import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';

const ReleaseDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const type = searchParams.get('type') || 'master';
  
  // 一覧から渡された基本的な情報（あれば）
  const initialRelease = location.state?.release || null;
  
  const [release, setRelease] = useState(initialRelease);
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(!initialRelease);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stockInfo, setStockInfo] = useState(null);
  const [isStockLoading, setIsStockLoading] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/search/release/${id}?type=${type}`);
        if (!res.ok) throw new Error('詳細情報の取得に失敗しました');
        const data = await res.json();
        setDetails(data);
        
        const primaryImage = data.images?.find(img => img.type === 'primary') || data.images?.[0];
        const artistName = data.artists?.[0]?.name || 'Unknown Artist';
        const titleName = data.title;
        
        if (!release) {
          setRelease({
            id: data.id,
            title: titleName,
            artist: artistName,
            year: data.year,
            cover_image: primaryImage?.uri || '',
            label: data.labels?.[0]?.name || '',
          });
        }
        
        // 在庫状況の取得（非同期で並行実行）
        const fetchStock = async () => {
          setIsStockLoading(true);
          try {
            const stockRes = await fetch(`/api/search/stock?artist=${encodeURIComponent(artistName)}&title=${encodeURIComponent(titleName)}`);
            if (stockRes.ok) {
              const stockData = await stockRes.json();
              setStockInfo(stockData);
            }
          } catch (e) {
            console.error('Stock fetch error', e);
          } finally {
            setIsStockLoading(false);
          }
        };
        fetchStock();

      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
        // 少し遅れて再生アニメーションを開始する
        setTimeout(() => setIsPlaying(true), 500);
      }
    };

    fetchDetails();
  }, [id, type]);

  if (error) {
    return (
      <div className="page-container detail-page error">
        <h2>エラーが発生しました</h2>
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className="back-btn">← 戻る</button>
      </div>
    );
  }

  return (
    <div className="page-container detail-page">
      <header className="header detail-header">
        <button onClick={() => navigate(-1)} className="back-btn">← 検索結果に戻る</button>
        <h1 className="logo-text">
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            <span className="logo-icon">📀</span> VinylQuery
          </Link>
        </h1>
      </header>

      <main className="detail-content">
        <div className="detail-hero">
          <div className={`record-player ${isPlaying ? 'playing' : ''}`}>
            <div className="record-sleeve">
              {release?.cover_image ? (
                <img src={release.cover_image} alt={release.title} className="sleeve-image" />
              ) : (
                <div className="sleeve-placeholder">No Image</div>
              )}
            </div>
            <div className="record-disc">
              <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
                <circle cx="150" cy="150" r="148" fill="#111" stroke="#222" strokeWidth="2"/>
                {/* Grooves */}
                {[130, 115, 100, 85, 70, 55].map((r, i) => (
                  <circle key={i} cx="150" cy="150" r={r} fill="none" stroke="#222" strokeWidth="1.5" />
                ))}
                {/* Center Label */}
                <circle cx="150" cy="150" r="45" fill="#E94560" />
                <circle cx="150" cy="150" r="40" fill="#d83a54" />
                <circle cx="150" cy="150" r="5" fill="#111" />
                <text x="150" y="145" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
                  {release?.title?.substring(0, 15)}
                </text>
              </svg>
            </div>
          </div>
          
          <div className="detail-info">
            <h1 className="detail-title">{release?.title || 'Loading...'}</h1>
            <h2 className="detail-artist">{release?.artist}</h2>
            
            <div className="detail-meta">
              {release?.year && <span className="meta-tag">{release.year}</span>}
              {release?.label && <span className="meta-tag">{release.label}</span>}
              {details?.genres && <span className="meta-tag">{details.genres.join(', ')}</span>}
            </div>

            {/* 店舗リンク（アフィリエイトエリア） */}
            <div className="affiliate-section">
              <h3 className="affiliate-title">ショップで在庫を探す</h3>
              <div className="store-links">
                {isStockLoading ? (
                  <div className="store-loading">在庫状況を確認中...</div>
                ) : (
                  <>
                    {/* Tower Records */}
                    <a 
                      href={stockInfo?.tower?.url || '#'} 
                      target="_blank" rel="noopener noreferrer" 
                      className="store-btn tower"
                    >
                      <span className="store-name">TOWER RECORDS</span>
                      <span className="store-status">検索する</span>
                    </a>

                    {/* HMV */}
                    <a 
                      href={stockInfo?.hmv?.url || '#'} 
                      target="_blank" rel="noopener noreferrer" 
                      className="store-btn hmv"
                    >
                      <span className="store-name">HMV</span>
                      <span className="store-status">検索する</span>
                    </a>
                  </>
                )}
              </div>
            </div>

            {isLoading && <p className="loading-text">詳細情報を読み込み中...</p>}
          </div>
        </div>

        {details?.tracklist && (
          <div className="tracklist-section">
            <h3>Tracklist</h3>
            <ul className="tracklist">
              {details.tracklist.map((track, idx) => (
                <li key={idx} className="track-item">
                  <span className="track-position">{track.position || (idx + 1)}</span>
                  <span className="track-title">{track.title}</span>
                  <span className="track-duration">{track.duration}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReleaseDetail;
