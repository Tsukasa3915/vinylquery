/**
 * 検索 API ルート
 *
 * 2つの検索モードを提供する:
 * - POST /api/search/artist   → アーティストから探す（厳密検索）
 * - POST /api/search/freeword → フリーワードで探す（ハイブリッド検索）
 */
const express = require('express');
const router = express.Router();

const discogs = require('../services/discogs');
const { filterReleases, filterArtistReleases } = require('../services/filter');
const { findRealArtist, smartSort, deduplicateReleases } = require('../services/scoring');
const { containsJapanese, resolveArtistName } = require('../services/translate');

const { ARTIST_ID_MAP, REVERSE_ARTIST_MAP, cleanArtistName } = require('../services/artistRegistry');

function extractJapaneseName(details) {
  if (!details) return null;
  
  let candidates = [];
  
  if (details.namevariations) {
    const jpVariations = details.namevariations.filter(v => containsJapanese(v));
    candidates.push(...jpVariations);
  }
  
  if (details.realname) {
    const parts = details.realname.split(/[=＝]/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (containsJapanese(trimmed)) {
        candidates.push(trimmed);
      }
    }
    if (containsJapanese(details.realname)) {
      candidates.push(details.realname.trim());
    }
  }
  
  if (details.name && containsJapanese(details.name)) {
    candidates.push(details.name);
  }
  
  if (candidates.length === 0) return null;
  
  const cleanCandidates = candidates
    .map(c => c.trim())
    .filter(c => c.length > 0 && c.length < 20 && !c.includes('='))
    .sort((a, b) => b.length - a.length);
    
  if (cleanCandidates.length > 0) {
    const withoutSpaces = cleanCandidates.filter(c => !/\s/.test(c));
    if (withoutSpaces.length > 0) {
      return withoutSpaces[0];
    }
    return cleanCandidates[0];
  }
  
  return null;
}

/**
 * リリースデータを統一フォーマットに正規化する
 */
function normalizeRelease(release) {
  // "Artist - Title" 形式を分解
  let artist = release.artist || '';
  let title = release.title || '';

  if (title.includes(' - ') && !artist) {
    const parts = title.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  }

  // 日本語名へ翻訳
  artist = cleanArtistName(artist);

  // 画像: cover_image（検索APIから取得、高解像度）を優先、なければthumbを使用
  const image = release.cover_image || release.thumb || '';

  // 正しい Discogs URL を構築
  let discogsUrl = '';
  if (release.uri) {
    discogsUrl = `https://www.discogs.com${release.uri}`;
  } else if (release.type === 'master' && release.id) {
    discogsUrl = `https://www.discogs.com/master/${release.id}`;
  } else if (release.id) {
    discogsUrl = `https://www.discogs.com/release/${release.id}`;
  }

  return {
    id: release.id,
    title: title,
    artist: artist,
    year: release.year || null,
    label: release.label || (release.labels ? release.labels.map((l) => l.name).join(', ') : ''),
    format: extractFormatDetail(release),
    cover_image: image,
    thumb: release.thumb || release.cover_image || '',
    relevance_score: release.relevance_score || 0,
    discogs_url: discogsUrl,
    role: release.role || 'Main',
  };
}

/**
 * フォーマット詳細を抽出（LP, 7", 12" 等）
 */
function extractFormatDetail(release) {
  if (release.format) {
    const formats = Array.isArray(release.format) ? release.format : [release.format];
    return formats.join(', ');
  }
  if (release.formats) {
    return release.formats
      .map((f) => {
        const parts = [f.name];
        if (f.descriptions) parts.push(...f.descriptions);
        return parts.join(' ');
      })
      .join(', ');
  }
  return 'Vinyl';
}

