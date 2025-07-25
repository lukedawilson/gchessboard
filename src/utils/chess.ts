/**
 * Collection of 0x88-based methods to represent chessboard state.
 *
 * https://www.chessprogramming.org/0x88
 */

import { munkres } from "./munkres.js";

export const SQUARE_COLORS = ["light", "dark"] as const;
export const SIDE_COLORS = ["white", "black"] as const;
export const PIECE_TYPES = [
  "queen",
  "king",
  "knight",
  "bishop",
  "rook",
  "pawn",
];

export type SquareColor = (typeof SQUARE_COLORS)[number];
export type Side = (typeof SIDE_COLORS)[number];
export type PieceType = (typeof PIECE_TYPES)[number];
export type Position = Partial<Record<Square, Piece>>;

export interface Piece {
  pieceType: PieceType;
  color: Side;
}

// prettier-ignore
const SQUARES_MAP = {
  a8:   0, b8:   1, c8:   2, d8:   3, e8:   4, f8:   5, g8:   6, h8:   7,
  a7:  16, b7:  17, c7:  18, d7:  19, e7:  20, f7:  21, g7:  22, h7:  23,
  a6:  32, b6:  33, c6:  34, d6:  35, e6:  36, f6:  37, g6:  38, h6:  39,
  a5:  48, b5:  49, c5:  50, d5:  51, e5:  52, f5:  53, g5:  54, h5:  55,
  a4:  64, b4:  65, c4:  66, d4:  67, e4:  68, f4:  69, g4:  70, h4:  71,
  a3:  80, b3:  81, c3:  82, d3:  83, e3:  84, f3:  85, g3:  86, h3:  87,
  a2:  96, b2:  97, c2:  98, d2:  99, e2: 100, f2: 101, g2: 102, h2: 103,
  a1: 112, b1: 113, c1: 114, d1: 115, e1: 116, f1: 117, g1: 118, h1: 119
}
const SQUARES = Object.keys(SQUARES_MAP) as Square[];
export type Square = keyof typeof SQUARES_MAP;

// prettier-ignore
const SQUARE_DISTANCE_TABLE = [
  14, 13, 12, 11, 10, 9, 8, 7, 8, 9, 10, 11, 12, 13, 14, 0,
  13, 12, 11, 10, 9 , 8, 7, 6, 7, 8, 9 , 10, 11, 12, 13, 0,
  12, 11, 10, 9 , 8 , 7, 6, 5, 6, 7, 8 , 9 , 10, 11, 12, 0,
  11, 10, 9 , 8 , 7 , 6, 5, 4, 5, 6, 7 , 8 , 9 , 10, 11, 0,
  10, 9 , 8 , 7 , 6 , 5, 4, 3, 4, 5, 6 , 7 , 8 , 9 , 10, 0,
  9 , 8 , 7 , 6 , 5 , 4, 3, 2, 3, 4, 5 , 6 , 7 , 8 , 9 , 0,
  8 , 7 , 6 , 5 , 4 , 3, 2, 1, 2, 3, 4 , 5 , 6 , 7 , 8 , 0,
  7 , 6 , 5 , 4 , 3 , 2, 1, 0, 1, 2, 3 , 4 , 5 , 6 , 7 , 0,
  8 , 7 , 6 , 5 , 4 , 3, 2, 1, 2, 3, 4 , 5 , 6 , 7 , 8 , 0,
  9 , 8 , 7 , 6 , 5 , 4, 3, 2, 3, 4, 5 , 6 , 7 , 8 , 9 , 0,
  10, 9 , 8 , 7 , 6 , 5, 4, 3, 4, 5, 6 , 7 , 8 , 9 , 10, 0,
  11, 10, 9 , 8 , 7 , 6, 5, 4, 5, 6, 7 , 8 , 9 , 10, 11, 0,
  12, 11, 10, 9 , 8 , 7, 6, 5, 6, 7, 8 , 9 , 10, 11, 12, 0,
  13, 12, 11, 10, 9 , 8, 7, 6, 7, 8, 9 , 10, 11, 12, 13, 0,
  14, 13, 12, 11, 10, 9, 8, 7, 8, 9, 10, 11, 12, 13, 14, 0,
]

const REVERSE_SQUARES_MAP = SQUARES.reduce(
  (acc, key) => {
    acc[SQUARES_MAP[key]] = key;
    return acc;
  },
  {} as Record<number, Square>
);

const FEN_PIECE_TYPE_MAP: { [key: string]: PieceType } = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};
export const REVERSE_FEN_PIECE_TYPE_MAP: Record<PieceType, string> =
  Object.keys(FEN_PIECE_TYPE_MAP).reduce(
    (acc, key) => {
      acc[FEN_PIECE_TYPE_MAP[key]] = key;
      return acc;
    },
    {} as Record<PieceType, string>
  );

