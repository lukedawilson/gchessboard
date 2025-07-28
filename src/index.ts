import {
  GChessBoardElement,
  MoveStartEvent,
  MoveEndEvent,
  MoveFinishedEvent,
  MoveCancelEvent,
} from "./GChessBoardElement.js";
import {
  Piece,
  PieceType,
  Position,
  Side,
  Square,
  getPosition,
  getFen,
} from "./utils/chess.js";
import { BoardArrow } from "./components/Arrows.js";
import { CoordinatesPlacement } from "./components/Coordinates.js";

export { GChessBoardElement, getPosition, getFen };

export type {
  BoardArrow,
  CoordinatesPlacement,
  MoveStartEvent,
  MoveEndEvent,
  MoveFinishedEvent,
  MoveCancelEvent,
  Piece,
  PieceType,
  Position,
  Side,
  Square,
};

customElements.define("g-chess-board", GChessBoardElement);
