# BalaCourt — 巴拉國線上AI法廳（LawSI）

AI 法官 **LawSI**（Ops-2.1）透過 **NVIDIA API** 審理，法規來自官方法律全文，案件與懲罰狀態存於 **Turso**。

## 環境變數

| 變數 | 說明 |
|------|------|
| `NVIDIA_API_KEY` | 必填，build.nvidia.com |
| `NVIDIA_MODEL` | 選填，預設 `nvidia/nemotron-3-ultra-550b-a55b` |
| `TURSO_DATABASE_URL` | 建議填 |
| `TURSO_AUTH_TOKEN` | 建議填 |

```bash
npm install
npm run dev
```

AI 意見僅供參考，非正式判決。
