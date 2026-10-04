import { readFileSync } from "fs";
import { join } from "path";

const LAWS_URL =
  "https://raw.githubusercontent.com/illusd/blapolice-file/main/docs/laws.md";
const PENALTIES_URL =
  "https://raw.githubusercontent.com/illusd/blapolice-file/main/docs/penalties.md";

let cachedLaws: string | null = null;
let cachedPenalties: string | null = null;

/** 巴拉國貨幣單位統一為 Bla$ */
function normalizeCurrency(text: string): string {
  return text
    .replace(/巴拉幣（BD）/g, "Bla$")
    .replace(/巴拉幣/g, "Bla$")
    .replace(/\bBD\s*/g, "Bla$ ");
}

function readDataFile(name: string): string {
  try {
    return readFileSync(join(process.cwd(), "src", "data", name), "utf-8");
  } catch {
    return "";
  }
}

async function fetchRemote(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

export function getLawsText(): string {
  if (cachedLaws === null) cachedLaws = normalizeCurrency(readDataFile("laws.md"));
  return cachedLaws;
}

export function getPenaltiesText(): string {
  if (cachedPenalties === null)
    cachedPenalties = normalizeCurrency(readDataFile("penalties.md"));
  return cachedPenalties;
}

export async function getLawsTextAsync(): Promise<string> {
  let text = getLawsText();
  if (!text) {
    text = await fetchRemote(LAWS_URL);
    if (text) cachedLaws = normalizeCurrency(text);
  }
  return text;
}

export async function getPenaltiesTextAsync(): Promise<string> {
  let text = getPenaltiesText();
  if (!text) {
    text = await fetchRemote(PENALTIES_URL);
    if (text) cachedPenalties = normalizeCurrency(text);
  }
  return text;
}

function combineLegal(laws: string, penalties: string, maxChars: number): string {
  const combined = `【巴拉國法律全文】\n${laws}\n\n【巴拉國處罰內容全文】\n${penalties}`;
  if (combined.length <= maxChars) return combined;
  const criminal = laws.includes("刑字第 1 號")
    ? laws.slice(laws.indexOf("## 刑字第 1 號"))
    : laws.slice(0, Math.floor(maxChars * 0.55));
  const penPart = penalties.slice(0, Math.floor(maxChars * 0.4));
  return `【巴拉國法律（節錄）】\n${criminal.slice(0, Math.floor(maxChars * 0.55))}\n\n【巴拉國處罰內容（節錄）】\n${penPart}`;
}

export async function getLegalContextAsync(maxChars = 45000): Promise<string> {
  const laws = await getLawsTextAsync();
  const penalties = await getPenaltiesTextAsync();
  if (!laws && !penalties) {
    return "【法規說明】暫時無法載入法規全文。請依罪刑法定、不設死刑、最重無期徒刑原則審理，並引用巴拉國官方條號。貨幣單位為 Bla$。";
  }
  return combineLegal(laws, penalties, maxChars);
}

export function getLegalContext(maxChars = 45000): string {
  const laws = getLawsText();
  const penalties = getPenaltiesText();
  if (!laws && !penalties) {
    return "【法規說明】本機未附法規檔，請改用 getLegalContextAsync 遠端載入。貨幣單位為 Bla$。";
  }
  return combineLegal(laws, penalties, maxChars);
}
