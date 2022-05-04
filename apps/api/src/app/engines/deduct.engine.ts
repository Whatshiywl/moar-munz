import { Injectable } from "@nestjs/common";
import { CheckBalanceAction, CheckBalancePayload, DeductAction, DeductPayload, Player, VictoryState } from "@moar-munz/api-interfaces";
import { SellTilesPromptFactory } from "../prompt/factories/selltiles.factory";
import { PromptService } from "../prompt/prompt.service";
import { MatchService } from "../shared/services/match.service";
import { PlayerService } from "../shared/services/player.service";
import { PubSubService } from "../pubsub/pubsub.service";
import { SocketService } from "../socket/socket.service";
import { Engine, Gear } from "./engine.decorators";

@Engine()
@Injectable()
export class DeductEngine {

  constructor(
    private playerService: PlayerService,
    private matchService: MatchService,
    private promptService: PromptService,
    private sellTilesPromptFactory: SellTilesPromptFactory,
    private socketService: SocketService,
    private pubsubService: PubSubService
  ) { }

  @Gear('deduct')
  async onDeduct(action: DeductAction, payload: DeductPayload) {
    const { playerId, amount } = action.body;
    this.playerService.addMoney(playerId, -amount);
    const checkBalancePayload = this.pubsubService.changeAction<CheckBalancePayload>(payload, 'check-balance');
    this.pubsubService.publish(checkBalancePayload);
  }

  @Gear('check-balance')
  async onCheckBalance(action: CheckBalanceAction, payload: CheckBalancePayload) {
    const { body, callback } = action;
    const { playerId, amount, origin } = body;
    const player = this.playerService.getPlayer(playerId);
    const balance = player.state.money;
    if (balance < 0 && this.matchService.getPlayerProperties(player).length) {
      this.promptService.publish(player, this.sellTilesPromptFactory, 'check-balance', payload.actions);
    } else {
      const debt = Math.min(0, player.state.money);
      const actualAmount = amount + debt;
      this.checkPlayerLost(player);
      if (origin) {
        const hasLost = this.playerService.getState(player.id).victory === VictoryState.LOST;
        if (!hasLost) this.broadcastTransaction(player, -amount, origin);
      }
      const checkBalancePayload = this.pubsubService.changeAction(payload, callback);
      if (checkBalancePayload.actions[callback]) {
        checkBalancePayload.actions[callback].body.amount = actualAmount;
      }
      this.pubsubService.publish(checkBalancePayload);
    }
  }

  private checkPlayerLost(player: Player) {
    const playerOrder = this.matchService.getPlayerOrder(player.matchId);
    if (this.playerService.getState(player.id)?.money >= 0) return;
    console.log(`${player.name} LOSES`);
    this.playerService.updateState(player.id, {
      money: 0, victory: VictoryState.LOST
    });
    const lost = [];
    const notLost = playerOrder.filter(Boolean).filter(id => {
      if (id === player.id) return false;
      const otherPlayer = this.playerService.getPlayer(id);
      const otherPlayerState = otherPlayer.state;
      if (otherPlayerState.victory === VictoryState.LOST) {
        lost.push(id);
        return false;
      } else return true;
    });
    if (notLost.length === 1) {
      const winner = this.playerService.getPlayer(notLost[0]);
      this.pubsubService.publishWin(winner.id);
    } else {
      this.socketService.broadcastGlobalMessage(
        playerOrder,
        id => id === player.id ?
          `You have lost. Git gud!` :
          `${player.name} has lost`
      );
    }
    return;
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
