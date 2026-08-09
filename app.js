import { XiangqiAudio } from "./audio.js";
import { XiangqiGame, FILES, RANKS, pieceLabel } from "./xiangqi.js";

/** clean_beta board.ini against viewBox 542×589 */
const BOARD_W = 542;
const BOARD_H = 589;
const GRID = { left: 32, top: 31, width: 448, height: 495 };
const STEP_X = GRID.width / 8;
const STEP_Y = GRID.height / 9;

const audio = new XiangqiAudio();
const game = new XiangqiGame();
globalThis.__xiangqi = game;

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const turnEl = document.getElementById("turn");
const checkEl = document.getElementById("check");
const modeEl = document.getElementById("mode");
const btnMute = document.getElementById("btn-mute");
const btnNew = document.getElementById("btn-new");
const btnResign = document.getElementById("btn-resign");
const btnModeAi = document.getElementById("btn-mode-ai");
const btnModeHot = document.getElementById("btn-mode-hot");
const confirmEl = document.getElementById("confirm");
const confirmTitle = document.getElementById("confirm-title");
const confirmBody = document.getElementById("confirm-body");
const confirmOk = document.getElementById("confirm-ok");
const confirmCancel = document.getElementById("confirm-cancel");

/** @type {ReturnType<typeof setTimeout> | null} */
let aiTimer = null;
/** @type {null | (() => void)} */
let confirmAction = null;

/**
 * @param {number} f
 * @param {number} r
 */
function pointStyle(f, r) {
  const x = GRID.left + f * STEP_X;
  const y = GRID.top + (9 - r) * STEP_Y;
  return {
    left: `${(x / BOARD_W) * 100}%`,
    top: `${(y / BOARD_H) * 100}%`,
  };
}

function pieceSrc(side, kind) {
  return `./assets/pieces/${side}_${kind}.svg`;
}

function setStatus(msg, tone = "") {
  statusEl.textContent = msg;
  statusEl.dataset.tone = tone;
}

function syncHud() {
  if (game.status === "win") {
    turnEl.textContent = game.mode === "hotseat" ? "終局" : "你勝";
  } else if (game.status === "lose") {
    turnEl.textContent = "電腦勝";
  } else if (game.aiThinking) {
    turnEl.textContent = "電腦思考";
  } else {
    turnEl.textContent = game.turn === "red" ? "紅方" : "黑方";
  }
  checkEl.textContent = game.inCheckFlag && game.status === "playing" ? "將軍" : "—";
  modeEl.textContent = game.mode === "ai" ? "人機" : "雙人";
  btnModeAi.setAttribute("aria-pressed", game.mode === "ai" ? "true" : "false");
  btnModeHot.setAttribute("aria-pressed", game.mode === "hotseat" ? "true" : "false");
  const tone =
    game.status === "win" ? "win" : game.status === "lose" ? "lose" : game.inCheckFlag ? "warn" : "";
  setStatus(game.message, tone);
}

/**
 * @param {string[]} events
 */
function handleEvents(events) {
  for (const e of events) {
    if (e === "select") audio.select();
    else if (e === "move") audio.move();
    else if (e === "capture") audio.capture();
    else if (e === "deny") audio.deny();
    else if (e === "check") audio.check();
    else if (e === "win") audio.win();
    else if (e === "lose") audio.lose();
  }
}

function scheduleAi() {
  if (aiTimer) clearTimeout(aiTimer);
  if (game.status !== "playing" || game.mode !== "ai") return;
  if (game.turn !== game.aiSide) return;
  game.aiThinking = true;
  syncHud();
  renderBoard();
  aiTimer = setTimeout(() => {
    const { events } = game.aiMove(2);
    game.aiThinking = false;
    handleEvents(events);
    syncHud();
    renderBoard();
    if (game.status === "playing" && game.turn === game.aiSide) scheduleAi();
  }, 380 + Math.random() * 280);
}

