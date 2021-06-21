import { Injectable } from '@nestjs/common';
import { LowDbService } from '../shared/services/lowdb.service';
import { UUIDService } from '../shared/services/uuid.service';
import { PlayerService } from '../shared/services/player.service';
import { SocketService } from '../socket/socket.service';
import { Lobby, LobbyOptions, LobbyState, Player } from '@moar-munz/api-interfaces';
import { MatchService } from '../shared/services/match.service';
import { EngineService } from '../engine/engine.service';

@Injectable()
export class LobbyService {

    constructor(
        private db: LowDbService,
        private uuidService: UUIDService,
        private socketService: SocketService,
        private playerService: PlayerService,
        private matchService: MatchService,
        private engineService: EngineService
    ) { }

    generateLobby(options: LobbyOptions) {
        const lobby: Lobby = {
            id: this.uuidService.generateUUID(),
            options,
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

    async removePlayer(lobby: Lobby, player: Player, replace: boolean) {
        if (!lobby.players[player.id]) return;
        replace = replace && lobby.options.ai;
        let aiPlayer: Player;
        if (replace) {
            aiPlayer = this.addAI(lobby, player);
        } else {
            this.deletePlayer(lobby, player);
        }
        const match = this.matchService.getMatch(lobby.id);
        if (match) this.matchService.removePlayer(lobby.playerOrder, player);
        this.playerService.deletePlayer(player.id);
        if (aiPlayer) await this.engineService.play(aiPlayer.id);
    }

    private deletePlayer(lobby: Lobby, player: Player) {
        const order = lobby.playerOrder.findIndex(s => s === player.id);
        lobby.playerOrder[order] = undefined;
        delete lobby.players[player.id];
        this.saveAndBroadcastLobby(lobby);
    }

    addAI(lobby: Lobby, replace?: Player) {
        const ai = this.playerService.getOrGenPlayerByToken(undefined, lobby, true);
        if (replace) {
            ai.player.name = `${replace.name} (AI)`;
            this.playerService.savePlayer(ai.player);
            this.replacePlayer(lobby, replace, ai.player);
            delete lobby.players[replace.id];
        } else {
            this.addPlayerAtFirstFreeSpot(lobby, ai.player);
        }
        this.saveAndBroadcastLobby(lobby);
        if (!replace) {
            const order = lobby.playerOrder.findIndex(s => s === ai.player.id);
            this.onPlayerReady(lobby, lobby.playerOrder[order], true);
        }
        return ai.player;
    }

    onEnterLobby(lobby: Lobby, token: string) {
        if (!lobby.open) return false;
        const playerData = this.playerService.getOrGenPlayerByToken(token, lobby, false);
        const player = playerData.player;
        token = playerData.token;
        if (!player) return false;
        this.addPlayerAtFirstFreeSpot(lobby, player);
        this.saveAndBroadcastLobby(lobby);
        return playerData;
    }

    private replacePlayer(lobby: Lobby, from: Player, to: Player) {
        const order = lobby.playerOrder.findIndex(s => s === from.id);
        lobby.playerOrder[order] = to.id;
        const fromState = this.getPlayer(lobby, from);
        const toState: LobbyState = { ready: false, color: fromState.color };
        lobby.players[to.id] = { ...to, ...toState };
    }

    private addPlayerAtFirstFreeSpot(lobby: Lobby, player: Player) {
        if (!lobby.playerOrder.includes(player.id)) {
            const order = this.getFirstFreeSpot(lobby);
            lobby.playerOrder[order] = player.id;
            const color = this.getPlayerColor(order);
            lobby.players[player.id] = {
                ...player,
                ...{ ready: false, color }
            };
        }
    }

    private getFirstFreeSpot(lobby: Lobby) {
        for (let i = 0; i <= lobby.playerOrder.length; i++) {
            if (!lobby.playerOrder[i]) {
                return i;
            }
        }
    }

    onPlayerReady(lobby: Lobby, player: string | Player, ready: boolean) {
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
        for (const playerId of lobby.playerOrder.filter(Boolean)) {
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
        const players = lobby.playerOrder;
        this.socketService.emit('update lobby', lobby, players);
    }

    private getPlayerColor(i: number) {
        const colors = [
            'red', 'blue', 'darkorange', 'green', 'blueviolet', 'deepskyblue'
        ];
        return colors[i];
    }

}
