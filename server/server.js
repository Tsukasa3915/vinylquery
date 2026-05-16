const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const searchRoutes = require('./routes/search');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(cors());
app.use(express.json());

// ルート (API)
app.use('/api/search', searchRoutes);

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'VinylQuery API is running' });
});

// フロントエンド（画面）の配信設定（本番環境用）
// client/dist フォルダ内の静的ファイルを提供
app.use(express.static(path.join(__dirname, '../client/dist')));

// API以外のすべてのリクエストをフロントエンドの index.html に転送（React Router用）
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// エラーハンドラ
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🎵 VinylQuery API server running on port ${PORT}`);
});

module.exports = app;
