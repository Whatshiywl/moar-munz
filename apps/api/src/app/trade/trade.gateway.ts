import { TradeSide } from '@moar-munz/api-interfaces';
import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { SocketService } from '../socket/socket.service';
import { createHash } from 'crypto';

@WebSocketGateway()
export class TradeGateway {

    constructor(
        private socketService: SocketService
    ) { }

    @SubscribeMessage('update trade')
    async onMessage(@MessageBody() body: { data: { side: TradeSide, player: string } }) {
        const { data: { side, player } } = body;
        const hash = createHash('sha1');
        side.form.tiles.forEach(tile => hash.update(tile));
        hash.update(`${side.form.value}`);
        side.hash = hash.digest('hex');
        const confirmed = await this.socketService.updateTradeSide(side, player);
        if (confirmed) {
            //TODO: execute trade
        }
    }

}
