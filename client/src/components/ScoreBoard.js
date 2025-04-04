// components/ScoreBoard.js
import React from 'react';

function ScoreBoard({ scores }) {
  if (!scores.length) {
    return (
      <div className="scoreboard empty-state">
        <p>No scores available. Add teams to your favorites to see their scores.</p>
      </div>
    );
  }

  // Group scores by league for better organization
  const scoresByLeague = scores.reduce((acc, score) => {
    const league = score.league || 'Other';
    if (!acc[league]) {
      acc[league] = [];
    }
    acc[league].push(score);
    return acc;
  }, {});

  return (
    <div className="scoreboard">
      {Object.entries(scoresByLeague).map(([league, leagueScores]) => (
        <div key={league} className="league-section">
          <h2>{league}</h2>
          <div className="scores-container">
            {leagueScores.map((score) => (
              <div key={score.id} className="score-card">
                <div className="game-status">
                  {score.status === 'in_progress' ? (
                    <span className="live-indicator">LIVE</span>
                  ) : score.status === 'scheduled' ? (
                    <span className="scheduled">
                      {new Date(score.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span className="final">FINAL</span>
                  )}
                </div>
                
                <div className="teams">
                  <div className="team">
                    <span className="team-name">{score.homeTeam.name}</span>
                    <span className="team-score">{score.homeTeam.score}</span>
                  </div>
                  <div className="team">
                    <span className="team-name">{score.awayTeam.name}</span>
                    <span className="team-score">{score.awayTeam.score}</span>
                  </div>
                </div>
                
                {score.status === 'in_progress' && (
                  <div className="game-info">
                    {score.period ? `${score.period} ${score.timeRemaining || ''}` : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="last-updated">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}

export default ScoreBoard;
