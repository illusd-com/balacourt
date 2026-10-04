import { getTurso, ensureSchema } from "./turso";

export type HearingMessage = { role: "user" | "assistant"; content: string };

export type HearingSlip = {
  id: string;
  status: "open" | "closed";
  defendant: string;
  plaintiff: string;
  defendant_id: string | null;
  plaintiff_id: string | null;
  test_mode: number;
  summary_title: string | null;
  messages_json: string;
  legal_text: string | null;
  judgment: string | null;
  previous_slip_id: string | null;
  created_at: string;
  closed_at: string | null;
};

export function generateHearingId(): string {
  let s = "";
  for (let i = 0; i < 15; i++) {
    s += Math.floor(Math.random() * 10).toString();
  }
  if (s[0] === "0") s = "1" + s.slice(1);
  return s;
}

export function redactIdNumbers(text: string): string {
  if (!text) return text;
  return text
    .replace(/[A-Z][12]\d{8}/gi, "＊＊＊＊＊＊＊＊＊")
    .replace(/[A-Z]{1,3}[-_]?\d{6,10}/gi, "＊＊＊＊＊＊＊＊＊")
    .replace(/(身分證[字號:：\s]*)([A-Z0-9-]{8,14})/gi, "$1＊＊＊＊＊＊＊＊＊")
    .replace(/(證號[：:\s]*)([A-Z0-9-]{8,14})/gi, "$1＊＊＊＊＊＊＊＊＊");
}

export function parseMessages(json: string | null): HearingMessage[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function ensureHearingSchema(): Promise<void> {
  const db = getTurso();
  if (!db) return;
  await ensureSchema();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS hearing_slips (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'open',
      defendant TEXT NOT NULL,
      plaintiff TEXT NOT NULL,
      defendant_id TEXT,
      plaintiff_id TEXT,
      test_mode INTEGER NOT NULL DEFAULT 0,
      summary_title TEXT,
      messages_json TEXT NOT NULL DEFAULT '[]',
      legal_text TEXT,
      judgment TEXT,
      previous_slip_id TEXT,
      created_at TEXT NOT NULL,
      closed_at TEXT
    )
  `);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_hearing_status ON hearing_slips(status)`
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_hearing_title ON hearing_slips(summary_title)`
  );
}

export async function createHearingSlip(data: {
  defendant: string;
  plaintiff: string;
  defendantId?: string;
  plaintiffId?: string;
  testMode?: boolean;
  previousSlipId?: string;
}): Promise<HearingSlip | null> {
  const db = getTurso();
  if (!db) return null;
  await ensureHearingSchema();

  let id = generateHearingId();
  for (let i = 0; i < 5; i++) {
    const exists = await db.execute({
      sql: "SELECT id FROM hearing_slips WHERE id = ?",
      args: [id],
    });
    if (exists.rows.length === 0) break;
    id = generateHearingId();
  }

  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO hearing_slips
      (id, status, defendant, plaintiff, defendant_id, plaintiff_id, test_mode, messages_json, previous_slip_id, created_at)
      VALUES (?, 'open', ?, ?, ?, ?, ?, '[]', ?, ?)`,
    args: [
      id,
      data.defendant,
      data.plaintiff,
      data.defendantId || null,
      data.plaintiffId || null,
      data.testMode ? 1 : 0,
      data.previousSlipId || null,
      now,
    ],
  });

  return getHearingSlip(id, { publicView: false });
}

export async function getHearingSlip(
  id: string,
  _opts?: { publicView?: boolean }
): Promise<HearingSlip | null> {
  const db = getTurso();
  if (!db) return null;
  await ensureHearingSchema();
  const r = await db.execute({
    sql: "SELECT * FROM hearing_slips WHERE id = ?",
    args: [id],
  });
  if (!r.rows.length) return null;
  const row = r.rows[0] as unknown as HearingSlip;

  if (row.status === "closed") {
    return {
      ...row,
      defendant_id: null,
      plaintiff_id: null,
      messages_json: redactIdNumbers(row.messages_json || "[]"),
      legal_text: row.legal_text ? redactIdNumbers(row.legal_text) : null,
      judgment: row.judgment ? redactIdNumbers(row.judgment) : null,
    };
  }
  return row;
}

export async function updateHearingMessages(
  id: string,
  messages: HearingMessage[]
): Promise<void> {
  const db = getTurso();
  if (!db) return;
  await ensureHearingSchema();
  await db.execute({
    sql: "UPDATE hearing_slips SET messages_json = ? WHERE id = ? AND status = 'open'",
    args: [JSON.stringify(messages), id],
  });
}

export async function closeHearingSlip(data: {
  id: string;
  messages: HearingMessage[];
  legalText?: string;
  judgment: string;
  summaryTitle: string;
}): Promise<HearingSlip | null> {
  const db = getTurso();
  if (!db) return null;
  await ensureHearingSchema();
  const now = new Date().toISOString();
  await db.execute({
    sql: `UPDATE hearing_slips SET
      status = 'closed',
      messages_json = ?,
      legal_text = ?,
      judgment = ?,
      summary_title = ?,
      closed_at = ?,
      defendant_id = NULL,
      plaintiff_id = NULL
      WHERE id = ?`,
    args: [
      JSON.stringify(data.messages),
      data.legalText || null,
      data.judgment,
      data.summaryTitle,
      now,
      data.id,
    ],
  });
  return getHearingSlip(data.id, { publicView: true });
}

export async function listClosedHearings(opts?: {
  q?: string;
  limit?: number;
}): Promise<HearingSlip[]> {
  const db = getTurso();
  if (!db) return [];
  await ensureHearingSchema();
  const limit = opts?.limit ?? 50;
  const q = (opts?.q || "").trim();

  if (q) {
    const r = await db.execute({
      sql: `SELECT * FROM hearing_slips
        WHERE status = 'closed'
          AND (id = ? OR summary_title LIKE ? OR defendant LIKE ? OR plaintiff LIKE ?)
        ORDER BY closed_at DESC LIMIT ?`,
      args: [q, `%${q}%`, `%${q}%`, `%${q}%`, limit],
    });
    return r.rows.map((row) => {
      const s = row as unknown as HearingSlip;
      return {
        ...s,
        defendant_id: null,
        plaintiff_id: null,
        messages_json: redactIdNumbers(s.messages_json || "[]"),
        legal_text: s.legal_text ? redactIdNumbers(s.legal_text) : null,
        judgment: s.judgment ? redactIdNumbers(s.judgment) : null,
      };
    });
  }

  const r = await db.execute({
    sql: `SELECT * FROM hearing_slips WHERE status = 'closed' ORDER BY closed_at DESC LIMIT ?`,
    args: [limit],
  });
  return r.rows.map((row) => {
    const s = row as unknown as HearingSlip;
    return {
      ...s,
      defendant_id: null,
      plaintiff_id: null,
      messages_json: redactIdNumbers(s.messages_json || "[]"),
      legal_text: s.legal_text ? redactIdNumbers(s.legal_text) : null,
      judgment: s.judgment ? redactIdNumbers(s.judgment) : null,
    };
  });
}
