import { Injectable } from '@nestjs/common';
import { sample, groupBy } from 'lodash';
import { PlayerService } from '../shared/services/player.service';
import { BoardService } from '../shared/services/board.service';
import { SocketService } from '../socket/socket.service';
import { DeedTile, DynamicTile, MatchState, Player, VictoryState, PlayMessage, TransferMessage, TransferPayload, TransferCompleteMessage, TransferCompletePayload, DeductMessage, CheckBalanceMessage, DeductPayload, CheckBalancePayload, WinMessage, WinPayload, AfterRentPaymentMessage, DeedAquireConfirmedMessage, AfterRentPaymentPayload, DeedAquireConfirmedPayload } from '@moar-munz/api-interfaces';
import { PromptService } from '../prompt/prompt.service';
import { MatchService } from '../shared/services/match.service';
import { PubSubService } from '../shared/services/pubsub.service';
import { WorldtourPromptFactory } from '../prompt/factories/worldtour.factory';
import { WorldcupPromptFactory } from '../prompt/factories/worldcup.factory';
import { BuyDeedPromptFactory } from '../prompt/factories/buydeed.factory';
import { ImproveDeedPromptFactory } from '../prompt/factories/improvedeed.factory';
import { AquireDeedPromptFactory } from '../prompt/factories/aquiredeed.factory';
import { BuyTilePromptFactory } from '../prompt/factories/buytile.factory';
import { SellTilesPromptFactory } from '../prompt/factories/selltiles.factory';

@Injectable()
export class EngineService {

  private readonly diceRollInterval = 100;
  private readonly diceRollAccel = 1.2;
  private readonly diceRollTimeout = 500;
  private readonly diceRollN = Math.round(Math.log((this.diceRollAccel - 1) * (this.diceRollTimeout / this.diceRollInterval) + 1) / Math.log(this.diceRollAccel));

  constructor(
    private matchService: MatchService,
    private playerService: PlayerService,
    private socketService: SocketService,
    private boardService: BoardService,
    private promptService: PromptService,
    private pubsubService: PubSubService,
    private worldtourPromptFactory: WorldtourPromptFactory,
    private worldcupPromptFactory: WorldcupPromptFactory,
    private buyDeedPromptFactory: BuyDeedPromptFactory,
    private improveDeedPromptFactory: ImproveDeedPromptFactory,
    private aquireDeedPromptFactory: AquireDeedPromptFactory,
    private buyTilePromptFactory: BuyTilePromptFactory,
    private sellTilesPromptFactory: SellTilesPromptFactory
  ) {
    this.pubsubService.on<PlayMessage>('play')
    .subscribe(async ({ payload, ack }) => {
      await this.play(payload.actions[payload.action].body.playerId, payload.actions[payload.action].body.forceUnlock);
      ack();
    });

    this.pubsubService.on<TransferMessage>('transfer')
    .subscribe(async ({ payload, ack }) => {
      await this.onTransfer(payload);
      ack();
    });

    this.pubsubService.on<AfterRentPaymentMessage>('after-rent-payment')
    .subscribe(async ({ payload, ack }) => {
      await this.onAfterRentPayment(payload);
      ack();
    });

    this.pubsubService.on<DeedAquireConfirmedMessage>('deed-aquire-confirmed')
    .subscribe(async ({ payload, ack }) => {
      await this.onDeedAquireConfirmed(payload);
      ack();
    });

    this.pubsubService.on<TransferCompleteMessage>('transfer-complete')
    .subscribe(async ({ payload, ack }) => {
      await this.onCompleteTransfer(payload);
      ack();
    });

    this.pubsubService.on<DeductMessage>('deduct')
    .subscribe(async ({ payload, ack }) => {
      await this.onDeduct(payload);
      ack();
    });

    this.pubsubService.on<CheckBalanceMessage>('check-balance')
    .subscribe(async ({ payload, ack }) => {
      await this.onCheckBalance(payload);
      ack();
    });

    this.pubsubService.on<WinMessage>('win')
    .subscribe(({ payload, ack }) => {
      this.win(payload);
      ack();
    });

  }

