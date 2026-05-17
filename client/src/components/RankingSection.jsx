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
    <div className="ranking-section">
      <h2 className="text-xl font-bold text-white mb-6 tracking-tight flex items-center gap-2">
        <span>🏆</span> {title}
      </h2>
      <div className={layout === 'list' ? 'flex flex-col gap-4' : 'grid grid-cols-2 gap-4'}>
        {ranking.map((item, index) => (
          <div key={item.id} className="relative group">
            {/* シックなランキング順位バッジ */}
            <div className="absolute top-2 left-2 z-10 bg-black/80 backdrop-blur text-white text-[10px] px-1.5 py-0.5 rounded font-bold border border-white/10 shadow-md">
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
