// components/LeagueLeaders.js
import React, { useState, useEffect } from 'react';

function LeagueLeaders() {
  const [leaderData, setLeaderData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('homeRuns');
  const [error, setError] = useState(null);
  
  const categories = [
    { id: 'homeRuns', name: 'HR' },
    { id: 'battingAverage', name: 'AVG' },
    { id: 'rbi', name: 'RBI' },
    { id: 'era', name: 'ERA' },
    { id: 'wins', name: 'W' },
    { id: 'strikeouts', name: 'K' }
  ];
  
  useEffect(() => {
    const fetchLeaders = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/mlb/leaders?category=${activeCategory}`);
        if (!response.ok) {
          throw new Error('Failed to fetch league leaders');
        }
        const data = await response.json();
        setLeaderData(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching league leaders:', error);
        setError('Unable to load league leaders. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaders();
  }, [activeCategory]);
  
  const formatValue = (value, category) => {
    if (category === 'battingAverage') {
      return parseFloat(value).toFixed(3).replace(/^0+/, '');
    }
    if (category === 'era') {
      return parseFloat(value).toFixed(2);
    }
    return value;
  };
  
  return (
    <div className="league-leaders">
      <h2>League Leaders</h2>
      
      <div className="category-tabs">
        {categories.map(category => (
          <button
            key={category.id}
            className={activeCategory === category.id ? 'active' : ''}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>
      
      {loading ? (
        <div className="loading">Loading leaders...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="leaders-table">
          <h3>{leaderData.displayName}</h3>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Team</th>
                <th>{leaderData.displayName}</th>
              </tr>
            </thead>
            <tbody>
                {leaderData.leaders?.map(leader => (
                    <tr key={`${leader.player.id}-${leader.rank}`}>
                    <td>{leader.rank}</td>
                    <td>{leader.player.name}</td>
                    <td>{leader.team?.name || 'N/A'}</td>
                    <td className="stat-value">{formatValue(leader.value, activeCategory)}</td>
                    </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default LeagueLeaders;