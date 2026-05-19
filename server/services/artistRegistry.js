/**
 * アーティスト登録情報レジストリ
 *
 * `server/data/artists.json` から主要なアーティスト情報を読み込み、
 * IDマッピング（ARTIST_ID_MAP）と日本語表示用逆引きマップ（REVERSE_ARTIST_MAP）を動的に構築する。
 */
const path = require('path');
const fs = require('fs');

// JSONファイルのロード
let artistsList = [];
try {
  const filePath = path.join(__dirname, '../data/artists.json');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  artistsList = JSON.parse(fileContent);
} catch (error) {
  console.error('[ArtistRegistry] Failed to load artists.json:', error.message);
}

// レジストリマップの動的構築
const ARTIST_ID_MAP = {};
const REVERSE_ARTIST_MAP = {};

artistsList.forEach((artist) => {
  // 1. 各検索ワード（表記揺れ）からID・名前情報へマッピング
  if (artist.searchTerms) {
    artist.searchTerms.forEach((term) => {
      const normalized = term.toLowerCase().trim();
      ARTIST_ID_MAP[normalized] = {
        id: artist.id,
        name: artist.englishName
      };
    });
  }

  // 2. 英語名（小文字）から日本語名へマッピング
  if (artist.englishName) {
    const normEnglish = artist.englishName.toLowerCase().trim();
    REVERSE_ARTIST_MAP[normEnglish] = artist.japaneseName;
  }
});

function cleanArtistName(name) {
  if (!name) return '';
  // 1. 後ろのアスタリスク（*）を除去
  // 2. 「 (2)」などの連番を除去
  let cleaned = name.replace(/\*+$/, '').replace(/\s*\(\d+\)$/, '').trim();
  const norm = cleaned.toLowerCase();
  if (REVERSE_ARTIST_MAP[norm]) {
    return REVERSE_ARTIST_MAP[norm];
  }
  return cleaned;
}

module.exports = {
  ARTIST_ID_MAP,
  REVERSE_ARTIST_MAP,
  cleanArtistName,
  artistsList
};
