# 象棋（`pg-xiangqi`）— 遊戲規劃文檔

> **用途：** 本 repo 的遊戲權威規格——coding agent 改動前必讀：這個遊戲是什麼、規則、設計限制、優化方向。
> **整理方式：** 從本 repo 實作反向整理（2026-08-23）。**改玩法先改此檔再改碼**；本檔與程式碼衝突時，以「規則（§3）」描述的設計意圖為準回報差異。
> **上游契約：** [PG-GAME-AGENT-GUIDE.md](https://github.com/sampot/playgrounds/blob/main/docs/PG-GAME-AGENT-GUIDE.md)（唯一必讀；本檔不重複其全文）· 型錄條目 `playgrounds/catalog/entries/pg-xiangqi.yaml`

## 1. 一句話

標準九路十列中國象棋：人機三段棋力、雙人熱座與 AI 對 AI 觀戰，含將軍／困斃／長將禁手與傳統記譜；常見規則之實作小品，非任一商業軟體復刻。

## 2. 定案速覽

| 項 | 值 |
| --- | --- |
| catalog id / kind / series | `pg-xiangqi` / `game` / `桌遊` |
| status | `listed` |
| 模式 | 人機（執紅）/ 雙人熱座 / AI 對 AI（可暫停）——切換即開新局 |
| 勝負 | 將死或困斃判負；長將第三次重複禁著，僅剩長將著＝長將方負；另有認輸 |
| 對手 AI | negamax＋α-β；`easy`(depth1)／`normal`(depth2)／`hard`(depth3) |
| 素材 | 棋盤 SVG（CC0）＋Kenney 音效/音樂（CC0）；棋子為 CSS 繪製 |
| 交付形 | 純 HTML＋CSS＋ESM JS；無 build；`npx vitest run` 測試 |

## 3. 完整規則（現行實作）

### 3.1 場地與走法

- 座標 file 0–8（紅方視角左→右）、rank 0–9（紅下黑上）；紅先行。
- 帥／將：九宮內直行一步（紅 rank0–2、黑 rank7–9，file 3–5）。仕／士：九宮內斜一步。相／象：田字兩步、不可過河（紅 rank≤4、黑 rank≥5）、塞象眼（眼位有子即擋）。傌／馬：日字、蹩馬腿。俥／車：直線滑行。炮／砲：走同車、吃須隔恰好一個砲架。兵／卒：過河前只進；過河（紅 r≥5、黑 r≤4）後可橫走，永不後退。

### 3.2 合法性與終局判定

- **兩將不得照面**：同一 file 且中間無子為非法局面，任何造成照面的著法被過濾。
- 自將過濾：走後己方被將軍即非法（`legalTargets` 逐一套用檢查）。
- 無合法著時：被將軍＝**將死**；未被將軍＝**困斃**（無棋可走判負，非和）。
- **長將**：歷史以 `positionKey`（行棋方＋全盤）記錄並附 `gaveCheck`；同一局面第三次出現且其間將軍方每步都在將軍→該著為禁著（生成合法著時直接剔除）；若一方只剩長將著可走（`onlyPerpetualCheckMoves`）→ 判「長將」負。

### 3.3 記譜與訊息

- 傳統記譜：紅方用中文數字一路～九路（由紅方右至左）、黑方用阿拉伯數字 1–9（由黑方右至左）；動詞平／進／退；傌象士以目標路、車炮兵以步數收尾；同線同名棋子以前／後消歧。例：`兵九進一`、`砲2平5`。
- 狀態列顯示最後著法（含「吃×」）、「· 將軍」提示；AI 回合加前綴「電腦：」／「紅方 AI：」。

### 3.4 AI 行為（`xiangqi.js`）

- 子力值：帥 10000、車 900、炮 450、馬 400、象/士 200、兵 100；兵每進一行 +12、馬車在中央 file 2–6 加 8；對方被將 +35、己方被將 −40。
- 三段設定 `AI_LEVELS`：easy `{depth:1, blunder:0.42, topFrac:0.55, jitter:55}`、normal `{depth:2, blunder:0.08, topFrac:0.22, jitter:10}`、hard `{depth:3, 全 0}`——blunder＝直接隨機放水著；topFrac＝自評分前 N% 中隨機挑；jitter＝評分抖動；絕勝分（≥10000，將死/困斃）不稀釋必選最優。
- 搜尋：negamax＋α-β剪枝，根節點按「吃子子力＋將軍 +50」排序；將死回 `-20000−depth`、困斃/長將 `-19000−depth`（偏好快勝慢敗）；節點內也做完整合法性（含長將歷史）。
- 思考延遲（手感節奏）：easy 240ms／normal 420ms／hard 700ms ＋隨機 0–160ms（AI 對 AI 為 0–120ms）。

### 3.5 邊界處理

- 非玩家回合、AI 思考中、終局後點擊一律忽略；非法目標格給 deny 音效並取消選取。
- 認輸／開新局／切換模式皆頁內確認面板（Esc／點背景可關）；認輸後對方勝（熱座＝當前行棋方的對家勝）。
- AI 對 AI 可暫停／繼續；暫停時保留盤面與訊息「已暫停 · 可按『繼續』或開新局」。

## 4. 操作與畫面

| 輸入 | 動作 |
| --- | --- |
| 點己方棋子 | 選取並高亮全部合法格；再點自身取消 |
| 點合法格／敵子 | 移動或吃子；非法格＝deny 取消選取 |
| 棋力下拉 | 簡易／一般／高檔（人機與 AI 對 AI 共用；變更即生效於後續思考） |
| 模式鈕 ×3 | 人機／雙人／AI對AI（頁內確認後開新局） |
| 暫停／繼續 | AI 對 AI 專用 |
| 開局／認輸 | 頁內確認；認輸僅人機與雙人 |
| 音效鈕 | 開/關（僅記憶體，未持久化） |

- 棋子為 CSS 雙層圓棋（白底紅/黑圈字＋墨黑圈字＋墨綠背），疊在 `assets/boards/board.svg` 上，格子以百分比定位（viewBox `-4 -41 520 639`，GRID left32/top31/448×495）。
- HUD：回合（你勝/電腦勝/紅方/黑AI…）、將軍旗標、模式；最近一步起訖格以 `.last` 高亮。
- Mobile-first；主操作皆點擊非 hover；禁 `alert`／`confirm`／`prompt`。

## 5. 持久化（KV 權威）

- **現況：本 repo 完全沒有持久化。** 不讀寫 `/api/kv`、不使用 localStorage、`functions.js` 僅是回 JSON 的 Playgrounds stub（無 session/KV 綁定）。戰績、音效開關、難度選擇皆存於頁面記憶體，重載即失。
- 若未來加入戰績/進度：一律走 `/api/kv/{key}` 為權威（命名建議 `pg-xiangqi-*`），localStorage 只能當輕量快取。

## 6. 美術／音效／署名

- `assets/boards/board.svg`：[hartwork/xiangqi-setup](https://github.com/hartwork/xiangqi-setup) 的 CC0 主題 `clean_beta`（Sebastian Pipping），見 `assets/boards/LICENSE.txt`。
- `assets/sfx/`（click1/click2/rollover1/switch1.ogg）：Kenney UI Audio（CC0）；`assets/music/jingles_HIT05.ogg`：Kenney Music Jingles（CC0）。載入失敗自動退回 WebAudio 合成音（select/move/capture/deny/check/win/lose 七種音色表）。
- 棋子為本專案 CSS 繪製，非第三方素材。CC0 亦依專案慣例署名——新增素材拷進 `assets/`、更新 `ATTRIBUTION.md` 與各目錄 LICENSE、同步 `sam-manifest.json` files。

## 7. 測試（`npx vitest run`）

現有覆蓋（`xiangqi.test.js`，18 例）：初始盤 32 子與雙王位置、開局紅方著數 >20；馬蹩腿、象不過河、炮隔一子吃、照面偵測與移開擋子成照面；傳統記譜（fileNum 紅黑反向、`兵九進一`、`砲2平5`、`卒3進1`）；XiangqiGame 點選→位移→換手與訊息文字、車將軍事件、AI 出合法著、hard 必取一步殺而非安靜著、三段深度/放水參數遞增、aivsai 雙邊輪流行棋；長將（三次重複偵測、第三次重複將軍著被列為非法）。

改動規則/AI 必補對應邊界測試；`app.js` DOM 不在測試範圍（`globalThis.__xiangqi` 僅供手動除錯）。

## 8. 硬約束（不可違反）

1. 僅 HTML＋CSS＋JS（ESM）；**無 build**、不入庫 `node_modules`、不安套件；工具一律 `npx <pkg>` 臨時執行。
2. 禁瀏覽器原生 `alert`／`confirm`／`prompt`；確認（開局/認輸/換模式）一律頁內確認面板。
3. Mobile-first；主操作不可 hover-only。
4. 分數/進度若新增，以 `/api/kv` 為唯一權威；禁止裸 `localStorage` 當權威（現行無任何持久化）。
5. 不自行載入 `sdk.js`；本作目前連 `window.PG` 都未引用，保持零宿主依賴即可運行。
6. 改動可執行邏輯前先寫失敗測試（TDD）。
7. 檔案清單變動須同步 `sam-manifest.json`。
8. 規則引擎（`xiangqi.js`）保持純函式/DOM 無關：UI 只呼叫 engine API，終局判定與長將邏輯不得搬進 UI 層。

## 9. 優化建議（可玩性與樂趣）

依優先級；實作前先在此登記並補測試。原則：強化學習曲線與重玩誘因，不改變「標準象棋規則對抗」的核心認同。

**高優先**

1. **著法記錄列表＋悔棋**：狀態列一次只顯示一手，熱座爭議與覆盤都不便。側欄／摺疊區列出傳統記譜序列，人機與熱座提供悔棋（撤回 1–2 手，AI 模式撤到玩家手），history 已具備所需資料。
2. **戰績持久化**：勝/敗/連勝目前重載即失；以 `/api/kv/pg-xiangqi-record` 存對各難度的累積成績並在 HUD 顯示，給單機一個長期目標。
3. **新手防呆提示**：被將軍時除了音效再以視覺閃爍帥/將格；選子時若所有合法著都會送掉大子（簡易靜態偵測），首次遭遇給一行教學提示——降低初學挫折而不代打。

**中優先**

4. **提示功能（Hint）**：以 hard 深度替玩家算一手並短暫高亮，每天不限次但顯示「提示中」標記——把 AI 引擎既有能力轉化為教學功能。
5. **殘局挑關**：內建 5–8 個經典殘局（如一步殺/三步殺），通過關卡寫 KV——利用現有 `startingBoard` 之外的任意擺盤能力，創造明確的重玩階段目標。
6. **難度自適應建議**：連勝 3 場後提示升檔、連敗 3 場建議降檔（僅提示不強制），讓三段棋力形成平滑曲線。

**低優先**

7. **觸覺與視覺回饋**：將軍時 `navigator.vibrate` 短震、吃子時棋子縮放消失動畫、最新一手箭頭指示。
8. **棋譜匯出**：一鍵複製整場傳統記譜文字（已逐手格式化），方便分享與求診。
