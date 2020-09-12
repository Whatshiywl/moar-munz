import { Injectable } from '@nestjs/common';
import { LowDbService } from '../lowdb/lowdb.service';
import { UUIDService } from '../uuid/uuid.service';
import { cloneDeep } from 'lodash';
import { PlayerService } from './player.service';
import { SocketService } from '../../socket/socket.service';
import { MatchService } from './match.service';
import { JWTService } from '../jwt/jwt.service';

@Injectable()
export class LobbyService {

    constructor(
        private db: LowDbService,
        private uuidService: UUIDService,
        private jwtService: JWTService,
        private socketService: SocketService,
        private playerService: PlayerService,
        private matchService: MatchService
    ) { }

    generateLobby(board: string) {
        const lobby = {
            id: this.uuidService.generateUUID(),
            board,
            open: true,
            players: [ ]
        };
        this.db.createLobby(lobby);
        return lobby;
    }

    getLobby(id: string) {
        return this.db.readLobby(id);
    }

    saveLobby(lobby) {
        return this.db.updateLobby(lobby);
    }

    deleteLobby(id: string) {
        return this.db.deleteLobby(id);
    }

    removePlayer(lobby, match, player) {
        const index = lobby.players.findIndex(s => s === player.id);
        lobby.players.splice(index, 1);
        this.saveAndBroadcastLobby(lobby);
        if (match) this.matchService.removePlayer(match, player);
        this.playerService.deletePlayer(player.id);
    }

    onEnterLobby(lobby, token: string) {
        if (!lobby || !lobby.open) return false;
        if (!token) {
            const uuid = this.uuidService.generateUUID(2);
            token = this.jwtService.genToken({ uuid });
        }
        const payload = this.jwtService.getPayload(token);
        const player = this.playerService.generatePlayer(payload.uuid);
        if (!player) return false;
        if (!lobby.players.includes(payload.uuid)) {
            lobby.players.push(payload.uuid);
            player.lobby = lobby.id;
        }
        this.playerService.savePlayer(player);
        this.saveAndBroadcastLobby(lobby);
        return { token, uuid: player.id };
    }

    onPlayerReady(lobby, player, ready: boolean) {
        this.playerService.onPlayerReady(player, ready);
        const everyoneReady = this.isEveryoneReady(lobby);
        console.log(`Everyone ready? ${everyoneReady}`);
        if (everyoneReady) {
            lobby.open = false;
            this.saveAndBroadcastLobby(lobby);
            this.notifyStartGame(lobby);
        } else {
            this.notifyLobbyChanges(lobby);
        }
    }

    private isEveryoneReady(lobby) {
        for (const playerId of lobby.players) {
            const p = this.playerService.getPlayer(playerId);
            if (!p.ready) return false;
        }
        return true;
    }

    private saveAndBroadcastLobby(lobby) {
        this.saveLobby(lobby);
        this.notifyLobbyChanges(lobby);
    }

    private notifyLobbyChanges(_lobby) {
        const lobby = cloneDeep(_lobby);
        let namespace;
        for (let i = 0; i < lobby.players.length; i++) {
            const id = lobby.players[i];
            const socketId = this.socketService.getClient(id).id;
            namespace = (namespace || this.socketService.getServer()).to(socketId);
            const player = this.playerService.getPlayer(id);
            player.color = this.getPlayerColors(i);
            this.playerService.savePlayer(player);
            lobby.players[i] = player;
        }
        if (!namespace) return;
        namespace.emit('update lobby', lobby);
    }

    private getPlayerColors(i: number) {
        const colors = [
            'red', 'blue', 'darkorange', 'green', 'blueviolet', 'deepskyblue'
        ];
        return colors[i];
    }

    private notifyStartGame(_lobby) {
        const lobby = cloneDeep(_lobby);
        const players = lobby.players.map(id => this.playerService.getPlayer(id));
        this.matchService.generateMatch(_lobby.board, ...players);
    }

}