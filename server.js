// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MLB API Base URL
const MLB_API_BASE = 'https://statsapi.mlb.com/api';

// Cache for storing fetched data to reduce API calls
let teamsCache = null;
let gamesCache = {};
let standingsCache = null;
let lastFetchTime = {
  teams: null,
  games: {},
  standings: null
};

// Cache durations in milliseconds
const CACHE_DURATION = {
  teams: 24 * 60 * 60 * 1000, // 24 hours for teams
  games: 5 * 60 * 1000, // 5 minutes for games
  standings: 60 * 60 * 1000 // 1 hour for standings
};

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
}

// Get all MLB teams
app.get('/api/mlb/teams', async (req, res) => {
  // Check if we can use cached data
  const now = new Date();
  if (
    teamsCache &&
    lastFetchTime.teams &&
    now.getTime() - lastFetchTime.teams.getTime() < CACHE_DURATION.teams
  ) {
    return res.json(teamsCache);
  }

  try {
    const response = await axios.get(`${MLB_API_BASE}/v1/teams?sportId=1`);
    
    // Format teams data
    const teams = response.data.teams.map(team => ({
      id: team.id,
      name: team.name,
      abbreviation: team.abbreviation,
      teamName: team.teamName,
      shortName: team.shortName,
      division: team.division?.name,
      league: team.league?.name,
      venue: team.venue?.name,
      logoUrl: `https://www.mlbstatic.com/team-logos/${team.id}.svg`
    })).sort((a, b) => a.name.localeCompare(b.name));
    
    // Update cache
    teamsCache = teams;
    lastFetchTime.teams = now;
    
    res.json(teams);
  } catch (error) {
    console.error('Error fetching MLB teams:', error);
    res.status(500).json({ error: 'Failed to fetch MLB teams' });
  }
});

// Get today's MLB games
app.get('/api/mlb/games/today', async (req, res) => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  
  // Check if we can use cached data
  const now = new Date();
  if (
    gamesCache[dateStr] &&
    lastFetchTime.games[dateStr] &&
    now.getTime() - lastFetchTime.games[dateStr].getTime() < CACHE_DURATION.games
  ) {
    return res.json(gamesCache[dateStr]);
  }
  
  try {
    const response = await axios.get(
      `${MLB_API_BASE}/v1/schedule?sportId=1&date=${dateStr}&hydrate=team,linescore,flags,liveLookin,person,probablePitcher,stats,broadcasts(all),game(content(media(epg),summary),tickets),seriesStatus(useOverride=true)`
    );
    
    // Format games data
    let games = [];
    
    if (response.data.dates && response.data.dates.length > 0) {
      games = response.data.dates[0].games.map(game => {
        // Calculate inning information
        const currentInning = game.linescore?.currentInning || 0;
        const inningHalf = game.linescore?.inningHalf || '';
        const inningState = currentInning > 0 
          ? `${inningHalf === 'top' ? 'Top' : 'Bottom'} ${currentInning}` 
          : '';
        
        return {
          id: game.gamePk,
          date: game.gameDate,
          status: game.status.detailedState,
          abstractStatus: game.status.abstractGameState, // Preview, Live, Final
          inningState,
          homeTeam: {
            id: game.teams.home.team.id,
            name: game.teams.home.team.name,
            score: game.teams.home.score,
            wins: game.teams.home.leagueRecord.wins,
            losses: game.teams.home.leagueRecord.losses
          },
          awayTeam: {
            id: game.teams.away.team.id,
            name: game.teams.away.team.name,
            score: game.teams.away.score,
            wins: game.teams.away.leagueRecord.wins,
            losses: game.teams.away.leagueRecord.losses
          },
          venue: game.venue.name,
          startTime: game.gameDate,
          probablePitchers: {
            home: game.teams.home.probablePitcher 
              ? {
                  id: game.teams.home.probablePitcher.id,
                  name: game.teams.home.probablePitcher.fullName,
                  stats: game.teams.home.probablePitcher.stats || {}
                } 
              : null,
            away: game.teams.away.probablePitcher 
              ? {
                  id: game.teams.away.probablePitcher.id,
                  name: game.teams.away.probablePitcher.fullName,
                  stats: game.teams.away.probablePitcher.stats || {}
                } 
              : null
          },
          linescore: game.linescore || null
        };
      });
    }
    
    // Update cache
    gamesCache[dateStr] = games;
    lastFetchTime.games[dateStr] = now;
    
    res.json(games);
  } catch (error) {
    console.error('Error fetching MLB games:', error);
    res.status(500).json({ error: 'Failed to fetch MLB games' });
  }
});

