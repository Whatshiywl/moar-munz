import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { JWTService } from '../shared/services/jwt.service';
import { PubSubService } from '../pubsub/pubsub.service';

@WebSocketGateway()
export class EngineGateway {

    constructor(
        private pubsubService: PubSubService,
        private jwtService: JWTService
    ) { }

    @SubscribeMessage('throw dice')
    async onThrowDice(@MessageBody() { token }: { token: string }) {
        const payload = this.jwtService.getPayload(token);
        this.pubsubService.publishPlay(payload.uuid);
    }

}
