export interface MatchCRUD {

    createMatch: (match: any) => string;

    readMatch: (id: string) => any;

    updateMatch: (match: any) => void;

    deleteMatch: (id: string) => any;

}

export interface PlayerCRUD {

    createPlayer: (player: any) => string;

    readPlayer: (id: string) => any;

    updatePlayer: (player: any) => void;

    deletePlayer: (id: string) => any;

}
