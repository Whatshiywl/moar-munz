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
        const payload = this.jwtService.getPayload(token);
        const player = this.playerService.getPlayer(payload.uuid);
        if (!player) return;
        const lobby = this.lobbyService.getLobby(player.lobby);
        if (!lobby) return;
        this.lobbyService.removePlayer(lobby, player);
        this.playerService.deletePlayer(payload.uuid);
        this.socketService.disconnect(clientId, token);
        this.matchService.removePlayer(player.lobby, payload.uuid);
        return lobby;
    }

    @SubscribeMessage('enter lobby')
    onEnterLobby(@MessageBody() lobbyQuery: { id: string }, @ConnectedSocket() client: Socket) {
        const token = client.handshake.query.token;
        const lobbyId = lobbyQuery.id;
        const lobby = this.lobbyService.getLobby(lobbyId);
        return this.lobbyService.onEnterLobby(lobby, token);
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
        this.lobbyService.onPlayerReady(lobby, player, ready);
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

}