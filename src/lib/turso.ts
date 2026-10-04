import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;

export function getTurso(): Client | null {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) return null;
  if (!client) {
    client = createClient({ url, authToken });
  }
  return client;
}

export async function ensureSchema(): Promise<void> {
  const db = getTurso();
  if (!db) return;
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS persons (
        id_number TEXT PRIMARY KEY,
        name TEXT,
        current_status TEXT DEFAULT '',
        follow_up TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS case_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_number TEXT,
        name TEXT,
        case_summary TEXT NOT NULL,
        event_clarification TEXT DEFAULT '',
        punishments TEXT DEFAULT '',
        reasons TEXT DEFAULT '',
        full_response TEXT DEFAULT '',
        user_message TEXT DEFAULT '',
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_cases_id_number ON case_records(id_number)`,
      `CREATE INDEX IF NOT EXISTS idx_cases_name ON case_records(name)`,
    ],
    "write"
  );
}

export type PersonRecord = {
  id_number: string;
  name: string | null;
  current_status: string;
  follow_up: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type CaseRecord = {
  id: number;
  id_number: string | null;
  name: string | null;
  case_summary: string;
  event_clarification: string;
  punishments: string;
  reasons: string;
  full_response: string;
  user_message: string;
  created_at: string;
};

export async function lookupPersons(opts: {
  idNumbers?: string[];
  names?: string[];
}): Promise<{ persons: PersonRecord[]; cases: CaseRecord[] }> {
  const db = getTurso();
  if (!db) return { persons: [], cases: [] };
  await ensureSchema();
  const persons: PersonRecord[] = [];
  const cases: CaseRecord[] = [];
  const seenIds = new Set<string>();
  const seenCaseIds = new Set<number>();

  for (const id of opts.idNumbers || []) {
    const r = await db.execute({ sql: "SELECT * FROM persons WHERE id_number = ?", args: [id] });
    for (const row of r.rows) {
      const p = row as unknown as PersonRecord;
      if (!seenIds.has(p.id_number)) {
        seenIds.add(p.id_number);
        persons.push(p);
      }
    }
    const c = await db.execute({
      sql: "SELECT * FROM case_records WHERE id_number = ? ORDER BY id DESC LIMIT 20",
      args: [id],
    });
    for (const row of c.rows) {
      const rec = row as unknown as CaseRecord;
      if (!seenCaseIds.has(Number(rec.id))) {
        seenCaseIds.add(Number(rec.id));
        cases.push(rec);
      }
    }
  }

  for (const name of opts.names || []) {
    if (!name || name.length < 2) continue;
    const r = await db.execute({
      sql: "SELECT * FROM persons WHERE name = ? OR name LIKE ?",
      args: [name, `%${name}%`],
    });
    for (const row of r.rows) {
      const p = row as unknown as PersonRecord;
      if (!seenIds.has(p.id_number)) {
        seenIds.add(p.id_number);
        persons.push(p);
      }
    }
    const c = await db.execute({
      sql: "SELECT * FROM case_records WHERE name = ? OR name LIKE ? OR case_summary LIKE ? ORDER BY id DESC LIMIT 20",
      args: [name, `%${name}%`, `%${name}%`],
    });
    for (const row of c.rows) {
      const rec = row as unknown as CaseRecord;
      if (!seenCaseIds.has(Number(rec.id))) {
        seenCaseIds.add(Number(rec.id));
        cases.push(rec);
      }
    }
  }
  return { persons, cases };
}

export async function saveJudgment(data: {
  id_number?: string | null;
  name?: string | null;
  case_summary: string;
  event_clarification: string;
  punishments: string;
  reasons: string;
  full_response: string;
  user_message: string;
  current_status?: string;
  follow_up?: string;
}): Promise<void> {
  const db = getTurso();
  if (!db) return;
  await ensureSchema();
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO case_records
      (id_number, name, case_summary, event_clarification, punishments, reasons, full_response, user_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.id_number || null,
      data.name || null,
      data.case_summary,
      data.event_clarification,
      data.punishments,
      data.reasons,
      data.full_response,
      data.user_message,
      now,
    ],
  });
  if (data.id_number) {
    const existing = await db.execute({
      sql: "SELECT id_number FROM persons WHERE id_number = ?",
      args: [data.id_number],
    });
    if (existing.rows.length > 0) {
      await db.execute({
        sql: `UPDATE persons SET
          name = COALESCE(?, name),
          current_status = COALESCE(?, current_status),
          follow_up = COALESCE(?, follow_up),
          updated_at = ?
          WHERE id_number = ?`,
        args: [
          data.name || null,
          data.current_status || data.punishments || null,
          data.follow_up || null,
          now,
          data.id_number,
        ],
      });
    } else {
      await db.execute({
        sql: `INSERT INTO persons (id_number, name, current_status, follow_up, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          data.id_number,
          data.name || null,
          data.current_status || data.punishments || "",
          data.follow_up || "",
          "",
          now,
          now,
        ],
      });
    }
  }
}

/** 測試模式：清除雙方在 persons / case_records 中的紀錄 */
export async function clearPartyRecords(opts: {
  idNumbers?: string[];
  names?: string[];
}): Promise<{ deletedPersons: number; deletedCases: number }> {
  const db = getTurso();
  if (!db) return { deletedPersons: 0, deletedCases: 0 };
  await ensureSchema();
  let deletedPersons = 0;
  let deletedCases = 0;
  const ids = [...new Set((opts.idNumbers || []).filter(Boolean))];
  const names = [...new Set((opts.names || []).filter((n) => n && n.length >= 2))];

  for (const id of ids) {
    const p = await db.execute({
      sql: "DELETE FROM persons WHERE id_number = ?",
      args: [id],
    });
    deletedPersons += Number(p.rowsAffected || 0);
    const c = await db.execute({
      sql: "DELETE FROM case_records WHERE id_number = ?",
      args: [id],
    });
    deletedCases += Number(c.rowsAffected || 0);
  }

  for (const name of names) {
    const p = await db.execute({
      sql: "DELETE FROM persons WHERE name = ?",
      args: [name],
    });
    deletedPersons += Number(p.rowsAffected || 0);
    const c = await db.execute({
      sql: "DELETE FROM case_records WHERE name = ?",
      args: [name],
    });
    deletedCases += Number(c.rowsAffected || 0);
  }

  return { deletedPersons, deletedCases };
}
