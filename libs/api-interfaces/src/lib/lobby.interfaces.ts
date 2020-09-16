import { Player } from './player.interfaces';

export interface LobbyOptions {
    board: string,
    ai: boolean
}

export interface Lobby {
    id: string,
    options: LobbyOptions,
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