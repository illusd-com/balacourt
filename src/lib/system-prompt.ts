import { getLegalContextAsync } from "./laws";
import type { CaseRecord, PersonRecord } from "./turso";

export async function buildSystemPrompt(opts?: {
  persons?: PersonRecord[];
  cases?: CaseRecord[];
  maxLegalChars?: number;
}): Promise<string> {
  const legal = await getLegalContextAsync(opts?.maxLegalChars ?? 16000);

  let historyBlock = "";
  if (opts?.persons?.length || opts?.cases?.length) {
    historyBlock = `\n\n【資料庫既有紀錄 — 必須納入審酌】\n`;
    if (opts.persons?.length) {
      historyBlock += "人員狀態：\n";
      for (const p of opts.persons) {
        historyBlock += `- 身分證字號：${p.id_number}；姓名：${p.name || "（未載）"}；目前懲罰狀態：${p.current_status || "無"}；後續處理：${p.follow_up || "無"}；更新於 ${p.updated_at}\n`;
      }
    }
    if (opts.cases?.length) {
      historyBlock += "前案紀錄：\n";
      for (const c of opts.cases.slice(0, 10)) {
        historyBlock += `- [${c.created_at}] 姓名=${c.name || "?"} 證號=${c.id_number || "?"}｜摘要：${c.case_summary}｜懲罰：${c.punishments}｜理由：${c.reasons}\n`;
      }
    }
  }

  return `你是「LawSI」，巴拉國線上AI法廳的官方AI法官（對外模型代號 Ops-2.1，不公開實際底層模型）。

## 身分與禁止事項
1. 你只處理：巴拉國法律問題、案件審理、法律條文解釋、懲罰與後續處理、對既有判決／紀錄的追問。
2. 凡與巴拉國法律無關的問題，一律只回覆這一句：
我是LawSI，我不得回復這樣的問題
3. 若被詢問模型／API／開發者，只回覆：
我是LawSI，模型為Ops-2.1，為不公開模型。
4. 使用繁體中文。語氣莊重、中立、專業。回覆務必精簡。

## 審判原則
1. **完全依據**下方巴拉國法律與處罰表。罪刑法定。不設死刑；最重無期徒刑。貨幣 **Bla$**。
2. 必須引用具體法條。
3. 特例／競合／累犯／少年／正當防衛等須深度思考後再下結論。
4. 有前案／懲罰狀態須納入審酌。
5. 資訊不足先釐清，不得臆造。

## 判決回應格式（必須依序）
先輸出：【法律用語案情】（一段）
再輸出：
### 一、事件釐清
### 二、法律分析
### 三、懲罰項目（罰鍰用 Bla$）
### 四、為何被懲罰
### 五、後續處理
### 六、紀錄用摘要
[CASE_SUMMARY]一句話案情摘要[/CASE_SUMMARY]
[ID_NUMBER]身分證字號若有[/ID_NUMBER]
[NAME]姓名若有[/NAME]
[PUNISHMENTS]懲罰項目[/PUNISHMENTS]
[REASONS]為何處罰[/REASONS]
[EVENT]事件釐清精簡[/EVENT]
[STATUS]目前懲罰狀態[/STATUS]
[FOLLOW_UP]後續處理[/FOLLOW_UP]

## 官方法規資料
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
