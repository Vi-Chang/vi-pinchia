const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
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
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
    token TEXT,
    edited INTEGER NOT NULL DEFAULT 0
  )
`);
// 舊資料表補欄位（已存在則忽略）
for (const sql of [
  'ALTER TABLE messages ADD COLUMN token TEXT',
  'ALTER TABLE messages ADD COLUMN edited INTEGER NOT NULL DEFAULT 0'
]) {
  try { db.exec(sql); } catch {}
}

// 訪客紀錄：進站時登記貴姓與行業
db.exec(`
  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    surname TEXT NOT NULL,
    industry TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
  )
`);

function validate(name, message) {
  if (!name || !message) return '名字和留言都要填喔';
  if (name.length > 30) return '名字最多 30 個字';
  if (message.length > 200) return '留言最多 200 個字';
  return null;
}

const app = express();
app.use(express.json());

app.get('/api/messages', (req, res) => {
  const rows = db.prepare('SELECT id, name, message, created_at, edited FROM messages ORDER BY id DESC LIMIT 100').all();
  res.json(rows);
});

app.post('/api/messages', (req, res) => {
  const name = (req.body?.name ?? '').toString().trim();
  const message = (req.body?.message ?? '').toString().trim();
  const err = validate(name, message);
  if (err) return res.status(400).json({ error: err });

  const token = crypto.randomUUID();
  const info = db.prepare('INSERT INTO messages (name, message, token) VALUES (?, ?, ?)').run(name, message, token);
  const row = db.prepare('SELECT id, name, message, created_at, edited FROM messages WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ ...row, token });
});

// 以 token 驗證是否為本人留言
function findOwnMessage(req, res) {
  const id = Number(req.params.id);
  const token = (req.body?.token ?? '').toString();
  if (!Number.isInteger(id) || !token) {
    res.status(400).json({ error: '參數不正確' });
    return null;
  }
  const row = db.prepare('SELECT id, token FROM messages WHERE id = ?').get(id);
  if (!row) {
    res.status(404).json({ error: '找不到這則留言' });
    return null;
  }
  if (!row.token || row.token !== token) {
    res.status(403).json({ error: '只能修改自己的留言喔' });
    return null;
  }
  return row;
}

app.put('/api/messages/:id', (req, res) => {
  const own = findOwnMessage(req, res);
  if (!own) return;

  const name = (req.body?.name ?? '').toString().trim();
  const message = (req.body?.message ?? '').toString().trim();
  const err = validate(name, message);
  if (err) return res.status(400).json({ error: err });

  db.prepare('UPDATE messages SET name = ?, message = ?, edited = 1 WHERE id = ?').run(name, message, own.id);
  const row = db.prepare('SELECT id, name, message, created_at, edited FROM messages WHERE id = ?').get(own.id);
  res.json(row);
});

app.delete('/api/messages/:id', (req, res) => {
  const own = findOwnMessage(req, res);
  if (!own) return;

  db.prepare('DELETE FROM messages WHERE id = ?').run(own.id);
  res.json({ ok: true });
});

// 訪客登記：記錄貴姓與行業，回傳歡迎資訊
app.post('/api/visitors', (req, res) => {
  const surname = (req.body?.surname ?? '').toString().trim();
  const industry = (req.body?.industry ?? '').toString().trim();
  if (!surname || !industry) return res.status(400).json({ error: '請填寫貴姓與行業' });
  if (surname.length > 10) return res.status(400).json({ error: '貴姓最多 10 個字' });
  if (industry.length > 30) return res.status(400).json({ error: '行業最多 30 個字' });

  const info = db.prepare('INSERT INTO visitors (surname, industry) VALUES (?, ?)').run(surname, industry);
  const row = db.prepare('SELECT id, surname, industry, created_at FROM visitors WHERE id = ?').get(info.lastInsertRowid);
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM visitors').get();
  res.status(201).json({ ...row, total: c });
});

// 訪客清單（給版主看有誰來過）
app.get('/api/visitors', (req, res) => {
  const rows = db.prepare('SELECT id, surname, industry, created_at FROM visitors ORDER BY id DESC LIMIT 200').all();
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM visitors').get();
  res.json({ total: c, visitors: rows });
});

app.use(express.static(__dirname));

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`vi-pinchia listening on port ${port}, db at ${dataDir}`);
});
