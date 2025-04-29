// components/TeamSelector.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function TeamSelector({ allTeams, onAddTeam }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('all');

  // Group teams by division
  const divisions = [
    { id: 'all', name: 'All Divisions' },
    { id: 'American League East', name: 'AL East' },
    { id: 'American League Central', name: 'AL Central' },
    { id: 'American League West', name: 'AL West' },
    { id: 'National League East', name: 'NL East' },
    { id: 'National League Central', name: 'NL Central' },
    { id: 'National League West', name: 'NL West' }
  ];

  const filteredTeams = allTeams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDivision = selectedDivision === 'all' || team.division === selectedDivision;
    return matchesSearch && matchesDivision;
  });

  return (
    <div className="team-selector">
      <h3>Find MLB Teams</h3>
      <div className="team-filters">
        <select 
          value={selectedDivision}
          onChange={(e) => setSelectedDivision(e.target.value)}
          className="division-select"
        >
          {divisions.map(division => (
            <option key={division.id} value={division.id}>
              {division.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search for teams..."
          className="team-search"
        />
      </div>
      
      <div className="search-results">
        {filteredTeams.length > 0 ? (
          <ul className="teams-list">
            {filteredTeams.map(team => (
              <li key={team.id} className="team-item">
                <div className="team-info">
                  <img 
                    src={team.logoUrl || `https://www.mlbstatic.com/team-logos/${team.id}.svg`}
                    alt={team.name}
                    className="team-logo-small" 
                  />
                  <div className="team-details">
                    <Link to={`/team/${team.id}`} className="team-link">
                      <span className="team-name">{team.name}</span>
                    </Link>
                    <span className="team-division">{team.division}</span>
                  </div>
                </div>
                <button 
                  onClick={() => onAddTeam(team)} 
                  className="add-favorite-btn"
                >
                  Add to Favorites
                </button>
              </li>
            ))}
          </ul>
        ) : (
          searchTerm && <p>No teams found. Try a different search term.</p>
        )}
      </div>
    </div>
  );
}

export default TeamSelector;