// ============================================================
// POST /api/search/artist — アーティストから探す（厳密検索）
// ============================================================
router.post('/artist', async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query || query.trim() === '') {
      return res.status(400).json({ error: '検索キーワードを入力してください。' });
    }

    const searchQuery = query.trim();
    const normalized = searchQuery.toLowerCase();

    let realArtist = null;
    if (ARTIST_ID_MAP[normalized]) {
      const mapped = ARTIST_ID_MAP[normalized];
      realArtist = {
        id: mapped.id,
        title: mapped.name,
        name: mapped.name,
        thumb: '',
      };
    } else {
      // 主要アーティストのレジストリから部分一致を優先的に探す (「椎名」で「椎名林檎」などを解決する)
      const { artistsList } = require('../services/artistRegistry');
      let bestMatch = null;
      let bestScore = 0;

      for (const artist of artistsList) {
        let score = 0;
        const jp = artist.japaneseName.toLowerCase();
        const en = artist.englishName.toLowerCase();
        
        if (jp === normalized || en === normalized) {
          score = 100;
        } else if (jp.startsWith(normalized) || en.startsWith(normalized)) {
          score = 80;
        } else if (jp.includes(normalized) || en.includes(normalized)) {
          score = 50;
        } else if (artist.searchTerms && artist.searchTerms.some(t => t.toLowerCase() === normalized)) {
          score = 60;
        } else if (artist.searchTerms && artist.searchTerms.some(t => t.toLowerCase().includes(normalized))) {
          score = 30;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = artist;
        }
      }

      if (bestMatch && bestScore >= 50) {
        console.log(`[Search] 🎯 主要アーティスト部分一致解決: "${searchQuery}" → "${bestMatch.japaneseName}" (ID: ${bestMatch.id}, Score: ${bestScore})`);
        realArtist = {
          id: bestMatch.id,
          title: bestMatch.englishName,
          name: bestMatch.englishName,
          japaneseName: bestMatch.japaneseName,
          thumb: '',
        };
      } else {
        // Step 1: 日本語の場合は英語名も解決する
        let englishName = null;
        if (containsJapanese(searchQuery)) {
          englishName = await resolveArtistName(searchQuery);
        }

        const effectiveQuery = englishName || searchQuery;
        const normEffective = effectiveQuery.toLowerCase().trim();
        
        if (ARTIST_ID_MAP[normEffective]) {
          const mapped = ARTIST_ID_MAP[normEffective];
          realArtist = {
            id: mapped.id,
            title: mapped.name,
            name: mapped.name,
            thumb: '',
          };
        } else {
          // Step 2: アーティストを検索
          const artists = await discogs.searchArtists(effectiveQuery);
          if (artists && artists.length > 0) {
            // Step 3: 偽物排除アルゴリズムで「本物」を特定
            realArtist = findRealArtist(artists, effectiveQuery);
          }
        }
      }
    }

    if (!realArtist) {
      return res.json({ artist: null, results: [], total: 0 });
    }

    // アーティスト詳細（画像と日本語名）を一括取得
    try {
      const details = await discogs.getArtistDetails(realArtist.id);
      if (details) {
        if (details.images && details.images.length > 0) {
          realArtist.thumb = details.images[0].uri || details.images[0].resource_url || '';
        }
        const jpName = extractJapaneseName(details);
        if (jpName) {
          realArtist.japaneseName = jpName;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch artist details:', err.message);
    }

    // Step 4: アーティストのリリース一覧を取得
    const releasesData = await discogs.getArtistReleases(realArtist.id);
    let releases = releasesData.releases || [];

    // Step 5: Vinyl & 公式版フィルタ
    releases = filterArtistReleases(releases);

    // Step 6: データを正規化
    releases = releases.map((r) => {
      return normalizeRelease({
        ...r,
        artist: r.artist || realArtist.title || realArtist.name,
      });
    });

    // 重複排除を適用して別形態の重複を間引く
    releases = deduplicateReleases(releases);

    // Step 7: スマートソート
    releases = smartSort(releases, searchQuery, realArtist.title || realArtist.name);

    const displayName = realArtist.japaneseName || realArtist.title || realArtist.name;
    releases = releases.map(r => ({
      ...r,
      artist: displayName
    }));

    res.json({
      artist: {
        id: realArtist.id,
        name: displayName,
        thumb: realArtist.thumb || realArtist.cover_image || '',
      },
      results: releases,
      total: releases.length,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/search/freeword — フリーワードで探す（ハイブリッド検索）
// ============================================================
router.post('/freeword', async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query || query.trim() === '') {
      return res.status(400).json({ error: '検索キーワードを入力してください。' });
    }

    const searchQuery = query.trim();

    // 日本語の場合、英語名も解決
    let englishName = null;
    const lowerSearchQuery = searchQuery.toLowerCase();
    
    if (ARTIST_ID_MAP[lowerSearchQuery]) {
      englishName = ARTIST_ID_MAP[lowerSearchQuery].name;
    } else if (containsJapanese(searchQuery)) {
      englishName = await resolveArtistName(searchQuery);
    }

    // ハイブリッド検索: 2系統の並列通信（Promise.all）
    const promises = [];

    // ① キーワード検索（リリース）
    promises.push(
      discogs.searchReleasesGeneral(searchQuery).catch((err) => {
        console.error('キーワード検索エラー:', err.message);
        return [];
      })
    );

    // ② 英語名が解決できた場合、アーティスト厳密検索も並行実行
    if (englishName) {
      promises.push(
        (async () => {
          try {
            const artists = await discogs.searchArtists(englishName);
            const realArtist = findRealArtist(artists, englishName);
            if (realArtist) {
              const releasesData = await discogs.getArtistReleases(realArtist.id);
              let releases = releasesData.releases || [];
              releases = filterArtistReleases(releases);
              return releases.map((r) => ({
                ...r,
                artist: r.artist || realArtist.title || realArtist.name,
                cover_image: r.thumb || '',
              }));
            }
            return [];
          } catch (err) {
            console.error('アーティスト厳密検索エラー:', err.message);
            return [];
          }
        })()
      );

      // ③ 英語名でもキーワード検索
      promises.push(
        discogs.searchReleasesGeneral(englishName).catch((err) => {
          console.error('英語名キーワード検索エラー:', err.message);
          return [];
        })
      );
    }

    // 並列実行
    const results = await Promise.all(promises);

    // 全結果を合体
    let allReleases = results.flat();

    // フィルタリング
    allReleases = filterReleases(allReleases);

    // 正規化
    allReleases = allReleases.map(normalizeRelease);

    // 重複排除
    allReleases = deduplicateReleases(allReleases);

    // ノイズ除去: タイトルまたはアーティスト名に検索クエリが含まれているものだけに絞る
    const lowerQuery = searchQuery.toLowerCase();
    const lowerEnglish = englishName ? englishName.toLowerCase() : '';
    allReleases = allReleases.filter(r => {
      const lowerArtist = (r.artist || '').toLowerCase();
      const lowerTitle = (r.title || '').toLowerCase();
      return lowerArtist.includes(lowerQuery) || lowerTitle.includes(lowerQuery) ||
             (lowerEnglish && (lowerArtist.includes(lowerEnglish) || lowerTitle.includes(lowerEnglish)));
    });

    // スマートソート
    allReleases = smartSort(allReleases, searchQuery, englishName || '');

    res.json({
      results: allReleases,
      total: allReleases.length,
      resolved_name: englishName,
    });
  } catch (error) {
    next(error);
  }
});
// ============================================================
// GET /api/search/release/:id — リリースの詳細情報を取得
// ============================================================
router.get('/release/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // 'master' or 'release'
    
    let details;
    if (type === 'master') {
      details = await discogs.getMasterDetails(id);
    } else {
      details = await discogs.getReleaseDetails(id);
    }

    if (details && details.artists && details.artists.length > 0) {
      try {
        const artistId = details.artists[0].id;
        const artistDetails = await discogs.getArtistDetails(artistId);
        if (artistDetails) {
          const jpName = extractJapaneseName(artistDetails);
          if (jpName) {
            details.artists[0].japaneseName = jpName;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch artist details for release detail page:', err.message);
      }
    }
    
    res.json(details);
  } catch (error) {
    next(error);
  }
});

// ============================================================
// GET /api/search/stock — 各ショップの在庫（検索結果）状況を取得
// ============================================================
router.get('/stock', async (req, res, next) => {
  try {
    const { artist, title } = req.query;
    if (!artist || !title) {
      return res.status(400).json({ error: 'artist and title are required' });
    }
    
    // stockサービスは遅延読み込み（ここでrequire）またはファイル上部でrequire
    const stockService = require('../services/stock');
    const stockInfo = await stockService.checkAllStores(artist, title);
    
    res.json(stockInfo);
  } catch (error) {
    next(error);
  }
});

// ============================================================
// GET /api/search/image — 単発の高画質画像を取得（遅延読み込み用）
// ============================================================
router.get('/image', async (req, res, next) => {
  try {
    const { id, type } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }
    
    // Discogs APIを使用して高画質画像を取得
    const imageUrl = await discogs.getHighResImageById(id, type || 'master');
    
    // 見つからなかった場合は空文字列を返す（フロントエンドでプレースホルダーを表示するため）
    res.json({ imageUrl: imageUrl || '' });
  } catch (error) {
    if (error.message && error.message.startsWith('rate_limit')) {
      const retryAfter = parseInt(error.message.split(':')[1], 10) || 2;
      return res.status(429).json({ error: 'Too Many Requests', retryAfter });
    }
    next(error);
  }
});

