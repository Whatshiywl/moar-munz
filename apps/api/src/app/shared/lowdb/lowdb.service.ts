import { Injectable } from '@nestjs/common';

import * as lowdb from 'lowdb';
import * as FileSync from 'lowdb/adapters/FileSync';
import { join } from 'path';
import { MatchCRUD, LobbyCRUD, PlayerCRUD } from '../db/db.interface';

@Injectable()
export class LowDbService implements MatchCRUD, LobbyCRUD, PlayerCRUD {

    private db: lowdb.LowdbSync<any>;

    constructor() {
        const adapter = new FileSync(join(__dirname, 'db.json'));
        this.db = lowdb(adapter);
        this.db.defaults({
            matches: { },
            lobbys: { },
            players: { }
        }).write();
        this.db.set('matches', { }).write();

        setInterval(() => {
            const now = Date.now();
            const lobbys = this.db.get('lobbys').value();
            Object.keys(lobbys).forEach(key => {
                const lobby = lobbys[key];
                const age = now - lobby.mtime;
                if (age < 120000) return;
                if (!lobby.players.length) {
                    this.deleteMatch(lobby);
                }
            });
        }, 60000);
    }

    // MATCH

    createMatch(match: any) {
        const id = match.id;
        this.db.set(`matches.${id}`, { ...match, mtime: Date.now()}).write();
        return id;
    }

    readMatch(id: string) {
        return this.db.get(`matches.${id}`).value();
    }

    updateMatch(match: any) {
        return this.db.set(`matches.${match.id}`, { ...match, mtime: Date.now() }).write();
    }

    deleteMatch(id: string) {
        return this.db.unset(`matches.${id}`).write();
    }

    // LOBBY
    
    createLobby(lobby: any) {
        const id = lobby.id;
        this.db.set(`lobbys.${id}`, { ...lobby, mtime: Date.now()}).write();
        return id;
    }

    readLobby(id: string) {
        return this.db.get(`lobbys.${id}`).value();
    }

    updateLobby(lobby: any) {
        return this.db.set(`lobbys.${lobby.id}`, { ...lobby, mtime: Date.now()}).write();
    }

    deleteLobby(id: string) {
        return this.db.unset(`lobbys.${id}`).write();
    }

    // Player
    
    createPlayer(player: any) {
        const id = player.id;
        this.db.set(`players.${id}`, { ...player, mtime: Date.now()}).write();
        return id;
    }

    readPlayer(id: string) {
        return this.db.get(`players.${id}`).value();
    }

    updatePlayer(player: any) {
        return this.db.set(`players.${player.id}`, { ...player, mtime: Date.now()}).write();
    }

    deletePlayer(id: string) {
       return this.db.unset(`players.${id}`).write();
    }

}