export function addCustomPieceTypes(map: Record<string, string>): void {
  Object.values(map).forEach((value) => PIECE_TYPES.push(value));

  Object.assign(FEN_PIECE_TYPE_MAP, map);
  Object.assign(
    REVERSE_FEN_PIECE_TYPE_MAP,
    Object.keys(FEN_PIECE_TYPE_MAP).reduce(
      (acc, key) => {
        acc[FEN_PIECE_TYPE_MAP[key]] = key;
        return acc;
      },
      {} as Record<PieceType, string>
    )
  );
}

export type PositionDiff = {
  added: Array<{ piece: Piece; square: Square }>;
  removed: Array<{ piece: Piece; square: Square }>;
  moved: Array<{ piece: Piece; oldSquare: Square; newSquare: Square }>;
};

/**
 * Parse a FEN string and return an object that maps squares to pieces.
 *
 * Also accepts the special string "initial" or "start" to represent
 * standard game starting position.
 *
 * Note that only the first part of the FEN string (piece placement) is
 * parsed; any additional components are ignored.
 *
 * @param fen the FEN string
 * @returns an object where key is of type Square (string) and value is
 *          of type Piece
 */
export function getPosition(fen: string): Position | undefined {
  if (fen === "initial" || fen === "start") {
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
  }

  const parts = fen.split(" ");
  const ranks = parts[0].split("/");
  if (ranks.length !== 8) {
    return undefined;
  }

  const position: Position = {};
  for (let i = 0; i < 8; i++) {
    const rank = 8 - i;
    let fileOffset = 0;
    for (let j = 0; j < ranks[i].length; j++) {
      const pieceLetter = ranks[i][j].toLowerCase();
      if (pieceLetter in FEN_PIECE_TYPE_MAP) {
        const square = (String.fromCharCode(97 + fileOffset) + rank) as Square;
        position[square] = {
          pieceType: FEN_PIECE_TYPE_MAP[pieceLetter],
          color: pieceLetter === ranks[i][j] ? "black" : "white",
        };
        fileOffset += 1;
      } else {
        const emptySpaces = parseInt(ranks[i][j]);
        if (isNaN(emptySpaces) || emptySpaces === 0 || emptySpaces > 8) {
          return undefined;
        } else {
          fileOffset += emptySpaces;
        }
      }
    }
    if (fileOffset !== 8) {
      return undefined;
    }
  }
  return position;
}

/**
 * Get FEN string corresponding to Position object. Note that this only returns
 * the first (piece placement) component of the FEN string.
 */
export function getFen(position: Position): string {
  const rankSpecs = [];
  for (let i = 0; i < 8; i++) {
    let rankSpec = "";
    let gap = 0;
    for (let j = 0; j < 8; j++) {
      const square = REVERSE_SQUARES_MAP[16 * i + j];
      const piece = position[square];
      if (piece !== undefined) {
        const pieceStr = REVERSE_FEN_PIECE_TYPE_MAP[piece.pieceType];
        if (gap > 0) {
          rankSpec += gap;
        }
        rankSpec += piece.color === "white" ? pieceStr.toUpperCase() : pieceStr;
        gap = 0;
      } else {
        gap += 1;
      }
    }
    if (gap > 0) {
      rankSpec += gap;
    }
    rankSpecs.push(rankSpec);
  }
  return rankSpecs.join("/");
}

/**
 * Return square identifier for visual index in a grid, depending on
 * orientation. If `orientation` is "white", then a8 is on the top
 * left (0) and h8 is on the bottom right (63):
 *
 * a8 ...... .
 * .  ...... .
 * .  ...... h1
 *
 * otherwise h1 is on the top left:
 *
 * h1 ...... .
 * .  ...... .
 * .  ...... a8
 *
 * https://www.chessprogramming.org/0x88#Coordinate_Transformation
 */
export function getSquare(visualIndex: number, orientation: Side) {
  const idx = visualIndex + (visualIndex & ~0x7);
  return REVERSE_SQUARES_MAP[orientation === "black" ? 0x77 - idx : idx];
}

/**
 * Get the "visual" index for `square` depending on `orientation`.
 * If `orientation` is "white", then a8 is on the top left (0) and h8 is
 * on the bottom right (63):
 *
 * a8 ...... .
 * .  ...... .
 * .  ...... h1
 *
 * otherwise h1 is on the top left:
 *
 * h1 ...... .
 * .  ...... .
 * .  ...... a8
 *
 * https://www.chessprogramming.org/0x88#Coordinate_Transformation
 *
 * @param square square to convert to visual index.
 * @param orientation  what side is at the bottom ("white" = a1 on bottom left)
 * @returns a visual index for the square in question.
 */
