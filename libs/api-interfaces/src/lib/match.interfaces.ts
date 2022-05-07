import { Board } from './board.interfaces';

export interface MatchOptions {
  board: string,
  ai: boolean
}

export enum MatchState {
  LOBBY,
  IDLE,
  START_TURN,
  ROLLING_DICE,
  PLAYING,
  MOVING,
  LANDING,
  OVER
}

export interface Match {
  id: string,
  playerOrder: string[],
  open: boolean,
  turn: number,
  lastDice: [number, number],
  options: MatchOptions,
  board: Board,
  locked: boolean,
  processing: boolean,
  state: MatchState
}
