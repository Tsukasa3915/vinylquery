import React from 'react';
import ResultCard from './ResultCard';

const ResultList = ({ results, isLoading, hasSearched, layout }) => {
  if (isLoading) {
    return (
      <div className="results-loading">
        <div className="spinner"></div>
        <p>レコードを探しています...</p>
      </div>
    );
  }

  if (hasSearched && results.length === 0) {
    return (
      <div className="results-empty">
        <span className="empty-icon">🏜️</span>
        <h3>見つかりませんでした</h3>
        <p>別のキーワードやアーティスト名でお試しください。</p>
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="results-welcome">
        <span className="welcome-icon">🎧</span>
        <h3>VinylQueryへようこそ</h3>
        <p>上の検索バーから、あなたのお気に入りのレコードを探しましょう。</p>
      </div>
    );
  }

  const gridClass = layout === 'list' ? 'results-list' : 'results-grid';

  return (
    <div className={gridClass}>
      {results.map((release, index) => (
        <ResultCard key={`${release.id}-${index}`} release={release} layout={layout} />
      ))}
    </div>
  );
};

export default ResultList;
