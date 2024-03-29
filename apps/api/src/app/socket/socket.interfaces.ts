import { Lobby, Match, Player, Message } from '@moar-munz/api-interfaces';

export interface SocketBody {
    token: string
}

export interface DataBody<T> {
    data: T
}

export interface LobbyBody {
    lobby: Lobby
}

export interface MatchBody {
    match: Match
}

export interface PlayerBody {
    player: Player
}

export interface SocketMessageBody {
    message: Message
}
