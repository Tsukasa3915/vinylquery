import React, { useState } from 'react';
import { useSearch } from '../hooks/useSearch';
import SearchModeToggle from '../components/SearchModeToggle';
import SearchBar from '../components/SearchBar';
import SortDropdown from '../components/SortDropdown';
import LayoutToggle from '../components/LayoutToggle';
import ResultList from '../components/ResultList';

const Home = () => {
  const {
    query,
    setQuery,
    mode,
    setMode,
    results,
    originalResultsCount,
    artistInfo,
    isLoading,
    error,
    sortOption,
    setSortOption,
    handleSearch
  } = useSearch();

  // sessionStorageから初期値を取得
  const getInitialState = (key, defaultValue) => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return defaultValue;
  };

  const [hasSearched, setHasSearched] = React.useState(() => getInitialState('vq_hasSearched', false));
  const [layout, setLayout] = React.useState(() => getInitialState('vq_layout', 'grid')); // 'grid' or 'list'

  React.useEffect(() => {
    sessionStorage.setItem('vq_hasSearched', JSON.stringify(hasSearched));
  }, [hasSearched]);

  React.useEffect(() => {
    sessionStorage.setItem('vq_layout', JSON.stringify(layout));
  }, [layout]);

  const onSearch = () => {
    if (query.trim()) {
      setHasSearched(true);
      handleSearch(query, mode);
    }
  };

  return (
    <div className="page-container">
      <header className="header">
        <div className="header-content">
          <div className="logo-container">
            <h1 className="logo-text">
              <span className="logo-icon">📀</span> VinylQuery
            </h1>
          </div>
          
          <div className="search-section">
            <SearchModeToggle mode={mode} setMode={setMode} />
            <SearchBar 
              query={query} 
              setQuery={setQuery} 
              onSearch={onSearch} 
              mode={mode} 
              isLoading={isLoading} 
            />
            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
      </header>

      <main className="main-content">
        {hasSearched && !isLoading && !error && (
          <div className="results-header">
            <div className="results-summary">
              {mode === 'artist' && artistInfo && (
                <div className="artist-badge">
                  {artistInfo.thumb && (
                    <img src={artistInfo.thumb} alt={artistInfo.name} className="artist-thumb" />
                  )}
                  <span>{artistInfo.name} の公式レコード</span>
                </div>
              )}
              <h2>
                {originalResultsCount > 0 
                  ? `${originalResultsCount}件のレコードが見つかりました` 
                  : ''}
              </h2>
            </div>
            
            {results.length > 0 && (
              <div className="results-controls">
                <LayoutToggle layout={layout} onLayoutChange={setLayout} />
                <SortDropdown sortOption={sortOption} setSortOption={setSortOption} />
              </div>
            )}
          </div>
        )}

        <ResultList 
          results={results} 
          isLoading={isLoading} 
          hasSearched={hasSearched}
          layout={layout}
        />
      </main>
    </div>
  );
};

export default Home;
