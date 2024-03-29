import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { LobbyService } from './lobby.service';
import { BodyLobbyPipe } from '../shared/pipes/body-lobby.pipe';
import { DataBody, LobbyBody, PlayerBody, SocketBody } from '../socket/socket.interfaces';
import { UsePipes } from '@nestjs/common';
import { BodyPlayerPipe } from '../shared/pipes/body-player.pipe';
import { PlayerService } from '../shared/services/player.service';

type EnterLobyBody = SocketBody & DataBody<{ lobbyId: string }> & LobbyBody
type ReadyBody = SocketBody & DataBody<{ ready: boolean }> & LobbyBody & PlayerBody
type RemovePlayerBody = SocketBody & DataBody<{ id: string }> & LobbyBody & PlayerBody

@WebSocketGateway()
export class LobbyGateway {

    constructor(
        private lobbyService: LobbyService,
        private playerService: PlayerService
    ) { }

    @UsePipes(BodyLobbyPipe)
    @SubscribeMessage('enter lobby')
    onEnterLobby(@MessageBody() body: EnterLobyBody) {
        const { token, lobby } = body;
        if (!lobby) return;
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

    @UsePipes(BodyPlayerPipe, BodyLobbyPipe)
    @SubscribeMessage('remove player')
    async onRemovePlayer(@MessageBody() body: RemovePlayerBody) {
        const { player, lobby, data } = body;
        if (!player || !lobby) return;
        const admin = lobby.playerOrder.filter(Boolean)[0];
        if (player.id !== admin) return;
        const playerToRemove = this.playerService.getPlayer(data.id);
        if (!playerToRemove.ai) return;
        await this.lobbyService.removePlayer(lobby, playerToRemove, false);
    }

    @UsePipes(BodyPlayerPipe, BodyLobbyPipe)
    @SubscribeMessage('add ai')
    onAddAI(@MessageBody() body: RemovePlayerBody) {
        const { player, lobby } = body;
        if (!player || !lobby) return;
        const admin = lobby.playerOrder.filter(Boolean)[0];
        if (player.id !== admin) return;
        this.lobbyService.addAI(lobby);
    }

}
