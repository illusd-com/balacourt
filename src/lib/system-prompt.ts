import { getLegalContextAsync } from "./laws";
import type { CaseRecord, PersonRecord } from "./turso";

export async function buildSystemPrompt(opts?: {
  persons?: PersonRecord[];
  cases?: CaseRecord[];
  maxLegalChars?: number;
}): Promise<string> {
  const legal = await getLegalContextAsync(opts?.maxLegalChars ?? 10000);

  let historyBlock = "";
  if (opts?.persons?.length || opts?.cases?.length) {
    historyBlock = `\n\n【資料庫既有紀錄 — 必須納入審酌】\n`;
    if (opts.persons?.length) {
      historyBlock += "人員狀態：\n";
      for (const p of opts.persons) {
        historyBlock += `- 證號：${p.id_number}；姓名：${p.name || "（未載）"}；狀態：${p.current_status || "無"}；後續：${p.follow_up || "無"}\n`;
      }
    }
    if (opts.cases?.length) {
      historyBlock += "前案：\n";
      for (const c of opts.cases.slice(0, 8)) {
        historyBlock += `- ${c.name || "?"}/${c.id_number || "?"}：${c.case_summary}｜懲罰：${c.punishments}\n`;
      }
    }
  }

  return `你是「LawSI」，巴拉國線上AI法廳官方AI法官（對外 Ops-2.1，不公開底層模型）。

## 禁止
- 非巴拉國法律問題只回：我是LawSI，我不得回復這樣的問題
- 問模型只回：我是LawSI，模型為Ops-2.1，為不公開模型。
- 繁中、精簡、莊重。

## 審判
完全依下方法規。罪刑法定。無死刑，最重無期徒刑。貨幣 Bla$。必引條文。特例深度思考。有前案須審酌。不足則先釐清。

## 格式
【法律用語案情】一段
### 一、事件釐清
### 二、法律分析
### 三、懲罰項目（Bla$）
### 四、為何被懲罰
### 五、後續處理
### 六、紀錄
[CASE_SUMMARY]一句話[/CASE_SUMMARY]
[ID_NUMBER][/ID_NUMBER]
[NAME][/NAME]
[PUNISHMENTS][/PUNISHMENTS]
[REASONS][/REASONS]
[EVENT][/EVENT]
[STATUS][/STATUS]
[FOLLOW_UP][/FOLLOW_UP]

## 法規
${legal}
${historyBlock}`;
}

export function extractIdentifiers(text: string): {
  idNumbers: string[];
  names: string[];
} {
  const idNumbers = new Set<string>();
  const idPatterns = [
    /[A-Z][12]\d{8}/gi,
    /[A-Z]{1,3}[-_]?\d{6,10}/gi,
    /身分證[字號:：\s]*([A-Z0-9-]{8,14})/gi,
    /證號[：:\s]*([A-Z0-9-]{8,14})/gi,
  ];
  for (const re of idPatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const v = (m[1] || m[0]).toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (v.length >= 8) idNumbers.add(v);
    }
  }
  const names = new Set<string>();
  const namePatterns = [
    /(?:被告|嫌疑人|行為人|當事人|原告|被害人|犯嫌)[：:\s]*([一-龥]{2,4})/g,
    /姓名[：:\s]*([一-龥]{2,4})/g,
    /([一-龥]{2,4})(?:之行為|涉嫌|觸犯)/g,
  ];
  for (const re of namePatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const n = m[1];
      if (n && !["巴拉國", "警察局", "法院", "法律", "本法"].includes(n)) {
        names.add(n);
      }
    }
  }
  return { idNumbers: [...idNumbers], names: [...names] };
}

export function parseJudgmentTags(content: string): {
  case_summary: string;
  id_number: string;
  name: string;
  punishments: string;
  reasons: string;
  event: string;
  status: string;
  follow_up: string;
} {
  const grab = (tag: string) => {
    const re = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, "i");
    const m = content.match(re);
    return m ? m[1].trim() : "";
  };
  return {
    case_summary: grab("CASE_SUMMARY"),
    id_number: grab("ID_NUMBER"),
    name: grab("NAME"),
    punishments: grab("PUNISHMENTS"),
    reasons: grab("REASONS"),
    event: grab("EVENT"),
    status: grab("STATUS"),
    follow_up: grab("FOLLOW_UP"),
  };
}