function renderBoard() {
  const highlights = game.highlights();
  const hi = new Set(highlights.map((h) => `${h.f},${h.r}`));
  const sel = game.selected;
  const last = game.lastMove;

  boardEl.replaceChildren();

  for (let r = 0; r < RANKS; r++) {
    for (let f = 0; f < FILES; f++) {
      const key = `${f},${r}`;
      const pos = pointStyle(f, r);
      const hit = document.createElement("button");
      hit.type = "button";
      hit.className = "cell";
      hit.style.left = pos.left;
      hit.style.top = pos.top;
      hit.dataset.f = String(f);
      hit.dataset.r = String(r);
      hit.setAttribute("aria-label", `檔 ${f + 1} 列 ${r + 1}`);
      if (sel && sel.f === f && sel.r === r) hit.classList.add("selected");
      if (hi.has(key)) hit.classList.add("legal");
      if (
        last &&
        ((last.from.f === f && last.from.r === r) ||
          (last.to.f === f && last.to.r === r))
      ) {
        hit.classList.add("last");
      }
      const piece = game.at(f, r);
      if (piece) {
        const img = document.createElement("img");
        img.src = pieceSrc(piece.side, piece.kind);
        img.alt = pieceLabel(piece);
        img.draggable = false;
        hit.appendChild(img);
        hit.classList.add("has-piece", piece.side);
      }
      boardEl.appendChild(hit);
    }
  }
}

/**
 * @param {string} title
 * @param {string} body
 * @param {() => void} onOk
 */
function askConfirm(title, body, onOk) {
  confirmTitle.textContent = title;
  confirmBody.textContent = body;
  confirmAction = onOk;
  confirmEl.hidden = false;
  confirmOk.focus();
}

function closeConfirm() {
  confirmEl.hidden = true;
  confirmAction = null;
}

boardEl.addEventListener("click", async (e) => {
  await audio.unlock();
  const t = e.target;
  if (!(t instanceof Element)) return;
  const btn = t.closest("button.cell");
  if (!btn || !boardEl.contains(btn)) return;
  const f = Number(btn.dataset.f);
  const r = Number(btn.dataset.r);
  if (game.aiThinking || !game.isHumanTurn()) return;
  const { events, ok } = game.click(f, r);
  handleEvents(events);
  syncHud();
  renderBoard();
  if (ok && game.mode === "ai" && game.turn === game.aiSide && game.status === "playing") {
    scheduleAi();
  }
});

btnNew.addEventListener("click", async () => {
  await audio.unlock();
  askConfirm("開新局？", "目前對局進度會清空。", () => {
    if (aiTimer) clearTimeout(aiTimer);
    game.aiThinking = false;
    game.reset(game.mode, "red");
    syncHud();
    renderBoard();
    closeConfirm();
  });
});

btnResign.addEventListener("click", async () => {
  await audio.unlock();
  if (game.status !== "playing") return;
  askConfirm("認輸？", "確定後對方獲勝。", () => {
    if (aiTimer) clearTimeout(aiTimer);
    game.aiThinking = false;
    if (game.mode === "ai") {
      game.status = "lose";
      game.message = "你認輸了";
      handleEvents(["lose"]);
    } else {
      const winner = game.turn === "red" ? "黑" : "紅";
      game.status = "win";
      game.message = `${winner}方獲勝（對手認輸）`;
      handleEvents(["win"]);
    }
    syncHud();
    renderBoard();
    closeConfirm();
  });
});

btnModeAi.addEventListener("click", async () => {
  await audio.unlock();
  if (game.mode === "ai") return;
  askConfirm("改為人機？", "將開新局，你執紅、電腦執黑。", () => {
    if (aiTimer) clearTimeout(aiTimer);
    game.reset("ai", "red");
    syncHud();
    renderBoard();
    closeConfirm();
  });
});

btnModeHot.addEventListener("click", async () => {
  await audio.unlock();
  if (game.mode === "hotseat") return;
  askConfirm("改為雙人熱座？", "將開新局，紅黑輪流同機下棋。", () => {
    if (aiTimer) clearTimeout(aiTimer);
    game.reset("hotseat", "red");
    syncHud();
    renderBoard();
    closeConfirm();
  });
});

confirmOk.addEventListener("click", () => {
  const fn = confirmAction;
  if (fn) fn();
});

confirmCancel.addEventListener("click", () => closeConfirm());

confirmEl.addEventListener("click", (e) => {
  if (e.target === confirmEl) closeConfirm();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !confirmEl.hidden) closeConfirm();
});

btnMute.addEventListener("click", async () => {
  await audio.unlock();
  audio.setEnabled(!audio.enabled);
  btnMute.textContent = audio.enabled ? "音效開" : "音效關";
  btnMute.setAttribute("aria-pressed", audio.enabled ? "true" : "false");
});

document.body.addEventListener(
  "pointerdown",
  () => {
    void audio.unlock();
  },
  { once: true },
);

syncHud();
renderBoard();