// Get detailed information for a specific game
app.get('/api/mlb/games/:gameId', async (req, res) => {
  const { gameId } = req.params;
  
  if (!gameId) {
    return res.status(400).json({ error: 'Game ID is required' });
  }
  
  // Check if we can use cached data
  const cacheKey = `game_${gameId}`;
  const now = new Date();
  if (
    gamesCache[cacheKey] &&
    lastFetchTime.games[cacheKey] &&
    now.getTime() - lastFetchTime.games[cacheKey].getTime() < CACHE_DURATION.games
  ) {
    return res.json(gamesCache[cacheKey]);
  }
  
  try {
    const response = await axios.get(`${MLB_API_BASE}/v1.1/game/${gameId}/feed/live`);
    const gameData = response.data;
    
    // Format for easier frontend consumption
    const formattedGame = {
      id: gameData.gameData.game.pk,
      status: gameData.gameData.status.detailedState,
      abstractStatus: gameData.gameData.status.abstractGameState,
      teams: {
        home: {
          id: gameData.gameData.teams.home.id,
          name: gameData.gameData.teams.home.name,
          score: gameData.liveData.linescore.teams.home.runs,
          hits: gameData.liveData.linescore.teams.home.hits,
          errors: gameData.liveData.linescore.teams.home.errors,
          currentBatters: gameData.liveData.boxscore.teams.home.batters
            .slice(0, 9)
            .map(batterId => {
              const batter = gameData.liveData.boxscore.teams.home.players[`ID${batterId}`];
              return {
                id: batterId,
                name: batter.person.fullName,
                position: batter.position.abbreviation,
                stats: batter.stats
              };
            })
        },
        away: {
          id: gameData.gameData.teams.away.id,
          name: gameData.gameData.teams.away.name,
          score: gameData.liveData.linescore.teams.away.runs,
          hits: gameData.liveData.linescore.teams.away.hits,
          errors: gameData.liveData.linescore.teams.away.errors,
          currentBatters: gameData.liveData.boxscore.teams.away.batters
            .slice(0, 9)
            .map(batterId => {
              const batter = gameData.liveData.boxscore.teams.away.players[`ID${batterId}`];
              return {
                id: batterId,
                name: batter.person.fullName,
                position: batter.position.abbreviation,
                stats: batter.stats
              };
            })
        }
      },
      linescore: gameData.liveData.linescore,
      currentPlay: gameData.liveData.plays.currentPlay,
      innings: gameData.liveData.linescore.innings,
      pitchers: {
        home: {
          current: gameData.liveData.boxscore.teams.home.pitchers
            .map(pitcherId => {
              const pitcher = gameData.liveData.boxscore.teams.home.players[`ID${pitcherId}`];
              return {
                id: pitcherId,
                name: pitcher.person.fullName,
                stats: pitcher.stats.pitching
              };
            })
            .pop() // Get the last/current pitcher
        },
        away: {
          current: gameData.liveData.boxscore.teams.away.pitchers
            .map(pitcherId => {
              const pitcher = gameData.liveData.boxscore.teams.away.players[`ID${pitcherId}`];
              return {
                id: pitcherId,
                name: pitcher.person.fullName,
                stats: pitcher.stats.pitching
              };
            })
            .pop() // Get the last/current pitcher
        }
      },
      venue: gameData.gameData.venue.name,
      weather: gameData.gameData.weather,
      gameTime: gameData.gameData.datetime,
      decisions: gameData.liveData.decisions || {}
    };
    
    // Update cache
    gamesCache[cacheKey] = formattedGame;
    lastFetchTime.games[cacheKey] = now;
    
    res.json(formattedGame);
  } catch (error) {
    console.error(`Error fetching MLB game ${gameId}:`, error);
    res.status(500).json({ error: `Failed to fetch MLB game ${gameId}` });
  }
});