export function getVisualIndex(square: Square, orientation: Side) {
  const idx = SQUARES_MAP[square];
  const orientedIdx = orientation === "black" ? 0x77 - idx : idx;
  return (orientedIdx + (orientedIdx & 0x7)) >> 1;
}

/**
 * Like `getVisualIndex`, but returns a row and column combination.
 *
 * @param square square to convert to visual row and column.
 * @param orientation  what side is at the bottom ("white" = a1 on bottom left)
 * @returns an array containing [row, column] for the square in question.
 */
export function getVisualRowColumn(
  square: Square,
  orientation: Side
): [number, number] {
  const idx = getVisualIndex(square, orientation);
  return [idx >> 3, idx & 0x7];
}

/**
 * https://www.chessprogramming.org/Color_of_a_Square#By_Anti-Diagonal_Index
 */
export function getSquareColor(square: Square): SquareColor {
  const idx0x88 = SQUARES_MAP[square];
  const idx = (idx0x88 + (idx0x88 & 0x7)) >> 1;
  return ((idx * 9) & 8) === 0 ? "light" : "dark";
}

/**
 * Type guard to check if `key` (string) is a valid chess square.
 */
export function keyIsSquare(key: string | undefined): key is Square {
  return key !== undefined && key in SQUARES_MAP;
}

/**
 * Deep equality check for two Piece objects.
 */
export function pieceEqual(a: Piece | undefined, b: Piece | undefined) {
  return (
    (a === undefined && b === undefined) ||
    (a !== undefined &&
      b !== undefined &&
      a.color === b.color &&
      a.pieceType === b.pieceType)
  );
}

/**
 * Type guard for string values that need to conform to a `Side` definition.
 */
export function isSide(s: string | null): s is Side {
  return SIDE_COLORS.includes(s as Side);
}

/**
 * Deep equality check for Position objects.
 */
export function positionsEqual(a: Position, b: Position) {
  return SQUARES.every((square) => pieceEqual(a[square], b[square]));
}

export function calcPositionDiff(
  oldPosition: Position,
  newPosition: Position
): PositionDiff {
  // Limit old and new positions only to squares that are different
  const oldPositionLimited = { ...oldPosition };
  const newPositionLimited = { ...newPosition };
  Object.keys(newPosition).forEach((k) => {
    const square = k as Square;
    if (pieceEqual(newPosition[square], oldPosition[square])) {
      delete oldPositionLimited[square];
      delete newPositionLimited[square];
    }
  });

  const added: Array<{ piece: Piece; square: Square }> = [];
  const removed: Array<{ piece: Piece; square: Square }> = [];
  const moved: Array<{ piece: Piece; oldSquare: Square; newSquare: Square }> =
    [];

  function groupByPiece(position: Position) {
    const groups = {} as Record<
      Side,
      Record<PieceType, { squares: Square[]; piece: Piece }>
    >;
    for (const color of SIDE_COLORS) {
      groups[color] = {} as Record<
        PieceType,
        { squares: Square[]; piece: Piece }
      >;
      for (const pieceType of PIECE_TYPES) {
        groups[color][pieceType] = { squares: [], piece: { color, pieceType } };
      }
    }
    Object.entries(position).forEach(([square, piece]) => {
      groups[piece.color][piece.pieceType].squares.push(square as Square);
    });
    return groups;
  }

  const oldPositionGrouped = groupByPiece(oldPositionLimited);
  const newPositionGrouped = groupByPiece(newPositionLimited);

  for (const pieceType of PIECE_TYPES) {
    for (const color of SIDE_COLORS) {
      const piece = { pieceType, color };
      const oldSquares = [...oldPositionGrouped[color][pieceType].squares];
      const newSquares = [...newPositionGrouped[color][pieceType].squares];

      const costMatrix = [];
      for (let i = 0; i < oldSquares.length; i++) {
        const row = [];
        for (let j = 0; j < newSquares.length; j++) {
          row.push(squareDistance(oldSquares[i], newSquares[j]));
        }
        costMatrix.push(row);
      }

      // Maximum distance between any two squares is 15, so use that as fill
      const matches = munkres(costMatrix, 15);

      for (const [i, j] of matches || []) {
        moved.push({
          piece,
          oldSquare: oldSquares[i],
          newSquare: newSquares[j],
        });
        delete oldSquares[i];
        delete newSquares[j];
      }
      oldSquares
        .filter((square) => square !== undefined)
        .forEach((square) => {
          removed.push({ piece, square });
        });
      newSquares
        .filter((square) => square !== undefined)
        .forEach((square) => {
          added.push({ piece, square });
        });
    }
  }

  return { added, removed, moved };
}

export function squareDistance(a: Square, b: Square) {
  return SQUARE_DISTANCE_TABLE[SQUARES_MAP[a] - SQUARES_MAP[b] + 0x77];
}