  private rollDice(): [number, number] {
    return [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)];
  }

  private sumDice(dice: number[]) {
    return dice.reduce((acc, n) => acc + n, 0);
  }

  private async determineDice(playerId: string) {
    const { matchId } = this.playerService.getPlayer(playerId) || {};
    if (!matchId) return;
    const dice = this.rollDice();
    const playerOrder = this.matchService.getPlayerOrder(matchId);
    for (let i = 0; i < this.diceRollN; i++) {
      const tempDice = this.rollDice();
      this.socketService.emit('dice roll', tempDice, playerOrder);
      await this.sleep(Math.round(this.diceRollInterval * Math.pow(this.diceRollAccel, i)));
    }
    this.matchService.setLastDice(matchId, dice);
    return true;
  }

  async play(playerId: string, forceUnlock: boolean = false) {
    if (!this.canPlay(playerId, forceUnlock)) return;
    const { matchId } = this.playerService.getPlayer(playerId);
    const matchState = this.matchService.getState(matchId);
    switch (matchState) {
      case MatchState.IDLE:
        this.matchService.setState(matchId, MatchState.START_TURN);
        await this.startTurn(playerId, matchId);
        break;
      case MatchState.START_TURN:
        this.matchService.setState(matchId, MatchState.ROLLING_DICE);
        await this.rollingDice(playerId, matchId);
        break;
      case MatchState.ROLLING_DICE:
        this.matchService.setState(matchId, MatchState.PLAYING);
        this.playing(playerId, matchId);
        break;
      case MatchState.PLAYING:
        this.matchService.setState(matchId, MatchState.MOVING);
        await this.moving(playerId, matchId);
        break;
      case MatchState.MOVING:
        this.matchService.setState(matchId, MatchState.LANDING);
        await this.landing(playerId, matchId);
        break;
      case MatchState.LANDING:
        this.matchService.setState(matchId, MatchState.IDLE);
        await this.idle(playerId, matchId);
        break;
    }
  }

  private async startTurn(playerId: string, matchId: string) {
    this.matchService.lock(matchId);
    const unlockAndPublish = await this.onStart(playerId);
    if (unlockAndPublish) {
      this.matchService.unlock(matchId);
      this.pubsubService.publishPlay(playerId);
    }
  }

  private async rollingDice(playerId: string, matchId: string) {
    this.matchService.lock(matchId);
    const publish = await this.determineDice(playerId);
    this.matchService.unlock(matchId);
    if (publish) this.pubsubService.publishPlay(playerId);
  }

  private playing(playerId: string, matchId: string) {
    this.matchService.lock(matchId);
    const publish = this.onPlay(playerId);
    this.matchService.unlock(matchId);
    if (publish) this.pubsubService.publishPlay(playerId);
  }

  private async moving(playerId: string, matchId: string) {
    this.matchService.lock(matchId);
    const publish = await this.walkNTiles(playerId);
    this.matchService.unlock(matchId);
    if (publish) this.pubsubService.publishPlay(playerId);
  }

  private async landing(playerId: string, matchId: string) {
    this.matchService.lock(matchId);
    const { publish, unlock } = await this.onLand(playerId);
    if (unlock) this.matchService.unlock(matchId);
    if (publish) this.pubsubService.publishPlay(playerId);
  }

  private async idle(playerId: string, matchId: string) {
    this.matchService.lock(matchId);
    await this.onEnd(playerId);
    this.matchService.unlock(matchId);
  }

  private canPlay(playerId: string, forceUnlock: boolean) {
    const player = this.playerService.getPlayer(playerId);
    if (!player) return false;
    if (forceUnlock) this.matchService.unlock(player.matchId);
    if (!this.matchService.isPlayable(player.matchId)) return false;
    if (!player.state.turn) return false;
    if (player.state.victory === VictoryState.LOST) this.matchService.setState(player.matchId, MatchState.LANDING);
    return true;
  }

  private async walkNTiles(playerId: string) {
    const player = this.playerService.getPlayer(playerId);
    if (!player) return false;
    const walkDistance = player.state.walkDistance;
    const boardSize = this.matchService.getBoardSize(player.matchId);
    const start = player.state.position;
    for (let i = 1; i <= walkDistance; i++) {
      const position = (start + i) % boardSize;
      this.movePlayerToPosition(player, position);
      await this.sleep(250);
    }
    return true;
  }

  private async movePlayerToPosition(player: Player, position: number) {
    this.matchService.move(player, position);
    await this.onPass(player);
  }

  private async onStart(playerId: string) {
    const player = this.playerService.getPlayer(playerId);
    console.log(`${player.name}'s turn started`);
    const playerState = player.state;
    let board = this.matchService.getBoard(player.matchId);
    const tile = board.tiles[playerState.position];
    switch (tile.type) {
      case 'worldtour':
        if (this.playerService.getState(playerId)?.money < tile.cost) {
          return true;
        }
        const payload = this.pubsubService.getPlayPayload(playerId, true);
        this.promptService.publish(player, this.worldtourPromptFactory, 'play', payload.actions);
        return false;
      default:
        return true;
    }
  }

  private onPlay(playerId: string) {
    const player = this.playerService.getPlayer(playerId);
    if (!player) return false;
    const playerState = player.state;
    const dice = this.matchService.getLastDice(player.matchId);
    const tile = this.matchService.getTileWithPlayer(player);
    switch (tile.type) {
      case 'prison':
        if (playerState.prison > 0) {
          if (dice[0] !== undefined && dice[0] === dice[1]) {
            this.playerService.updateState(playerId, {
              prison: 0, playAgain: true
            });
          } else {
            this.playerService.updateState(playerId, {
              prison: playerState.prison - 1
            });
            console.log('not pairs, cant leave jail');
            this.matchService.setState(player.matchId, MatchState.LANDING);
            return true;
          }
        }
        break;
      default:
        if (dice[0] !== undefined && dice[0] === dice[1]) {
          const equalDie = (playerState.equalDie || 0) + 1;
          this.playerService.updateState(playerId, { equalDie });
          if (equalDie === 3) {
            this.sendToJail(player);
            console.log('3 pairs, go to jail');
            this.matchService.setState(player.matchId, MatchState.LANDING);
            return true;
          } else {
            this.playerService.updateState(playerId, { playAgain: true });
          }
        } else {
          this.playerService.updateState(playerId, { equalDie: 0 });
        }
        break;
    }
    const lastDice = this.matchService.getLastDice(player.matchId);
    const walkDistance = this.sumDice(lastDice);
    this.playerService.setWalkDistance(playerId, walkDistance);
    return true;
  }

  private async onPass(player: Player) {
    const position = player.state.position;
    const tile = this.matchService.getTileAtPosition(player.matchId, position);
    switch (tile.type) {
      case 'start':
        const amount = 300;
        this.playerService.addMoney(player.id, amount);
        this.broadcastTransaction(player, amount, tile.name);
        break;
    }
  }

  private async onLand(playerId: string): Promise<{ publish: boolean, unlock: boolean }> {
    const ret = (publish: boolean, unlock = true) => ({ publish, unlock });
    const player = this.playerService.getPlayer(playerId);
    if (!player) return ret(false);
    const tile = this.matchService.getTileWithPlayer(player);
    console.log(player.id, player.name, 'landed on', tile, 'with', player.state.money);
    switch (tile.type) {
      case 'prison':
        this.playerService.updateState(playerId, { prison: 2 });
        break;
      case 'worldcup':
        const payload = this.pubsubService.getPlayPayload(playerId, true);
        this.promptService.publish(player, this.worldcupPromptFactory, 'play', payload.actions);
        return ret(false, false);
      case 'deed':
        if (!tile.owner) {
          if (tile.price > this.playerService.getState(playerId)?.money) break;
          const payload = this.pubsubService.getPlayPayload(playerId, true);
          this.promptService.publish(player, this.buyDeedPromptFactory, 'play', payload.actions);
        } else {
          if (tile.owner === player.id) {
            const payload = this.pubsubService.getPlayPayload(playerId, true);
            this.promptService.publish(player, this.improveDeedPromptFactory, 'play', payload.actions);
          } else {
            await this.onLandOthersProp(playerId);
          }
        }
        return ret(false, false);
      case 'company':
        if (!tile.owner) {
          if (tile.price > this.playerService.getState(playerId)?.money) break;
          const payload = this.pubsubService.getPlayPayload(playerId, true);
          this.promptService.publish(player, this.buyTilePromptFactory, 'play', payload.actions);
          return ret(false, false);
        } else {
          if (tile.owner !== player.id) {
            const dice = this.matchService.getLastDice(player.matchId);
            const cost = this.sumDice(dice) * tile.multiplier;
            const playPayload = this.pubsubService.getPlayPayload(playerId, true);
            this.pubsubService.publishTransfer(playerId, tile.owner, cost, playPayload.action, playPayload.actions);
            return ret(false, false);
          }
        }
        break;
      case 'railroad':
        if (!tile.owner) {
          if (tile.price > this.playerService.getState(playerId)?.money) break;
          const payload = this.pubsubService.getPlayPayload(playerId, true);
          this.promptService.publish(player, this.buyTilePromptFactory, 'play', payload.actions);
          return ret(false, false);
        } else {
          if (tile.owner !== player.id) {
            const cost = this.boardService.getRawRent(tile);
            const playPayload = this.pubsubService.getPlayPayload(playerId, true);
            this.pubsubService.publishTransfer(playerId, tile.owner, cost, playPayload.action, playPayload.actions);
            return ret(false, false);
          }
        }
        break;
      case 'tax':
        const ownedProperties = this.matchService.getPlayerProperties(player);
        const propretyValue = ownedProperties.reduce((acc, t) => acc += this.boardService.getTileValue(t), 0);
        const totalValue = this.playerService.getState(playerId)?.money + propretyValue;
        const tax = tile.tax;
        const taxAmount = Math.ceil(totalValue * tax);
        return this.giveThenPlay(player, -taxAmount, tile.name);
      case 'chance':
        const cards = [
          async () => {
            this.sendToJail(player);
            return ret(true);
          },
          async () => {
            this.socketService.broadcastGlobalMessage(
              [player.id], `Go back to Start!`
            );
            await this.movePlayerToPosition(player, 0);
            this.matchService.setState(player.matchId, MatchState.MOVING);
            return ret(true);
          },
          async () => this.giveThenPlay(player, 50, tile.name),
          async () => this.giveThenPlay(player, 75, tile.name),
          async () => this.giveThenPlay(player, 100, tile.name),
          async () => this.giveThenPlay(player, 125, tile.name),
          async () => this.giveThenPlay(player, 150, tile.name),
          async () => this.giveThenPlay(player, 200, tile.name),
          async () => this.giveThenPlay(player, 300, tile.name),
          async () => this.giveThenPlay(player, 500, tile.name),
          async () => this.giveThenPlay(player, 1500, tile.name),
          async () => this.giveThenPlay(player, -50, tile.name),
          async () => this.giveThenPlay(player, -75, tile.name),
          async () => this.giveThenPlay(player, -100, tile.name),
          async () => this.giveThenPlay(player, -125, tile.name),
          async () => this.giveThenPlay(player, -150, tile.name),
          async () => this.giveThenPlay(player, -200, tile.name),
          async () => this.giveThenPlay(player, -300, tile.name),
          async () => this.giveThenPlay(player, -500, tile.name),
          async () => {
            this.socketService.broadcastGlobalMessage(
              [player.id], `You lucky you shall play again!`
            );
            this.playerService.updateState(playerId, { playAgain: true });
            return ret(true);
          }
        ];
        const card = sample(cards);
        const cardResult = await card();
        return cardResult;
    }
    return ret(true);
  }

  // LandOnOthersPropGear start
  private async onLandOthersProp(playerId: string) {
    const player = this.playerService.getPlayer(playerId);
    const board = this.matchService.getBoard(player.matchId);
    const tile = this.matchService.getTileWithPlayer(player) as DeedTile & DynamicTile;
    const cost = this.boardService.getFullRent(board, tile);
    this.pubsubService.publishTransfer(playerId, tile.owner, cost, 'after-rent-payment', {
      'after-rent-payment': {
        body: { playerId }
      }
    });
  }

  private async onAfterRentPayment(payload: AfterRentPaymentPayload) {
    const { playerId } = payload.actions['after-rent-payment'].body;
    const player = this.playerService.getPlayer(playerId);
    const tile = this.matchService.getTileWithPlayer(player) as DeedTile & DynamicTile;
    const value = 2 * this.boardService.getTileValue(tile);
    if (player.state.money < value) return this.pubsubService.publishPlay(playerId, true);
    const playPayload = this.pubsubService.getPlayPayload(playerId, true);
    const deedAquirePayload = this.pubsubService.addActions(payload, {
      'deed-aquire-confirmed': {
        body: { playerId }
      }
    });
    const promptPayload = this.pubsubService.addActions(deedAquirePayload, playPayload.actions);
    this.promptService.publish(player, this.aquireDeedPromptFactory, 'deed-aquire-confirmed', promptPayload.actions);
  }

  private async onDeedAquireConfirmed(payload: DeedAquireConfirmedPayload) {
    const { playerId } = payload.actions['deed-aquire-confirmed'].body;
    const player = this.playerService.getPlayer(playerId);
    const tile = this.matchService.getTileWithPlayer(player) as DeedTile & DynamicTile;
    this.matchService.setTileOwner(tile.name, player);
    this.matchService.setState(player.matchId, MatchState.MOVING);
    this.pubsubService.publishPlay(playerId, true);
  }
  // LandOnOthersPropGear end

  private async onEnd(playerId: string) {
    const player = this.playerService.getPlayer(playerId);
    if (!player) return;
    const playerState = player.state;
    const hasLost = playerState.victory === VictoryState.LOST;
    if (playerState.playAgain && !hasLost) {
      this.playerService.updateState(playerId, { playAgain: false });
      console.log(`${player.name}'s turn continues`);
      if (player.ai) {
        this.sleep(2000).then(() => this.pubsubService.publishPlay(player.id));
      }
    }
    else {
      console.log(`${player.name}'s turn ended`, player);
      const { matchId } = player;
      const nextPlayer = this.matchService.computeNextPlayer(matchId);
      if (nextPlayer.ai) {
        if (this.matchService.hasHumanPlayers(matchId)) {
          this.sleep(2000).then(() => this.pubsubService.publishPlay(nextPlayer.id));
        }
        else console.log('Abord infinite AI match!');
      }
    }
  }

  // DeductGear start
  private async onDeduct(payload: DeductPayload) {
    const { playerId, amount } = payload.actions.deduct.body;
    this.playerService.addMoney(playerId, -amount);
    const checkBalancePayload = this.pubsubService.changeAction<CheckBalancePayload>(payload, 'check-balance');
    this.pubsubService.publish(checkBalancePayload);
  }

  private async onCheckBalance(payload: CheckBalancePayload) {
    const { body, callback } = payload.actions['check-balance'];
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
  // DeductGear end

  private giveThenPlay(player: Player, amount: number, origin?: string) {
    const payload = this.pubsubService.getPlayPayload(player.id, true);
    if (amount > 0) {
      this.playerService.addMoney(player.id, amount);
      if (origin) this.broadcastTransaction(player, amount, origin);
      return { publish: true, unlock: true };
    } else {
      this.pubsubService.publishDeduct(player.id, -amount, 'play', payload.actions, origin);
      return { publish: false, unlock: false };
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

  // TransferGear start
  private async onTransfer(payload: TransferPayload) {
    const { from: fromId, to: toId, amount } = payload.actions.transfer.body;
    if (amount < 0) {
      return this.pubsubService.publishTransfer(toId, fromId, -amount, payload.actions['transfer-complete'].callback, payload.actions);
    }
    const from = this.playerService.getPlayer(fromId);
    const to = this.playerService.getPlayer(toId);
    console.log(`Transfering ${amount} from ${from.name} to ${to.name}`);
    this.pubsubService.publishDeduct(fromId, amount, 'transfer-complete', payload.actions);
  }

  private async onCompleteTransfer(payload: TransferCompletePayload) {
    const { body, callback } = payload.actions['transfer-complete'];
    const { from: fromId, to: toId, amount: actualAmount } = body;
    const from = this.playerService.getPlayer(fromId);
    const to = this.playerService.getPlayer(toId);
    console.log(`${to.name} will receive ${actualAmount}`);
    this.playerService.addMoney(to.id, actualAmount);
    this.broadcastTransaction(to, actualAmount, from.name);
    const callbackPayload = this.pubsubService.changeAction(payload, callback);
    this.pubsubService.publish(callbackPayload);
  }
  // TransferGear end

  private sendToJail(player: Player) {
    this.matchService.move(player, 10);
    this.playerService.updateState(player.id, {
      prison: 2, equalDie: 0
    });
    this.socketService.broadcastGlobalMessage(
      this.matchService.getPlayerOrder(player.matchId),
      id => id === player.id
        ? `You have gone to jail!`
        : `${player.name} has gone to jail.`
    );
  }

  // WinGear start
  private win(payload: WinPayload) {
    const { playerId } = payload.actions.win.body;
    const winner = this.playerService.getPlayer(playerId);
    console.log(`${winner.name} WINS`);
    const playerOrder = this.matchService.getPlayerOrder(winner.matchId);
    this.socketService.broadcastGlobalMessage(
      playerOrder,
      id => id === winner.id
        ? `You have won!`
        : `${winner.name} has won`
    );
    const lost = playerOrder.filter(Boolean).filter(p => p !== winner.id);
    lost.forEach(id => {
      const player = this.playerService.getPlayer(id);
      this.matchService.setPlayerVictory(player, VictoryState.LOST);
    });
    this.matchService.setPlayerVictory(winner, VictoryState.WON);
    this.matchService.setMatchOver(winner.matchId);
  }
  // WinGear end

  private sleep(n: number) {
    return new Promise<void>(r => {
      setTimeout(() => {
        r();
      }, n);
    });
  }

}
