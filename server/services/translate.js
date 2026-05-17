/**
 * 日本語→英語 アーティスト名解決サービス
 *
 * 日本語のアーティスト名が入力された場合、
 * Discogs のデータベースを活用して英語名を解決する。
 * 外部翻訳APIには依存しない。
 */

const discogs = require('./discogs');

// 日本の主要アナログ流通アーティストの直接IDマッピング（表記ゆれとAPI誤爆防止）
const ARTIST_ID_MAP = {
  'iri': { id: 5891531, name: 'iri' },
  'イリ': { id: 5891531, name: 'iri' },
  'bialystocks': { id: 11246145, name: 'Bialystocks' },
  'ビアリストックス': { id: 11246145, name: 'Bialystocks' },
  'チャットモンチー': { id: 1993472, name: 'Chatmonchy' },
  'chatmonchy': { id: 1993472, name: 'Chatmonchy' },
  'サカナクション': { id: 1361113, name: 'Sakanaction' },
  'sakanaction': { id: 1361113, name: 'Sakanaction' },
  'kirinji': { id: 282436, name: 'Kirinji' },
  'キリンジ': { id: 282436, name: 'Kirinji' },
  'tempalay': { id: 4543781, name: 'Tempalay' },
  'テンパレイ': { id: 4543781, name: 'Tempalay' },
  '羊文学': { id: 6672322, name: 'Hitsujibungaku' },
  'hitsujibungaku': { id: 6672322, name: 'Hitsujibungaku' },
  '細野晴臣': { id: 120531, name: 'Haruomi Hosono' },
  'haruomihosono': { id: 120531, name: 'Haruomi Hosono' }
};

/**
 * 文字列が日本語（ひらがな・カタカナ・漢字）を含むか判定
 * @param {string} text
 * @returns {boolean}
 */
function containsJapanese(text) {
  // ひらがな: \u3040-\u309F
  // カタカナ: \u30A0-\u30FF
  // 漢字 (CJK): \u4E00-\u9FFF
  // 全角英数: \uFF01-\uFF5E
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text);
}

/**
 * 日本語アーティスト名から英語名を解決する
 *
 * Discogs のアーティスト検索結果から、
 * realname や namevariations を参照して英語名を特定する。
 * 複数候補がある場合、namevariations に検索名が含まれるものを優先する。
 *
 * @param {string} japaneseName - 日本語アーティスト名
 * @returns {Promise<string|null>} 英語名。解決できない場合は null。
 */
async function resolveArtistName(japaneseName) {
  const normalized = japaneseName.toLowerCase().trim();
  if (ARTIST_ID_MAP[normalized]) {
    const artist = ARTIST_ID_MAP[normalized];
    console.log(`[Translate] 🎯 直接マッピング解決: "${japaneseName}" → "${artist.name}" (ID: ${artist.id})`);
    return artist.name;
  }

  if (!containsJapanese(japaneseName)) {
    return null; // 日本語でなければ翻訳不要
  }

  try {
    // Discogs でアーティスト検索
    const artists = await discogs.searchArtists(japaneseName);

    if (!artists || artists.length === 0) {
      return null;
    }

    console.log(`[Translate] "${japaneseName}" → ${artists.length} 件の候補`);

    // 各候補のうち、上位数件の詳細を取得し、namevariations に日本語名が含まれるかチェック
    const maxCheck = Math.min(artists.length, 5);
    for (let i = 0; i < maxCheck; i++) {
      const artist = artists[i];

      try {
        const details = await discogs.getArtistDetails(artist.id);

        if (!details) continue;

        // namevariations に検索名（日本語名）が含まれるかチェック
        const nameVariations = details.namevariations || [];
        const hasJapaneseMatch = nameVariations.some(
          (variation) => variation.trim() === japaneseName.trim()
        );

        // realname に検索名が含まれるかチェック
        const realnameMatch = details.realname && details.realname.includes(japaneseName);

        if (hasJapaneseMatch || realnameMatch) {
          // このアーティストは日本語名が一致 → 英語名を返す
          const englishName = findEnglishName(details, artist);
          if (englishName) {
            console.log(`[Translate] ✅ "${japaneseName}" → "${englishName}" (via namevariations/realname match, ID: ${artist.id})`);
            return englishName;
          }
        }

        // 最初の候補のみ: 名前自体が英語の場合
        if (i === 0) {
          const englishName = findEnglishName(details, artist);
          if (englishName) {
            console.log(`[Translate] "${japaneseName}" → "${englishName}" (via top result, ID: ${artist.id})`);
            // 最初の候補だけのフォールバック用に保持
            var fallbackName = englishName;
          }
        }
      } catch (err) {
        console.error(`[Translate] 候補 ${i} の詳細取得失敗:`, err.message);
        continue;
      }
    }

    // フォールバック: 最初の候補から取得した英語名
    if (fallbackName) {
      console.log(`[Translate] ⚠️ "${japaneseName}" → "${fallbackName}" (fallback)`);
      return fallbackName;
    }

    console.log(`[Translate] ❌ "${japaneseName}" の英語名を解決できませんでした`);
    return null;
  } catch (error) {
    console.error('アーティスト名解決エラー:', error.message);
    return null;
  }
}

/**
 * アーティスト詳細情報から英語名を抽出する
 * @param {Object} details - Discogs アーティスト詳細
 * @param {Object} searchResult - 検索結果のアーティスト
 * @returns {string|null}
 */
function findEnglishName(details, searchResult) {
  // 1. name が英語の場合はそれを使う
  if (details.name && !containsJapanese(details.name) && /[a-zA-Z]/.test(details.name)) {
    return details.name;
  }

  // 2. realname から英語部分を抽出
  if (details.realname) {
    // "Gen Hoshino = 星野源" のような形式を処理
    const parts = details.realname.split(/[=＝]/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!containsJapanese(trimmed) && /[a-zA-Z]/.test(trimmed)) {
        return trimmed;
      }
    }
  }

  // 3. namevariations から英語名を探す
  if (details.namevariations && details.namevariations.length > 0) {
    const englishName = details.namevariations.find(
      (name) => !containsJapanese(name) && /[a-zA-Z]/.test(name)
    );
    if (englishName) return englishName;
  }

  // 4. 検索結果の title が英語の場合
  if (searchResult.title && !containsJapanese(searchResult.title)) {
    return searchResult.title;
  }

  return null;
}

module.exports = {
  containsJapanese,
  resolveArtistName,
};
