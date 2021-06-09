import { Board } from './board.interfaces';
import { LobbyOptions } from './lobby.interfaces';
import { VictoryState } from './player.interfaces';

export interface Match {
    id: string,
    turn: 0,
    lastDice: [ number, number ],
    playerOrder: string[],
    playerState: { [id: string]: PlayerState },
    options: LobbyOptions,
    board: Board,
    locked: boolean,
    over: boolean
}

export interface PlayerState {
    victory: VictoryState,
    position: number,
    playAgain: boolean,
    money: number,
    prison: number,
    equalDie: number,
    turn: boolean
}
