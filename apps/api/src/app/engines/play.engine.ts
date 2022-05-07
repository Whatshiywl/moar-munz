import { sample } from 'lodash';
import { PlayerService } from '../shared/services/player.service';
import { BoardService } from '../shared/services/board.service';
import { SocketService } from '../socket/socket.service';
import type { Player, PlayAction, PlayPayload } from '@moar-munz/api-interfaces';
import { VictoryState, MatchState } from '@moar-munz/api-interfaces';
import { PromptService } from '../prompt/prompt.service';
import { MatchService } from '../shared/services/match.service';
import { PubSubService } from '../pubsub/pubsub.service';
import { WorldtourPromptFactory } from '../prompt/factories/worldtour.factory';
import { WorldcupPromptFactory } from '../prompt/factories/worldcup.factory';
import { BuyDeedPromptFactory } from '../prompt/factories/buydeed.factory';
import { ImproveDeedPromptFactory } from '../prompt/factories/improvedeed.factory';
import { BuyTilePromptFactory } from '../prompt/factories/buytile.factory';
import { Engine, Gear } from './engine.decorators';

@Engine()
export class PlayEngine {

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
    private buyTilePromptFactory: BuyTilePromptFactory
  ) {
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

  @Gear('play')
  async onPlay(action: PlayAction, payload: PlayPayload) {
    const { playerId, forceUnlock } = action.body;
    const { matchId } = this.playerService.getPlayer(playerId);
    if (payload.matchId !== matchId) return;
    if (!this.canPlay(playerId, forceUnlock)) return;
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
    const unlockAndPublish = await this.onStart(matchId, playerId);
    if (unlockAndPublish) {
      this.matchService.unlock(matchId);
      this.pubsubService.publishPlay(matchId, playerId);
    }
  }

  private async rollingDice(playerId: string, matchId: string) {
    this.matchService.lock(matchId);
    const publish = await this.determineDice(playerId);
    this.matchService.unlock(matchId);
    if (publish) this.pubsubService.publishPlay(matchId, playerId);
  }

  private playing(playerId: string, matchId: string) {
    this.matchService.lock(matchId);
    const publish = this.processPlay(playerId);
    this.matchService.unlock(matchId);
    if (publish) this.pubsubService.publishPlay(matchId, playerId);
  }

  private async moving(playerId: string, matchId: string) {
    this.matchService.lock(matchId);
    const publish = await this.walkNTiles(playerId);
    this.matchService.unlock(matchId);
    if (publish) this.pubsubService.publishPlay(matchId, playerId);
  }

  private async landing(playerId: string, matchId: string) {
    this.matchService.lock(matchId);
    const { publish, unlock } = await this.onLand(matchId, playerId);
    if (unlock) this.matchService.unlock(matchId);
    if (publish) this.pubsubService.publishPlay(matchId, playerId);
  }

  private async idle(playerId: string, matchId: string) {
    this.matchService.lock(matchId);
    await this.onEnd(matchId, playerId);
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

  private async onStart(matchId: string, playerId: string) {
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
        const payload = this.pubsubService.getPlayPayload(matchId, playerId, true);
        this.promptService.publish(player, this.worldtourPromptFactory, 'play', payload.actions);
        return false;
      default:
        return true;
    }
  }

  private processPlay(playerId: string) {
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

  private async onLand(matchId: string, playerId: string): Promise<{ publish: boolean, unlock: boolean }> {
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
        const payload = this.pubsubService.getPlayPayload(matchId, playerId, true);
        this.promptService.publish(player, this.worldcupPromptFactory, 'play', payload.actions);
        return ret(false, false);
      case 'deed':
        if (!tile.owner) {
          if (tile.price > this.playerService.getState(playerId)?.money) break;
          const payload = this.pubsubService.getPlayPayload(matchId, playerId, true);
          this.promptService.publish(player, this.buyDeedPromptFactory, 'play', payload.actions);
        } else {
          if (tile.owner === player.id) {
            const payload = this.pubsubService.getPlayPayload(matchId, playerId, true);
            this.promptService.publish(player, this.improveDeedPromptFactory, 'play', payload.actions);
          } else {
            const board = this.matchService.getBoard(player.matchId);
            const cost = this.boardService.getFullRent(board, tile);
            this.pubsubService.publishTransfer(matchId, playerId, tile.owner, cost, 'after-rent-payment', {
              'after-rent-payment': {
                body: { playerId }
              }
            });
          }
        }
        return ret(false, false);
      case 'company':
        if (!tile.owner) {
          if (tile.price > this.playerService.getState(playerId)?.money) break;
          const payload = this.pubsubService.getPlayPayload(matchId, playerId, true);
          this.promptService.publish(player, this.buyTilePromptFactory, 'play', payload.actions);
          return ret(false, false);
        } else {
          if (tile.owner !== player.id) {
            const dice = this.matchService.getLastDice(player.matchId);
            const cost = this.sumDice(dice) * tile.multiplier;
            const playPayload = this.pubsubService.getPlayPayload(matchId, playerId, true);
            this.pubsubService.publishTransfer(matchId, playerId, tile.owner, cost, playPayload.action, playPayload.actions);
            return ret(false, false);
          }
        }
        break;
      case 'railroad':
        if (!tile.owner) {
          if (tile.price > this.playerService.getState(playerId)?.money) break;
          const payload = this.pubsubService.getPlayPayload(matchId, playerId, true);
          this.promptService.publish(player, this.buyTilePromptFactory, 'play', payload.actions);
          return ret(false, false);
        } else {
          if (tile.owner !== player.id) {
            const cost = this.boardService.getRawRent(tile);
            const playPayload = this.pubsubService.getPlayPayload(matchId, playerId, true);
            this.pubsubService.publishTransfer(matchId, playerId, tile.owner, cost, playPayload.action, playPayload.actions);
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

  private async onEnd(matchId: string, playerId: string) {
    const player = this.playerService.getPlayer(playerId);
    if (!player) return;
    const playerState = player.state;
    const hasLost = playerState.victory === VictoryState.LOST;
    if (playerState.playAgain && !hasLost) {
      this.playerService.updateState(playerId, { playAgain: false });
      console.log(`${player.name}'s turn continues`);
      if (player.ai) {
        this.sleep(2000).then(() => this.pubsubService.publishPlay(matchId, player.id));
      }
    }
    else {
      console.log(`${player.name}'s turn ended`, player);
      const { matchId } = player;
      const nextPlayer = this.matchService.computeNextPlayer(matchId);
      if (nextPlayer.ai) {
        if (this.matchService.hasHumanPlayers(matchId)) {
          this.sleep(2000).then(() => this.pubsubService.publishPlay(matchId, nextPlayer.id));
        }
        else console.log('Abord infinite AI match!');
      }
    }
  }

  private giveThenPlay(player: Player, amount: number, origin?: string) {
    const payload = this.pubsubService.getPlayPayload(player.matchId, player.id, true);
    if (amount > 0) {
      this.playerService.addMoney(player.id, amount);
      if (origin) this.broadcastTransaction(player, amount, origin);
      return { publish: true, unlock: true };
    } else {
      this.pubsubService.publishDeduct(player.matchId, player.id, -amount, 'play', payload.actions, origin);
      return { publish: false, unlock: false };
    }
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

  private sleep(n: number) {
    return new Promise<void>(r => {
      setTimeout(() => {
        r();
      }, n);
    });
  }

}
