const express = require('express');
const router = express.Router();
const discogs = require('../services/discogs');
const { deduplicateReleases } = require('../services/scoring');

// HMV風ランキングのためのシードアーティスト/キーワード
const RANKING_SEEDS = [
  'Bialystocks',
  '細野晴臣',
  'サカナクション',
  'iri',
  'チャットモンチー',
  'KIRINJI',
];

// 簡易的なキャッシュ（毎リクエストDiscogsを叩かないため）
let cachedRanking = null;
let cacheTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1時間

router.get('/', async (req, res, next) => {
  try {
    if (cachedRanking && Date.now() - cacheTime < CACHE_DURATION) {
      return res.json({ results: cachedRanking });
    }

    // 各シードから2件ずつ取得して混ぜる
    let allReleases = [];
    for (const seed of RANKING_SEEDS) {
      // 意図的に待機を入れてAPI制限を回避
      await new Promise(resolve => setTimeout(resolve, 500));
      const results = await discogs.searchReleasesGeneral(seed);
      if (results && results.length > 0) {
        // 画像があるものを優先
        const withImages = results.filter(r => r.cover_image && !r.cover_image.includes('spacer.gif'));
        allReleases = allReleases.concat(withImages.slice(0, 3));
      }
    }

    // 重複を排除
    let uniqueReleases = deduplicateReleases(allReleases);

    // ランダムにシャッフルしてトップ10件を取得
    uniqueReleases = uniqueReleases.sort(() => 0.5 - Math.random()).slice(0, 10);

    cachedRanking = uniqueReleases;
    cacheTime = Date.now();

    res.json({ results: cachedRanking });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
