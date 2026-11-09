'use strict';
const path = require('path'),
  crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const DATA = process.env.DATA_DIR || path.join(__dirname, '..');
const db = new DatabaseSync(path.join(DATA, 'workly.db'));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT,email TEXT UNIQUE,salt TEXT,hash TEXT,role TEXT,title TEXT DEFAULT '',rate TEXT DEFAULT '',loc TEXT DEFAULT '',skills TEXT DEFAULT '[]',bio TEXT DEFAULT '',ts INTEGER);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,uid TEXT,ts INTEGER);
CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,uid TEXT,title TEXT,cat TEXT,descr TEXT,skills TEXT,type TEXT,amt REAL,level TEXT,status TEXT DEFAULT 'open',ts INTEGER);
CREATE TABLE IF NOT EXISTS props(id TEXT PRIMARY KEY,jobId TEXT,uid TEXT,bid REAL,letter TEXT,status TEXT DEFAULT 'pending',ts INTEGER);
CREATE TABLE IF NOT EXISTS ms(id TEXT PRIMARY KEY,jobId TEXT,t TEXT,amt REAL,st TEXT DEFAULT 'pending',ts INTEGER);
CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY,jobId TEXT,toId TEXT,fromId TEXT,stars INTEGER,text TEXT,ts INTEGER);
CREATE TABLE IF NOT EXISTS notes(id TEXT PRIMARY KEY,uid TEXT,text TEXT,v TEXT,r TEXT,c TEXT,read INTEGER DEFAULT 0,ts INTEGER);
CREATE TABLE IF NOT EXISTS msgs(id INTEGER PRIMARY KEY AUTOINCREMENT,fromId TEXT,toId TEXT,text TEXT,ts INTEGER);
CREATE TABLE IF NOT EXISTS saved(uid TEXT,jobId TEXT,PRIMARY KEY(uid,jobId));
CREATE TABLE IF NOT EXISTS invites(uid TEXT,tid TEXT,jobId TEXT,PRIMARY KEY(uid,tid,jobId));`);
db.prepare('DELETE FROM sessions WHERE ts<?').run(Date.now() - 30 * 864e5);
const q = (s, ...a) => db.prepare(s).all(...a),
  one = (s, ...a) => db.prepare(s).get(...a),
  run = (s, ...a) => db.prepare(s).run(...a);
const id = p => p + crypto.randomBytes(5).toString('hex');

module.exports = { db, q, one, run, id };
