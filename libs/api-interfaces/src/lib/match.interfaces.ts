import { Board } from './board.interfaces';

export interface MatchOptions {
  board: string,
  ai: boolean
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
  over: boolean,
  started: boolean
}
