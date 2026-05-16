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
const spotify = require('../services/spotify');
const { filterReleases, filterArtistReleases } = require('../services/filter');
const { findRealArtist, smartSort, deduplicateReleases } = require('../services/scoring');
const { containsJapanese, resolveArtistName } = require('../services/translate');



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

    // Step 1: 日本語の場合は英語名も解決する
    let englishName = null;
    if (containsJapanese(searchQuery)) {
      englishName = await resolveArtistName(searchQuery);
    }

    // Step 2: アーティストを検索
    const effectiveQuery = englishName || searchQuery;
    const artists = await discogs.searchArtists(effectiveQuery);

    if (!artists || artists.length === 0) {
      return res.json({ artist: null, results: [], total: 0 });
    }

    // Step 3: 偽物排除アルゴリズムで「本物」を特定
    const realArtist = findRealArtist(artists, effectiveQuery);

    if (!realArtist) {
      return res.json({ artist: null, results: [], total: 0 });
    }

    // Step 4: アーティストのリリース一覧を取得
    const releasesData = await discogs.getArtistReleases(realArtist.id);
    let releases = releasesData.releases || [];

    // Step 5: Vinyl & 公式版フィルタ
    releases = filterArtistReleases(releases);

    // Step 6: データを正規化
    releases = releases.map((r) => {
      // artist releases の場合、artist 名はアーティスト名
      return normalizeRelease({
        ...r,
        artist: r.artist || realArtist.title || realArtist.name,
      });
    });

    // Step 7: スマートソート
    releases = smartSort(releases, searchQuery, realArtist.title || realArtist.name);

    res.json({
      artist: {
        id: realArtist.id,
        name: realArtist.title || realArtist.name,
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
    if (containsJapanese(searchQuery)) {
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
    const { artist, title } = req.query;
    if (!artist || !title) {
      return res.status(400).json({ error: 'artist and title are required' });
    }
    
    // Spotify APIを使用して高画質画像を取得
    const imageUrl = await spotify.getHighResImage(artist, title);
    
    // 見つからなかった場合は空文字列を返す（フロントエンドでプレースホルダーを表示するため）
    res.json({ imageUrl: imageUrl || '' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
