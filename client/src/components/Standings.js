import React, { useState, useEffect } from 'react';

function Standings() {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeLeague, setActiveLeague] = useState('all');

  useEffect(() => {
    const fetchStandings = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/mlb/standings');
        if (!response.ok) {
          throw new Error('Failed to fetch standings');
        }
        const data = await response.json();
        setStandings(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching standings:', error);
        setError('Unable to load standings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, []);

  if (loading) {
    return <div className="loading">Loading standings...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  // Filter standings by league
  const filteredStandings = activeLeague === 'all' 
    ? standings 
    : standings.filter(record => record.league.includes(activeLeague));

  return (
    <div className="standings-container">
      <h2>MLB Standings</h2>
      
      <div className="standings-filters">
        <button 
          className={activeLeague === 'all' ? 'active' : ''} 
          onClick={() => setActiveLeague('all')}
        >
          All
        </button>
        <button 
          className={activeLeague === 'American' ? 'active' : ''} 
          onClick={() => setActiveLeague('American')}
        >
          American League
        </button>
        <button 
          className={activeLeague === 'National' ? 'active' : ''} 
          onClick={() => setActiveLeague('National')}
        >
          National League
        </button>
      </div>
      
      <div className="standings-tables">
        {filteredStandings.map((record, i) => (
          <div key={i} className="division-standings">
            <h3>{record.division}</h3>
            <table className="standings-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th className="team-cell">Team</th>
                  <th>W</th>
                  <th>L</th>
                  <th>Pct</th>
                  <th>GB</th>
                  <th>Home</th>
                  <th>Away</th>
                  <th>Streak</th>
                  <th>Run Diff</th>
                </tr>
              </thead>
              <tbody>
                {record.teams.map(team => (
                  <tr key={team.id}>
                    <td>{team.rank}</td>
                    <td className="team-cell">
                      <img 
                        src={`https://www.mlbstatic.com/team-logos/${team.id}.svg`}
                        alt={team.name}
                        className="team-logo-tiny"
                      />
                      {team.name}
                    </td>
                    <td>{team.wins}</td>
                    <td>{team.losses}</td>
                    <td>{team.winningPercentage}</td>
                    <td>{team.gamesBack === '0.0' ? '-' : team.gamesBack}</td>
                    <td>{team.homeRecord}</td>
                    <td>{team.awayRecord}</td>
                    <td>{team.streak}</td>
                    <td className={parseInt(team.runDifferential) > 0 ? 'positive' : 'negative'}>
                      {parseInt(team.runDifferential) > 0 ? '+' : ''}{team.runDifferential}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      
      <div className="last-updated">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}

export default Standings;