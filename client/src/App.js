import React, { useState, useEffect } from 'react';
import './App.css';
import TeamSelector from './components/TeamSelector';
import ScoreBoard from './components/ScoreBoard';

function App() {
  const [favorites, setFavorites] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load saved favorites from localStorage on component mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteTeams');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (error) {
        console.error('Error parsing saved favorites:', error);
        localStorage.removeItem('favoriteTeams');
      }
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    if (favorites.length > 0) {
      localStorage.setItem('favoriteTeams', JSON.stringify(favorites));
    }
  }, [favorites]);

  // Fetch scores for favorite teams
  useEffect(() => {
    if (favorites.length === 0) return;
    
    const fetchScores = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/scores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ teams: favorites }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch scores');
        }
        
        const data = await response.json();
        setScores(data);
      } catch (error) {
        console.error('Error fetching scores:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
    
    // Set up polling every 60 seconds
    const intervalId = setInterval(fetchScores, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [favorites]);

  const handleAddFavorite = (team) => {
    if (!favorites.some(fav => fav.id === team.id)) {
      setFavorites([...favorites, team]);
    }
  };

  const handleRemoveFavorite = (teamId) => {
    setFavorites(favorites.filter(team => team.id !== teamId));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Sports Score Dashboard</h1>
      </header>
      <main>
        <div className="dashboard-container">
          <div className="sidebar">
            <TeamSelector onAddTeam={handleAddFavorite} />
            <h3>Favorite Teams</h3>
            <ul className="favorites-list">
              {favorites.map(team => (
                <li key={team.id}>
                  {team.name} ({team.league})
                  <button onClick={() => handleRemoveFavorite(team.id)}>Remove</button>
                </li>
              ))}
            </ul>
          </div>
          <div className="main-content">
            {loading ? (
              <p>Loading scores...</p>
            ) : (
              <ScoreBoard scores={scores} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;