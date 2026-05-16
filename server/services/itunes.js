/**
 * iTunes Search API 通信サービス
 *
 * アーティスト名とタイトルから高解像度のアルバムカバー画像を取得する。
 */

/**
 * iTunes Search API を使用してリリース一覧の画像を高解像度に差し替える
 *
 * @param {Array} releases - normalizeRelease済みのリリース配列
 * @returns {Promise<Array>} 高解像度画像付きリリース配列
 */
async function enrichReleasesWithImages(releases) {
  if (!releases || releases.length === 0) return releases;

  console.log(`[iTunes] ${releases.length}件の画像取得を開始します...`);

  // レートリミット対策としてチャンクサイズを5に縮小
  const chunkSize = 5;
  const enriched = [...releases];
  
  let rateLimitHit = false;

  for (let i = 0; i < enriched.length; i += chunkSize) {
    const chunk = enriched.slice(i, i + chunkSize);
    const promises = chunk.map(async (release) => {
      // 既にレートリミットに到達している場合、または必須データがない場合はスキップ
      if (rateLimitHit || !release.artist || !release.title) return release;

      try {
        const cleanTitle = release.title.replace(/\s*[\[\(].*?[\]\)]\s*/g, ' ').trim();
        const cleanArtist = release.artist.replace(/\s*[\[\(].*?[\]\)]\s*/g, ' ').trim();

        const query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);
        const url = `https://itunes.apple.com/search?term=${query}&entity=album&limit=1`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        let response;
        try {
          response = await fetch(url, { signal: controller.signal });
        } finally {
          clearTimeout(timeoutId);
        }

        if (response.status === 403 || response.status === 429) {
          rateLimitHit = true;
          throw new Error(`iTunes API Rate Limit (${response.status})`);
        }

        if (!response.ok) {
          throw new Error(`iTunes API Error: ${response.status}`);
        }

        let data = await response.json();

        // 検索結果が0件の場合、タイトルのみで再検索（リトライ）を試みる
        if ((!data.results || data.results.length === 0) && cleanTitle.length > 2 && !rateLimitHit) {
          const fallbackQuery = encodeURIComponent(cleanTitle);
          const fallbackUrl = `https://itunes.apple.com/search?term=${fallbackQuery}&entity=album&limit=1`;
          
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 1500);
          try {
            const retryRes = await fetch(fallbackUrl, { signal: retryController.signal });
            if (retryRes.status === 403 || retryRes.status === 429) {
              rateLimitHit = true;
            } else if (retryRes.ok) {
              data = await retryRes.json();
            }
          } catch (retryErr) {
            // リトライエラー時は無視
          } finally {
            clearTimeout(retryTimeoutId);
          }
        }

        if (data.results && data.results.length > 0) {
          const hiResImage = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
          release.cover_image = hiResImage;
          release.thumb = hiResImage;
        }
      } catch (err) {
        console.log(`[iTunes] ID ${release.id} 画像取得スキップ: ${err.message}`);
      }
      return release;
    });

    await Promise.all(promises);

    // レートリミット到達時は以降のチャンク処理を中断（画像はDiscogsのまま）
    if (rateLimitHit) {
      console.log(`[iTunes] レートリミット到達のため、残りの画像取得をスキップします`);
      break;
    }

    // レートリミット対策でチャンク間にウェイトを設ける (500ms)
    if (i + chunkSize < enriched.length) {
      await new Promise(res => setTimeout(res, 500));
    }
  }

  console.log(`[iTunes] 画像取得処理完了 (取得対象: ${releases.length}件)`);
  return enriched;
}

module.exports = {
  enrichReleasesWithImages,
};
