import React, { useRef, useEffect, useState } from 'react';

const SearchBar = ({ query, setQuery, onSearch, mode, isLoading }) => {
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    // Focus the input when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // 非同期の自動サジェスト取得 (200msデバウンス)
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (err) {
        console.error('[SearchBar] Failed to fetch suggestions:', err);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // クリックアウトサイド検知でサジェスト一覧を閉じる
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;
    setShowSuggestions(false);
    onSearch();
  };

  const handleSuggestionClick = (name) => {
    setQuery(name);
    setShowSuggestions(false);
    onSearch(name); // 即時検索を実行
  };

  const placeholder = mode === 'artist' 
    ? "例: 星野源, Nujabes, The Beatles..." 
    : "例: Yellow Dancer, Cowboy Bebop Soundtrack...";

  return (
    <div className="search-bar-container" ref={containerRef}>
      <form onSubmit={handleSubmit} className={`search-form ${isLoading ? 'loading' : ''}`}>
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            disabled={isLoading}
            autoComplete="off"
          />
          {query && (
            <button 
              type="button" 
              className="clear-btn" 
              onClick={() => {
                setQuery('');
                setSuggestions([]);
              }}
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

      {/* 自動サジェストのドロップダウン */}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="suggestions-dropdown">
          {suggestions.map((suggestion) => (
            <li 
              key={suggestion.id} 
              className="suggestion-item"
              onClick={() => handleSuggestionClick(suggestion.name)}
            >
              <span className="suggestion-icon">🔍</span>
              <div className="suggestion-text">
                <span className="suggestion-name">{suggestion.name}</span>
                {suggestion.englishName && suggestion.englishName.toLowerCase() !== suggestion.name.toLowerCase() && (
                  <span className="suggestion-english">{suggestion.englishName}</span>
                )}
              </div>
              <span className="suggestion-badge">アーティスト</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
