export interface Trade {
    id: string
}

export interface Message {
    type: 'global' | 'private',
    recipients: string[],
    from: string,
    data: string
}
