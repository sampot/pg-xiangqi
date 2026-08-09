/**
 * Xiangqi (象棋) rules engine.
 * Coordinates: file 0–8 left→right (red's view), rank 0–9 bottom(red)→top(black).
 */

export const FILES = 9;
export const RANKS = 10;

/** @typedef {'red'|'black'} Side */
/** @typedef {'king'|'advisor'|'elephant'|'horse'|'chariot'|'cannon'|'pawn'} Kind */
/** @typedef {{ side: Side, kind: Kind }} Piece */
/** @typedef {{ f: number, r: number }} Pos */
/** @typedef {{ from: Pos, to: Pos }} Move */

export const RED_LABEL = {
  king: "帥",
  advisor: "仕",
  elephant: "相",
  horse: "傌",
  chariot: "俥",
  cannon: "炮",
  pawn: "兵",
};

export const BLACK_LABEL = {
  king: "將",
  advisor: "士",
  elephant: "象",
  horse: "馬",
  chariot: "車",
  cannon: "砲",
  pawn: "卒",
};

export function pieceLabel(p) {
  return p.side === "red" ? RED_LABEL[p.kind] : BLACK_LABEL[p.kind];
}

export function opposite(side) {
  return side === "red" ? "black" : "red";
}

export function inBounds(f, r) {
  return f >= 0 && f < FILES && r >= 0 && r < RANKS;
}

function inPalace(side, f, r) {
  if (f < 3 || f > 5) return false;
  return side === "red" ? r >= 0 && r <= 2 : r >= 7 && r <= 9;
}

function crossedRiver(side, r) {
  return side === "red" ? r >= 5 : r <= 4;
}

/** @returns {(Piece|null)[][]} */
export function emptyBoard() {
  return Array.from({ length: RANKS }, () => Array(FILES).fill(null));
}

/** @returns {(Piece|null)[][]} */
export function startingBoard() {
  const b = emptyBoard();
  /** @param {number} f @param {number} r @param {Side} side @param {Kind} kind */
  const put = (f, r, side, kind) => {
    b[r][f] = { side, kind };
  };

  const back = /** @type {[Kind, number][]} */ ([
    ["chariot", 0],
    ["horse", 1],
    ["elephant", 2],
    ["advisor", 3],
    ["king", 4],
    ["advisor", 5],
    ["elephant", 6],
    ["horse", 7],
    ["chariot", 8],
  ]);
  for (const [kind, f] of back) {
    put(f, 0, "red", kind);
    put(f, 9, "black", kind);
  }
  put(1, 2, "red", "cannon");
  put(7, 2, "red", "cannon");
  put(1, 7, "black", "cannon");
  put(7, 7, "black", "cannon");
  for (const f of [0, 2, 4, 6, 8]) {
    put(f, 3, "red", "pawn");
    put(f, 6, "black", "pawn");
  }
  return b;
}

/**
 * @param {(Piece|null)[][]} board
 * @returns {(Piece|null)[][]}
 */
export function cloneBoard(board) {
  return board.map((row) => row.map((p) => (p ? { ...p } : null)));
}

/**
 * @param {(Piece|null)[][]} board
 * @param {Side} side
 * @returns {Pos|null}
 */
export function findKing(board, side) {
  for (let r = 0; r < RANKS; r++) {
    for (let f = 0; f < FILES; f++) {
      const p = board[r][f];
      if (p && p.side === side && p.kind === "king") return { f, r };
    }
  }
  return null;
}

/**
 * Kings facing on same file with nothing between → illegal for the side to move.
 * @param {(Piece|null)[][]} board
 */
export function kingsFaceEachOther(board) {
  const rk = findKing(board, "red");
  const bk = findKing(board, "black");
  if (!rk || !bk || rk.f !== bk.f) return false;
  const lo = Math.min(rk.r, bk.r);
  const hi = Math.max(rk.r, bk.r);
  for (let r = lo + 1; r < hi; r++) {
    if (board[r][rk.f]) return false;
  }
  return true;
}

/**
 * Pseudo-legal generator (ignores self-check / flying general).
 * @param {(Piece|null)[][]} board
 * @param {number} f
 * @param {number} r
 * @returns {Pos[]}
 */
