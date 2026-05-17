import React, { useState, useEffect } from 'react';
import { useSearch } from '../hooks/useSearch';
import SearchModeToggle from '../components/SearchModeToggle';
import SearchBar from '../components/SearchBar';
import SortDropdown from '../components/SortDropdown';
import LayoutToggle from '../components/LayoutToggle';
import ResultList from '../components/ResultList';
import RankingSection from '../components/RankingSection';
import BottomNav from '../components/BottomNav';

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

  const [hasSearched, setHasSearched] = useState(() => getInitialState('vq_hasSearched', false));
  const [layout, setLayout] = useState(() => getInitialState('vq_layout', 'grid')); // 'grid' or 'list'
  const [activeTab, setActiveTab] = useState('home'); // 'home' or 'search' (SP専用)

  useEffect(() => {
    sessionStorage.setItem('vq_hasSearched', JSON.stringify(hasSearched));
  }, [hasSearched]);

  useEffect(() => {
    sessionStorage.setItem('vq_layout', JSON.stringify(layout));
  }, [layout]);

  const onSearch = () => {
    if (query.trim()) {
      setHasSearched(true);
      handleSearch(query, mode);
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: '90px' }}>
      {/* 
        大画面(PC)では2カラム並列表示、モバイル(SP)ではタブに応じて切り替えるハイブリッドレイアウト
      */}
      <div className="home-layout-container">
        
        {/* =============================================
           1. ランキングエリア (左側)
           ============================================= */}
        <div className={`home-sidebar ${activeTab === 'home' ? 'active-mobile-tab' : 'hidden-mobile-tab'}`}>
          <RankingSection title="注目のアナログレコード" layout="list" />
        </div>

        {/* =============================================
           2. 検索＆結果エリア (右側)
           ============================================= */}
        <div className={`home-main ${activeTab === 'search' ? 'active-mobile-tab' : 'hidden-mobile-tab'}`}>
          
          {/* ヘッダー＆検索入力 */}
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

          {/* 検索結果 */}
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

      </div>

      {/* モバイル用ボトムナビゲーション */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default Home;
