import { readFileSync } from "fs";
import { join } from "path";

let cachedLaws: string | null = null;
let cachedPenalties: string | null = null;

function readDataFile(name: string): string {
  try {
    return readFileSync(join(process.cwd(), "src", "data", name), "utf-8");
  } catch {
    return "";
  }
}

export function getLawsText(): string {
  if (cachedLaws === null) cachedLaws = readDataFile("laws.md");
  return cachedLaws;
}

export function getPenaltiesText(): string {
  if (cachedPenalties === null) cachedPenalties = readDataFile("penalties.md");
  return cachedPenalties;
}

export function getLegalContext(maxChars = 90000): string {
  const laws = getLawsText();
  const penalties = getPenaltiesText();
  const combined = `【巴拉國法律全文】\n${laws}\n\n【巴拉國處罰內容全文】\n${penalties}`;
  if (combined.length <= maxChars) return combined;
  const criminal = laws.includes("刑字第 1 號")
    ? laws.slice(laws.indexOf("## 刑字第 1 號"))
    : laws.slice(0, Math.floor(maxChars * 0.55));
  const penPart = penalties.slice(0, Math.floor(maxChars * 0.4));
  return `【巴拉國法律（節錄）】\n${criminal.slice(0, Math.floor(maxChars * 0.55))}\n\n【巴拉國處罰內容（節錄）】\n${penPart}`;
}