export function generatePieceTargets(board, f, r) {
  const piece = board[r][f];
  if (!piece) return [];
  const { side, kind } = piece;
  /** @type {Pos[]} */
  const out = [];

  /** @param {number} tf @param {number} tr */
  const tryEmptyOrCapture = (tf, tr) => {
    if (!inBounds(tf, tr)) return;
    const t = board[tr][tf];
    if (!t || t.side !== side) out.push({ f: tf, r: tr });
  };

  if (kind === "king") {
    for (const [df, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const tf = f + df;
      const tr = r + dr;
      if (!inPalace(side, tf, tr)) continue;
      tryEmptyOrCapture(tf, tr);
    }
    return out;
  }

  if (kind === "advisor") {
    for (const [df, dr] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const tf = f + df;
      const tr = r + dr;
      if (!inPalace(side, tf, tr)) continue;
      tryEmptyOrCapture(tf, tr);
    }
    return out;
  }

  if (kind === "elephant") {
    for (const [df, dr] of [
      [2, 2],
      [2, -2],
      [-2, 2],
      [-2, -2],
    ]) {
      const tf = f + df;
      const tr = r + dr;
      if (!inBounds(tf, tr)) continue;
      if (side === "red" && tr > 4) continue;
      if (side === "black" && tr < 5) continue;
      const eyeF = f + df / 2;
      const eyeR = r + dr / 2;
      if (board[eyeR][eyeF]) continue;
      tryEmptyOrCapture(tf, tr);
    }
    return out;
  }

  if (kind === "horse") {
    /** @type {[number, number, number, number][]} [blockF, blockR, destF, destR] */
    const hops = [
      [1, 0, 2, 1],
      [1, 0, 2, -1],
      [-1, 0, -2, 1],
      [-1, 0, -2, -1],
      [0, 1, 1, 2],
      [0, 1, -1, 2],
      [0, -1, 1, -2],
      [0, -1, -1, -2],
    ];
    for (const [blockF, blockR, destF, destR] of hops) {
      const bf = f + blockF;
      const br = r + blockR;
      if (!inBounds(bf, br) || board[br][bf]) continue;
      tryEmptyOrCapture(f + destF, r + destR);
    }
    return out;
  }

  if (kind === "chariot" || kind === "cannon") {
    for (const [df, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      let screens = 0;
      for (let step = 1; ; step++) {
        const tf = f + df * step;
        const tr = r + dr * step;
        if (!inBounds(tf, tr)) break;
        const t = board[tr][tf];
        if (kind === "chariot") {
          if (!t) {
            out.push({ f: tf, r: tr });
            continue;
          }
          if (t.side !== side) out.push({ f: tf, r: tr });
          break;
        }
        // cannon
        if (screens === 0) {
          if (!t) out.push({ f: tf, r: tr });
          else screens = 1;
        } else {
          if (!t) continue;
          if (t.side !== side) out.push({ f: tf, r: tr });
          break;
        }
      }
    }
    return out;
  }

  if (kind === "pawn") {
    const fwd = side === "red" ? 1 : -1;
    tryEmptyOrCapture(f, r + fwd);
    if (crossedRiver(side, r)) {
      tryEmptyOrCapture(f + 1, r);
      tryEmptyOrCapture(f - 1, r);
    }
  }

  return out;
}

/**
 * @param {(Piece|null)[][]} board
 * @param {Side} bySide — attacker
 * @param {Pos} target
 */
export function isSquareAttacked(board, bySide, target) {
  for (let r = 0; r < RANKS; r++) {
    for (let f = 0; f < FILES; f++) {
      const p = board[r][f];
      if (!p || p.side !== bySide) continue;
      const targets = generatePieceTargets(board, f, r);
      if (targets.some((t) => t.f === target.f && t.r === target.r)) return true;
    }
  }
  return false;
}

/**
 * @param {(Piece|null)[][]} board
 * @param {Side} side
 */
export function inCheck(board, side) {
  const king = findKing(board, side);
  if (!king) return true;
  return isSquareAttacked(board, opposite(side), king);
}

/**
 * Apply move on a cloned board (no legality checks).
 * @param {(Piece|null)[][]} board
 * @param {Move} move
 */
export function applyMove(board, move) {
  const next = cloneBoard(board);
  const piece = next[move.from.r][move.from.f];
  next[move.to.r][move.to.f] = piece;
  next[move.from.r][move.from.f] = null;
  return next;
}

/**
 * Legal moves for a piece (filters self-check and flying general).
 * @param {(Piece|null)[][]} board
 * @param {number} f
 * @param {number} r
 * @returns {Pos[]}
 */
export function legalTargets(board, f, r) {
  const piece = board[r][f];
  if (!piece) return [];
  const side = piece.side;
  /** @type {Pos[]} */
  const legal = [];
  for (const to of generatePieceTargets(board, f, r)) {
    const next = applyMove(board, { from: { f, r }, to });
    if (kingsFaceEachOther(next)) continue;
    if (inCheck(next, side)) continue;
    legal.push(to);
  }
  return legal;
}

/**
 * @param {(Piece|null)[][]} board
 * @param {Side} side
 * @returns {Move[]}
 */
export function allLegalMoves(board, side) {
  /** @type {Move[]} */
  const moves = [];
  for (let r = 0; r < RANKS; r++) {
    for (let f = 0; f < FILES; f++) {
      const p = board[r][f];
      if (!p || p.side !== side) continue;
      for (const to of legalTargets(board, f, r)) {
        moves.push({ from: { f, r }, to });
      }
    }
  }
  return moves;
}

/**
 * @param {(Piece|null)[][]} board
 * @param {Side} side
 * @returns {'playing'|'checkmate'|'stalemate'}
 */
export function outcomeFor(board, side) {
  const moves = allLegalMoves(board, side);
  if (moves.length) return "playing";
  return inCheck(board, side) ? "checkmate" : "stalemate";
}

export const MATERIAL = {
  king: 10000,
  chariot: 900,
  cannon: 450,
  horse: 400,
  elephant: 200,
  advisor: 200,
  pawn: 100,
};

/**
 * @param {(Piece|null)[][]} board
 * @param {Side} perspective
 */
export function evaluate(board, perspective) {
  let score = 0;
  for (let r = 0; r < RANKS; r++) {
    for (let f = 0; f < FILES; f++) {
      const p = board[r][f];
      if (!p) continue;
      let v = MATERIAL[p.kind];
      // Advanced pawns
      if (p.kind === "pawn") {
        if (p.side === "red") v += r * 12;
        else v += (9 - r) * 12;
      }
      // Center horse / chariot slight bonus
      if (p.kind === "horse" || p.kind === "chariot") {
        if (f >= 2 && f <= 6) v += 8;
      }
      score += p.side === perspective ? v : -v;
    }
  }
  if (inCheck(board, opposite(perspective))) score += 35;
  if (inCheck(board, perspective)) score -= 40;
  return score;
}

/**
 * Simple minimax with capture ordering; depth 2 default.
 * @param {(Piece|null)[][]} board
 * @param {Side} side
 * @param {number} [depth]
 * @returns {Move|null}
 */
export function pickAiMove(board, side, depth = 2) {
  const moves = allLegalMoves(board, side);
  if (!moves.length) return null;

  /** @param {Move} m */
  const orderKey = (m) => {
    const cap = board[m.to.r][m.to.f];
    let s = cap ? MATERIAL[cap.kind] : 0;
    const next = applyMove(board, m);
    if (inCheck(next, opposite(side))) s += 50;
    return s;
  };
  moves.sort((a, b) => orderKey(b) - orderKey(a));

  const opp = opposite(side);
  let best = moves[0];
  let bestScore = -Infinity;

  for (const m of moves) {
    const next = applyMove(board, m);
    const score = -negamax(next, opp, depth - 1, -Infinity, Infinity, side);
    // slight jitter so games vary
    const jitter = (Math.random() - 0.5) * 3;
    if (score + jitter > bestScore) {
      bestScore = score + jitter;
      best = m;
    }
  }
  return best;
}

/**
 * @param {(Piece|null)[][]} board
 * @param {Side} side to move
 * @param {number} depth
 * @param {number} alpha
 * @param {number} beta
 * @param {Side} rootSide
 */
function negamax(board, side, depth, alpha, beta, rootSide) {
  const state = outcomeFor(board, side);
  if (state === "checkmate") {
    // side to move is mated
    return side === rootSide ? -20000 - depth : 20000 + depth;
  }
  if (state === "stalemate") {
    // 困毙：無棋可走判負
    return side === rootSide ? -19000 - depth : 19000 + depth;
  }
  if (depth <= 0) return evaluate(board, rootSide) * (side === rootSide ? 1 : -1);

  const moves = allLegalMoves(board, side);
  moves.sort((a, b) => {
    const ca = board[a.to.r][a.to.f];
    const cb = board[b.to.r][b.to.f];
    return (cb ? MATERIAL[cb.kind] : 0) - (ca ? MATERIAL[ca.kind] : 0);
  });

  let best = -Infinity;
  for (const m of moves) {
    const next = applyMove(board, m);
    const score = -negamax(next, opposite(side), depth - 1, -beta, -alpha, rootSide);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export class XiangqiGame {
  constructor() {
    this.reset("ai");
  }

  /**
   * @param {'ai'|'hotseat'} [mode]
   * @param {Side} [playerSide] — in AI mode, human side (default red)
   */
  reset(mode = "ai", playerSide = "red") {
    /** @type {(Piece|null)[][]} */
    this.board = startingBoard();
    /** @type {'ai'|'hotseat'} */
    this.mode = mode;
    /** @type {Side} */
    this.playerSide = playerSide;
    /** @type {Side} */
    this.turn = "red";
    /** @type {'playing'|'win'|'lose'|'draw'} */
    this.status = "playing";
    /** @type {Pos|null} */
    this.selected = null;
    /** @type {Move|null} */
    this.lastMove = null;
    this.message = mode === "ai" ? "紅方先行 · 點選己方棋子" : "紅方先行 · 雙人輪流";
    this.aiThinking = false;
    this.moveCount = 0;
    this.inCheckFlag = false;
  }

  get aiSide() {
    return opposite(this.playerSide);
  }

  at(f, r) {
    if (!inBounds(f, r)) return null;
    return this.board[r][f];
  }

  isHumanTurn() {
    if (this.status !== "playing" || this.aiThinking) return false;
    if (this.mode === "hotseat") return true;
    return this.turn === this.playerSide;
  }

  highlights() {
    if (!this.selected) return [];
    return legalTargets(this.board, this.selected.f, this.selected.r);
  }

  /**
   * @param {number} f
   * @param {number} r
   * @returns {{ events: string[], ok: boolean }}
   */
  click(f, r) {
    /** @type {string[]} */
    const events = [];
    if (!this.isHumanTurn() || !inBounds(f, r)) return { events, ok: false };

    const piece = this.at(f, r);
    const humanSide = this.mode === "hotseat" ? this.turn : this.playerSide;

    if (piece && piece.side === humanSide) {
      if (this.selected && this.selected.f === f && this.selected.r === r) {
        this.selected = null;
        return { events, ok: true };
      }
      this.selected = { f, r };
      events.push("select");
      return { events, ok: true };
    }

    if (this.selected) {
      const from = this.selected;
      const legal = legalTargets(this.board, from.f, from.r);
      const hit = legal.find((t) => t.f === f && t.r === r);
      if (!hit) {
        this.selected = null;
        events.push("deny");
        return { events, ok: false };
      }
      const captured = this.at(f, r);
      this._commitMove({ from, to: { f, r } }, events);
      if (captured) events.push("capture");
      else events.push("move");
      return { events, ok: true };
    }

    return { events, ok: false };
  }

  /**
   * @param {Move} move
   * @param {string[]} events
   */
  _commitMove(move, events) {
    const mover = this.at(move.from.f, move.from.r);
    const captured = this.at(move.to.f, move.to.r);
    this.board = applyMove(this.board, move);
    this.lastMove = move;
    this.selected = null;
    this.moveCount += 1;

    const label = mover ? pieceLabel(mover) : "?";
    const capLabel = captured ? pieceLabel(captured) : "";
    this.message = capLabel ? `${label} 吃 ${capLabel}` : `${label} 移動`;

    const next = opposite(this.turn);
    const state = outcomeFor(this.board, next);
    this.inCheckFlag = inCheck(this.board, next);

    if (state === "checkmate" || state === "stalemate") {
      const winner = this.turn;
      if (this.mode === "hotseat") {
        this.status = "win";
        this.message =
          state === "checkmate"
            ? `${winner === "red" ? "紅" : "黑"}方將死獲勝`
            : `${winner === "red" ? "紅" : "黑"}方困斃獲勝`;
        events.push("win");
      } else if (winner === this.playerSide) {
        this.status = "win";
        this.message = state === "checkmate" ? "將軍！你贏了" : "對方困斃，你贏了";
        events.push("win");
      } else {
        this.status = "lose";
        this.message = state === "checkmate" ? "被將死了" : "無棋可走，你輸了";
        events.push("lose");
      }
      return;
    }

    this.turn = next;
    if (this.inCheckFlag) {
      this.message += " · 將軍";
      events.push("check");
    }
  }

  /**
   * AI plays one move for aiSide.
   * @param {number} [depth]
   * @returns {{ events: string[] }}
   */
  aiMove(depth = 2) {
    /** @type {string[]} */
    const events = [];
    if (this.status !== "playing" || this.mode !== "ai") return { events };
    if (this.turn !== this.aiSide) return { events };

    const move = pickAiMove(this.board, this.aiSide, depth);
    if (!move) {
      this.status = "win";
      this.message = "電腦無棋可走，你贏了";
      events.push("win");
      return { events };
    }
    const captured = this.at(move.to.f, move.to.r);
    this._commitMove(move, events);
    if (this.status === "playing") {
      this.message = captured ? "電腦吃子" : "電腦移動了一子";
      if (this.inCheckFlag) this.message += " · 將軍";
    }
    if (captured && !events.includes("capture")) events.push("capture");
    else if (!captured && !events.includes("move")) events.push("move");
    return { events };
  }
}
