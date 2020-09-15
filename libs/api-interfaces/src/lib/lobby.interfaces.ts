import { Player } from './player.interfaces';

export interface Lobby {
    id: string,
    board: string,
    open: boolean,
    players: {
        [id: string]: Player & LobbyState
    }
    playerOrder: string[]
}

export interface LobbyState {
    color: string,
    ready: boolean
}