// ============================================================
// GET /api/search/suggestions — 入力キーワードからアーティスト候補をサジェスト
// ============================================================
router.get('/suggestions', (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) {
    return res.json([]);
  }

  const query = q.toLowerCase().trim();
  const { artistsList } = require('../services/artistRegistry');

  const matches = [];
  for (const artist of artistsList) {
    let score = 0;
    
    // 1. 完全一致
    if (artist.japaneseName.toLowerCase() === query || artist.englishName.toLowerCase() === query) {
      score = 100;
    }
    // 2. 前方一致
    else if (artist.japaneseName.toLowerCase().startsWith(query) || artist.englishName.toLowerCase().startsWith(query)) {
      score = 80;
    }
    // 3. 部分一致
    else if (artist.japaneseName.toLowerCase().includes(query) || artist.englishName.toLowerCase().includes(query)) {
      score = 50;
    }
    // 4. 表記揺れ（searchTerms）の部分一致
    else {
      const termMatch = artist.searchTerms.some(term => term.toLowerCase().includes(query));
      if (termMatch) {
        score = 30;
      }
    }

    if (score > 0) {
      matches.push({
        id: artist.id,
        name: artist.japaneseName,
        englishName: artist.englishName,
        score
      });
    }
  }

  // スコア順、かつ同じスコアなら名前の長さ順でソート
  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.length - b.name.length;
  });

  res.json(matches.slice(0, 6));
});

module.exports = router;
