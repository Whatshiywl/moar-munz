export interface Trade {
    id: string
}

export interface Message {
    type: 'global' | 'private',
    from: string,
    to: string,
    data: string
}