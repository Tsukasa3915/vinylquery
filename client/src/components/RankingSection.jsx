import React, { useEffect, useState } from 'react';
import ResultCard from './ResultCard';

const RankingSection = ({ title = "ランキング", layout = "list", onSwapLayout, isReversed }) => {
  const [ranking, setRanking] = useState([]);
  const [period, setPeriod] = useState('day'); // 'day' | 'week' | 'month'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/ranking?period=${period}`);
        const data = await res.json();
        setRanking(data.results || []);
      } catch (e) {
        console.error('Failed to fetch ranking', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRanking();
  }, [period]);

  return (
    <div className="ranking-container">
      <h2 className="ranking-title">
        <span>🏆</span> {title}
        {onSwapLayout && (
          <button 
            className="swap-layout-btn"
            onClick={onSwapLayout}
            title="左右レイアウトを入れ替える"
            aria-label="Swap Layout"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '16px', height: '16px'}}>
              <path d="M8 7h12m0 0l-4-4m4 4l-4 4m-8 6H4m0 0l4 4m-4-4l4-4"/>
            </svg>
          </button>
        )}
      </h2>

      {/* Spotify風のシックな期間切り替えタブ */}
      <div className="ranking-tabs">
        <button 
          className={`ranking-tab ${period === 'day' ? 'active' : ''}`}
          onClick={() => setPeriod('day')}
        >
          デイリー
        </button>
        <button 
          className={`ranking-tab ${period === 'week' ? 'active' : ''}`}
          onClick={() => setPeriod('week')}
        >
          ウィークリー
        </button>
        <button 
          className={`ranking-tab ${period === 'month' ? 'active' : ''}`}
          onClick={() => setPeriod('month')}
        >
          マンスリー
        </button>
      </div>

      {isLoading ? (
        <div className="ranking-loader-container">
          <div className="ranking-loader"></div>
        </div>
      ) : (
        <div className="ranking-list">
          {ranking.map((item, index) => (
            <div key={item.id} className="ranking-item-wrapper">
              <div className="ranking-badge">
                #{index + 1}
              </div>
              <ResultCard release={item} layout={layout} index={index} hideLabel={true} hideFormat={true} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RankingSection;
