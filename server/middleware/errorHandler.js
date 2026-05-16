/**
 * グローバルエラーハンドラ
 * すべてのルートで発生した例外を一元的にキャッチし、
 * クライアントに統一されたエラーレスポンスを返す。
 */
function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);
  console.error(err.stack);

  // Discogs API のレートリミット
  if (err.status === 429) {
    return res.status(429).json({
      error: 'APIのリクエスト制限に達しました。しばらく待ってから再度お試しください。',
    });
  }

  // 汎用エラー
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'サーバー内部エラーが発生しました。',
  });
}

module.exports = errorHandler;
