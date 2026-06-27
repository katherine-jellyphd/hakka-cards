# 僑界名片簿

僑界社團用的名片管理 PWA App。

## 功能

- 手機拍照或上傳名片照片，AI 自動辨識（支援一張照片多張名片）
- 智慧合併重複聯絡人（正反面自動偵測）
- 電話智慧去重（不同格式的同一號碼自動合併）
- 電話一鍵撥打、Email 一鍵寄信、社群連結一鍵開啟
- 「認識場合」欄位 + 批量編輯（選取多人一次設定場合）
- 群組寄信（mailto BCC，支援選取特定聯絡人）
- 匯出 Google 聯絡人 CSV（支援選取匯出，自動建立群組標籤）
- 前端密碼保護
- PWA 支援（可加到 iPhone 主畫面當獨立 App）

## 技術

- 前端：React 18 + Babel CDN（單一 `index.html`）
- 後端：Vercel Serverless Function（`api/extract.js`）
- AI：Claude Sonnet Vision（名片辨識）
- 資料庫：Supabase（`hakka_contacts` table）
- 部署：Vercel（自動從 GitHub deploy）

## 設定

- 預設密碼：`hakka2026`（可在 App 設定裡修改）
- Anthropic API Key 存在 Vercel 環境變數 `ANTHROPIC_API_KEY`
- API 驗證 token 存在 Vercel 環境變數 `API_SECRET`（預設 `hakka-cards-2026`）
