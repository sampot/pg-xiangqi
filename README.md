# pg-xiangqi

華語圈經典**中國象棋**：標準棋盤與走法、將軍／困斃、人機、雙人熱座與 AI 對 AI 觀戰。純前端，無建置步驟。

棋種為常見規則之實作小品，非任一商業軟體／商標復刻。

也可當作 [Playgrounds（遊樂場）](https://play.samkuo.me/) 的 **SAM**（`index.html` 入口）。規則或 AI 想再調？開進來玩，再叫 AI 幫你改一版。

## 一鍵開 SAM 小

**[一鍵開 SAM 小](https://play.samkuo.me/?open=sampot%2Fpg-xiangqi&name=%E8%B1%A1%E6%A3%8B)**

```
https://play.samkuo.me/?open=sampot/pg-xiangqi&name=象棋
```

同源會重用本機已匯入的沙盒；要強制新建可加 `&fresh=1`。

## 試玩（本機）

```bash
npx --yes serve .
# 或
python3 -m http.server 8080
```

點一下頁面後音效才會出聲。

## 操作

| 操作 | 說明 |
| --- | --- |
| 點己方棋 → 目標格 | 移動或吃子（合法格有提示） |
| 人機／雙人／AI對AI | 切換模式（會開新局） |
| 暫停／繼續 | AI 對 AI 專用；可調速度 |
| 開局 | 重新擺子 |
| 認輸 | 人機／雙人；頁內確認後對方勝 |
| 音效開／關 | 靜音 |

## 規則摘要

- 九路十列；楚河漢界；九宮內帥／將與仕／士
- 馬蹩腿、象塞象眼、炮隔子打、兵過河可橫走
- 兩將不得照面；被將軍須應；無棋可走（困斃）判負
- **長將**：不得以連續重複的著法將軍；同一將軍局面第三次重複時禁著，長將方負

## 署名

美術／音效／音樂皆 CC0，仍依專案慣例署名——見 [`ATTRIBUTION.md`](./ATTRIBUTION.md)。

## 檔案

| 檔案 | 說明 |
| --- | --- |
| `index.html` | 結構 |
| `styles.css` | 亮／暗色、行動優先 |
| `app.js` | 輸入、確認面板、AI 節奏 |
| `xiangqi.js` | 規則、將軍／困斃、簡易 AI |
| `audio.js` | Kenney 取樣＋合成備援 |
| `assets/` | 棋盤／音效／音樂 |
| `functions.js` | Playgrounds 可選 stub |

## License

程式碼 MIT；`assets/` 內素材見各目錄 `LICENSE`／`ATTRIBUTION.md`（CC0）。
