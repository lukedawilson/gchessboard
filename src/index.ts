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
  addCustomPieceTypes,
} from "./utils/chess.js";
import { BoardArrow } from "./components/Arrows.js";
import { CoordinatesPlacement } from "./components/Coordinates.js";

export { GChessBoardElement, getPosition, getFen, addCustomPieceTypes };

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
