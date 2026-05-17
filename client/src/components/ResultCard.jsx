import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const PlaceholderImage = ({ title, artist }) => {
  // Generate a consistent color based on title
  const hash = (title || 'record').split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const hue = Math.abs(hash) % 360;

  return (
    <div className="placeholder-image">
      <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id={`bg-${hash}`} cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor={`hsl(${hue}, 25%, 22%)`} />
            <stop offset="100%" stopColor={`hsl(${hue}, 15%, 12%)`} />
          </radialGradient>
          <radialGradient id={`vinyl-${hash}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`hsl(${hue}, 30%, 18%)`} />
            <stop offset="30%" stopColor="#1a1a1f" />
            <stop offset="100%" stopColor="#0f0f13" />
          </radialGradient>
        </defs>
        {/* Background */}
        <rect width="300" height="300" fill={`url(#bg-${hash})`} />
        
        {/* Vinyl record */}
        <circle cx="150" cy="150" r="120" fill={`url(#vinyl-${hash})`} opacity="0.8" />
        
        {/* Grooves */}
        {[100, 85, 70, 55].map((r, i) => (
          <circle
            key={i}
            cx="150"
            cy="150"
            r={r}
            fill="none"
            stroke={`hsl(${hue}, 10%, ${16 + i * 2}%)`}
            strokeWidth="0.5"
            opacity="0.5"
          />
        ))}
        
        {/* Center label */}
        <circle cx="150" cy="150" r="35" fill={`hsl(${hue}, 40%, 30%)`} />
        <circle cx="150" cy="150" r="32" fill={`hsl(${hue}, 35%, 25%)`} />
        <circle cx="150" cy="150" r="5" fill="#0f0f13" />
        
        {/* Title text on label */}
        <text
          x="150"
          y="144"
          textAnchor="middle"
          fill={`hsl(${hue}, 20%, 60%)`}
          fontSize="7"
          fontFamily="'Noto Sans JP', sans-serif"
          fontWeight="500"
        >
          {(title || '').length > 16 ? (title || '').substring(0, 16) + '…' : title}
        </text>
        <text
          x="150"
          y="158"
          textAnchor="middle"
          fill={`hsl(${hue}, 15%, 45%)`}
          fontSize="5.5"
          fontFamily="'Noto Sans JP', sans-serif"
        >
          {(artist || '').length > 20 ? (artist || '').substring(0, 20) + '…' : artist}
        </text>

        {/* Shine effect */}
        <ellipse
          cx="115"
          cy="110"
          rx="60"
          ry="45"
          fill="white"
          opacity="0.03"
          transform="rotate(-30, 115, 110)"
        />
      </svg>
    </div>
  );
};

const ResultCard = ({ release, index, layout, hideLabel = false }) => {
  const [highResImage, setHighResImage] = useState(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          if (!hasFetched) {
            setHasFetched(true);
            fetchHighResImage();
          }
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [hasFetched, release]);

  const fetchHighResImage = async (retryCount = 0) => {
    try {
      const releaseId = release.id;
      // 検索結果がマスターかリリースかを判別
      const releaseType = release.type === 'release' || release.uri?.includes('/release/') ? 'release' : 'master';
      
      if (!releaseId) return;

      // 初回リクエスト時はアクセスを分散させるため、0.2〜2秒のランダムな遅延を入れる
      if (retryCount === 0) {
        const jitter = Math.floor(Math.random() * 1800) + 200;
        await new Promise(resolve => setTimeout(resolve, jitter));
      }

      const res = await fetch(`/api/search/image?id=${releaseId}&type=${releaseType}`);
      
      if (res.status === 429 && retryCount < 3) {
        // Too Many Requestsの場合、指定秒数またはランダム秒数待ってからリトライ
        const data = await res.json().catch(() => ({}));
        const retryAfterMs = (data.retryAfter * 1000) || (3000 + Math.random() * 2000);
        setTimeout(() => fetchHighResImage(retryCount + 1), retryAfterMs);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl && data.imageUrl !== release.cover_image) {
          const img = new Image();
          img.src = data.imageUrl;
          img.onload = () => {
            setHighResImage(data.imageUrl);
            setIsImageLoaded(true);
          };
        }
      }
    } catch (e) {
      console.warn('Failed to fetch high-res image', e);
    }
  };

  const displayImage = highResImage || release.cover_image;
  const cardClass = `result-card ${layout === 'list' ? 'list-view' : ''} ${isVisible ? 'is-visible' : ''}`;

  return (
    <div className={cardClass} ref={cardRef}>
      <Link 
        to={`/release/${release.id}?type=${release.uri ? 'release' : 'master'}`} 
        className="card-link"
        state={{ release }}
      >
        <div className="card-image-wrapper">
          {displayImage ? (
            <img 
              src={displayImage} 
              alt={`${release.title} — ${release.artist}`} 
              className={`card-image ${highResImage && isImageLoaded ? 'high-res-loaded' : ''}`}
              loading="lazy"
            />
          ) : (
            <PlaceholderImage title={release.title} artist={release.artist} />
          )}

          <div className="format-badge">{release.format || 'Vinyl'}</div>
        </div>
        <div className="card-content">
          <h3 className="card-title" title={release.title}>{release.title}</h3>
          <p className="card-artist" title={release.artist}>{release.artist}</p>
          
          <div className="card-meta">
            {release.year && (
              <span className="meta-item year">
                {release.year}
              </span>
            )}
            {!hideLabel && release.label && (
              <span className="meta-item label" title={Array.isArray(release.label) ? release.label.join(', ') : release.label}>
                <span className="icon">🏷️</span> {Array.isArray(release.label) ? release.label[0] : release.label.split(',')[0]}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* 狭いカラム表示時に、マウスオーバーでふわっと浮かび上がる情報ポップアップ */}
      {layout === 'list' && (
        <div className="hover-preview-card">
          {displayImage ? (
            <img src={displayImage} alt="" className="hover-preview-image" />
          ) : (
            <div className="hover-preview-image-placeholder">No Image</div>
          )}
          <div className="hover-preview-title">{release.title}</div>
          <div className="hover-preview-meta">
            <span className="hover-preview-artist">{release.artist}</span>
            {release.year && <span className="hover-preview-year"> ({release.year})</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultCard;
