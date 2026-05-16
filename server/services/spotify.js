/**
 * Spotify Web API 連携サービス
 *
 * Client Credentials Flow を使用してアクセストークンを取得し、
 * 高解像度のアルバムアートワークを検索・取得します。
 */

let accessToken = null;
let tokenExpirationTime = null;

/**
 * Spotify API のアクセストークンを取得する（有効期限内なら再利用）
 */
async function getAccessToken() {
  // トークンが有効ならそのまま返す
  if (accessToken && tokenExpirationTime && Date.now() < tokenExpirationTime) {
    return accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify API credentials are not set in .env');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Failed to get Spotify access token: ${response.statusText}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  // 余裕を持って有効期限の5分前に失効扱いにする
  tokenExpirationTime = Date.now() + (data.expires_in - 300) * 1000;

  return accessToken;
}

/**
 * Spotify API からアルバムアートワークの高画質URLを取得する
 * 
 * @param {string} artist - アーティスト名
 * @param {string} title - アルバムタイトル
 * @returns {Promise<string|null>} 高画質画像URL（見つからない場合はnull）
 */
async function getHighResImage(artist, title) {
  try {
    const token = await getAccessToken();

    // 検索精度の向上のため、不要なカッコや注釈を除外する
    const cleanTitle = title.replace(/\s*[\[\(].*?[\]\)]\s*/g, ' ').trim();
    const cleanArtist = artist.replace(/\s*[\[\(].*?[\]\)]\s*/g, ' ').trim();

    // 1. まず「アルバム名 + アーティスト名」で厳格に検索
    let query = encodeURIComponent(`album:${cleanTitle} artist:${cleanArtist}`);
    let url = `https://api.spotify.com/v1/search?q=${query}&type=album&limit=1`;

    let response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    let data = await response.json();

    // 2. ヒットしなかった場合、またはエラーの場合、単純なキーワード検索でフォールバック
    if (!response.ok || !data.albums || data.albums.items.length === 0) {
      query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);
      url = `https://api.spotify.com/v1/search?q=${query}&type=album&limit=1`;
      
      response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      data = await response.json();
    }

    if (response.ok && data.albums && data.albums.items.length > 0) {
      const album = data.albums.items[0];
      if (album.images && album.images.length > 0) {
        // Spotifyの画像配列は通常 [大(640x640), 中(300x300), 小(64x64)] の順
        return album.images[0].url;
      }
    }

    return null;
  } catch (error) {
    console.warn(`[Spotify API] Failed to fetch image for "${title} - ${artist}":`, error.message);
    return null;
  }
}

module.exports = {
  getHighResImage,
};
