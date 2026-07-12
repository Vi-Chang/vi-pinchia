const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// DATA_DIR 可指向 Zeabur Volume 掛載點，讓資料庫在重新部署後仍保留
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'guestbook.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
  )
`);

const app = express();
app.use(express.json());

app.get('/api/messages', (req, res) => {
  const rows = db.prepare('SELECT id, name, message, created_at FROM messages ORDER BY id DESC LIMIT 100').all();
  res.json(rows);
});

app.post('/api/messages', (req, res) => {
  const name = (req.body?.name ?? '').toString().trim();
  const message = (req.body?.message ?? '').toString().trim();

  if (!name || !message) {
    return res.status(400).json({ error: '名字和留言都要填喔' });
  }
  if (name.length > 30) {
    return res.status(400).json({ error: '名字最多 30 個字' });
  }
  if (message.length > 200) {
    return res.status(400).json({ error: '留言最多 200 個字' });
  }

  const info = db.prepare('INSERT INTO messages (name, message) VALUES (?, ?)').run(name, message);
  const row = db.prepare('SELECT id, name, message, created_at FROM messages WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

app.use(express.static(__dirname));

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`vi-pinchia listening on port ${port}, db at ${dataDir}`);
});
