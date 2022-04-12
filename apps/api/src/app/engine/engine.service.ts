import { Injectable } from '@nestjs/common';
import { sample, groupBy } from 'lodash';
import { PlayerService } from '../shared/services/player.service';
import { BoardService } from '../shared/services/board.service';
import { SocketService } from '../socket/socket.service';
import { DeedTile, DynamicTile, MatchState, Player, RentableTile, VictoryState } from '@moar-munz/api-interfaces';
import { PromptService } from '../prompt/prompt.service';
import { MatchService } from '../shared/services/match.service';
import { PubSubService } from '../shared/services/pubsub.service';

@Injectable()
export class EngineService {

    private readonly diceRollInterval = 100;
    private readonly diceRollAccel = 1.2;
    private readonly diceRollTimeout = 2000;
    private readonly diceRollN = Math.round(Math.log((this.diceRollAccel - 1) * (this.diceRollTimeout / this.diceRollInterval) + 1) / Math.log(this.diceRollAccel));

    constructor(
        private matchService: MatchService,
        private playerService: PlayerService,
        private socketService: SocketService,
        private boardService: BoardService,
        private promptService: PromptService,
        private pubsubService: PubSubService
    ) {
        this.pubsubService.onPlayMessage$
        .subscribe(async message => {
            const { payload } = message;
            console.log('engine got play message', payload);
            await this.play(payload.playerId);
            message.ack();
        });
    }

