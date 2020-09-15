import { WebSocketGateway, ConnectedSocket, OnGatewayInit, OnGatewayDisconnect, OnGatewayConnection } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { LobbyService } from '../lobby/lobby.service';
import { PlayerService } from '../shared/db/player.service';
import { MatchService } from '../match/match.service';
import { SocketService } from './socket.service';
import { JWTService } from '../shared/jwt/jwt.service';
import { BoardService } from '../shared/db/board.service';

@WebSocketGateway()
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

    constructor(
        private lobbyService: LobbyService,
        private playerService: PlayerService,
        private matchService: MatchService,
        private boardService: BoardService,
        private socketService: SocketService,
        private jwtService: JWTService
    ) { }

    async afterInit(server: Server) {
        await this.boardService.loadBoards();
        this.socketService.initServer(server);
    }

    handleConnection(@ConnectedSocket() client: Socket) {
        this.socketService.connect(client);
    }

    handleDisconnect(@ConnectedSocket() client: Socket) {
        const token = client.handshake.query.token;
        const payload = this.jwtService.getPayload(token);
        const player = this.playerService.getPlayer(payload.uuid);
        if (!player) return;
        const lobby = this.lobbyService.getLobby(player.lobby);
        if (!lobby) return;
        const match = this.matchService.getMatch(player.lobby);
        this.lobbyService.removePlayer(lobby, match, player);
        this.socketService.disconnect(client);
        return lobby;
    }

}