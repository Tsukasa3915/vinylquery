import React, { useEffect, useState } from 'react';
import ResultCard from './ResultCard';

const RankingSection = ({ title = "注目のアナログレコード", layout = "list" }) => {
  const [ranking, setRanking] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const res = await fetch('/api/ranking');
        const data = await res.json();
        setRanking(data.results || []);
      } catch (e) {
        console.error('Failed to fetch ranking', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRanking();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="ranking-container">
      <h2 className="ranking-title">
        <span>🏆</span> {title}
      </h2>
      <div className="ranking-list">
        {ranking.map((item, index) => (
          <div key={item.id} className="ranking-item-wrapper">
            <div className="ranking-badge">
              #{index + 1}
            </div>
            <ResultCard release={item} layout={layout} index={index} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RankingSection;
