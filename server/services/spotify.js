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
    let url = `https://api.spotify.com/v1/search?q=${query}&type=album&limit=20`;

    let response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    let data = await response.json();

    // 2. ヒットしなかった場合、またはエラーの場合、単純なキーワード検索でフォールバック
    if (!response.ok || !data.albums || data.albums.items.length === 0) {
      query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);
      url = `https://api.spotify.com/v1/search?q=${query}&type=album&limit=20`;
      
      response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      data = await response.json();
    }

    if (response.ok && data.albums && data.albums.items.length > 0) {
      const items = data.albums.items;
      let bestAlbum = null;
      let highestScore = -1;

      // 除外するノイズキーワード
      const noiseWords = ['カラオケ', 'karaoke', 'オルゴール', 'music box', 'カバー', 'cover', 'tribute', 'トリビュート', 'instrumental', 'インスト', 'remix', 'リミックス'];

      for (const album of items) {
        let score = 0;
        const albumName = album.name.toLowerCase();
        const artistNames = album.artists.map(a => a.name.toLowerCase());
        const queryArtist = cleanArtist.toLowerCase();

        // 1. ノイズチェック（強制除外）
        const isNoise = noiseWords.some(word => 
          albumName.includes(word) || artistNames.some(a => a.includes(word))
        );
        if (isNoise) continue; // ノイズが含まれる場合はスキップ

        // 2. アーティスト名の一致（非常に重要）
        const isArtistMatch = artistNames.includes(queryArtist) || 
                              artistNames.some(a => a.includes(queryArtist) || queryArtist.includes(a));
        
        if (isArtistMatch) {
          score += 100; // 本人の作品であれば超高得点
        } else {
          // Various Artists などの場合
          if (artistNames.includes('various artists')) {
            score -= 50;
          } else {
            score -= 10;
          }
        }

        // 3. アルバムタイプの優先度
        if (album.album_type === 'album') score += 20;
        if (album.album_type === 'single') score += 10;
        if (album.album_type === 'compilation') score -= 30; // オムニバスは優先度を下げる

        // 最もスコアが高いものを記録
        if (score > highestScore) {
          highestScore = score;
          bestAlbum = album;
        }
      }

      // もし全ての候補がノイズで除外されてしまった場合は、最初の結果をフォールバック採用
      const finalAlbum = bestAlbum || items[0];

      if (finalAlbum && finalAlbum.images && finalAlbum.images.length > 0) {
        // 画像配列の中から最も解像度が高い（widthが最大）ものを取得する
        const largestImage = finalAlbum.images.reduce((prev, current) => {
          return (prev.width > current.width) ? prev : current;
        });
        return largestImage.url;
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
