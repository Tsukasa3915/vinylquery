/**
 * Discogs API 通信サービス
 *
 * すべての Discogs API 通信を一元管理する。
 * API トークンの付与とレートリミット対応を担う。
 * Node.js v18+ のビルトイン fetch を使用。
 */

const BASE_URL = 'https://api.discogs.com';
const TOKEN = process.env.DISCOGS_TOKEN;
const USER_AGENT = 'VinylQuery/1.0';

/**
 * Discogs API への汎用 GET リクエスト
 */
async function discogsGet(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);

  // クエリパラメータを付与
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, value);
    }
  });

  // トークン認証
  if (TOKEN) {
    url.searchParams.append('token', TOKEN);
  }

  console.log(`[Discogs] GET ${url.pathname}${url.search.substring(0, 80)}...`);

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    const error = new Error(`Discogs API error: ${response.status} ${response.statusText}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * アーティストを検索する
 * @param {string} query - アーティスト名
 * @returns {Promise<Array>} アーティスト候補リスト
 */
async function searchArtists(query) {
  const data = await discogsGet('/database/search', {
    q: query,
    type: 'artist',
    per_page: 20,
  });
  return data.results || [];
}

/**
 * アーティストの詳細情報を取得する
 * @param {number} artistId
 * @returns {Promise<Object>}
 */
async function getArtistDetails(artistId) {
  return discogsGet(`/artists/${artistId}`);
}

/**
 * アーティストのリリース一覧を取得する（Vinyl のみ）
 * N+1問題を回避するため、一括取得する。
 * @param {number} artistId
 * @param {number} page
 * @param {number} perPage
 * @returns {Promise<Object>}
 */
async function getArtistReleases(artistId, page = 1, perPage = 100) {
  return discogsGet(`/artists/${artistId}/releases`, {
    page,
    per_page: perPage,
    sort: 'year',
    sort_order: 'desc',
  });
}

/**
 * リリース（作品）をキーワードで検索する（Vinyl 限定）
 * @param {string} query - 検索キーワード
 * @param {string} [artist] - アーティスト名（任意の絞り込み）
 * @returns {Promise<Array>}
 */
async function searchReleases(query, artist = '') {
  const params = {
    q: query,
    type: 'release',
    format: 'Vinyl',
    per_page: 50,
  };
  if (artist) {
    params.artist = artist;
  }
  const data = await discogsGet('/database/search', params);
  return data.results || [];
}

/**
 * リリースをキーワード検索（マスターリリース含む）
 * @param {string} query
 * @returns {Promise<Array>}
 */
async function searchReleasesGeneral(query) {
  const data = await discogsGet('/database/search', {
    q: query,
    format: 'Vinyl',
    per_page: 50,
  });
  return data.results || [];
}

/**
 * 個別リリースの詳細を取得する（高解像度画像あり）
 * @param {number} releaseId
 * @returns {Promise<Object>}
 */
async function getReleaseDetails(releaseId) {
  return discogsGet(`/releases/${releaseId}`);
}

/**
 * マスターリリースの詳細を取得する（高解像度画像あり）
 * @param {number} masterId
 * @returns {Promise<Object>}
 */
async function getMasterDetails(masterId) {
  return discogsGet(`/masters/${masterId}`);
}


module.exports = {
  searchArtists,
  getArtistDetails,
  getArtistReleases,
  searchReleases,
  searchReleasesGeneral,
  getReleaseDetails,
  getMasterDetails,
};
