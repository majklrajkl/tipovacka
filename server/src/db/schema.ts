import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(__dirname, '..', '..', 'tipovacka.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'finished')),
      winner_team TEXT,
      best_scorer TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      kickoff TEXT NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'live', 'finished')),
      tournament_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      UNIQUE(user_id, match_id)
    );

    CREATE TABLE IF NOT EXISTS scoring_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      points INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tournament_tips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tournament_id INTEGER NOT NULL,
      winning_team TEXT NOT NULL,
      best_scorer TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      UNIQUE(user_id, tournament_id)
    );
  `);

  // Seed default scoring rules if empty
  const rulesCount = db.prepare('SELECT COUNT(*) as count FROM scoring_rules').get() as { count: number };
  if (rulesCount.count === 0) {
    const insert = db.prepare('INSERT INTO scoring_rules (key, label, points) VALUES (?, ?, ?)');
    insert.run('exact_score', 'Exact score prediction', 5);
    insert.run('correct_outcome', 'Correct outcome (win/draw/loss)', 2);
    insert.run('correct_goal_diff', 'Correct goal difference', 3);
    insert.run('tournament_winner', 'Correct tournament winner', 10);
    insert.run('tournament_scorer', 'Correct tournament best scorer', 10);
  }

  // Seed tournament scoring rules if missing
  const tournamentWinnerRule = db.prepare("SELECT COUNT(*) as count FROM scoring_rules WHERE key = 'tournament_winner'").get() as { count: number };
  if (tournamentWinnerRule.count === 0) {
    const insertRule = db.prepare('INSERT INTO scoring_rules (key, label, points) VALUES (?, ?, ?)');
    insertRule.run('tournament_winner', 'Correct tournament winner', 10);
    insertRule.run('tournament_scorer', 'Correct tournament best scorer', 10);
  }

  // Add tournament_id column to matches if it doesn't exist
  const matchColumns = db.prepare("PRAGMA table_info(matches)").all() as any[];
  if (!matchColumns.find((c: any) => c.name === 'tournament_id')) {
    db.exec('ALTER TABLE matches ADD COLUMN tournament_id INTEGER REFERENCES tournaments(id) ON DELETE SET NULL');
  }

  // Seed default admin user if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)').run('admin', hash);
  }
}
