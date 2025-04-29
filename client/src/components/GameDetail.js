// components/GameDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function GameDetail() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGameDetails = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/mlb/games/${gameId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch game details');
        }
        const data = await response.json();
        setGame(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching game details:', error);
        setError('Unable to load game details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchGameDetails();
    
    // Set up polling if game is live
    const intervalId = game && game.abstractStatus === 'Live' 
      ? setInterval(fetchGameDetails, 30000) // Poll every 30 seconds for live games
      : null;
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [gameId, game?.abstractStatus]);

  if (loading) {
    return <div className="loading">Loading game details...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!game) {
    return <div className="not-found">Game not found</div>;
  }

  // Render the boxscore/linescore
  const renderLinescore = () => {
    if (!game.linescore || !game.linescore.innings || game.linescore.innings.length === 0) {
      return <p>No linescore available</p>;
    }

    return (
      <div className="linescore">
        <table>
          <thead>
            <tr>
              <th>Team</th>
              {game.linescore.innings.map((inning, i) => (
                <th key={i}>{i + 1}</th>
              ))}
              <th>R</th>
              <th>H</th>
              <th>E</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <img 
                  src={`https://www.mlbstatic.com/team-logos/${game.teams.away.id}.svg`}
                  alt={game.teams.away.name}
                  className="team-logo-tiny"
                />
                {game.teams.away.name}
              </td>
              {game.linescore.innings.map((inning, i) => (
                <td key={i}>{inning.away?.runs || ''}</td>
              ))}
              <td>{game.teams.away.score}</td>
              <td>{game.teams.away.hits}</td>
              <td>{game.teams.away.errors}</td>
            </tr>
            <tr>
              <td>
                <img 
                  src={`https://www.mlbstatic.com/team-logos/${game.teams.home.id}.svg`}
                  alt={game.teams.home.name}
                  className="team-logo-tiny"
                />
                {game.teams.home.name}
              </td>
              {game.linescore.innings.map((inning, i) => (
                <td key={i}>{inning.home?.runs || ''}</td>
              ))}
              <td>{game.teams.home.score}</td>
              <td>{game.teams.home.hits}</td>
              <td>{game.teams.home.errors}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Render current game state (bases, count, etc.)
  const renderCurrentPlay = () => {
    if (!game.currentPlay || game.abstractStatus !== 'Live') {
      return null;
    }

    const { count, offense, defense, playEvents } = game.currentPlay;
    const lastPlay = playEvents && playEvents.length > 0 ? playEvents[playEvents.length - 1] : null;
    
    return (
      <div className="current-play">
        <div className="diamond">
          <div className={`base first-base ${offense.first ? 'occupied' : ''}`}></div>
          <div className={`base second-base ${offense.second ? 'occupied' : ''}`}></div>
          <div className={`base third-base ${offense.third ? 'occupied' : ''}`}></div>
          <div className="home-plate"></div>
        </div>
        
        <div className="count-display">
          <div className="count-item">
            <span className="count-label">Balls:</span>
            <span className="count-value">{count.balls}</span>
          </div>
          <div className="count-item">
            <span className="count-label">Strikes:</span>
            <span className="count-value">{count.strikes}</span>
          </div>
          <div className="count-item">
            <span className="count-label">Outs:</span>
            <span className="count-value">{count.outs}</span>
          </div>
        </div>
        
        {lastPlay && (
          <div className="last-play">
            <p>{lastPlay.details.description}</p>
          </div>
        )}
      </div>
    );
  };

  // Render batting order
  const renderBattingOrder = (team, isHome) => {
    const batters = team.currentBatters;
    
    if (!batters || batters.length === 0) {
      return <p>No batting data available</p>;
    }
    
    return (
      <div className={`batting-order ${isHome ? 'home' : 'away'}`}>
        <h3>{team.name} Batting Order</h3>
        <table className="batting-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Pos</th>
              <th>AB</th>
              <th>H</th>
              <th>R</th>
              <th>RBI</th>
              <th>BB</th>
              <th>AVG</th>
            </tr>
          </thead>
          <tbody>
            {batters.map((batter, i) => {
              const stats = batter.stats && batter.stats.batting 
                ? batter.stats.batting 
                : {};
              
              return (
                <tr key={batter.id}>
                  <td>{i + 1}</td>
                  <td>{batter.name}</td>
                  <td>{batter.position}</td>
                  <td>{stats.atBats || 0}</td>
                  <td>{stats.hits || 0}</td>
                  <td>{stats.runs || 0}</td>
                  <td>{stats.rbi || 0}</td>
                  <td>{stats.baseOnBalls || 0}</td>
                  <td>{stats.avg || '.000'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Render current pitchers
  const renderPitchers = () => {
    const { home, away } = game.pitchers;
    
    return (
      <div className="pitchers-container">
        <div className="pitcher away-pitcher">
          <h3>{game.teams.away.name} Pitcher</h3>
          {away.current ? (
            <div className="pitcher-stats">
              <div className="pitcher-name">{away.current.name}</div>
              <div className="pitcher-detail">
                <span>IP: {away.current.stats.inningsPitched || '0.0'}</span>
                <span>ERA: {away.current.stats.era || '0.00'}</span>
              </div>
              <div className="pitcher-detail">
                <span>K: {away.current.stats.strikeOuts || 0}</span>
                <span>BB: {away.current.stats.baseOnBalls || 0}</span>
                <span>Pitches: {away.current.stats.pitchesThrown || 0}</span>
              </div>
            </div>
          ) : (
            <p>No pitcher data available</p>
          )}
        </div>
        
        <div className="pitcher home-pitcher">
          <h3>{game.teams.home.name} Pitcher</h3>
          {home.current ? (
            <div className="pitcher-stats">
              <div className="pitcher-name">{home.current.name}</div>
              <div className="pitcher-detail">
                <span>IP: {home.current.stats.inningsPitched || '0.0'}</span>
                <span>ERA: {home.current.stats.era || '0.00'}</span>
              </div>
              <div className="pitcher-detail">
                <span>K: {home.current.stats.strikeOuts || 0}</span>
                <span>BB: {home.current.stats.baseOnBalls || 0}</span>
                <span>Pitches: {home.current.stats.pitchesThrown || 0}</span>
              </div>
            </div>
          ) : (
            <p>No pitcher data available</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="game-detail">
      <div className="back-link">
        <Link to="/">« Back to All Games</Link>
      </div>
      
      <div className="game-header">
        <div className="teams-container">
          <div className="team away-team">
            <img 
              src={`https://www.mlbstatic.com/team-logos/${game.teams.away.id}.svg`}
              alt={game.teams.away.name}
              className="team-logo"
            />
            <h2>{game.teams.away.name}</h2>
            <div className="team-record">({game.teams.away.wins}-{game.teams.away.losses})</div>
            <div className="team-score">{game.teams.away.score}</div>
          </div>
          
          <div className="game-info">
            <div className="game-status">
              {game.abstractStatus === 'Live' ? (
                <span className="live-indicator">LIVE</span>
              ) : game.abstractStatus === 'Preview' ? (
                <span className="scheduled">Scheduled</span>
              ) : (
                <span className="final">Final</span>
              )}
            </div>
            
            {game.venue && (
              <div className="venue-info">
                {game.venue}
              </div>
            )}
            
            {game.weather && (
              <div className="weather-info">
                {game.weather.condition}, {game.weather.temp}°F
              </div>
            )}
          </div>
          
          <div className="team home-team">
            <img 
              src={`https://www.mlbstatic.com/team-logos/${game.teams.home.id}.svg`}
              alt={game.teams.home.name}
              className="team-logo"
            />
            <h2>{game.teams.home.name}</h2>
            <div className="team-record">({game.teams.home.wins}-{game.teams.home.losses})</div>
            <div className="team-score">{game.teams.home.score}</div>
          </div>
        </div>
      </div>
      
      {renderLinescore()}
      
      {game.abstractStatus === 'Live' && renderCurrentPlay()}
      
      {game.abstractStatus === 'Live' && renderPitchers()}
      
      <div className="batting-orders">
        {renderBattingOrder(game.teams.away, false)}
        {renderBattingOrder(game.teams.home, true)}
      </div>
      
      {game.abstractStatus === 'Final' && game.decisions && (
        <div className="game-decisions">
          <h3>Game Decisions</h3>
          {game.decisions.winner && (
            <div className="decision">
              <span className="decision-label">Win:</span>
              <span className="decision-value">{game.decisions.winner.fullName}</span>
            </div>
          )}
          {game.decisions.loser && (
            <div className="decision">
              <span className="decision-label">Loss:</span>
              <span className="decision-value">{game.decisions.loser.fullName}</span>
            </div>
          )}
          {game.decisions.save && (
            <div className="decision">
              <span className="decision-label">Save:</span>
              <span className="decision-value">{game.decisions.save.fullName}</span>
            </div>
          )}
        </div>
      )}
      
      <div className="last-updated">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}

export default GameDetail;