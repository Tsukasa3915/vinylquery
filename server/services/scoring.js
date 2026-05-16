/**
 * スマートソート / スコアリングエンジン
 *
 * 検索結果に独自の関連度スコアを付与し、
 * ユーザーにとって最も関連性の高い順に並び替える。
 */

/**
 * 偽物排除アルゴリズム
 *
 * アーティスト候補リストから「本物」のアーティストを特定する。
 * - 名前に bot, band, tribute 等を含む別名義を減点
 * - ID の若さ（小ささ）を評価（古くから登録 = 本物の可能性が高い）
 * - 「& His Band」等のグループ派生を減点
 *
 * @param {Array} artists - Discogs アーティスト候補リスト
 * @param {string} query - 検索クエリ（オリジナル）
 * @returns {Object|null} 最も本物らしいアーティスト
 */
function findRealArtist(artists, query) {
  if (!artists || artists.length === 0) return null;

  const normalizedQuery = query.toLowerCase().trim();

  // スコアリングキーワード（減点対象）
  const penaltyKeywords = [
    'bot',
    'tribute',
    'cover',
    'karaoke',
    'midi',
    'ringtone',
    'homage',
    'inspired',
    'in the style of',
    'sound-alike',
    'soundalike',
  ];

  // グループ・派生名義を示すパターン（減点対象）
  const groupSuffixPatterns = [
    /&\s*his\s+band/i,
    /&\s*her\s+band/i,
    /&\s*the\s+/i,
    /\s+band$/i,
    /\s+trio$/i,
    /\s+quartet$/i,
    /\s+quintet$/i,
    /\s+orchestra$/i,
    /\s+ensemble$/i,
    /\s+feat\.\s/i,
    /\s+featuring\s/i,
    /＆/,  // 全角&
  ];

  const scored = artists.map((artist) => {
    let score = 0;
    const name = (artist.title || artist.name || '').toLowerCase();

    // ① 名前の完全一致 → 大幅加点
    if (name === normalizedQuery) {
      score += 100;
    } else if (name.startsWith(normalizedQuery)) {
      // 前方一致 → 中加点
      score += 50;
    } else if (name.includes(normalizedQuery)) {
      // 部分一致 → 小加点
      score += 20;
    }

    // ② 偽物キーワードが含まれている場合 → 減点
    penaltyKeywords.forEach((keyword) => {
      if (name.includes(keyword)) {
        score -= 50;
      }
    });

    // ③ グループ・派生名義パターン → 減点
    const originalName = artist.title || artist.name || '';
    groupSuffixPatterns.forEach((pattern) => {
      if (pattern.test(originalName)) {
        score -= 40;
      }
    });

    // ④ 名前が検索クエリより大幅に長い場合 → 減点（派生名義の可能性）
    if (name.length > normalizedQuery.length * 2) {
      score -= 15;
    }

    // ⑤ ID の若さ（小さいほど古い = 本物の可能性が高い）
    // ID が 100万未満なら加点、1000万以上なら減点
    const id = artist.id || Infinity;
    if (id < 100000) {
      score += 30;
    } else if (id < 1000000) {
      score += 15;
    } else if (id < 5000000) {
      score += 5;
    } else if (id > 10000000) {
      score -= 10;
    }

    // ⑥ 括弧つきの番号がある場合は減点（同名アーティストの派生）
    if (/\(\d+\)/.test(artist.title || artist.name || '')) {
      score -= 20;
    }

    return { ...artist, _score: score };
  });

  // スコア順にソートし、最高スコアを返す
  scored.sort((a, b) => b._score - a._score);

  console.log('[Scoring] アーティスト候補スコア:');
  scored.forEach((a) => {
    console.log(`  - ${a.title || a.name} (ID: ${a.id}) → score: ${a._score}`);
  });

  return scored[0];
}

/**
 * リリースにスマートソートスコアを付与する
 *
 * @param {Array} releases - リリースの配列
 * @param {string} query - 検索クエリ
 * @param {string} [artistName] - アーティスト名（厳密検索時）
 * @returns {Array} スコア付きのリリース配列（降順ソート済み）
 */
function smartSort(releases, query, artistName = '') {
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedArtist = artistName.toLowerCase().trim();

  const scored = releases.map((release) => {
    let relevanceScore = 0;

    const title = (release.title || '').toLowerCase();
    const artist = (release.artist || '').toLowerCase();

    // ① アーティスト名が完全一致 → 最上位
    if (normalizedArtist && artist.includes(normalizedArtist)) {
      relevanceScore += 50;
    }

    // ② アーティスト名とタイトルの分離チェック
    // Discogs の title は "Artist - Title" 形式の場合がある
    if (title.includes(' - ')) {
      const parts = title.split(' - ');
      const releaseArtist = parts[0].trim().toLowerCase();
      const releaseTitle = parts.slice(1).join(' - ').trim().toLowerCase();

      // アーティスト部分が完全一致
      if (releaseArtist === normalizedQuery || releaseArtist === normalizedArtist) {
        relevanceScore += 40;
      }

      // タイトル部分に検索ワードが含まれる
      if (releaseTitle.includes(normalizedQuery)) {
        relevanceScore += 30;
      }
    }

    // ③ タイトル全体に検索ワードが含まれる
    if (title.includes(normalizedQuery)) {
      relevanceScore += 20;
    }

    // ④ メインアーティストかどうか（role による判別）
    if (release.role === 'Main') {
      relevanceScore += 15;
    } else if (release.role === 'TrackAppearance' || release.role === 'Appearance') {
      relevanceScore -= 10;
    }

    // ⑤ year がある方が情報量が多い
    if (release.year && release.year > 0) {
      relevanceScore += 5;
    }

    return {
      ...release,
      relevance_score: relevanceScore,
    };
  });

  // 関連度スコアで降順ソート
  scored.sort((a, b) => b.relevance_score - a.relevance_score);
  return scored;
}

/**
 * 重複排除
 * Discogs ID が同じリリースを一つにまとめる
 *
 * @param {Array} releases
 * @returns {Array} 重複除去後のリリース
 */
function deduplicateReleases(releases) {
  const seen = new Map();
  return releases.filter((release) => {
    const id = release.id;
    if (seen.has(id)) return false;
    seen.set(id, true);
    return true;
  });
}

module.exports = {
  findRealArtist,
  smartSort,
  deduplicateReleases,
};
