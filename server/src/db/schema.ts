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

    CREATE TABLE IF NOT EXISTS tournament_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tournament_id INTEGER NOT NULL,
      paid INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
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

  // Add description column to tournaments if it doesn't exist
  const tournamentColumns = db.prepare("PRAGMA table_info(tournaments)").all() as any[];
  if (!tournamentColumns.find((c: any) => c.name === 'description')) {
    db.exec('ALTER TABLE tournaments ADD COLUMN description TEXT');
  }

  // Seed default admin user if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)').run('admin', hash);
  }

  // Seed "MS Hokej 2026" tournament if no tournaments exist
  const tournamentCount = db.prepare('SELECT COUNT(*) as count FROM tournaments').get() as { count: number };
  if (tournamentCount.count === 0) {
    db.prepare('INSERT INTO tournaments (name, status) VALUES (?, ?)').run('MS Hokej 2026', 'active');
    const tournament = db.prepare('SELECT id FROM tournaments WHERE name = ?').get('MS Hokej 2026') as { id: number };
    const tid = tournament.id;

    const insertMatch = db.prepare(
      'INSERT INTO matches (home_team, away_team, kickoff, tournament_id) VALUES (?, ?, ?, ?)'
    );

    // All times are local Swiss time (CEST = UTC+2)
    const matches: [string, string, string][] = [
      // Day 1 - May 15
      ['Finland', 'Germany', '2026-05-15T16:20:00+02:00'],
      ['Canada', 'Sweden', '2026-05-15T16:20:00+02:00'],
      ['USA', 'Switzerland', '2026-05-15T20:20:00+02:00'],
      ['Czechia', 'Denmark', '2026-05-15T20:20:00+02:00'],
      // Day 2 - May 16
      ['Great Britain', 'Austria', '2026-05-16T12:20:00+02:00'],
      ['Slovakia', 'Norway', '2026-05-16T12:20:00+02:00'],
      ['Hungary', 'Finland', '2026-05-16T16:20:00+02:00'],
      ['Italy', 'Canada', '2026-05-16T16:20:00+02:00'],
      ['Switzerland', 'Latvia', '2026-05-16T20:20:00+02:00'],
      ['Slovenia', 'Czechia', '2026-05-16T20:20:00+02:00'],
      // Day 3 - May 17
      ['Great Britain', 'USA', '2026-05-17T12:20:00+02:00'],
      ['Italy', 'Slovakia', '2026-05-17T12:20:00+02:00'],
      ['Austria', 'Hungary', '2026-05-17T16:20:00+02:00'],
      ['Denmark', 'Sweden', '2026-05-17T16:20:00+02:00'],
      ['Germany', 'Latvia', '2026-05-17T20:20:00+02:00'],
      ['Norway', 'Slovenia', '2026-05-17T20:20:00+02:00'],
      // Day 4 - May 18
      ['Finland', 'USA', '2026-05-18T16:20:00+02:00'],
      ['Canada', 'Denmark', '2026-05-18T16:20:00+02:00'],
      ['Germany', 'Switzerland', '2026-05-18T20:20:00+02:00'],
      ['Sweden', 'Czechia', '2026-05-18T20:20:00+02:00'],
      // Day 5 - May 19
      ['Latvia', 'Austria', '2026-05-19T16:20:00+02:00'],
      ['Italy', 'Norway', '2026-05-19T16:20:00+02:00'],
      ['Hungary', 'Great Britain', '2026-05-19T20:20:00+02:00'],
      ['Slovenia', 'Slovakia', '2026-05-19T20:20:00+02:00'],
      // Day 6 - May 20
      ['Austria', 'Switzerland', '2026-05-20T16:20:00+02:00'],
      ['Czechia', 'Italy', '2026-05-20T16:20:00+02:00'],
      ['USA', 'Germany', '2026-05-20T20:20:00+02:00'],
      ['Sweden', 'Slovenia', '2026-05-20T20:20:00+02:00'],
      // Day 7 - May 21
      ['Latvia', 'Finland', '2026-05-21T16:20:00+02:00'],
      ['Canada', 'Norway', '2026-05-21T16:20:00+02:00'],
      ['Switzerland', 'Great Britain', '2026-05-21T20:20:00+02:00'],
      ['Denmark', 'Slovakia', '2026-05-21T20:20:00+02:00'],
      // Day 8 - May 22
      ['Germany', 'Hungary', '2026-05-22T16:20:00+02:00'],
      ['Canada', 'Slovenia', '2026-05-22T16:20:00+02:00'],
      ['Finland', 'Great Britain', '2026-05-22T20:20:00+02:00'],
      ['Sweden', 'Italy', '2026-05-22T20:20:00+02:00'],
      // Day 9 - May 23
      ['Latvia', 'USA', '2026-05-23T12:20:00+02:00'],
      ['Denmark', 'Slovenia', '2026-05-23T12:20:00+02:00'],
      ['Switzerland', 'Hungary', '2026-05-23T16:20:00+02:00'],
      ['Slovakia', 'Czechia', '2026-05-23T16:20:00+02:00'],
      ['Austria', 'Germany', '2026-05-23T20:20:00+02:00'],
      ['Norway', 'Sweden', '2026-05-23T20:20:00+02:00'],
      // Day 10 - May 24
      ['Great Britain', 'Latvia', '2026-05-24T16:20:00+02:00'],
      ['Denmark', 'Italy', '2026-05-24T16:20:00+02:00'],
      ['Finland', 'Austria', '2026-05-24T20:20:00+02:00'],
      ['Slovakia', 'Canada', '2026-05-24T20:20:00+02:00'],
      // Day 11 - May 25
      ['USA', 'Hungary', '2026-05-25T16:20:00+02:00'],
      ['Czechia', 'Norway', '2026-05-25T16:20:00+02:00'],
      ['Germany', 'Great Britain', '2026-05-25T20:20:00+02:00'],
      ['Slovenia', 'Italy', '2026-05-25T20:20:00+02:00'],
      // Day 12 - May 26
      ['Hungary', 'Latvia', '2026-05-26T12:20:00+02:00'],
      ['Norway', 'Denmark', '2026-05-26T12:20:00+02:00'],
      ['USA', 'Austria', '2026-05-26T16:20:00+02:00'],
      ['Sweden', 'Slovakia', '2026-05-26T16:20:00+02:00'],
      ['Switzerland', 'Finland', '2026-05-26T20:20:00+02:00'],
      ['Czechia', 'Canada', '2026-05-26T20:20:00+02:00'],
      // Quarterfinals - May 28
      ['QF1', 'QF1', '2026-05-28T16:20:00+02:00'],
      ['QF2', 'QF2', '2026-05-28T16:20:00+02:00'],
      ['QF3', 'QF3', '2026-05-28T20:20:00+02:00'],
      ['QF4', 'QF4', '2026-05-28T20:20:00+02:00'],
      // Semifinals - May 30
      ['SF1', 'SF1', '2026-05-30T15:20:00+02:00'],
      ['SF2', 'SF2', '2026-05-30T20:00:00+02:00'],
      // Medal games - May 31
      ['Bronze', 'Bronze', '2026-05-31T15:30:00+02:00'],
      ['Gold', 'Gold', '2026-05-31T20:20:00+02:00'],
    ];

    for (const [home, away, kickoff] of matches) {
      insertMatch.run(home, away, kickoff, tid);
    }
  }
}
