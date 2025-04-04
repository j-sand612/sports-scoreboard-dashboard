// components/TeamSelector.js
import React, { useState } from 'react';

function TeamSelector({ onAddTeam }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState('all');

  const leagues = [
    { id: 'all', name: 'All Leagues' },
    { id: 'NBA', name: 'NBA Basketball' },
    { id: 'MLB', name: 'MLB Baseball' },
    { id: 'NFL', name: 'NFL Football' },
    { id: 'NHL', name: 'NHL Hockey' },
    { id: 'EPL', name: 'English Premier League' }
  ];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}&league=${selectedLeague}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching teams:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="team-selector">
      <h3>Find Teams</h3>
      <form onSubmit={handleSearch}>
        <select 
          value={selectedLeague}
          onChange={(e) => setSelectedLeague(e.target.value)}
        >
          {leagues.map(league => (
            <option key={league.id} value={league.id}>
              {league.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search for teams..."
        />
        <button type="submit">Search</button>
      </form>
      
      {loading ? (
        <p>Searching...</p>
      ) : (
        <div className="search-results">
          {searchResults.length > 0 ? (
            <ul>
              {searchResults.map(team => (
                <li key={team.id}>
                  {team.name} ({team.league})
                  <button onClick={() => onAddTeam(team)}>Add to Favorites</button>
                </li>
              ))}
            </ul>
          ) : (
            searchTerm && <p>No teams found. Try a different search term.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default TeamSelector;
