/**
 * 検索爆速化のための内製インメモリキャッシュサービス
 *
 * 外部ライブラリを追加せずに、非常に軽量で堅牢なメモリキャッシュを提供します。
 * TTL（生存時間）付きでデータを保存し、2回目以降の検索をミリ秒単位で返します。
 */

const cache = new Map();

/**
 * キャッシュからデータを取得する
 * 有効期限が切れている場合は自動的に削除して null を返します。
 *
 * @param {string} key - キャッシュキー
 * @returns {any|null} 保存されたデータ、存在しないか期限切れの場合は null
 */
function get(key) {
  const item = cache.get(key);
  if (!item) return null;

  // 有効期限チェック
  if (Date.now() > item.expiry) {
    cache.delete(key);
    console.log(`[Cache] 🗑️  Expired & Deleted: "${key}"`);
    return null;
  }

  return item.value;
}

/**
 * キャッシュにデータを設定する
 *
 * @param {string} key - キャッシュキー
 * @param {any} value - 保存する値
 * @param {number} [ttlMs=86400000] - 有効期限（ミリ秒単位、デフォルト24時間）
 */
function set(key, value, ttlMs = 1000 * 60 * 60 * 24) {
  cache.set(key, {
    value,
    expiry: Date.now() + ttlMs
  });
  console.log(`[Cache] 💾 Saved: "${key}" (TTL: ${ttlMs / 1000}s)`);
}

/**
 * すべてのキャッシュをクリアする
 */
function clear() {
  cache.clear();
  console.log(`[Cache] 🧹 All cache cleared`);
}

module.exports = {
  get,
  set,
  clear
};
