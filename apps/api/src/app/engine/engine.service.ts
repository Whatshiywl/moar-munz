import { Injectable } from '@nestjs/common';
import { sample, groupBy } from 'lodash';
import { PlayerService } from '../shared/services/player.service';
import { BoardService } from '../shared/services/board.service';
import { SocketService } from '../socket/socket.service';
import { DeedTile, DynamicTile, Player, RentableTile, VictoryState } from '@moar-munz/api-interfaces';
import { PromptService } from '../shared/services/prompt.service';
import { MatchService } from '../shared/services/match.service';

@Injectable()
export class EngineService {

    constructor(
        private matchService: MatchService,
        private playerService: PlayerService,
        private socketService: SocketService,
        private boardService: BoardService,
        private promptService: PromptService
    ) { }

    private rollDice(): [ number, number ] {
        return [ Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6) ];
    }

    async play(playerId: string) {
        const player = this.playerService.getPlayer(playerId);
        if (!player) return;
        if (!this.matchService.isPlayable(player.lobby)) return;
        let playerState = this.matchService.getPlayerState(player);
        if (!playerState.turn) return;
        if (playerState.victory === VictoryState.LOST) return;
        this.matchService.setLocked(player.lobby, true);
        console.log(`${player.name}'s turn started`);
        const move = await this.onStart(player);
        const dice = typeof move === 'number' ?
            [ undefined, undefined ] as [ number, number ] :
            this.rollDice()
        this.matchService.setLastDice(player.lobby, dice);
        const diceResult = typeof move === 'number' ? move : dice.reduce((acc, n) => acc + n, 0);
        const canPlay = this.onPlay(player, dice);
        if (canPlay) {
            const boardSize = this.matchService.getBoardSize(player.lobby);
            const start = this.matchService.getPlayerPosition(player);
            for (let i = 1; i <= diceResult; i++) {
                const position = (start + i) % boardSize;
                await this.onPass(player, position);
                await this.sleep(250);
                if (i === diceResult) await this.onLand(player, position, diceResult);
            }
        }
        this.matchService.setLocked(player.lobby, false);
        const winState = this.matchService.getPlayerState(player);
        const hasLost = winState.victory === VictoryState.LOST;
        if (playerState.playAgain && !hasLost) {
            playerState.playAgain = false;
            console.log(`${player.name}'s turn continues`);
            if (player.ai) await this.play(player.id);
        }
        else {
            console.log(`${player.name}'s turn ended`);
            const nextPlayer = this.matchService.setNextPlayer(player.lobby);
            if (nextPlayer) await this.play(nextPlayer.id);
        }
    }

    private async onStart(player: Player) {
        const playerState = this.matchService.getPlayerState(player);
        let board = this.matchService.getBoard(player.lobby);
        const tile = board.tiles[playerState.position];
        switch (tile.type) {
            case 'worldtour':
                if (this.matchService.getPlayerMoney(player) < tile.cost) return;
                const options = [ 'No', ...board.tiles.filter(t => {
                    if (t.type !== 'deed') return false;
                    if (t.owner && t.owner !== player.id) return false;
                    return true;
                }).map(t => t.name) ];
                if (!options.length) return;
                const message = `Would you like to travel for ${tile.cost}?\nIf so, where to?`;
                const prompt = await this.promptService.select(player, message, options);
                board = this.matchService.getBoard(player.lobby);
                const answer = prompt.answer;
                if (answer !== prompt.options[0]) {
                    this.givePlayer(player, -tile.cost, false);
                    let goToIndex = board.tiles.findIndex(t => t.name === answer);
                    if (goToIndex < playerState.position) goToIndex += board.tiles.length;
                    return goToIndex - playerState.position;
                }
                break;
        }
    }

    private onPlay(player: Player, die: number[]) {
        const playerState = this.matchService.getPlayerState(player);
        const tile = this.matchService.getTileWithPlayer(player);
        switch (tile.type) {
            case 'prison':
                if (playerState.prison > 0) {
                    if (die[0] !== undefined && die[0] === die[1]) {
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
                if (die[0] !== undefined && die[0] === die[1]) {
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

    private async onLand(player: Player, position: number, diceResult: number) {
        const playerState = this.matchService.getPlayerState(player);
        const board = this.matchService.getBoard(player.lobby);
        let tile = board.tiles[position];
        console.log(player.id, player.name, 'landed on', tile);
        switch (tile.type) {
            case 'prison':
                this.matchService.updatePlayerState(player, { prison: 2 });
                break;
            case 'worldcup':
                const deeds = board.tiles.filter(t => t.type === 'deed') as RentableTile[];
                const wcOptions = deeds.filter(t => {
                    if (!t.owner || t.owner !== player.id) return false;
                    return true;
                }).map(t => {
                    const rent = this.boardService.getFullRent(board, t) / (t.worldcup ? 2 : 1);
                    return `${t.name} (${rent})`;
                });
                if (!wcOptions.length) return;
                const tileName = tile.name.toLocaleLowerCase();
                const message = `Set the location to host the next ${tileName}!`;
                const wcPrompt = await this.promptService.select(player, message, wcOptions);
                const wcAnswer = wcPrompt.answer;
                const wcAnswerValue = wcAnswer.match(/^([^\(]+)/)[1].trim();
                this.matchService.setWorldcup(player.lobby, wcAnswerValue);
                break;
            case 'deed':
                if (!tile.owner) {
                    if (tile.price > this.matchService.getPlayerMoney(player)) return;
                    const options = [ 'No' ];
                    for (let n = tile.level; n < tile.rent.length - 1; n++) {
                        const levelDifference = n - tile.level;
                        const cost = tile.building * levelDifference;
                        if (tile.price + cost > playerState.money) break;
                        options.push(`${n} (${tile.price + cost})`);
                    }
                    if (options.length === 1) return;
                    const message = `Would you like to buy ${tile.name} for ${tile.price}?\nIf so, how many houses do you want (${tile.building} each)?`;
                    const prompt = await this.promptService.select(player, message, options);
                    const answer = prompt.answer;
                    if (answer !== prompt.options[0]) {
                        const answerValue = parseInt(answer.match(/^([^\(]+)/)[1].trim(), 10);
                        this.matchService.setTileOwner(tile.name, player);
                        const levelDifference = answerValue - tile.level;
                        const cost = tile.building * levelDifference;
                        const amount = tile.price + cost;
                        await this.givePlayer(player, -amount, false);
                        this.matchService.setTileLevel(player.lobby, tile.name, answerValue + 1);
                        const monopolies = this.getPlayerMonopolies(player);
                        if (monopolies >= 4) this.win(player);
                    }
                } else {
                    if (tile.owner === player.id) {
                        const options = [ 'No' ];
                        for (let n = tile.level; n < tile.rent.length; n++) {
                            const levelDifference = n + 1 - tile.level;
                            const cost = tile.building * levelDifference;
                            if (cost > playerState.money) break;
                            options.push(`${n} (${cost})`);
                        }
                        if (options.length === 1) return;
                        const message = `Would you like to improve your property?\nIf so, to how many houses (${tile.building} each extra)?`;
                        const prompt = await this.promptService.select(player, message, options);
                        const answer = prompt.answer;
                        if (answer !== prompt.options[0]) {
                            tile = this.matchService.getTileAtPosition(player.lobby, position) as DeedTile & DynamicTile;
                            if (tile.owner !== player.id) return;
                            const answerValue = parseInt(answer.match(/^([^\(]+)/)[1].trim(), 10);
                            const levelDifference = answerValue + 1 - tile.level;
                            const cost = tile.building * levelDifference;
                            await this.givePlayer(player, -cost, false);
                            this.matchService.setTileLevel(player.lobby, tile.name, answerValue + 1);
                        }
                    } else {
                        const owner = this.playerService.getPlayer(tile.owner);
                        const cost = this.boardService.getFullRent(board, tile);
                        await this.transferFromTo(player, owner, cost);
                        const value = 2 * this.boardService.getTileValue(tile);
                        if (playerState.money >= value) {
                            const message = `Would you like to buy ${tile.name} from ${owner.name} for ${value}?`;
                            const prompt = await this.promptService.confirm(player, message);
                            const answer = prompt.answer;
                            if (answer) {
                                tile = this.matchService.getTileAtPosition(player.lobby, position) as DeedTile & DynamicTile;
                                if (tile.owner !== player.id) return;
                                await this.transferFromTo(player, owner, value);
                                this.matchService.setTileOwner(tile.name, player);
                                await this.onLand(player, position, diceResult);
                            }
                        }
                    }
                }
                break;
            case 'company':
                if (!tile.owner) {
                    if (tile.price > this.matchService.getPlayerMoney(player)) return;
                    const message = `Would you like to buy ${tile.name} for ${tile.price}?`;
                    const prompt = await this.promptService.confirm(player, message);
                    const answer = prompt.answer;
                    if (answer) {
                        this.matchService.setTileOwner(tile.name, player);
                        await this.givePlayer(player, -tile.price, false);
                    }
                } else {
                    if (tile.owner !== player.id) {
                        const owner = this.playerService.getPlayer(tile.owner);
                        const cost = diceResult * tile.multiplier;
                        await this.transferFromTo(player, owner, cost);
                    }
                }
                break;
            case 'railroad':
                if (!tile.owner) {
                    if (tile.price > playerState.money) return;
                    const message = `Would you like to buy ${tile.name} for ${tile.price}?`;
                    const prompt = await this.promptService.confirm(player, message);
                    const answer = prompt.answer;
                    if (answer) {
                        this.matchService.setTileOwner(tile.name, player);
                        await this.givePlayer(player, -tile.price, false);
                        const ownedRails = board.tiles.filter(t => t.type === 'railroad' && t.owner === player.id) as RentableTile[];
                        ownedRails.forEach(t => {
                          this.matchService.setTileLevel(player.lobby, t.name, ownedRails.length);
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
                        await this.onPass(player, 0)
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

    private getPlayerMonopolies(player: Player) {
        const board = this.matchService.getBoard(player.lobby);
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

    private async onPass(player: Player, position: number) {
        this.matchService.move(player, position);
        const tile = this.matchService.getTileAtPosition(player.lobby, position);
        switch (tile.type) {
            case 'start':
                await this.givePlayer(player, 300, true);
                break;
        }
    }

    private async givePlayer(player: Player, amount: number, origin?: string | boolean) {
      const { lobby: matchId } = player;
      while (this.matchService.getPlayerMoney(player) + amount < 0) {
        const properties = this.matchService.getPlayerProperties(player);
        if (!properties.length) break;
        const options = properties.map(prop => {
          const value = this.boardService.getTileValue(prop);
          return `${prop.name} (${value})`;
        });
        const remainingAmount = Math.abs(this.matchService.getPlayerMoney(player) + amount);
        const message = `You must sell some properties.\nAmount remaining: ${remainingAmount}`;
        const prompt = await this.promptService.select(player, message, options);
        const answer = prompt.answer;
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
      const startAmount = this.matchService.getPlayerMoney(player);
      this.matchService.addPlayerMoney(player, amount);
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
      return this.matchService.getPlayerMoney(player) - startAmount;
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
        this.matchService.getPlayerOrder(player.lobby),
        id => id === player.id ?
        `You have gone to jail!` :
        `${player.name} has gone to jail.`
      );
    }

    private win(winner: Player) {
      console.log(`${winner.name} WINS`);
      const playerOrder = this.matchService.getPlayerOrder(winner.lobby);
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
      this.matchService.setMatchOver(winner.lobby);
    }

    private sleep(n: number) {
        return new Promise<void>(r => {
            setTimeout(() => {
                r();
            }, n);
        });
    }

}
