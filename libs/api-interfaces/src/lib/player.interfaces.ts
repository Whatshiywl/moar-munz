import { LobbyState } from './lobby.interfaces';
import { PlayerState } from './match.interfaces';

export interface Player {
    id: string,
    name: string,
    lobby: string,
    ai: boolean
}

export enum VictoryState {
    UNDEFINED, LOST, WON
}

export type PlayerComplete = Player & PlayerState & LobbyState;