import React from 'react';

const SearchModeToggle = ({ mode, setMode }) => {
  return (
    <div className="search-mode-toggle">
      <button
        className={`mode-btn ${mode === 'artist' ? 'active' : ''}`}
        onClick={() => setMode('artist')}
      >
        <span className="icon">🎤</span> アーティストから探す(推奨)
      </button>
      <button
        className={`mode-btn ${mode === 'freeword' ? 'active' : ''}`}
        onClick={() => setMode('freeword')}
      >
        <span className="icon">🔎</span> フリーワードで探す
      </button>
    </div>
  );
};

export default SearchModeToggle;
