import { WebSocketGateway, ConnectedSocket, OnGatewayInit, OnGatewayDisconnect, OnGatewayConnection } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { LobbyService } from '../lobby/lobby.service';
import { PlayerService } from '../shared/services/player.service';
import { SocketService } from './socket.service';
import { JWTService } from '../shared/services/jwt.service';
import { BoardService } from '../shared/services/board.service';

@WebSocketGateway()
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

    constructor(
        private lobbyService: LobbyService,
        private playerService: PlayerService,
        private boardService: BoardService,
        private socketService: SocketService,
        private jwtService: JWTService
    ) { }

    async afterInit(server: Server) {
        await this.boardService.loadBoards();
        this.socketService.initServer(server);
    }

    handleConnection(@ConnectedSocket() client: Socket) {
        try {
            this.socketService.connect(client);
        } catch (error) {
            console.error(error);
        }
    }

    async handleDisconnect(@ConnectedSocket() client: Socket) {
        const token = client.handshake.query.token;
        const payload = this.jwtService.getPayload(token);
        const player = this.playerService.getPlayer(payload.uuid);
        if (!player) return;
        const lobby = this.lobbyService.getLobby(player.lobby);
        if (!lobby) return;
        await this.lobbyService.removePlayer(lobby, player, true);
        this.socketService.disconnect(client);
        return lobby;
    }

}
