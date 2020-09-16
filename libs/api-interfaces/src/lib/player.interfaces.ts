export interface Player {
    id: string,
    name: string,
    lobby: string,
    ai: boolean
}

export enum VictoryState {
    UNDEFINED, LOST, WON
}