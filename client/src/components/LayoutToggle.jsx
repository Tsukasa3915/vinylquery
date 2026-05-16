import React from 'react';

const LayoutToggle = ({ layout, onLayoutChange }) => {
  return (
    <div className="layout-toggle">
      <button
        className={`layout-btn ${layout === 'list' ? 'active' : ''}`}
        onClick={() => onLayoutChange('list')}
        title="リスト表示"
        aria-label="リスト表示"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1" y="2" width="16" height="3" rx="1" fill="currentColor"/>
          <rect x="1" y="7.5" width="16" height="3" rx="1" fill="currentColor"/>
          <rect x="1" y="13" width="16" height="3" rx="1" fill="currentColor"/>
        </svg>
      </button>
      <button
        className={`layout-btn ${layout === 'grid' ? 'active' : ''}`}
        onClick={() => onLayoutChange('grid')}
        title="グリッド表示"
        aria-label="グリッド表示"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1" y="1" width="7" height="7" rx="1" fill="currentColor"/>
          <rect x="10" y="1" width="7" height="7" rx="1" fill="currentColor"/>
          <rect x="1" y="10" width="7" height="7" rx="1" fill="currentColor"/>
          <rect x="10" y="10" width="7" height="7" rx="1" fill="currentColor"/>
        </svg>
      </button>
    </div>
  );
};

export default LayoutToggle;
