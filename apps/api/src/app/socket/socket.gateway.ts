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
        if (!lobby || !lobby.open) return false;
        let token = client.handshake.query.token;
        if (!token) {
            const uuid = this.uuidService.generateUUID(2);
            token = this.jwtService.genToken({ uuid });
        }
        const payload = this.jwtService.getPayload(token);
        const player = this.playerService.generatePlayer(payload.uuid);
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

    handleDisconnect(@ConnectedSocket() client: Socket) {
        const token = client.handshake.query.token;
        const payload = this.jwtService.getPayload(token);
        const player = this.playerService.getPlayer(payload.uuid);
        if (!player) return;
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
        player.ready = ready;
        this.playerService.savePlayer(player);
        const everyoneReady = this.isEveryoneReady(lobby);
        if (everyoneReady) {
            lobby.open = false;
            this.lobbyService.saveLobby(lobby);
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
            const p = this.playerService.getPlayer(playerId);
            if (!p.ready) return false;
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

}