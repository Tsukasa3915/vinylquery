import React from 'react';

const ArtistSelection = ({ candidates, onSelect, isLoading }) => {
  if (isLoading) {
    return (
      <div className="results-loading">
        <div className="spinner"></div>
        <p>アーティスト候補を読み込んでいます...</p>
      </div>
    );
  }

  return (
    <div className="artist-selection-container">
      <div className="selection-header">
        <span className="selection-icon">👥</span>
        <h3>該当するアーティストを選択してください</h3>
        <p>Discogsに登録されている公式アーティスト情報から一致する候補を表示しています。</p>
      </div>

      <div className="artist-candidates-grid">
        {candidates.map((artist) => {
          // 画像がない場合のデフォルト丸型シルエット
          const thumbImage = artist.thumb || artist.cover_image;

          return (
            <button
              key={artist.id}
              className="artist-candidate-card"
              onClick={() => onSelect(artist.id, artist.name, thumbImage)}
            >
              <div className="candidate-avatar-wrapper">
                {thumbImage ? (
                  <img
                    src={thumbImage}
                    alt={artist.name}
                    className="candidate-avatar"
                    loading="lazy"
                  />
                ) : (
                  <div className="candidate-avatar-placeholder">
                    <span>👤</span>
                  </div>
                )}
              </div>
              <div className="candidate-info">
                <h4 className="candidate-name">{artist.name}</h4>
                {artist.englishName && artist.englishName !== artist.name && (
                  <span className="candidate-subname">{artist.englishName}</span>
                )}
                <span className="candidate-badge">公式アーティスト</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ArtistSelection;
