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
    <div className="page-container pb-20 md:pb-6">
      {/* 
        大画面(PC)では2カラム並列表示、モバイル(SP)ではタブに応じて切り替えるハイブリッドレイアウト
      */}
      <div className="flex flex-col md:flex-row gap-8 items-start w-full mt-4 md:mt-8">
        
        {/* =============================================
           1. ランキングエリア (左側)
           ============================================= */}
        {/* 
          PC: 常時左側に表示 (1/3幅)
          SP: 'home' タブの時のみ全幅で表示
        */}
        <div className={`w-full md:w-1/3 shrink-0 ${activeTab === 'home' ? 'block' : 'hidden md:block'}`}>
          <div className="bg-black/30 backdrop-blur-md border border-white/5 rounded-3xl p-6 shadow-2xl">
            <RankingSection title="注目のアナログレコード" layout="list" />
          </div>
        </div>

        {/* =============================================
           2. 検索＆結果エリア (右側)
           ============================================= */}
        {/* 
          PC: 常時右側に表示 (2/3幅)
          SP: 'search' タブの時のみ表示
        */}
        <div className={`flex-1 w-full md:w-2/3 ${activeTab === 'search' ? 'block' : 'hidden md:block'}`}>
          <div className="flex flex-col gap-6">
            
            {/* ヘッダー＆検索入力 */}
            <header className="header bg-black/20 backdrop-blur-sm border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl">
              <div className="header-content flex flex-col gap-6">
                <div className="logo-container w-full flex items-center justify-between">
                  <h1 className="logo-text text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span className="logo-icon text-primary animate-pulse-slow">💿</span> VinylQuery
                  </h1>
                </div>
                
                <div className="search-section w-full">
                  <SearchModeToggle mode={mode} setMode={setMode} />
                  <SearchBar 
                    query={query} 
                    setQuery={setQuery} 
                    onSearch={onSearch} 
                    mode={mode} 
                    isLoading={isLoading} 
                  />
                  {error && <div className="error-message mt-2">{error}</div>}
                </div>
              </div>
            </header>

            {/* 検索結果 */}
            <main className="main-content bg-black/10 rounded-3xl p-6 border border-white/5 shadow-lg min-h-[400px]">
              {hasSearched && !isLoading && !error && (
                <div className="results-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div className="results-summary">
                    {mode === 'artist' && artistInfo && (
                      <div className="artist-badge flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 text-sm">
                        {artistInfo.thumb && (
                          <img src={artistInfo.thumb} alt={artistInfo.name} className="artist-thumb w-6 h-6 rounded-full object-cover" />
                        )}
                        <span className="font-bold text-white">{artistInfo.name} の公式レコード</span>
                      </div>
                    )}
                    <h2 className="text-base text-gray-400 mt-2">
                      {originalResultsCount > 0 
                        ? `${originalResultsCount}件のレコードが見つかりました` 
                        : ''}
                    </h2>
                  </div>
                  
                  {results.length > 0 && (
                    <div className="results-controls flex items-center gap-4">
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

      </div>

      {/* モバイル用ボトムナビゲーション */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default Home;
