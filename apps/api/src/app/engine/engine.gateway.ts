import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { EngineService } from './engine.service';
import { JWTService } from '../shared/services/jwt.service';

@WebSocketGateway()
export class EngineGateway {

    constructor(
        private engineService: EngineService,
        private jwtService: JWTService
    ) { }

    @SubscribeMessage('throw dice')
    async onThrowDice(@MessageBody() { token }: { token: string }) {
        const payload = this.jwtService.getPayload(token);
        await this.engineService.play(payload.uuid);
    }

}
