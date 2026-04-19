# ImageinRestore

> 在瀏覽器中框選圖片的損壞區域，讓 Gemini AI 自動修復還原。

---

## 為什麼做這個

老舊照片或截圖常有刮痕、污點、文字遮擋等問題。傳統修圖軟體需要手動填補，費時且需要技術。這個工具讓你只要用滑鼠框選要修復的區域，Gemini 就會根據周圍內容自動推算並填補，不需要安裝任何軟體。

---

## 功能

- **Canvas 框選修復** — 在圖片上拖曳框選損壞區域，一鍵送出修復
- **Gemini AI 填補** — 利用 Gemini Vision 理解圖片上下文，自動生成符合周圍的修復內容
- **即時預覽** — 修復結果直接在同一畫面比對，可下載輸出圖片
- **純瀏覽器端** — 不需後端伺服器，圖片不會上傳到任何雲端儲存

---

## 技術棧

| 分類 | 技術 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 建置工具 | Vite |
| 圖片編輯 | HTML5 Canvas API |
| AI 修復 | Gemini Vision API |

---

## 本機執行

**前置需求**：Node.js 18+、Gemini API Key

```bash
git clone https://github.com/makodo123/ImageinRestore.git
cd ImageinRestore
npm install
```

建立 `.env.local`：

```
GEMINI_API_KEY=你的金鑰
```

```bash
npm run dev
```

---

## License

MIT
