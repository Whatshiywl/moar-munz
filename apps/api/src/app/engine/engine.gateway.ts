import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { MatchBody, PlayerBody, SocketBody } from '../socket/socket.interfaces';
import { UsePipes } from '@nestjs/common';
import { BodyPlayerPipe } from '../shared/pipes/body-player.pipe';
import { EngineService } from './engine.service';
import { BodyMatchPipe } from '../shared/pipes/body-match.pipe';

type ThrowDiceBody = SocketBody & MatchBody & PlayerBody

@WebSocketGateway()
export class EngineGateway {

    constructor(
        private engineService: EngineService
    ) { }

    @UsePipes(BodyPlayerPipe, BodyMatchPipe)
    @SubscribeMessage('throw dice')
    async onThrowDice(@MessageBody() body: ThrowDiceBody) {
        const { player, match } = body;
        if (!player || !match) return;
        await this.engineService.play(match, player);
    }

}
