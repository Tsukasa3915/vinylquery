const express = require('express');
const router = express.Router();
const discogs = require('../services/discogs');
const { deduplicateReleases } = require('../services/scoring');

// 各期間（デイリー、ウィークリー、マンスリー）に応じた魅力的なシードアーティスト/キーワード
const RANKING_SEEDS = {
  day: [
    'Bialystocks',
    'iri',
    'サカナクション',
    'KIRINJI',
    'Tempalay',
    '羊文学'
  ],
  week: [
    '細野晴臣',
    '大滝詠一',
    '山下達郎',
    '竹内まりや',
    '坂本龍一',
    '矢野顕子'
  ],
  month: [
    'チャットモンチー',
    'キリンジ',
    'スピッツ',
    '宇多田ヒカル',
    '椎名林檎',
    'フィッシュマンズ'
  ]
};

// 簡易的なキャッシュ（期間ごとに独立して管理）
const caches = {
  day: null,
  week: null,
  month: null
};

const cacheTimes = {
  day: 0,
  week: 0,
  month: 0
};

const CACHE_DURATION = 1000 * 60 * 60; // 1時間

router.get('/', async (req, res, next) => {
  try {
    // クエリパラメータから期間を取得（デフォルトは'day'）
    const period = req.query.period === 'week' || req.query.period === 'month' ? req.query.period : 'day';

    if (caches[period] && Date.now() - cacheTimes[period] < CACHE_DURATION) {
      return res.json({ results: caches[period] });
    }

    const seeds = RANKING_SEEDS[period];
    let allReleases = [];

    for (const seed of seeds) {
      // API制限を考慮してわずかに遅延を挿入
      await new Promise(resolve => setTimeout(resolve, 300));
      const results = await discogs.searchReleasesGeneral(seed);
      if (results && results.length > 0) {
        // 画像があるものを優先
        const withImages = results.filter(r => r.cover_image && !r.cover_image.includes('spacer.gif'));
        allReleases = allReleases.concat(withImages.slice(0, 4));
      }
    }

    // 重複を排除
    let uniqueReleases = deduplicateReleases(allReleases);

    // タイトルからアーティストを分離
    uniqueReleases = uniqueReleases.map(r => {
      let title = r.title || '';
      let artist = r.artist || '';
      if (title.includes(' - ') && !artist) {
        const parts = title.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }
      return { ...r, title, artist };
    });

    // シャッフルしてトップ15件を取得
    uniqueReleases = uniqueReleases.sort(() => 0.5 - Math.random()).slice(0, 15);

    caches[period] = uniqueReleases;
    cacheTimes[period] = Date.now();

    res.json({ results: caches[period] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
