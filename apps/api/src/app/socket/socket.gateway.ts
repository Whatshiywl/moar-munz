import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayInit, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { cloneDeep } from 'lodash';
import { LobbyService } from '../shared/db/lobby.service';
import { PlayerService } from '../shared/db/player.service';
import { MatchService } from '../shared/db/match.service';
import { SocketService } from './socket.service';
import { JWTService } from '../shared/jwt/jwt.service';
import { UUIDService } from '../shared/uuid/uuid.service';

@WebSocketGateway()
export class SocketGateway implements OnGatewayDisconnect {

    constructor(
        private lobbyService: LobbyService,
        private playerService: PlayerService,
        private matchService: MatchService,
        private socketService: SocketService,
        private uuidService: UUIDService,
        private jwtService: JWTService
    ) { }

    @SubscribeMessage('enter lobby')
    onEnterLobby(@MessageBody() lobbyQuery: { id: string }, @ConnectedSocket() client: Socket) {
        const lobby = this.lobbyService.getLobby(lobbyQuery.id);
        if (!lobby) return false;
        let token = client.handshake.query.token;
        if (!token) {
            const uuid = this.uuidService.generateUUID(2);
            token = this.jwtService.genToken({ uuid });
        }
        const payload = this.jwtService.getPayload(token);
        const player = this.getSavedOrNewPlayer(lobby, payload.uuid);
        if (!player) return false;
        if (!lobby.players.includes(payload.uuid)) {
            lobby.players.push(payload.uuid);
            player.lobby = lobbyQuery.id;
        }
        this.lobbyService.saveLobby(lobby);
        this.playerService.savePlayer(player);
        this.notifyLobbyChanges(lobby);
        return { token, uuid: payload.uuid };
    }

    private getSavedOrNewPlayer(lobby: any, uuid: string) {
        const savedPlayer = this.playerService.getPlayer(uuid);
        if (savedPlayer) {
            savedPlayer.away = false;
            this.playerService.savePlayer(savedPlayer);
            return savedPlayer;
        } else {
            if (!lobby.open) return false;
            const newPlayer = this.playerService.generatePlayer(uuid);
            return newPlayer;
        }
    }

    async handleDisconnect(@ConnectedSocket() client: Socket) {
        const token = client.handshake.query.token;
        const payload = this.jwtService.getPayload(token);
        let player = this.playerService.getPlayer(payload.uuid);
        if (!player) return;
        player.away = true;
        this.playerService.savePlayer(player);
        await this.sleep(5000);
        player = this.playerService.getPlayer(payload.uuid);
        if (!player || !player.away) return;
        const lobby = this.lobbyService.getLobby(player.lobby);
        if (!lobby) return;
        const index = lobby.players.findIndex(s => s === payload.uuid);
        lobby.players.splice(index, 1);
        this.lobbyService.saveLobby(lobby);
        this.playerService.deletePlayer(payload.uuid);
        this.notifyLobbyChanges(lobby);
        this.matchService.removePlayer(player.lobby, payload.uuid);
        this.socketService.disconnect(client);
        return lobby;
    }

    @SubscribeMessage('ready')
    onReady(@MessageBody() ready: boolean, @ConnectedSocket() client: Socket) {
        const token = client.handshake.query.token;
        const payload = this.jwtService.getPayload(token);
        console.log('onReady', payload.uuid);
        const player = this.playerService.getPlayer(payload.uuid);
        if (!player) return;
        const lobby = this.lobbyService.getLobby(player.lobby);
        if (!lobby) return;
        lobby.ready[payload.uuid] = ready;
        this.lobbyService.saveLobby(lobby);
        const everyoneReady = this.isEveryoneReady(lobby);
        if (everyoneReady) {
            lobby.open = false;
            this.notifyStartGame(lobby);
        } else {
            this.notifyLobbyChanges(lobby);
        }
    }

    @SubscribeMessage('throw dice')
    async onThrowDice(@ConnectedSocket() client: Socket) {
        const token = client.handshake.query.token;
        const payload = this.jwtService.getPayload(token);
        const player = this.playerService.getPlayer(payload.uuid);
        if (!player) return;
        const match = this.matchService.getMatch(player.lobby);
        if (!match) return;
        await this.matchService.play(match, player);
    }

    private isEveryoneReady(lobby) {
        for (const playerId of lobby.players) {
            const ready = lobby.ready[playerId];
            if (!ready) return false;
        }
        return true;
    }

    private notifyLobbyChanges(l) {
        const lobby = cloneDeep(l);
        let namespace;
        for (let i = 0; i < lobby.players.length; i++) {
            const id = lobby.players[i];
            const socketId = this.socketService.getClient(id).id;
            namespace = (namespace || this.socketService.getServer()).to(socketId);
            const player = this.playerService.getPlayer(id);
            player.color = this.getPlayerColors(i);
            this.playerService.savePlayer(player);
            player.ready = lobby.ready[id] || false;
            lobby.players[i] = player;
        }
        if (!namespace) return;
        namespace.emit('update lobby', lobby);
    }

    private notifyStartGame(_lobby) {
        const lobby = cloneDeep(_lobby);
        const players = lobby.players.map(id => this.playerService.getPlayer(id));
        const match = cloneDeep(this.matchService.generateMatch(_lobby.board, ...players));
        this.matchService.saveAndBroadcastMatch(match);
    }

    private getPlayerColors(i: number) {
        const colors = [
            'red', 'blue', 'darkorange', 'green', 'blueviolet', 'deepskyblue'
        ];
        return colors[i];
    }

    private sleep(n: number) {
        return new Promise(r => {
            setTimeout(() => {
                r();
            }, n);
        });
    }

}