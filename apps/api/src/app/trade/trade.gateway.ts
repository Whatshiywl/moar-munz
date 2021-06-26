import { TradeSide } from '@moar-munz/api-interfaces';
import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { SocketService } from '../socket/socket.service';
import { createHash } from 'crypto';
import { MatchService } from '../shared/services/match.service';
import { PlayerService } from '../shared/services/player.service';

@WebSocketGateway()
export class TradeGateway {

    constructor(
        private socketService: SocketService,
        private matchService: MatchService,
        private playerService: PlayerService
    ) { }

    @SubscribeMessage('update trade')
    async onMessage(@MessageBody() body: { data: { side: TradeSide, player: string } }) {
        const { data: { side, player } } = body;
        const hash = createHash('sha1');
        side.form.tiles.forEach(tile => hash.update(tile));
        hash.update(`${side.form.value}`);
        side.hash = hash.digest('hex');
        const trade = await this.socketService.updateTradeSide(side, player);
        if (!trade) return;
        for (const side of trade.sides) {
            const thisPlayer = this.playerService.getPlayer(side.player);
            const otherPlayerId = trade.sides.find(s => s.player !== side.player).player;
            const otherPlayer = this.playerService.getPlayer(otherPlayerId);
            const toTransfer = side.form.value || 0;
            this.matchService.addPlayerMoney(thisPlayer, -toTransfer);
            this.matchService.addPlayerMoney(otherPlayer, toTransfer);
            for (const tile of side.form.tiles) {
                this.matchService.setTileOwner(tile, otherPlayer);
            }
        }
        this.socketService.endTrade(trade);
    }

}
