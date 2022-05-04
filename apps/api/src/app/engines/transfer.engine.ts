import { TransferPayload, TransferCompletePayload, Player, TransferAction, TransferCompleteAction } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { PubSubService } from "../pubsub/pubsub.service";
import { MatchService } from "../shared/services/match.service";
import { PlayerService } from "../shared/services/player.service";
import { SocketService } from "../socket/socket.service";
import { Engine, Gear } from "./engine.decorators";

@Engine()
@Injectable()
export class TransferEngine {

  constructor (
    private playerService: PlayerService,
    private matchService: MatchService,
    private pubsubService: PubSubService,
    private socketService: SocketService
  ) { }

  @Gear('transfer')
  async onTransfer(action: TransferAction, payload: TransferPayload) {
    const { from: fromId, to: toId, amount } = action.body;
    if (amount < 0) {
      return this.pubsubService.publishTransfer(toId, fromId, -amount, payload.actions['transfer-complete'].callback, payload.actions);
    }
    const from = this.playerService.getPlayer(fromId);
    const to = this.playerService.getPlayer(toId);
    console.log(`Transfering ${amount} from ${from.name} to ${to.name}`);
    this.pubsubService.publishDeduct(fromId, amount, 'transfer-complete', payload.actions);
  }

  @Gear('transfer-complete')
  async onTransferComplete(action: TransferCompleteAction, payload: TransferCompletePayload) {
    const { body, callback } = action;
    const { from: fromId, to: toId, amount: actualAmount } = body;
    const from = this.playerService.getPlayer(fromId);
    const to = this.playerService.getPlayer(toId);
    console.log(`${to.name} will receive ${actualAmount}`);
    this.playerService.addMoney(to.id, actualAmount);
    this.broadcastTransaction(to, actualAmount, from.name);
    const callbackPayload = this.pubsubService.changeAction(payload, callback);
    this.pubsubService.publish(callbackPayload);
  }

  // TODO: create common service for this
  private broadcastTransaction(player: Player, amount: number, origin: string) {
    const playerOrder = this.matchService.getPlayerOrder(player.matchId);
    const got = amount > 0;
    const val = Math.abs(amount);
    const startMessage = `just ${got ? 'got' : 'lost'} ${val}`;
    const oriMessage = origin ? ` ${amount > 0 ? 'from' : 'to'} ${origin}` : '';
    const data = `${startMessage}${oriMessage}`;
    console.log(`Notifying that ${player.name} ${data}`);
    this.socketService.broadcastGlobalMessage(
      playerOrder,
      id => id === player.id
        ? `You ${data}`
        : `${player.name} ${data}`
    );
  }

}
