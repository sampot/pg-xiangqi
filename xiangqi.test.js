import { describe, expect, it } from "vitest";
import {
  XiangqiGame,
  startingBoard,
  allLegalMoves,
  legalTargets,
  applyMove,
  inCheck,
  outcomeFor,
  findKing,
  generatePieceTargets,
  kingsFaceEachOther,
} from "./xiangqi.js";

describe("xiangqi starting position", () => {
  it("has 32 pieces and both kings", () => {
    const b = startingBoard();
    let n = 0;
    for (const row of b) for (const p of row) if (p) n += 1;
    expect(n).toBe(32);
    expect(findKing(b, "red")).toEqual({ f: 4, r: 0 });
    expect(findKing(b, "black")).toEqual({ f: 4, r: 9 });
  });

  it("red has many opening moves", () => {
    const moves = allLegalMoves(startingBoard(), "red");
    expect(moves.length).toBeGreaterThan(20);
  });
});

describe("piece rules", () => {
  it("horse is blocked by hobbling point", () => {
    const b = startingBoard();
    // red horse at (1,0); block at (1,1) empty initially — move pawn? 
    // Place a blocker at (2,0) wait - horse at f=1: block right is (2,0) which is elephant
    const targets = generatePieceTargets(b, 1, 0);
    // blocked toward center by elephant at (2,0); can go to (0,2) if path clear — block up is (1,1) empty, dest (0,2)/(2,2)
    // (2,2) empty, (0,2) empty
    expect(targets.some((t) => t.f === 0 && t.r === 2)).toBe(true);
    expect(targets.some((t) => t.f === 2 && t.r === 2)).toBe(true);
    // cannot jump over elephant to (3,1)
    expect(targets.some((t) => t.f === 3 && t.r === 1)).toBe(false);
  });

  it("elephant cannot cross river", () => {
    const b = startingBoard();
    // clear eye and path for red elephant at (2,0) toward (4,2)
    b[1][3] = null;
    const targets = legalTargets(b, 2, 0);
    expect(targets.every((t) => t.r <= 4)).toBe(true);
  });

  it("cannon captures over exactly one screen", () => {
    const b = startingBoard();
    // red cannon (1,2) can capture black cannon (1,7) over pawn (1,6)? path: ranks 3,4,5,6
    // pieces on file 1: red cannon r2, black cannon r7, black pawn at (0,6)/(2,6) not file 1
    // Actually no pawn on file 1. Between r2 and r7: empty → cannot capture
    const raw = generatePieceTargets(b, 1, 2);
    expect(raw.some((t) => t.f === 1 && t.r === 7)).toBe(false);
    // put a screen
    b[5][1] = { side: "red", kind: "pawn" };
    const withScreen = generatePieceTargets(b, 1, 2);
    expect(withScreen.some((t) => t.f === 1 && t.r === 7)).toBe(true);
  });

  it("forbids flying generals", () => {
    const b = startingBoard();
    // clear file 4 between kings
    for (let r = 1; r <= 8; r++) b[r][4] = null;
    expect(kingsFaceEachOther(b)).toBe(true);
    // red chariot move that would leave face is illegal — moving pawn off file already cleared
    // Moving red king sideways is ok; any move that keeps facing is illegal for the side to move
    // Place red chariot and try to move the only blocker away — already cleared so red to move is in illegal state conceptually
    // After a move that creates facing: black chariot at (4,7) empty path
    b[3][4] = { side: "red", kind: "chariot" };
    expect(kingsFaceEachOther(b)).toBe(false);
    // move chariot off file → facing
    const next = applyMove(b, { from: { f: 4, r: 3 }, to: { f: 3, r: 3 } });
    expect(kingsFaceEachOther(next)).toBe(true);
  });
});

describe("XiangqiGame", () => {
  it("selects and moves a pawn", () => {
    const g = new XiangqiGame();
    expect(g.click(0, 3).ok).toBe(true); // select red pawn
    expect(g.selected).toEqual({ f: 0, r: 3 });
    expect(g.click(0, 4).ok).toBe(true);
    expect(g.at(0, 4)?.kind).toBe("pawn");
    expect(g.turn).toBe("black");
  });

  it("detects check from chariot", () => {
    const g = new XiangqiGame();
    g.board = startingBoard();
    // clear and place red chariot on file 4 aiming black king
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) g.board[r][f] = null;
    g.board[0][4] = { side: "red", kind: "king" };
    g.board[9][4] = { side: "black", kind: "king" };
    g.board[0][0] = { side: "red", kind: "chariot" };
    g.board[8][3] = { side: "black", kind: "advisor" };
    g.turn = "red";
    g.click(0, 0);
    g.click(0, 9); // chariot to (0,9) — not checking
    // reset scenario: chariot to (4,5) checks
    g.board = startingBoard();
    for (let r = 1; r <= 8; r++) g.board[r][4] = null;
    g.board[5][0] = { side: "red", kind: "chariot" };
    g.board[3][4] = null;
    g.board[6][4] = null;
    g.turn = "red";
    g.selected = null;
    g.status = "playing";
    g.click(0, 5);
    const res = g.click(4, 5);
    expect(res.ok).toBe(true);
    expect(inCheck(g.board, "black")).toBe(true);
    expect(res.events).toContain("check");
  });

  it("ai returns a legal move", () => {
    const g = new XiangqiGame();
    g.turn = "black";
    const before = g.moveCount;
    const { events } = g.aiMove(1);
    expect(events.length).toBeGreaterThan(0);
    expect(g.moveCount).toBe(before + 1);
    expect(outcomeFor(g.board, "red")).toBe("playing");
  });

  it("aivsai lets AI play both sides", () => {
    const g = new XiangqiGame();
    g.reset("aivsai");
    expect(g.isHumanTurn()).toBe(false);
    expect(g.turn).toBe("red");
    const r1 = g.aiMove(1);
    expect(r1.events.length).toBeGreaterThan(0);
    expect(g.turn).toBe("black");
    const r2 = g.aiMove(1);
    expect(r2.events.length).toBeGreaterThan(0);
    expect(g.turn).toBe("red");
    expect(g.moveCount).toBe(2);
  });
});
