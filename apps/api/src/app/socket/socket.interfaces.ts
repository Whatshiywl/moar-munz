export interface SocketBody {
    token: string
}

export interface DataBody<T> {
    data: T
}

export interface LobbyBody {
    lobby
}

export interface MatchBody {
    match
}

export interface PlayerBody {
    player
}
