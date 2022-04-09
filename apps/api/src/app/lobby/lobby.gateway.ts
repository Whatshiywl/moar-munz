import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { LobbyService } from './lobby.service';
import { BodyLobbyPipe } from '../shared/pipes/body-lobby.pipe';
import { DataBody, MatchBody, PlayerBody, SocketBody } from '../socket/socket.interfaces';
import { UsePipes } from '@nestjs/common';
import { BodyPlayerPipe } from '../shared/pipes/body-player.pipe';
import { PlayerService } from '../shared/services/player.service';

type EnterLobyBody = SocketBody & DataBody<{ lobbyId: string }> & MatchBody
type ReadyBody = SocketBody & DataBody<{ ready: boolean }> & MatchBody & PlayerBody
type RemovePlayerBody = SocketBody & DataBody<{ id: string }> & MatchBody & PlayerBody

@WebSocketGateway()
export class LobbyGateway {

    constructor(
        private lobbyService: LobbyService,
        private playerService: PlayerService
    ) { }

    @UsePipes(BodyLobbyPipe)
    @SubscribeMessage('enter lobby')
    onEnterLobby(@MessageBody() body: EnterLobyBody) {
        const { token, match } = body;
        if (!match) return;
        return this.lobbyService.onEnterLobby(match, token);
    }

    @UsePipes(BodyPlayerPipe, BodyLobbyPipe)
    @SubscribeMessage('ready')
    onReady(@MessageBody() body: ReadyBody) {
        const { player, match, data } = body;
        if (!player || !match) return;
        console.log('onReady', player.id);
        this.lobbyService.onPlayerReady(match, player, data.ready);
    }

    @UsePipes(BodyPlayerPipe, BodyLobbyPipe)
    @SubscribeMessage('remove player')
    async onRemovePlayer(@MessageBody() body: RemovePlayerBody) {
        const { player, match, data } = body;
        if (!player || !match) return;
        const admin = match.playerOrder.filter(Boolean)[0];
        if (player.id !== admin) return;
        const playerToRemove = this.playerService.getPlayer(data.id);
        if (!playerToRemove.ai) return;
        await this.lobbyService.removePlayer(match, playerToRemove, false);
    }

    @UsePipes(BodyPlayerPipe, BodyLobbyPipe)
    @SubscribeMessage('add ai')
    onAddAI(@MessageBody() body: RemovePlayerBody) {
        const { player, match } = body;
        if (!player || !match) return;
        const admin = match.playerOrder.filter(Boolean)[0];
        if (player.id !== admin) return;
        this.lobbyService.addAI(match);
    }

}
