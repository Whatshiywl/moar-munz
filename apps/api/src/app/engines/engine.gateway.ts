import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { JWTService } from '../shared/services/jwt.service';
import { PubSubService } from '../pubsub/pubsub.service';
import { PlayerService } from '../shared/services/player.service';

@WebSocketGateway()
export class EngineGateway {

    constructor(
        private playerService: PlayerService,
        private pubsubService: PubSubService,
        private jwtService: JWTService
    ) { }

    @SubscribeMessage('throw dice')
    async onThrowDice(@MessageBody() { token }: { token: string }) {
        const { uuid } = this.jwtService.getPayload(token);
        const player = this.playerService.getPlayer(uuid);
        this.pubsubService.publishPlay(player.matchId, player.id);
    }

}
