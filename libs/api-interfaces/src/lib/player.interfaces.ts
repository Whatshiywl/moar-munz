export interface Player {
    id: string,
    name: string,
    lobby: string
}

export enum VictoryState {
    UNDEFINED, LOST, WON
}