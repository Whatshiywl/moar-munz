import { Match, Player } from '@moar-munz/api-interfaces';
import { Injectable } from '@nestjs/common';

import * as lowdb from 'lowdb';
import * as FileSync from 'lowdb/adapters/FileSync';
import { join } from 'path';
import { MatchCRUD, PlayerCRUD } from '../interfaces/db.interface';

@Injectable()
export class LowDbService implements MatchCRUD, PlayerCRUD {

    private db: lowdb.LowdbSync<any>;

    constructor() {
        const adapter = new FileSync(join(__dirname, 'db.json'));
        this.db = lowdb(adapter);
        this.db.defaults({
            matches: { },
            players: { }
        }).write();
    }

    // MATCH

    createMatch(match: Match) {
        const id = match.id;
        this.db.set(`matches.${id}`, { ...match, mtime: Date.now()}).write();
        return id;
    }

    readMatch(id: string): Match {
        return this.db.get(`matches.${id}`).value();
    }

    readAllMatches(): Match[] {
        return this.db.get('matches').value();
    }

    updateMatch(match: Match) {
        return this.db.set(`matches.${match.id}`, { ...match, mtime: Date.now() }).write();
    }

    deleteMatch(id: string) {
        return this.db.unset(`matches.${id}`).write();
    }

    // Player

    createPlayer(player: Player) {
        const id = player.id;
        this.db.set(`players.${id}`, { ...player, mtime: Date.now()}).write();
        return id;
    }

    readPlayer(id: string) {
        return this.db.get(`players.${id}`).value();
    }

    readPlayersByMatchId(matchId: string) {
        const players = this.db.get('players').value() as { [id: string]: Player };
        return Object.values(players).filter(p => p.matchId === matchId);
    }

    updatePlayer(player: Player) {
        return this.db.set(`players.${player.id}`, { ...player, mtime: Date.now()}).write();
    }

    deletePlayer(id: string) {
       return this.db.unset(`players.${id}`).write();
    }

}
