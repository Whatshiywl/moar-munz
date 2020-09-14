import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { LobbyService } from '../lobby/lobby.service';
import { BodyLobbyPipe } from '../shared/pipes/body-lobby.pipe';
import { DataBody, LobbyBody, PlayerBody, SocketBody } from '../socket/socket.interfaces';
import { UsePipes } from '@nestjs/common';
import { BodyPlayerPipe } from '../shared/pipes/body-player.pipe';

type EnterLobyBody = SocketBody & DataBody<{ lobbyId: string }> & LobbyBody
type ReadyBody = SocketBody & DataBody<{ ready: boolean }> & LobbyBody & PlayerBody

@WebSocketGateway()
export class MatchGateway {

    constructor(
        private lobbyService: LobbyService
    ) { }

    @UsePipes(BodyLobbyPipe)
    @SubscribeMessage('enter lobby')
    onEnterLobby(@MessageBody() body: EnterLobyBody) {
        const { token, lobby } = body;
        return this.lobbyService.onEnterLobby(lobby, token);
    }

    @UsePipes(BodyPlayerPipe, BodyLobbyPipe)
    @SubscribeMessage('ready')
    onReady(@MessageBody() body: ReadyBody) {
        const { player, lobby, data } = body;
        if (!player || !lobby) return;
        console.log('onReady', player.id);
        this.lobbyService.onPlayerReady(lobby, player, data.ready);
    }

}