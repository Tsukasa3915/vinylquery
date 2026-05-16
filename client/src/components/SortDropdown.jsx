import React from 'react';

const SortDropdown = ({ sortOption, setSortOption }) => {
  return (
    <div className="sort-dropdown">
      <label htmlFor="sort-select">並び替え:</label>
      <div className="select-wrapper">
        <select
          id="sort-select"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
        >
          <option value="recommended">おすすめ順</option>
          <option value="newest">新しい順</option>
          <option value="oldest">古い順</option>
        </select>
      </div>
    </div>
  );
};

export default SortDropdown;
