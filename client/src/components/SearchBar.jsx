import React, { useRef, useEffect } from 'react';

const SearchBar = ({ query, setQuery, onSearch, mode, isLoading }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus the input when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;
    onSearch();
  };

  const placeholder = mode === 'artist'
    ? "例: 星野源, Nujabes, The Beatles..."
    : "例: Yellow Dancer, Cowboy Bebop Soundtrack...";

  return (
    <div className="search-bar-container">
      <form onSubmit={handleSubmit} className={`search-form ${isLoading ? 'loading' : ''}`}>
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          {query && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <button
          type="submit"
          className="search-submit-btn"
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? <span className="loader"></span> : '検索'}
        </button>
      </form>
    </div>
  );
};

export default SearchBar;
