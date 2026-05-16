function checkTowerRecords(query) {
  const url = `https://tower.jp/search/item/${encodeURIComponent(query)}`;
  return { available: true, url };
}

function checkHMV(query) {
  const url = `https://www.hmv.co.jp/search/keyword_${encodeURIComponent(query)}/target_MUSIC/type_sr/`;
  return { available: true, url };
}

async function checkAllStores(artist, title) {
  // 検索クエリからカッコなどの余分な情報を消す
  const cleanTitle = title.replace(/\s*[\[\(].*?[\]\)]\s*/g, ' ').trim();
  const cleanArtist = artist.replace(/\s*[\[\(].*?[\]\)]\s*/g, ' ').replace(/\*/g, '').trim();
  
  const query = `${cleanArtist} ${cleanTitle}`;
  
  return {
    tower: checkTowerRecords(query),
    hmv: checkHMV(query)
  };
}

module.exports = {
  checkAllStores
};
