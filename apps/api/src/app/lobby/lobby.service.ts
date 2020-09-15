import { Injectable } from '@nestjs/common';
import { LowDbService } from '../shared/lowdb/lowdb.service';
import { UUIDService } from '../shared/uuid/uuid.service';
import { PlayerService } from '../shared/db/player.service';
import { SocketService } from '../socket/socket.service';
import { MatchService } from '../match/match.service';
import { Namespace } from 'socket.io';
import { Lobby, Match, Player } from '@moar-munz/api-interfaces';

@Injectable()
export class LobbyService {

    constructor(
        private db: LowDbService,
        private uuidService: UUIDService,
        private socketService: SocketService,
        private playerService: PlayerService,
        private matchService: MatchService
    ) { }

    generateLobby(board: string) {
        const lobby: Lobby = {
            id: this.uuidService.generateUUID(),
            board,
            open: true,
            players: { },
            playerOrder: [ ]
        };
        this.db.createLobby(lobby);
        return lobby;
    }

    getLobby(id: string) {
        return this.db.readLobby(id);
    }

    saveLobby(lobby: Lobby) {
        return this.db.updateLobby(lobby);
    }

    deleteLobby(id: string) {
        return this.db.deleteLobby(id);
    }

    removePlayer(lobby: Lobby, match: Match, player: Player) {
        if (!lobby.players[player.id]) return;
        const order = lobby.playerOrder.findIndex(s => s === player.id);
        lobby.playerOrder.splice(order, 1);
        delete lobby.players[player.id];
        this.saveAndBroadcastLobby(lobby);
        if (match) this.matchService.removePlayer(match, player);
        this.playerService.deletePlayer(player.id);
    }

    onEnterLobby(lobby: Lobby, token: string) {
        if (!lobby.open) return false;
        const playerData = this.playerService.getOrGenPlayerByToken(token, lobby);
        const player = playerData.player;
        token = playerData.token;
        if (!player) return false;
        if (!lobby.playerOrder.includes(player.id)) {
            for (let i = 0; i <= lobby.playerOrder.length; i++) {
                if (!lobby.playerOrder[i]) {
                    lobby.playerOrder[i] = player.id;
                    const color = this.getPlayerColor(i);
                    lobby.players[player.id] = {
                        ...player,
                        ...{ ready: false, color }
                    };
                    break;
                }
            }
        }
        this.saveAndBroadcastLobby(lobby);
        return playerData;
    }

    onPlayerReady(lobby: Lobby, player: Player, ready: boolean) {
        this.getPlayer(lobby, player).ready = ready;
        const everyoneReady = this.isEveryoneReady(lobby);
        console.log(`Everyone ready? ${everyoneReady}`);
        if (everyoneReady) {
            lobby.open = false;
            this.saveAndBroadcastLobby(lobby);
            this.matchService.generateMatch(lobby);
        } else {
            this.notifyLobbyChanges(lobby);
        }
    }

    private isEveryoneReady(lobby: Lobby) {
        for (const playerId of lobby.playerOrder) {
            const player = this.getPlayer(lobby, playerId);
            if (!player.ready) return false;
        }
        return true;
    }

    private getPlayer(lobby: Lobby, player: string | Player) {
        const playerId = typeof player === 'string' ? player : player.id;
        return lobby.players[playerId];
    }

    private saveAndBroadcastLobby(lobby: Lobby) {
        this.saveLobby(lobby);
        this.notifyLobbyChanges(lobby);
    }

    private notifyLobbyChanges(lobby: Lobby) {
        let namespace: Namespace;
        for (const id of lobby.playerOrder) {
            const socketId = this.socketService.getClient(id).id;
            namespace = (namespace || this.socketService.getServer()).to(socketId);
        }
        if (!namespace) return;
        namespace.emit('update lobby', lobby);
    }

    private getPlayerColor(i: number) {
        const colors = [
            'red', 'blue', 'darkorange', 'green', 'blueviolet', 'deepskyblue'
        ];
        return colors[i];
    }

}