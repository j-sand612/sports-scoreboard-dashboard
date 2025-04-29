// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import TeamSelector from './components/TeamSelector';
import GamesList from './components/GamesList';
import GameDetail from './components/GameDetail';
import Standings from './components/Standings';
import TeamSchedule from './components/TeamSchedule';

function App() {
  const [favorites, setFavorites] = useState([]);
  const [todayGames, setTodayGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allTeams, setAllTeams] = useState([]);

  // Load saved favorites from localStorage on component mount
  useEffect(() => {
    console.log("Checking localStorage on mount");
    const savedFavorites = localStorage.getItem('mlbFavoriteTeams');
    console.log("Raw savedFavorites from localStorage:", savedFavorites);
    
    if (savedFavorites && savedFavorites !== '[]') {
      try {
        const parsedFavorites = JSON.parse(savedFavorites);
        console.log("Parsed favorites:", parsedFavorites);
        
        // Only set favorites if there are actually items to set
        if (parsedFavorites && parsedFavorites.length > 0) {
          setFavorites(parsedFavorites);
        }
      } catch (error) {
        console.error('Error parsing saved favorites:', error);
        // Don't remove from localStorage on parse error
        // Just keep the current state
      }
    } else {
      console.log("No saved favorites found in localStorage");
    }
      
      // Fetch all MLB teams
      const fetchTeams = async () => {
        try {
          const response = await fetch('/api/mlb/teams');
          if (!response.ok) {
            throw new Error('Failed to fetch MLB teams');
          }
          const data = await response.json();
          setAllTeams(data);
        } catch (error) {
          console.error('Error fetching MLB teams:', error);
        }
      };
    
      fetchTeams();
    }, []);

  // Save favorites to localStorage whenever they change, but only if the array has items
  useEffect(() => {
    // Only save if favorites actually has items
    if (favorites.length > 0) {
      localStorage.setItem('mlbFavoriteTeams', JSON.stringify(favorites));
      console.log("Saved favorites to localStorage:", favorites);
    }
  }, [favorites]);

  // Fetch today's games
  useEffect(() => {
    const fetchTodayGames = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/mlb/games/today');
        if (!response.ok) {
          throw new Error('Failed to fetch today\'s games');
        }
        const data = await response.json();
        setTodayGames(data);
      } catch (error) {
        console.error('Error fetching today\'s games:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayGames();
    
    // Set up polling every 60 seconds
    const intervalId = setInterval(fetchTodayGames, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  const handleAddFavorite = (team) => {
    if (!favorites.some(fav => fav.id === team.id)) {
      const newFavorites = [...favorites, team];
      console.log("Setting favorites state to:", newFavorites);
      setFavorites(newFavorites);
      
      // Explicitly stringify and save to localStorage
      const favoritesJson = JSON.stringify(newFavorites);
      console.log("Saving to localStorage:", favoritesJson);
      localStorage.setItem('mlbFavoriteTeams', favoritesJson);
      
      // Verify it was saved
      console.log("Verification - localStorage now contains:", localStorage.getItem('mlbFavoriteTeams'));
      
      console.log("Added to favorites:", team);
      console.log("New favorites:", newFavorites);
    }
  };

  const handleRemoveFavorite = (teamId) => {
    setFavorites(favorites.filter(team => team.id !== teamId));
  };

  // Filter today's games to show favorite teams' games first
  const getFilteredGames = () => {
    if (!todayGames.length) return [];
    
    const favoriteTeamIds = favorites.map(team => team.id);
    
    // Split games into favorites and non-favorites
    const favoriteGames = todayGames.filter(game => 
      favoriteTeamIds.includes(game.homeTeam.id) || 
      favoriteTeamIds.includes(game.awayTeam.id)
    );
    
    const otherGames = todayGames.filter(game => 
      !favoriteTeamIds.includes(game.homeTeam.id) && 
      !favoriteTeamIds.includes(game.awayTeam.id)
    );
    
    // Prioritize live games within each category
    const sortGames = (games) => {
      return games.sort((a, b) => {
        // Live games first
        if (a.abstractStatus === 'Live' && b.abstractStatus !== 'Live') return -1;
        if (a.abstractStatus !== 'Live' && b.abstractStatus === 'Live') return 1;
        
        // Then upcoming games
        if (a.abstractStatus === 'Preview' && b.abstractStatus === 'Final') return -1;
        if (a.abstractStatus === 'Final' && b.abstractStatus === 'Preview') return 1;
        
        // Sort by start time for upcoming games
        if (a.abstractStatus === 'Preview' && b.abstractStatus === 'Preview') {
          return new Date(a.startTime) - new Date(b.startTime);
        }
        
        return 0;
      });
    };
    
    return [...sortGames(favoriteGames), ...sortGames(otherGames)];
  };

  console.log("localStorage content:", localStorage.getItem('mlbFavoriteTeams'));


  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>MLB Score Dashboard</h1>
          <nav className="main-nav">
            <Link to="/">Today's Games</Link>
            <Link to="/standings">Standings</Link>
            {favorites.length > 0 && favorites.map(team => (
              <Link key={team.id} to={`/team/${team.id}`}>{team.name}</Link>
            ))}
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={
              <div className="dashboard-container">
                <div className="sidebar">
                  <TeamSelector 
                    allTeams={allTeams} 
                    onAddTeam={handleAddFavorite}
                  />
                  <h3>Favorite Teams</h3>
                  <ul className="favorites-list">
                    {favorites.map(team => (
                      <li key={team.id}>
                        <img 
                          src={team.logoUrl || `https://www.mlbstatic.com/team-logos/${team.id}.svg`}
                          alt={team.name}
                          className="team-logo-small" 
                        />
                        <span>{team.name}</span>
                        <button onClick={() => handleRemoveFavorite(team.id)}>Remove</button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="main-content">
                  {loading ? (
                    <p>Loading games...</p>
                  ) : (
                    <GamesList games={getFilteredGames()} favorites={favorites} />
                  )}
                </div>
              </div>
            } />
            <Route path="/game/:gameId" element={<GameDetail />} />
            <Route path="/standings" element={<Standings />} />
            <Route path="/team/:teamId" element={<TeamSchedule allTeams={allTeams} />} />
          </Routes>
        </main>
        <footer>
          <p>Data provided by MLB Stats API</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;