    private rollDice(): [ number, number ] {
        return [ Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6) ];
    }

    private sumDice(dice: number[]) {
        return dice.reduce((acc, n) => acc + n, 0);
    }

    private async determineDice(playerId: string, canMove: boolean) {
        const { matchId } = this.playerService.getPlayer(playerId) || { };
        if (!matchId) return;
        const dice = canMove ?
            this.rollDice() :
            [ undefined, undefined ] as [ number, number ];
        const playerOrder = this.matchService.getPlayerOrder(matchId);
        if (canMove) {
            for (let i = 0; i < this.diceRollN; i++) {
                const tempDice = this.rollDice();
                this.socketService.emit('dice roll', tempDice, playerOrder);
                await this.sleep(Math.round(this.diceRollInterval * Math.pow(this.diceRollAccel, i)));
            }
        }
        this.matchService.setLastDice(matchId, dice);
    }

    async play(playerId: string) {
        if (!this.canPlay(playerId)) return;
        const { matchId } = this.playerService.getPlayer(playerId);
        const matchState = this.matchService.getState(matchId);

        switch (matchState) {
            case MatchState.IDLE:
                this.matchService.setLocked(matchId, true);
                this.matchService.setState(matchId, MatchState.START_TURN);
                await this.startTurn(playerId);
                this.matchService.setLocked(matchId, false);
                await this.pubsubService.publishPlay(playerId);
                break;
            case MatchState.START_TURN:
                this.matchService.setLocked(matchId, true);
                this.matchService.setState(matchId, MatchState.ROLLING_DICE);
                await this.rollingDice(playerId);
                this.matchService.setLocked(matchId, false);
                await this.pubsubService.publishPlay(playerId);
                break;
            case MatchState.ROLLING_DICE:
                this.matchService.setLocked(matchId, true);
                this.matchService.setState(matchId, MatchState.PLAYING);
                await this.playing(playerId);
                this.matchService.setLocked(matchId, false);
                await this.pubsubService.publishPlay(playerId);
                break;
            case MatchState.PLAYING:
                this.matchService.setLocked(matchId, true);
                this.matchService.setState(matchId, MatchState.MOVING);
                await this.moving(playerId);
                this.matchService.setLocked(matchId, false);
                await this.pubsubService.publishPlay(playerId);
                break;
            case MatchState.MOVING:
                this.matchService.setLocked(matchId, true);
                this.matchService.setState(matchId, MatchState.IDLE);
                await this.idle(playerId);
                this.matchService.setLocked(matchId, false);
                break;
        }
    }

    private async startTurn(playerId: string) {
        const canMove = await this.onStart(playerId);
        this.playerService.setCanMove(playerId, canMove);
    }

    private async rollingDice(playerId: string) {
        const canMove = this.playerService.getCanMove(playerId);
        await this.determineDice(playerId, canMove);
    }

    private async playing(playerId: string) {
        const canMove = this.playerService.getCanMove(playerId);
        const canWalk = canMove && this.onPlay(playerId);
        this.playerService.setCanWalk(playerId, canWalk);

        const { matchId } = this.playerService.getPlayer(playerId) || { };
        const lastDice = this.matchService.getLastDice(matchId);
        const walkDistance = canMove ? this.sumDice(lastDice) : 0;
        this.playerService.setWalkDistance(playerId, walkDistance);
    }

    private async moving(playerId: string) {
        const canWalk = this.playerService.getCanWalk(playerId);
        const walkDistance = this.playerService.getWalkDistance(playerId);
        if (canWalk) await this.walkNTiles(playerId, walkDistance);
    }

    private async idle(playerId: string) {
        await this.onEnd(playerId);
    }

    private canPlay(playerId: string) {
        const player = this.playerService.getPlayer(playerId);
        if (!this.matchService.isPlayable(player.matchId)) return false;
        if (!player.state.turn) return false;
        if (player.state.victory !== VictoryState.UNDEFINED) return false;
        return true;
    }

    private async walkNTiles(playerId: string, n: number) {
        const player = this.playerService.getPlayer(playerId);
        if (!player) return;
        const boardSize = this.matchService.getBoardSize(player.matchId);
        const start = this.matchService.getPlayerPosition(player);
        for (let i = 1; i <= n; i++) {
            const position = (start + i) % boardSize;
            this.movePlayerToPosition(player, position);
            await this.sleep(250);
            if (i === n) await this.onLand(player);
        }
    }

    private async movePlayerToPosition(player: Player, position: number, land?: boolean) {
        this.matchService.move(player, position);
        await this.onPass(player);
        if (land) await this.onLand(player);
    }

    private async onStart(playerId: string) {
        const player = this.playerService.getPlayer(playerId);
        console.log(`${player.name}'s turn started`);
        const playerState = this.matchService.getPlayerState(player);
        let board = this.matchService.getBoard(player.matchId);
        const tile = board.tiles[playerState.position];
        switch (tile.type) {
            case 'worldtour':
                if (this.matchService.getPlayerMoney(player) < tile.cost) return false;
                const prompt = await this.promptService.process(player, this.promptService.worldtourPromptFactory);
                if (!prompt) return false;
                board = this.matchService.getBoard(player.matchId);
                const answer = prompt.answer;
                if (answer !== prompt.options[0]) {
                    this.givePlayer(player, -tile.cost, false);
                    let goToIndex = board.tiles.findIndex(t => t.name === answer);
                    if (goToIndex < playerState.position) goToIndex += board.tiles.length;
                    const walkDistance = goToIndex - this.matchService.getPlayerPosition(player);
                    /**
                     * TODO:
                     * this.matchService.setState(matchId, MatchState.PLAYING);
                     *      // This will skip ROLLING_DICE and PLAYING, going straight to WALKING
                     * DON'T compute players' playAgain and equalDie to know if can play
                     *      // We don't need to know if the player has rolled equal dice in this case
                     * DON't this.onPlay()
                     *      // We are skipping this step
                     * DON't this.walkNTiles()
                     *      // This will be done automatically on the next play() run
                     * this.playerService.setCanWalk(playerId, true)
                     *      // Allow movement
                     * this.playerService.setWalkDistance(playerId, walkDistance)
                     *      // Persist walk distance for moving step
                     * this.pubsubService.publish()
                     *      // Set off next play() run
                     * Figure our return statements
                     *      // Maybe returning undefined should signal the normal event chain to break?
                     */
                    // const canPlay = this.onPlay(playerId);
                    this.matchService.setLastDice(player.matchId, [ undefined, undefined ]);
                    await this.walkNTiles(playerId, walkDistance);
                    return false;
                }
                break;
        }
        return true;
    }

    private onPlay(playerId: string) {
        const player = this.playerService.getPlayer(playerId);
        if (!player) return;
        const dice = this.matchService.getLastDice(player.matchId);
        const playerState = this.matchService.getPlayerState(player);
        const tile = this.matchService.getTileWithPlayer(player);
        switch (tile.type) {
            case 'prison':
                if (playerState.prison > 0) {
                    if (dice[0] !== undefined && dice[0] === dice[1]) {
                        this.matchService.updatePlayerState(player, {
                            prison: 0, playAgain: true
                        });
                    } else {
                        this.matchService.updatePlayerState(player, {
                            prison: playerState.prison - 1
                        });
                        console.log('not pairs, cant leave jail');
                        return false;
                    }
                }
                break;
            default:
                // TODO: move this logic to rollingDice()
                if (dice[0] !== undefined && dice[0] === dice[1]) {
                    const equalDie = (playerState.equalDie || 0) + 1;
                    this.matchService.updatePlayerState(player, { equalDie });
                    if (equalDie === 3) {
                        this.sendToJail(player);
                        console.log('3 pairs, go to jail');
                        return false;
                    } else {
                        this.matchService.updatePlayerState(player, { playAgain: true });
                    }
                } else {
                    this.matchService.updatePlayerState(player, { equalDie: 0 });
                }
                break;
        }
        return true;
    }

    private async onPass(player: Player) {
        const position = this.matchService.getPlayerPosition(player);
        const tile = this.matchService.getTileAtPosition(player.matchId, position);
        switch (tile.type) {
            case 'start':
                await this.givePlayer(player, 300, true);
                break;
        }
    }

    private async onLand(player: Player) {
        const board = this.matchService.getBoard(player.matchId);
        let tile = this.matchService.getTileWithPlayer(player);
        console.log(player.id, player.name, 'landed on', tile);
        switch (tile.type) {
            case 'prison':
                this.matchService.updatePlayerState(player, { prison: 2 });
                break;
            case 'worldcup':
                const wcPrompt = await this.promptService.process(player, this.promptService.worldcupPromptFactory);
                if (!wcPrompt) return;
                const wcAnswer = wcPrompt.answer;
                const wcAnswerValue = wcAnswer.match(/^([^\(]+)/)[1].trim();
                this.matchService.setWorldcup(player.matchId, wcAnswerValue);
                break;
            case 'deed':
                if (!tile.owner) {
                    if (tile.price > this.matchService.getPlayerMoney(player)) return;
                    const prompt = await this.promptService.process(player, this.promptService.buyDeedPromptFactory);
                    if (!prompt) return;
                    const answer = prompt.answer;
                    if (answer !== prompt.options[0]) {
                        const answerValue = parseInt(answer.match(/^([^\(]+)/)[1].trim(), 10);
                        this.matchService.setTileOwner(tile.name, player);
                        const levelDifference = answerValue - tile.level;
                        const cost = tile.building * levelDifference;
                        const amount = tile.price + cost;
                        await this.givePlayer(player, -amount, false);
                        this.matchService.setTileLevel(player.matchId, tile.name, answerValue + 1);
                        const monopolies = this.getPlayerMonopolies(player);
                        if (monopolies >= 4) this.win(player);
                    }
                } else {
                    if (tile.owner === player.id) {
                        const prompt = await this.promptService.process(player, this.promptService.improveDeedPromptFactory);
                        if (!prompt) return;
                        const answer = prompt.answer;
                        if (answer !== prompt.options[0]) {
                            tile = this.matchService.getTileWithPlayer(player) as DeedTile & DynamicTile;
                            if (tile.owner !== player.id) return;
                            const answerValue = parseInt(answer.match(/^([^\(]+)/)[1].trim(), 10);
                            const levelDifference = answerValue + 1 - tile.level;
                            const cost = tile.building * levelDifference;
                            await this.givePlayer(player, -cost, false);
                            this.matchService.setTileLevel(player.matchId, tile.name, answerValue + 1);
                        }
                    } else {
                        const owner = this.playerService.getPlayer(tile.owner);
                        const cost = this.boardService.getFullRent(board, tile);
                        await this.transferFromTo(player, owner, cost);
                        const value = 2 * this.boardService.getTileValue(tile);
                        if (this.matchService.getPlayerMoney(player) >= value) {
                            const prompt = await this.promptService.process(player, this.promptService.aquireDeedPromptFactory);
                            if (!prompt) return;
                            const answer = prompt.answer;
                            if (answer) {
                                tile = this.matchService.getTileWithPlayer(player) as DeedTile & DynamicTile;
                                if (tile.owner === player.id) return;
                                await this.transferFromTo(player, owner, value);
                                this.matchService.setTileOwner(tile.name, player);
                                await this.onLand(player);
                            }
                        }
                    }
                }
                break;
            case 'company':
                if (!tile.owner) {
                    if (tile.price > this.matchService.getPlayerMoney(player)) return;
                    const prompt = await this.promptService.process(player, this.promptService.buyTilePromptFactory);
                    if (!prompt) return;
                    const answer = prompt.answer;
                    if (answer) {
                        this.matchService.setTileOwner(tile.name, player);
                        await this.givePlayer(player, -tile.price, false);
                    }
                } else {
                    if (tile.owner !== player.id) {
                        const owner = this.playerService.getPlayer(tile.owner);
                        const dice = this.matchService.getLastDice(player.matchId);
                        const cost = this.sumDice(dice) * tile.multiplier;
                        await this.transferFromTo(player, owner, cost);
                    }
                }
                break;
            case 'railroad':
                if (!tile.owner) {
                    if (tile.price > this.matchService.getPlayerMoney(player)) return;
                    const prompt = await this.promptService.process(player, this.promptService.buyTilePromptFactory);
                    if (!prompt) return;
                    const answer = prompt.answer;
                    if (answer) {
                        this.matchService.setTileOwner(tile.name, player);
                        await this.givePlayer(player, -tile.price, false);
                        const ownedRails = board.tiles.filter(t => t.type === 'railroad' && t.owner === player.id) as RentableTile[];
                        ownedRails.forEach(t => {
                          this.matchService.setTileLevel(player.matchId, t.name, ownedRails.length);
                        });
                    }
                } else {
                    if (tile.owner !== player.id) {
                        const owner = this.playerService.getPlayer(tile.owner);
                        const cost = this.boardService.getRawRent(tile);
                        await this.transferFromTo(player, owner, cost);
                    }
                }
                break;
            case 'tax':
                const ownedProperties = this.matchService.getPlayerProperties(player);
                const propretyValue = ownedProperties.reduce((acc, t) => acc += this.boardService.getTileValue(t), 0);
                const totalValue = this.matchService.getPlayerMoney(player) + propretyValue;
                const tax = tile.tax;
                const taxAmount = Math.ceil(totalValue * tax);
                await this.givePlayer(player, -taxAmount, true);
                break;
            case 'chance':
                const cards = [
                    async () => this.sendToJail(player),
                    async () => {
                        this.socketService.broadcastGlobalMessage(
                            [ player.id ], `Go back to Start!`
                        );
                        await this.movePlayerToPosition(player, 0, true);
                    },
                    async () => this.givePlayer(player, 50, true),
                    async () => this.givePlayer(player, 75, true),
                    async () => this.givePlayer(player, 100, true),
                    async () => this.givePlayer(player, 125, true),
                    async () => this.givePlayer(player, 150, true),
                    async () => this.givePlayer(player, 200, true),
                    async () => this.givePlayer(player, 300, true),
                    async () => this.givePlayer(player, 500, true),
                    async () => this.givePlayer(player, 1500, true),
                    async () => this.givePlayer(player, -50, true),
                    async () => this.givePlayer(player, -75, true),
                    async () => this.givePlayer(player, -100, true),
                    async () => this.givePlayer(player, -125, true),
                    async () => this.givePlayer(player, -150, true),
                    async () => this.givePlayer(player, -200, true),
                    async () => this.givePlayer(player, -300, true),
                    async () => this.givePlayer(player, -500, true),
                    async () => {
                        this.socketService.broadcastGlobalMessage(
                            [ player.id ], `You lucky you shall play again!`
                        );
                        this.matchService.updatePlayerState(player, { playAgain: true });
                    }
                ];
                const card = sample(cards);
                await card();
                break;
        }
    }

    private async onEnd(playerId: string) {
        const player = this.playerService.getPlayer(playerId);
        if (!player) return;
        const playerState = this.matchService.getPlayerState(player);
        const hasLost = playerState.victory === VictoryState.LOST;
        if (playerState.playAgain && !hasLost) {
            this.matchService.updatePlayerState(player, { playAgain: false });
            console.log(`${player.name}'s turn continues`);
            if (player.ai) {
                this.sleep(2000).then(() => this.pubsubService.publishPlay(player.id));
            }
        }
        else {
            console.log(`${player.name}'s turn ended`);
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

    private getPlayerMonopolies(player: Player) {
        const board = this.matchService.getBoard(player.matchId);
        const colorGroups = groupBy(board.tiles, 'color');
        let monopolies = 0;
        Object.keys(colorGroups)
        .filter(key => key !== 'undefined')
        .map(key => colorGroups[key])
        .forEach(group => {
            const ownedByPlayer = group.filter(t => t.owner === player.id);
            if (ownedByPlayer.length === group.length) monopolies++;
        });
        return monopolies;
    }

    private async givePlayer(player: Player, amount: number, origin?: string | boolean) {
      const { matchId } = player;
      this.matchService.addPlayerMoney(player, amount);
      while (this.matchService.getPlayerMoney(player) < 0) {
        const properties = this.matchService.getPlayerProperties(player);
        if (!properties.length) break;
        const prompt = await this.promptService.process(player, this.promptService.sellTilesPromptFactory);
        if (!prompt) return;
        const answer = prompt.answer;
        if (answer === prompt.options[0]) continue;
        const answerName = answer.match(/^([^\(]+)/)[1].trim();
        const answerTile = properties.find(t => t.name === answerName);
        if (!answerTile) continue;
        const answerValue = this.matchService.getTileValue(matchId, answerName);
        this.matchService.removeOwnerFromTile(matchId, answerName);
        this.matchService.addPlayerMoney(player, answerValue);
        if (answerTile.type === 'railroad') {
          const board = this.matchService.getBoard(matchId);
          const ownedRails = board.tiles.filter(t => t.type === 'railroad' && t.owner === player.id);
          ownedRails.forEach(t => {
            this.matchService.setTileLevel(matchId, t.name, ownedRails.length);
          });
        }
      }
      const playerOrder = this.matchService.getPlayerOrder(matchId);
      if (this.matchService.getPlayerMoney(player) < 0) {
        console.log(`${player.name} LOSES`);
        this.matchService.updatePlayerState(player, {
          money: 0, victory: VictoryState.LOST
        });
        const lost = [ ];
        const notLost = playerOrder.filter(Boolean).filter(id => {
          if (id === player.id) return false;
          const otherPlayer = this.playerService.getPlayer(id);
          const otherPlayerState = this.matchService.getPlayerState(otherPlayer);
          if (otherPlayerState.victory === VictoryState.LOST) {
            lost.push(id);
            return false;
          } else return true;
        });
        if (notLost.length === 1) {
          const winner = this.playerService.getPlayer(notLost[0]);
          this.win(winner);
        } else {
          this.socketService.broadcastGlobalMessage(
            playerOrder,
            id => id === player.id ?
            `You have lost. Git gud!` :
            `${player.name} has lost`
          );
        }
      } else if (origin !== false) {
        const tile = this.matchService.getTileWithPlayer(player);
        const ori = origin === true ? tile.name : origin;
        const got = amount > 0;
        const val = Math.abs(amount);
        const startMessage = `just ${got ? 'got' : 'lost'} ${val}`;
        const oriMessage = ori ? ` ${amount > 0 ? 'from' : 'to'} ${ori}` : '';
        const data = `${startMessage}${oriMessage}`;
        console.log(`Notifying that ${player.name} ${data}`);
        this.socketService.broadcastGlobalMessage(
          playerOrder,
          id => id === player.id ?
          `You ${data}` :
          `${player.name} ${data}`
        );
      }
      const loss = Math.min(0, this.matchService.getPlayerMoney(player));
      return amount - loss;
    }

    private async transferFromTo(from: Player, to: Player, amount: number) {
      console.log(`Transfering ${amount} from ${from.name} to ${to.name}`);
      const toOrigin = amount > 0 ? false : to.name;
      const actualAmount = await this.givePlayer(from, -amount, toOrigin);
      console.log(`${to.name} will receive ${-actualAmount}`);
      const fromOrigin = toOrigin ? false : from.name;
      await this.givePlayer(to, -actualAmount, fromOrigin);
    }

    private sendToJail(player: Player) {
      this.matchService.move(player, 10);
      this.matchService.updatePlayerState(player, {
        prison: 2, equalDie: 0
      });
      this.socketService.broadcastGlobalMessage(
        this.matchService.getPlayerOrder(player.matchId),
        id => id === player.id ?
        `You have gone to jail!` :
        `${player.name} has gone to jail.`
      );
    }

    private win(winner: Player) {
      console.log(`${winner.name} WINS`);
      const playerOrder = this.matchService.getPlayerOrder(winner.matchId);
      this.socketService.broadcastGlobalMessage(
        playerOrder,
        id => id === winner.id ?
        `You have won!` :
        `${winner.name} has won`
      );
      const lost = playerOrder.filter(Boolean).filter(p => p !== winner.id);
      lost.forEach(id => {
        const player = this.playerService.getPlayer(id);
        this.matchService.setPlayerVictory(player, VictoryState.LOST);
      });
      this.matchService.setPlayerVictory(winner, VictoryState.WON);
      this.matchService.setMatchOver(winner.matchId);
    }

    private sleep(n: number) {
        return new Promise<void>(r => {
            setTimeout(() => {
                r();
            }, n);
        });
    }

}
