import { Injectable } from '@nestjs/common';
import { LowDbService } from '../shared/services/lowdb.service';
import { UUIDService } from '../shared/services/uuid.service';
import { PlayerService } from '../shared/services/player.service';
import { SocketService } from '../socket/socket.service';
import { MatchService } from '../match/match.service';
import { Lobby, LobbyOptions, LobbyState, Match, Player } from '@moar-munz/api-interfaces';

@Injectable()
export class LobbyService {

    constructor(
        private db: LowDbService,
        private uuidService: UUIDService,
        private socketService: SocketService,
        private playerService: PlayerService,
        private matchService: MatchService
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
        const order = lobby.playerOrder.findIndex(s => s === player.id);
        replace = replace && lobby.options.ai;
        if (replace) {
            const ai = this.playerService.getOrGenPlayerByToken(undefined, lobby, true);
            ai.player.name = `${player.name} (AI)`;
            this.playerService.savePlayer(ai.player);
            lobby.playerOrder[order] = ai.player.id;
            const lobbyState = this.getPlayer(lobby, player);
            const aiLobbyState: LobbyState = { ready: false, color: lobbyState.color };
            lobby.players[ai.player.id] = { ...ai.player, ...aiLobbyState };
        } else {
            lobby.playerOrder[order] = undefined;
        }
        delete lobby.players[player.id];
        this.saveAndBroadcastLobby(lobby);
        const match = this.matchService.getMatch(lobby.id);
        if (match) await this.matchService.removePlayer(lobby, match, player);
        this.playerService.deletePlayer(player.id);
        if (replace) this.onPlayerReady(lobby, lobby.playerOrder[order], true);
    }

    onEnterLobby(lobby: Lobby, token: string) {
        if (!lobby.open) return false;
        const playerData = this.playerService.getOrGenPlayerByToken(token, lobby, false);
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
        const namespace = this.socketService.getNamespaceFromIdList(lobby.playerOrder);
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