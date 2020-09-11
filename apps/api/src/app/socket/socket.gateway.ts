import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayInit, OnGatewayDisconnect, OnGatewayConnection, WebSocketServer } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { cloneDeep } from 'lodash';
import { LobbyService } from '../shared/db/lobby.service';
import { PlayerService } from '../shared/db/player.service';
import { MatchService } from '../shared/db/match.service';
import { SocketService } from './socket.service';
import { JWTService } from '../shared/jwt/jwt.service';
import { UUIDService } from '../shared/uuid/uuid.service';

@WebSocketGateway()
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

    constructor(
        private lobbyService: LobbyService,
        private playerService: PlayerService,
        private matchService: MatchService,
        private socketService: SocketService,
        private uuidService: UUIDService,
        private jwtService: JWTService
    ) { }

    afterInit(server: Server) {
        this.socketService.initServer(server);
    }

    handleConnection(@ConnectedSocket() client: Socket) {
        this.socketService.connect(client);
    }

    handleDisconnect(@ConnectedSocket() client: Socket) {
        const token = client.handshake.query.token;
        const clientId = client.id;
        const disconnectResult = this.socketService.disconnect(clientId, token);
        const { player, payload, lobby } = disconnectResult;
        this.matchService.removePlayer(player.lobby, payload.uuid);
        return lobby;
    }

    @SubscribeMessage('enter lobby')
    onEnterLobby(@MessageBody() lobbyQuery: { id: string }, @ConnectedSocket() client: Socket) {
        const token = client.handshake.query.token;
        const lobbyId = lobbyQuery.id;
        return this.socketService.handleEnterLobby(lobbyId, token);
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
            this.socketService.notifyLobbyChanges(lobby);
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

    private notifyStartGame(_lobby) {
        const lobby = cloneDeep(_lobby);
        const players = lobby.players.map(id => this.playerService.getPlayer(id));
        const match = cloneDeep(this.matchService.generateMatch(_lobby.board, ...players));
        this.matchService.saveAndBroadcastMatch(match);
    }

}