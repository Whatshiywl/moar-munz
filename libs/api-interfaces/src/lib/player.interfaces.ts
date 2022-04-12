import { Prompt } from "./prompt.interfaces"

export enum VictoryState {
  UNDEFINED, LOST, WON
}

export interface PlayerState {
  victory: VictoryState,
  position: number,
  playAgain: boolean,
  money: number,
  prison: number,
  equalDie: number,
  turn: boolean,
  canMove: boolean,
  canWalk: boolean,
  walkDistance: number
}

export interface Player {
  id: string,
  name: string,
  matchId: string,
  ai: boolean,
  color: string,
  ready: boolean,
  state: PlayerState,
  prompt?: Prompt
}
