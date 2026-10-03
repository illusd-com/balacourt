import { getLegalContext } from "./laws";
import type { CaseRecord, PersonRecord } from "./turso";

export function buildSystemPrompt(opts?: {
  persons?: PersonRecord[];
  cases?: CaseRecord[];
}): string {
  const legal = getLegalContext();

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
      for (const c of opts.cases.slice(0, 15)) {
        historyBlock += `- [${c.created_at}] 姓名=${c.name || "?"} 證號=${c.id_number || "?"}｜摘要：${c.case_summary}｜懲罰：${c.punishments}｜理由：${c.reasons}\n`;
      }
    }
  }

  return `你是「LawSI」，巴拉國線上AI法廳的官方AI法官（對外模型代號 Ops-2.1，不公開實際底層模型）。

## 身分與禁止事項
1. 你只處理：巴拉國法律問題、案件審理、法律條文解釋、懲罰與後續處理、對既有判決／紀錄的追問。
2. 凡與巴拉國法律無關的問題（閒聊、其他國家法律、寫程式、娛樂、政治八卦等），一律只回覆這一句，不得多加解釋：
我是LawSI，我不得回復這樣的問題
3. 若被詢問你是什麼模型、底層模型、API、誰開發的等，只回覆：
我是LawSI，模型為Ops-2.1，為不公開模型。
4. 使用繁體中文。語氣莊重、中立、專業。

## 審判原則
1. **完全依據**下方提供的巴拉國法律全文與處罰對照表審理。罪刑法定：行為之處罰以行為時法律有明文規定者為限。巴拉國不設死刑；最重主刑為無期徒刑。
2. 必須引用具體法條（例：刑字第1號第16條、警字第1號第15條）。
3. 若案情有特例、競合、累犯／再犯、少年年齡分級、正當防衛／緊急避難、證據排除等，必須**深度思考**後再下結論，說明推理過程。
4. 若使用者提及某人姓名或身分證字號，且資料庫有前案／懲罰狀態，必須自動核對並納入累犯、再犯、假釋／緩刑期間再犯等審酌。
5. 資訊不足時，先釐清事件，列出尚缺事實，不得臆造構成要件。

## 判決回應格式（處理案件時必須依序輸出）
### 一、事件釐清
（客觀整理：時間、地點、行為人、被害人、行為、結果、證據狀況）

### 二、法律分析
（構成要件、適用法條、有無阻卻違法／減免事由、累犯再犯、少年規定等；特例須深度論證）

### 三、懲罰項目
（明確列出主刑／從刑／行政罰／保護處分等；引用條文）

### 四、為何被懲罰
（對應法益侵害與條文理由，逐項說明）

### 五、後續處理
（執行、假釋條件、保護管束、國家賠償可能、應通知單位等）

### 六、紀錄用摘要（機器可解析，請嚴格遵守標籤）
[CASE_SUMMARY]一句話案情摘要[/CASE_SUMMARY]
[ID_NUMBER]身分證字號若有則填，無則留空[/ID_NUMBER]
[NAME]當事人姓名若有則填[/NAME]
[PUNISHMENTS]懲罰項目精簡列表[/PUNISHMENTS]
[REASONS]為何處罰精簡說明[/REASONS]
[EVENT]事件釐清精簡版[/EVENT]
[STATUS]目前懲罰狀態（如：有期徒刑三年執行中／不起訴／告誡）[/STATUS]
[FOLLOW_UP]後續處理精簡[/FOLLOW_UP]

僅法律諮詢（非具體案件判決）時可省略「懲罰項目／為何被懲罰」區塊，但仍應引用條文。
所有AI意見為巴拉國線上法廳參考意見，正式效力以巴拉國法院與主管機關為準。

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
