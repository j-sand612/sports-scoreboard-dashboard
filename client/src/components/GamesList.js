// components/GamesList.js
import React from 'react';
import { Link } from 'react-router-dom';

function GamesList({ games, favorites }) {
  if (!games.length) {
    return (
      <div className="games-list empty-state">
        <p>No games scheduled for today.</p>
      </div>
    );
  }

  // Get favorite team IDs for highlighting
  const favoriteTeamIds = favorites.map(team => team.id);

  // Group games by status
  const liveGames = games.filter(game => game.abstractStatus === 'Live');
  const upcomingGames = games.filter(game => game.abstractStatus === 'Preview');
  const completedGames = games.filter(game => game.abstractStatus === 'Final');

  // Format time from ISO string
  const formatGameTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderGameCard = (game) => {
    const isHomeTeamFavorite = favoriteTeamIds.includes(game.homeTeam.id);
    const isAwayTeamFavorite = favoriteTeamIds.includes(game.awayTeam.id);
    
    return (
      <Link to={`/game/${game.id}`} key={game.id} className="game-card-link">
        <div className={`game-card ${(isHomeTeamFavorite || isAwayTeamFavorite) ? 'favorite-team-game' : ''}`}>
          <div className="game-status">
            {game.abstractStatus === 'Live' ? (
              <span className="live-indicator">LIVE: {game.inningState}</span>
            ) : game.abstractStatus === 'Preview' ? (
              <span className="scheduled">{formatGameTime(game.startTime)}</span>
            ) : (
              <span className="final">FINAL</span>
            )}
          </div>
          
          <div className="teams">
            <div className={`team ${isAwayTeamFavorite ? 'favorite-team' : ''}`}>
              <img 
                src={`https://www.mlbstatic.com/team-logos/${game.awayTeam.id}.svg`}
                alt={game.awayTeam.name}
                className="team-logo-small"
              />
              <span className="team-name">{game.awayTeam.name}</span>
              <span className="team-score">{game.awayTeam.score}</span>
            </div>
            
            <div className="at-symbol">@</div>
            
            <div className={`team ${isHomeTeamFavorite ? 'favorite-team' : ''}`}>
              <img 
                src={`https://www.mlbstatic.com/team-logos/${game.homeTeam.id}.svg`}
                alt={game.homeTeam.name}
                className="team-logo-small"
              />
              <span className="team-name">{game.homeTeam.name}</span>
              <span className="team-score">{game.homeTeam.score}</span>
            </div>
          </div>
          
          {game.venue && (
            <div className="game-venue">
              {game.venue}
            </div>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="games-list">
      {liveGames.length > 0 && (
        <div className="games-section">
          <h2>Live Games</h2>
          <div className="games-grid">
            {liveGames.map(renderGameCard)}
          </div>
        </div>
      )}
      
      {upcomingGames.length > 0 && (
        <div className="games-section">
          <h2>Today's Upcoming Games</h2>
          <div className="games-grid">
            {upcomingGames.map(renderGameCard)}
          </div>
        </div>
      )}
      
      {completedGames.length > 0 && (
        <div className="games-section">
          <h2>Completed Games</h2>
          <div className="games-grid">
            {completedGames.map(renderGameCard)}
          </div>
        </div>
      )}
      
      <div className="last-updated">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}

export default GamesList;