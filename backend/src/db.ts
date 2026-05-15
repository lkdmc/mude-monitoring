import initSqlJs, { Database } from "sql.js";
import path from "path";
import fs from "fs";

const DB_DIR = process.env.DB_PATH
  ? path.dirname(process.env.DB_PATH)
  : path.join(__dirname, "../../data");

const DB_FILE = process.env.DB_PATH || path.join(DB_DIR, "monitoring.db");

let db: Database;

const save = () => {
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
};

export const initDb = async (): Promise<void> => {
  const SQL = await initSqlJs();

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const fileBuffer = fs.existsSync(DB_FILE) ? fs.readFileSync(DB_FILE) : null;
  db = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS targets (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url  TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS checks (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      target_id        INTEGER NOT NULL,
      status_code      INTEGER,
      response_time_ms INTEGER NOT NULL,
      is_up            INTEGER NOT NULL,
      checked_at       TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (target_id) REFERENCES targets(id)
    );
  `);

  const insert = db.prepare(
    "INSERT OR IGNORE INTO targets (name, url) VALUES (?, ?)"
  );
  insert.run(["MUDE Course Website", "https://mude.citg.tudelft.nl"]);
  insert.run(["Content Archival System", "https://mude.citg.tudelft.nl/archive"]);
  insert.run(["Jupyter Publishing Pipeline", "https://mude.citg.tudelft.nl/book"]);
  insert.run(["diData - Grade overview platform", "https://didata.tudelft.nl"]);
  insert.run(["diData - Test Webpage", "https://edu01.citg.tudelft.nl"]);
  insert.free();

  save();
};

const query = <T>(sql: string, params: (string | number | null)[] = []): T[] => {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
};

export type Target = { id: number; name: string; url: string };

export const getAllTargets = (): Target[] => query<Target>("SELECT * FROM targets");

export const insertCheck = (
  targetId: number,
  statusCode: number | null,
  responseTimeMs: number,
  isUp: boolean
): void => {
  db.run(
    "INSERT INTO checks (target_id, status_code, response_time_ms, is_up) VALUES (?, ?, ?, ?)",
    [targetId, statusCode, responseTimeMs, isUp ? 1 : 0]
  );
  save();
};

export const getLatestStatus = () =>
  query(
    `SELECT t.id, t.name, t.url, c.status_code, c.response_time_ms, c.is_up, c.checked_at
     FROM targets t
     LEFT JOIN checks c ON c.id = (
       SELECT id FROM checks WHERE target_id = t.id ORDER BY checked_at DESC LIMIT 1
     )`
  );

export const getHistory = (targetId: number) =>
  query(
    `SELECT status_code, response_time_ms, is_up, checked_at
     FROM checks
     WHERE target_id = ?
       AND checked_at >= datetime('now', '-24 hours')
     ORDER BY checked_at ASC`,
    [targetId]
  );

export const getTargetById = (id: number) =>
  query("SELECT * FROM targets WHERE id = ?", [id])[0] ?? null;
