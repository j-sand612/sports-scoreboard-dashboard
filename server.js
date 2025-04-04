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

// Cache for storing fetched data to reduce API calls
let scoreCache = {};
let lastFetchTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
}

// API endpoints
app.get('/api/search', async (req, res) => {
  const { q, league } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search term is required' });
  }
  
  try {
    let url;
    
    if (league && league !== 'all') {
      // Search teams by league
      url = `https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?l=${encodeURIComponent(league)}`;
    } else {
      // Search all teams
      url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(q)}`;
    }
    
    const response = await axios.get(url);
    
    if (!response.data.teams) {
      return res.json([]);
    }
    
    // Format team data
    const teams = response.data.teams.map(team => ({
      id: team.idTeam,
      name: team.strTeam,
      league: team.strLeague,
      logo: team.strTeamBadge,
      sport: team.strSport
    }));
    
    // Filter by search term if needed
    const filteredTeams = league === 'all' 
      ? teams
      : teams.filter(team => 
          team.name.toLowerCase().includes(q.toLowerCase())
        );
    
    res.json(filteredTeams);
  } catch (error) {
    console.error('Error searching teams:', error);
    res.status(500).json({ error: 'Failed to search teams' });
  }
});

app.post('/api/scores', async (req, res) => {
    const { teams } = req.body;

    if (!teams || !Array.isArray(teams) || teams.length === 0) {
        return res.status(400).json({ error: 'Teams array is required' });
    }

    const now = new Date();
    const cacheIsValid = lastFetchTime && 
        (now.getTime() - lastFetchTime.getTime() < CACHE_DURATION);

    // Get team IDs from request
    const requestedTeamIds = teams.map(team => team.id);

    // Find which teams are missing from the cache
    const cachedTeamIds = new Set();
    Object.values(scoreCache).forEach(score => {
        cachedTeamIds.add(score.homeTeam.id);
        cachedTeamIds.add(score.awayTeam.id);
    });

    const missingTeamIds = requestedTeamIds.filter(id => !cachedTeamIds.has(id));
    const missingTeams = teams.filter(team => missingTeamIds.includes(team.id));

    // If cache is valid and we have all requested teams, use cache
    if (cacheIsValid && missingTeamIds.length === 0) {
        const filteredScores = Object.values(scoreCache).filter(
        score => requestedTeamIds.includes(score.homeTeam.id) || 
                    requestedTeamIds.includes(score.awayTeam.id)
        );
        
        return res.json(filteredScores);
    }

    try {
        let allScores = [];
        
        // If cache is valid, start with existing scores
        if (cacheIsValid) {
        allScores = Object.values(scoreCache);
        }
        
        // Only fetch for missing teams or if cache is invalid
        const teamsToFetch = cacheIsValid ? missingTeams : teams;
        
        if (teamsToFetch.length > 0) {
        const newScoresPromises = teamsToFetch.map(async (team) => {
            try {
                // Get upcoming events (scheduled games)
                const upcomingUrl = `https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${team.id}`;
                const upcomingResponse = await axios.get(upcomingUrl);
                
                // Get recently completed events (final scores)
                const pastUrl = `https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${team.id}`;
                const pastResponse = await axios.get(pastUrl);
                
                let allEvents = [];
                
                // Process upcoming events
                if (upcomingResponse.data.events) {
                  const upcoming = upcomingResponse.data.events.map(event => ({
                    id: event.idEvent,
                    league: event.strLeague,
                    homeTeam: {
                      id: event.idHomeTeam,
                      name: event.strHomeTeam,
                      score: 0
                    },
                    awayTeam: {
                      id: event.idAwayTeam,
                      name: event.strAwayTeam,
                      score: 0
                    },
                    status: 'scheduled',
                    scheduledTime: event.strTimestamp
                  }));
                  allEvents = [...allEvents, ...upcoming];
                }
                
                // Process past events (last ~15 events)
                if (pastResponse.data.results) {
                  const past = pastResponse.data.results.map(event => ({
                    id: event.idEvent,
                    league: event.strLeague,
                    homeTeam: {
                      id: event.idHomeTeam,
                      name: event.strHomeTeam,
                      score: parseInt(event.intHomeScore) || 0
                    },
                    awayTeam: {
                      id: event.idAwayTeam,
                      name: event.strAwayTeam,
                      score: parseInt(event.intAwayScore) || 0
                    },
                    status: 'completed',
                    completedTime: event.dateEvent
                  }));
                  allEvents = [...allEvents, ...past];
                }
                
                return allEvents;
              } catch (error) {
                console.error(`Error fetching scores for team ${team.id}:`, error);
                return [];
              }
        });
        
        const newScoresArrays = await Promise.all(newScoresPromises);
        const newScores = newScoresArrays.flat();
        
        // Combine with existing scores (if any)
        allScores = [...allScores, ...newScores];
        }
        
        // Deduplicate scores by event ID
        const uniqueScores = {};
        for (const score of allScores) {
        uniqueScores[score.id] = score;
        }
        
        // Update cache
        scoreCache = uniqueScores;
        lastFetchTime = now;
        
        res.json(Object.values(uniqueScores).filter(
        score => requestedTeamIds.includes(score.homeTeam.id) || 
                    requestedTeamIds.includes(score.awayTeam.id)
        ));
    } catch (error) {
        console.error('Error fetching scores:', error);
        res.status(500).json({ error: 'Failed to fetch scores' });
    }
});

// Endpoint for embedded devices to fetch scores in a simple format
app.get('/api/device/scores', async (req, res) => {
  const { teams } = req.query;
  
  if (!teams) {
    return res.status(400).json({ error: 'Team IDs required' });
  }
  
  const teamIds = teams.split(',');
  
  // Check if we have cached data
  if (
    lastFetchTime && 
    new Date().getTime() - lastFetchTime.getTime() < CACHE_DURATION &&
    Object.keys(scoreCache).length > 0
  ) {
    // Filter cache for the requested teams
    const filteredScores = Object.values(scoreCache).filter(
      score => teamIds.includes(score.homeTeam.id) || teamIds.includes(score.awayTeam.id)
    );
    
    // Format for embedded devices (simplified format)
    const simplifiedScores = filteredScores.map(score => ({
      id: score.id,
      home: {
        team: score.homeTeam.name,
        score: score.homeTeam.score
      },
      away: {
        team: score.awayTeam.name,
        score: score.awayTeam.score
      },
      status: score.status
    }));
    
    return res.json(simplifiedScores);
  }
  
  // If no cache, return error suggesting to fetch scores first
  return res.status(404).json({ 
    error: 'No cached scores available',
    message: 'Please fetch scores via the frontend first'
  });
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