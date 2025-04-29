// components/TeamSchedule.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function TeamSchedule({ allTeams }) {
  const { teamId } = useParams();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [team, setTeam] = useState(null);
  
  // Date range options for schedule
  const [dateRange, setDateRange] = useState('default'); // default, week, month, season
  
  useEffect(() => {
    // Find the team in allTeams
    if (allTeams.length > 0) {
      const foundTeam = allTeams.find(t => t.id.toString() === teamId.toString());
      if (foundTeam) {
        setTeam(foundTeam);
      }
    }
  }, [teamId, allTeams]);
  
  useEffect(() => {
    const fetchTeamSchedule = async () => {
      setLoading(true);
      
      // Calculate date range based on selection
      let startDate, endDate;
      const today = new Date();
      
      switch (dateRange) {
        case 'week':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 3);
          endDate = new Date(today);
          endDate.setDate(today.getDate() + 4);
          break;
        case 'month':
          startDate = new Date(today);
          startDate.setDate(1);
          endDate = new Date(today);
          endDate.setMonth(today.getMonth() + 1);
          endDate.setDate(0); // Last day of current month
          break;
        case 'season':
          // Season typically runs from April to October
          startDate = new Date(today.getFullYear(), 3, 1); // April 1
          endDate = new Date(today.getFullYear(), 9, 31); // October 31
          break;
        default: // Default is 1 week before and 2 weeks after
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 7);
          endDate = new Date(today);
          endDate.setDate(today.getDate() + 14);
      }
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      try {
        const response = await fetch(`/api/mlb/teams/${teamId}/games?startDate=${startDateStr}&endDate=${endDateStr}`);
        if (!response.ok) {
          throw new Error('Failed to fetch team schedule');
        }
        const data = await response.json();
        setGames(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching team schedule:', error);
        setError('Unable to load team schedule. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      fetchTeamSchedule();
    }
  }, [teamId, dateRange]);

  if (loading) {
    return <div className="loading">Loading team schedule...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }
  
  if (!team) {
    return <div className="not-found">Team not found</div>;
  }

  // Group games by month/week
  const groupedGames = games.reduce((acc, game) => {
    const date = new Date(game.date);
    const month = date.toLocaleString('default', { month: 'long' });
    const weekNumber = Math.ceil(date.getDate() / 7);
    const weekLabel = `Week ${weekNumber} (${month})`;
    
    const groupKey = dateRange === 'month' ? month : weekLabel;
    
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    
    acc[groupKey].push(game);
    return acc;
  }, {});
  
  // Format date for display
  const formatGameDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Format time for display
  const formatGameTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };
  
  return (
    <div className="team-schedule">
      <div className="back-link">
        <Link to="/">« Back to All Games</Link>
      </div>
      
      <div className="team-header">
        <img 
          src={team.logoUrl || `https://www.mlbstatic.com/team-logos/${team.id}.svg`}
          alt={team.name}
          className="team-logo-large"
        />
        <div className="team-info">
          <h2>{team.name}</h2>
          <div className="team-details">
            <span>{team.league}</span>
            <span>{team.division}</span>
            <span>Home: {team.venue}</span>
          </div>
        </div>
      </div>
      
      <div className="schedule-controls">
        <h3>Schedule</h3>
        <div className="date-range-controls">
          <button 
            className={dateRange === 'default' ? 'active' : ''} 
            onClick={() => setDateRange('default')}
          >
            3 Weeks
          </button>
          <button 
            className={dateRange === 'week' ? 'active' : ''} 
            onClick={() => setDateRange('week')}
          >
            This Week
          </button>
          <button 
            className={dateRange === 'month' ? 'active' : ''} 
            onClick={() => setDateRange('month')}
          >
            This Month
          </button>
          <button 
            className={dateRange === 'season' ? 'active' : ''} 
            onClick={() => setDateRange('season')}
          >
            Full Season
          </button>
        </div>
      </div>
      
      <div className="schedule-list">
        {Object.keys(groupedGames).length === 0 ? (
          <p className="no-games">No games scheduled in the selected date range.</p>
        ) : (
          Object.entries(groupedGames).map(([groupName, groupGames]) => (
            <div key={groupName} className="schedule-group">
              <h3 className="group-heading">{groupName}</h3>
              
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Opponent</th>
                    <th>Venue</th>
                    <th>Status</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {groupGames.map(game => {
                    // Determine if team is home or away
                    const isHome = game.homeTeam.id.toString() === teamId.toString();
                    const opponent = isHome ? game.awayTeam : game.homeTeam;
                    const gameResult = () => {
                      if (game.abstractStatus !== 'Final') return '-';
                      
                      const teamScore = isHome ? game.homeTeam.score : game.awayTeam.score;
                      const opponentScore = isHome ? game.awayTeam.score : game.homeTeam.score;
                      
                      if (teamScore > opponentScore) return 'W';
                      if (teamScore < opponentScore) return 'L';
                      return 'T';
                    };
                    
                    const scoreDisplay = () => {
                      if (game.abstractStatus === 'Preview') return '';
                      
                      const teamScore = isHome ? game.homeTeam.score : game.awayTeam.score;
                      const opponentScore = isHome ? game.awayTeam.score : game.homeTeam.score;
                      
                      return `${teamScore}-${opponentScore}`;
                    };
                    
                    return (
                      <tr key={game.id}>
                        <td>{formatGameDate(game.date)}</td>
                        <td>{formatGameTime(game.startTime)}</td>
                        <td>
                          <div className="opponent-info">
                            <img 
                              src={`https://www.mlbstatic.com/team-logos/${opponent.id}.svg`}
                              alt={opponent.name}
                              className="team-logo-tiny"
                            />
                            <span>{isHome ? 'vs' : '@'} {opponent.name}</span>
                          </div>
                        </td>
                        <td>{game.venue}</td>
                        <td>
                          {game.abstractStatus === 'Live' ? (
                            <span className="live-indicator">LIVE</span>
                          ) : game.abstractStatus === 'Final' ? (
                            <span className="final-indicator">Final</span>
                          ) : (
                            <span className="scheduled-indicator">Scheduled</span>
                          )}
                        </td>
                        <td>
                          <Link to={`/game/${game.id}`} className="game-link">
                            <span className={
                              gameResult() === 'W' ? 'win' : 
                              gameResult() === 'L' ? 'loss' : ''
                            }>
                              {gameResult()} {scoreDisplay()}
                            </span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
      
      <div className="last-updated">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}

export default TeamSchedule;