export interface BaseTile {
    name: string,
    type: 'start' | 'deed' | 'chance' | 'company' | 'railroad' | 'prison' | 'worldcup' | 'worldtour' | 'tax',
    color: string
}

export interface StartTile extends BaseTile {
    type: 'start'
}

export interface DeedTile extends BaseTile {
    type: 'deed',
    level: number,
    price: number,
    rent: number[],
    building: number
}

export interface ChanceTile extends BaseTile {
    type: 'chance'
}

export interface CompanyTile extends BaseTile {
    type: 'company',
    price: number,
    multiplier: number
}

export interface RailroadTile extends BaseTile {
    type: 'railroad',
    level: number,
    price: number,
    rent: number[]
}

export interface PrisonTile extends BaseTile {
    type: 'prison'
}

export interface WorldcupTile extends BaseTile {
    type: 'worldcup'
}

export interface WorldtourTile extends BaseTile {
    type: 'worldtour',
    cost: number
}

export interface TaxTile extends BaseTile {
    type: 'tax',
    tax: number
}

export type RawTile =
    | StartTile
    | DeedTile
    | ChanceTile
    | CompanyTile
    | RailroadTile
    | PrisonTile
    | WorldcupTile
    | WorldtourTile
    | TaxTile

export interface DynamicTile {
    owner?: string,
    worldcup?: boolean,
    value: number,
    currentRent: number,
    power: number,
    x: number,
    y: number,
    highlighted: boolean
}

export type Tile =
    & RawTile
    & DynamicTile

export type OwnableTile = (
    | DeedTile
    | RailroadTile
    | CompanyTile )
    & DynamicTile

export type RentableTile = (
    | DeedTile
    | RailroadTile )
    & DynamicTile