// Get games for a specific team
app.get('/api/mlb/teams/:teamId/games', async (req, res) => {
  const { teamId } = req.params;
  const { startDate, endDate } = req.query;
  
  if (!teamId) {
    return res.status(400).json({ error: 'Team ID is required' });
  }
  
  // Default to last 7 days and next 7 days if dates not specified
  const today = new Date();
  const defaultStartDate = new Date(today);
  defaultStartDate.setDate(defaultStartDate.getDate() - 7);
  const defaultEndDate = new Date(today);
  defaultEndDate.setDate(defaultEndDate.getDate() + 7);
  
  const start = startDate || defaultStartDate.toISOString().split('T')[0];
  const end = endDate || defaultEndDate.toISOString().split('T')[0];
  
  // Check if we can use cached data
  const cacheKey = `team_${teamId}_${start}_${end}`;
  const now = new Date();
  if (
    gamesCache[cacheKey] &&
    lastFetchTime.games[cacheKey] &&
    now.getTime() - lastFetchTime.games[cacheKey].getTime() < CACHE_DURATION.games
  ) {
    return res.json(gamesCache[cacheKey]);
  }
  
  try {
    const response = await axios.get(
      `${MLB_API_BASE}/v1/schedule?sportId=1&teamId=${teamId}&startDate=${start}&endDate=${end}&hydrate=team,linescore`
    );
    
    // Format games data
    let games = [];
    
    if (response.data.dates && response.data.dates.length > 0) {
      response.data.dates.forEach(date => {
        const formattedGames = date.games.map(game => {
          return {
            id: game.gamePk,
            date: game.gameDate,
            status: game.status.detailedState,
            abstractStatus: game.status.abstractGameState,
            homeTeam: {
              id: game.teams.home.team.id,
              name: game.teams.home.team.name,
              score: game.teams.home.score,
            },
            awayTeam: {
              id: game.teams.away.team.id,
              name: game.teams.away.team.name,
              score: game.teams.away.score,
            },
            venue: game.venue.name,
            startTime: game.gameDate
          };
        });
        
        games = [...games, ...formattedGames];
      });
    }
    
    // Update cache
    gamesCache[cacheKey] = games;
    lastFetchTime.games[cacheKey] = now;
    
    res.json(games);
  } catch (error) {
    console.error(`Error fetching games for team ${teamId}:`, error);
    res.status(500).json({ error: `Failed to fetch games for team ${teamId}` });
  }
});

// Get current MLB standings
app.get('/api/mlb/standings', async (req, res) => {
  // Check if we can use cached data
  const now = new Date();
  if (
    standingsCache &&
    lastFetchTime.standings &&
    now.getTime() - lastFetchTime.standings.getTime() < CACHE_DURATION.standings
  ) {
    return res.json(standingsCache);
  }
  
  try {
    const response = await axios.get(
      `${MLB_API_BASE}/v1/standings?leagueId=103,104&season=${new Date().getFullYear()}&standingsTypes=regularSeason&hydrate=team`
    );
    
    // Format standings data
    const standings = response.data.records.map(record => {
      return {
        standingsType: record.standingsType,
        league: record.league.name || (record.league.id === 103 ? "American League" : "National League"),
        division: record.division.name || `Division ${record.division.id}`,
        teams: record.teamRecords.map(team => {
          // Get the home and away records safely
          let homeRecord = "0-0";
          let awayRecord = "0-0";
          
          // Check if records object exists and has the expected structure
          if (team.records && team.records.splitRecords) {
            // Find home and away records in splitRecords array
            const homeRec = team.records.splitRecords.find(r => r.type === "home");
            const awayRec = team.records.splitRecords.find(r => r.type === "away");
            
            if (homeRec) homeRecord = `${homeRec.wins}-${homeRec.losses}`;
            if (awayRec) awayRecord = `${awayRec.wins}-${awayRec.losses}`;
          }
          
          return {
            id: team.team.id,
            name: team.team.name,
            rank: team.divisionRank,
            wins: team.wins,
            losses: team.losses,
            winningPercentage: team.winningPercentage,
            gamesBack: team.gamesBack,
            wildCardGamesBack: team.wildCardGamesBack || 'N/A',
            runDifferential: team.runDifferential,
            homeRecord: homeRecord,
            awayRecord: awayRecord,
            streak: team.streak?.streakCode || 'N/A'
          };
        }).sort((a, b) => Number(a.rank) - Number(b.rank))
      };
    });
    
    // Update cache
    standingsCache = standings;
    lastFetchTime.standings = now;
    
    res.json(standings);
  } catch (error) {
    console.error('Error fetching MLB standings:', error);
    res.status(500).json({ error: 'Failed to fetch MLB standings' });
  }
});

// Save favorite teams to localStorage (handled client-side)
app.post('/api/mlb/favorites', (req, res) => {
  // This is just a placeholder API endpoint
  // In a real app with user accounts, you would save to a database
  res.json({ message: 'Favorites would be saved to database in a full implementation' });
});

// Catch-all handler for React routing
app.get('*', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  } else {
    res.status(404).send('API endpoint not found');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});