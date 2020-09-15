import { Board } from './board.interfaces';
import { VictoryState } from './player.interfaces';

export interface Match {
    id: string,
    turn: 0,
    lastDice: [ number, number ],
    playerOrder: string[],
    playerState: { [id: string]: PlayerState }
    board: Board,
    locked: boolean,
    over: boolean
}

export interface PlayerState {
    victory: VictoryState,
    position: number,
    playAgain: boolean,
    money: number,
    prision: number,
    equalDie: number,
    highlighted: boolean,
    turn: boolean
}