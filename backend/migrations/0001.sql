PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS players (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
 consent_version TEXT NOT NULL, consent_at INTEGER NOT NULL,
 first_played_at INTEGER, last_played_at INTEGER, total_matches_started INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_player ON sessions(player_id);
CREATE TABLE IF NOT EXISTS matches (
 id TEXT PRIMARY KEY, player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
 source TEXT NOT NULL CHECK(source IN ('human','simulation')), run_id TEXT,
 started_at INTEGER NOT NULL, completed_at INTEGER,
 game_version TEXT NOT NULL, rules_version TEXT NOT NULL, ai_version TEXT NOT NULL,
 metrics_version TEXT NOT NULL, seed INTEGER NOT NULL, config_json TEXT NOT NULL,
 summary_json TEXT, complete_hash TEXT
);
CREATE INDEX IF NOT EXISTS matches_player ON matches(player_id);
CREATE INDEX IF NOT EXISTS matches_versions ON matches(rules_version,source);
CREATE TABLE IF NOT EXISTS event_batches (
 match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
 batch INTEGER NOT NULL, payload_json TEXT NOT NULL, payload_hash TEXT NOT NULL,
 created_at INTEGER NOT NULL, PRIMARY KEY(match_id,batch)
);
CREATE TABLE IF NOT EXISTS participants (
 match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
 participant_id TEXT NOT NULL, known_player_id TEXT REFERENCES players(id) ON DELETE SET NULL,
 controller_type TEXT NOT NULL, final_favor INTEGER NOT NULL,
 PRIMARY KEY(match_id,participant_id)
);
CREATE TABLE IF NOT EXISTS simulation_runs (
 id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, manifest_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_buckets (
 key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE VIEW IF NOT EXISTS human_matches AS SELECT * FROM matches WHERE source='human';
CREATE VIEW IF NOT EXISTS simulation_matches AS SELECT * FROM matches WHERE source='simulation';
