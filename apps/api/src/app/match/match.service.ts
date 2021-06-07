import { Injectable } from '@nestjs/common';
import { sample, groupBy } from 'lodash';
import { LowDbService } from '../shared/services/lowdb.service';
import { PlayerService } from '../shared/services/player.service';
import { BoardService } from '../shared/services/board.service';
import { SocketService } from '../socket/socket.service';
import { Lobby, Match, Message, OwnableTile, Player, PlayerState, RentableTile, VictoryState } from '@moar-munz/api-interfaces';

@Injectable()
export class MatchService {

    constructor(
        private db: LowDbService,
        private playerService: PlayerService,
        private socketService: SocketService,
        private boardService: BoardService
    ) { }

    generateMatch(lobby: Lobby) {
        const id = lobby.id;
        const playerOrder = [ ...lobby.playerOrder ];
        const options = { ...lobby.options };
        const playerState: {
            [id: string]: PlayerState;
        } = { };
        playerOrder.filter(Boolean).forEach((playerId, i) => {
            playerState[playerId] = {
                position: 0,
                money: 2000,
                victory: VictoryState.UNDEFINED,
                playAgain: false,
                prison: 0,
                equalDie: 0,
                highlighted: false,
                turn: i === 0
            };
        });
        const board = this.boardService.getBoard(lobby.options.board);
        const match: Match = {
            id,
            turn: 0,
            lastDice: [ 1, 1 ],
            playerOrder,
            playerState,
            options,
            board,
            locked: false,
            over: false
        };
        this.db.createMatch(match);
        this.saveAndBroadcastMatch(match);
    }

    getMatch(id: string) {
        return this.db.readMatch(id);
    }

    saveMatch(match: Match) {
        this.db.updateMatch(match);
    }

    async removePlayer(lobby: Lobby, match: Match, player: Player) {
        const index = match.playerOrder.findIndex(s => s === player.id);
        if (index < 0) return;
        const playerState = this.getPlayerState(match, player);
        if (match.options.ai) {
            const aiId = lobby.playerOrder[index];
            match.playerOrder[index] = aiId;
            match.playerState[aiId] = { ...playerState };
            match.board.tiles.forEach(tile => {
                if (tile.owner === player.id) tile.owner = aiId;
            });
        } else {
            if (playerState.turn) await this.setNextPlayer(match, player);
            match.playerOrder[index] = undefined;
            match.board.tiles.forEach(tile => {
                if (tile.owner === player.id) {
                    tile.owner = undefined;
                    if (this.boardService.isRentableTile(tile)) tile.level = 0;
                }
            });
        }
        delete match.playerState[player.id];
        this.saveAndBroadcastMatch(match);
    }

    saveAndBroadcastMatch(match) {
        this.saveMatch(match);
        this.broadcastMatchState(match);
    }

    private rollDice(): [ number, number ] {
        return [ Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6) ];
    }

    async play(match: Match, player: Player) {
        if (match.locked || match.over) return;
        const playerState = this.getPlayerState(match, player);
        if (!playerState.turn) return;
        if (playerState.victory === VictoryState.LOST) return;
        match.locked = true;
        console.log(`${player.name}'s turn started`);
        this.saveAndBroadcastMatch(match);
        const move = await this.onStart(match, player);
        this.saveAndBroadcastMatch(match);
        const dice = match.lastDice = typeof move === 'number' ?
            [ undefined, undefined ] :
            this.rollDice()
        const diceResult = typeof move === 'number' ? move : dice.reduce((acc, n) => acc + n, 0);
        if (await this.onPlay(match, player, dice)) {
            this.saveAndBroadcastMatch(match);
            const tiles = match.board.tiles;
            const start = playerState.position;
            for (let i = 1; i <= diceResult; i++) {
                const position = (start + i) % tiles.length;
                await this.onPass(match, player, position);
                this.saveAndBroadcastMatch(match);
                await this.sleep(250);
                if (i === diceResult) {
                    this.saveAndBroadcastMatch(match);
                    await this.onLand(match, player, position, diceResult);
                    this.saveAndBroadcastMatch(match);
                }
            }
        }
        match.locked = false;
        const hasLost = this.getPlayerState(match, player).victory === VictoryState.LOST;
        if (playerState.playAgain && !hasLost) {
            playerState.playAgain = false;
            console.log(`${player.name}'s turn continues`);
            if (player.ai) await this.play(match, player);
        }
        else {
            console.log(`${player.name}'s turn ended`);
            await this.setNextPlayer(match, player);
        }
        this.saveAndBroadcastMatch(match);
    }

    private async setNextPlayer(match: Match, player: Player) {
        const playerState = this.getPlayerState(match, player);
        playerState.turn = false;
        const index = match.playerOrder.findIndex(id => id === player.id);
        const next = this.getNextPlayer(match, index);
        next.state.turn = true;
        const nextPlayer = this.playerService.getPlayer(next.id);
        console.log('next player', nextPlayer);
        if (nextPlayer.ai) {
            const players = match.playerOrder.map(p => this.playerService.getPlayer(p));
            const humanPlayers = players.filter(p => !p.ai);
            if (humanPlayers.length === 0) return console.log('Abord infinite AI match!');
            await this.play(match, nextPlayer);
        }
    }

    private getNextPlayer(match: Match, index: number) {
        while (true) {
            index = (index + 1) % match.playerOrder.length;
            const nextPlayerId = match.playerOrder[index];
            if (!nextPlayerId) continue;
            const nextPlayerState = this.getPlayerState(match, nextPlayerId);
            if (!nextPlayerState || nextPlayerState.victory === VictoryState.LOST) continue;
            return { id: nextPlayerId, state: nextPlayerState };
        }
    }

    private async onStart(match: Match, player: Player) {
        const playerState = this.getPlayerState(match, player);
        const tile = match.board.tiles[playerState.position];
        switch (tile.type) {
            case 'worldtour':
                if (playerState.money < tile.cost) return;
                const options = [ 'No', ...match.board.tiles.filter(t => {
                    if (t.type !== 'deed') return false;
                    if (t.owner && t.owner !== player.id) return false;
                    return true;
                }).map(t => t.name) ];
                if (!options.length) return;
                const question = this.socketService.ask(player,
                `Would you like to travel for ${tile.cost}?\nIf so, where to?`,
                options);
                const answer = await question;
                if (answer !== options[0]) {
                    this.givePlayer(match, player, -tile.cost, false);
                    let goToIndex = match.board.tiles.findIndex(t => t.name === answer);
                    if (goToIndex < playerState.position) goToIndex += match.board.tiles.length;
                    return goToIndex - playerState.position;
                }
                break;
        }
    }

    private async onPlay(match: Match, player: Player, die: number[]) {
        const playerState = this.getPlayerState(match, player);
        const tile = match.board.tiles[playerState.position];
        switch (tile.type) {
            case 'prison':
                if (playerState.prison > 0) {
                    if (die[0] !== undefined && die[0] === die[1]) {
                        playerState.prison = 0;
                        playerState.playAgain = true;
                    } else {
                        playerState.prison--;
                        console.log('not pairs, cant leave jail');
                        return false;
                    }
                }
                break;
            default:
                if (die[0] !== undefined && die[0] === die[1]) {
                    playerState.equalDie = (playerState.equalDie || 0) + 1;
                    if (playerState.equalDie === 3) {
                        this.sendToJail(match, player);
                        console.log('3 pairs, go to jail');
                        return false;
                    } else {
                        playerState.playAgain = true;
                    }
                } else {
                    playerState.equalDie = 0;
                }
                break;
        }
        return true;
    }

    private async onLand(match: Match, player: Player, position: number, diceResult: number) {
        const playerState = this.getPlayerState(match, player);
        const tile = match.board.tiles[position];
        console.log(player.id, player.name, 'landed on', tile);
        switch (tile.type) {
            case 'prison':
                playerState.prison = 2;
                break;
            case 'worldcup':
                const deeds = match.board.tiles.filter(t => t.type === 'deed') as RentableTile[];
                const wcOptions = deeds.filter(t => {
                    if (!t.owner || t.owner !== player.id) return false;
                    return true;
                }).map(t => `${t.name} (${this.boardService.getRawRent(t)})`);
                if (!wcOptions.length) return;
                const wcQuestions = this.socketService.ask(player,
                `Set the location to host the next worldcup!`,
                wcOptions);
                const wcAnswer = await wcQuestions;
                const wcAnswerValue = wcAnswer.match(/^([^\(]+)/)[1].trim();
                match.board.tiles.forEach(t => {
                    t.worldcup = t.name === wcAnswerValue;
                });
                break;
            case 'deed':
                if (!tile.owner) {
                    if (tile.price > playerState.money) return;
                    const options = [ 'No' ];
                    for (let n = tile.level; n < tile.rent.length - 1; n++) {
                        const levelDifference = n - tile.level;
                        const cost = tile.building * levelDifference;
                        if (tile.price + cost > playerState.money) break;
                        options.push(`${n} (${tile.price + cost})`);
                    }
                    if (options.length === 1) return;
                    const question = this.socketService.ask(player,
                    `Would you like to buy ${tile.name} for ${tile.price}?\nIf so, how many houses do you want (${tile.building} each)?`,
                    options);
                    const answer = await question;
                    if (answer !== options[0]) {
                        const answerValue = parseInt(answer.match(/^([^\(]+)/)[1].trim(), 10);
                        tile.owner = player.id;
                        const levelDifference = answerValue - tile.level;
                        const cost = tile.building * levelDifference;
                        const amount = tile.price + cost;
                        await this.givePlayer(match, player, -amount, false);
                        tile.level = answerValue + 1;
                        const monopolies = this.getPlayerMonopolies(match, player);
                        if (monopolies >= 4) {
                            this.win(match, player);
                        }
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
                        const question = this.socketService.ask(player,
                        `Would you like to improve your property?\nIf so, to how many houses (${tile.building} each extra)?`,
                        options);
                        const answer = await question;
                        if (answer !== options[0]) {
                            const answerValue = parseInt(answer.match(/^([^\(]+)/)[1].trim(), 10);
                            const levelDifference = answerValue + 1 - tile.level;
                            const cost = tile.building * levelDifference;
                            await this.givePlayer(match, player, -cost, false);
                            tile.level = answerValue + 1;
                        }
                    } else {
                        const owner = this.playerService.getPlayer(tile.owner);
                        const cost = this.boardService.getFullRent(match.board, tile);
                        await this.transferFromTo(match, player, owner, cost);
                        const value = 2 * this.boardService.getTileValue(tile);
                        if (playerState.money >= value) {
                            const question = this.socketService.ask(player,
                            `Would you like to buy ${tile.name} from ${owner.name} for ${value}?`,
                            [ 'No', 'Yes' ] as const);
                            const answer = await question;
                            if (answer === 'Yes') {
                                await this.transferFromTo(match, player, owner, value);
                                tile.owner = player.id;
                                this.saveAndBroadcastMatch(match);
                                await this.onLand(match, player, position, diceResult);
                            }
                        }
                    }
                }
                break;
            case 'company':
                if (!tile.owner) {
                    if (tile.price > playerState.money) return;
                    const question = this.socketService.ask(player,
                    `Would you like to buy ${tile.name} for ${tile.price}?`,
                    [ 'No', 'Yes' ] as const);
                    const answer = await question;
                    if (answer !== 'No') {
                        tile.owner = player.id;
                        await this.givePlayer(match, player, -tile.price, false);
                    }
                } else {
                    if (tile.owner !== player.id) {
                        const owner = this.playerService.getPlayer(tile.owner);
                        const cost = diceResult * tile.multiplier;
                        await this.transferFromTo(match, player, owner, cost);
                    }
                }
                break;
            case 'railroad':
                if (!tile.owner) {
                    if (tile.price > playerState.money) return;
                    const question = this.socketService.ask(player,
                    `Would you like to buy ${tile.name} for ${tile.price}?`,
                    [ 'No', 'Yes' ] as const);
                    const answer = await question;
                    if (answer !== 'No') {
                        tile.owner = player.id;
                        await this.givePlayer(match, player, -tile.price, false);
                        const boardRails = match.board.tiles.filter(t => t.type === 'railroad') as RentableTile[];
                        const ownedRails = boardRails.filter(t => t.owner === player.id);
                        ownedRails.forEach(t => t.level = ownedRails.length);
                    }
                } else {
                    if (tile.owner !== player.id) {
                        const owner = this.playerService.getPlayer(tile.owner);
                        const cost = this.boardService.getRawRent(tile);
                        await this.transferFromTo(match, player, owner, cost);
                    }
                }
                break;
            case 'tax':
                const ownedProperties = this.getPlayerProperties(match, player);
                const propretyValue = ownedProperties.reduce((acc, t) => acc += this.boardService.getTileValue(t), 0);
                const totalValue = playerState.money + propretyValue;
                const tax = tile.tax;
                const taxAmount = Math.ceil(totalValue * tax);
                await this.givePlayer(match, player, -taxAmount, true);
                break;
            case 'chance':
                const cards = [
                    async () => this.sendToJail(match, player),
                    async () => this.onPass(match, player, 0),
                    async () => this.givePlayer(match, player, 50, true),
                    async () => this.givePlayer(match, player, 75, true),
                    async () => this.givePlayer(match, player, 100, true),
                    async () => this.givePlayer(match, player, 125, true),
                    async () => this.givePlayer(match, player, 150, true),
                    async () => this.givePlayer(match, player, 200, true),
                    async () => this.givePlayer(match, player, 300, true),
                    async () => this.givePlayer(match, player, 500, true),
                    async () => this.givePlayer(match, player, 1500, true),
                    async () => this.givePlayer(match, player, -50, true),
                    async () => this.givePlayer(match, player, -75, true),
                    async () => this.givePlayer(match, player, -100, true),
                    async () => this.givePlayer(match, player, -125, true),
                    async () => this.givePlayer(match, player, -150, true),
                    async () => this.givePlayer(match, player, -200, true),
                    async () => this.givePlayer(match, player, -300, true),
                    async () => this.givePlayer(match, player, -500, true),
                    async () => {
                        this.socketService.broadcastGlobalMessage(
                            [ player.id ], `You lucky you shall play again!`
                        );
                        match.playerState[player.id].playAgain = true;
                    }
                ];
                const card = sample(cards);
                await card();
                break;
        }
    }

    private getPlayerMonopolies(match: Match, player: Player) {
        const colorGroups = groupBy(match.board.tiles, 'color');
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

    private async givePlayer(match: Match, player: Player, amount: number, origin?: string | boolean) {
        const playerState = this.getPlayerState(match, player);
        while (playerState.money + amount < 0) {
            const properties = this.getPlayerProperties(match, player);
            if (!properties.length) break;
            const options = properties.map(prop => {
                const value = this.boardService.getTileValue(prop);
                return `${prop.name} (${value})`;
            });
            const question = this.socketService.ask(player,
            `You must sell some properties.\nAmount remaining: ${Math.abs(playerState.money + amount)}`,
            options);
            const answer = await question;
            const answerName = answer.match(/^([^\(]+)/)[1].trim();
            const answerTile = properties.find(t => t.name === answerName);
            const answerValue = this.boardService.getTileValue(answerTile);
            answerTile.owner = undefined;
            if (this.boardService.isRentableTile(answerTile)) {
                answerTile.level = 0;
            }
            playerState.money += answerValue;
            if (answerTile.type === 'railroad') {
                const boardRails = match.board.tiles.filter(t => t.type === 'railroad') as RentableTile[];
                const ownedRails = boardRails.filter(t => t.owner === player.id);
                ownedRails.forEach(t => t.level = ownedRails.length);
            }
            this.saveAndBroadcastMatch(match);
        }
        const startAmount = playerState.money;
        playerState.money += amount;
        const tile = match.board.tiles[playerState.position];
        if (playerState.money < 0) {
            console.log(`${player.name} LOSES`);
            playerState.money = 0;
            playerState.victory = VictoryState.LOST;
            const lost = [ ];
            const notLost = match.playerOrder.filter(Boolean).filter(id => {
                if (id === player.id) return false;
                const otherPlayer = this.playerService.getPlayer(id);
                const otherPlayerState = this.getPlayerState(match, otherPlayer);
                if (otherPlayerState.victory === VictoryState.LOST) {
                    lost.push(id);
                    return false;
                } else return true;
            });
            if (notLost.length === 1) {
                const winner = this.playerService.getPlayer(notLost[0]);
                this.win(match, winner);
            } else {
                this.socketService.broadcastGlobalMessage(
                    match.playerOrder,
                    id => id === player.id ?
                    `You have lost. Git gud!` :
                    `${player.name} has lost`
                );
            }
        } else {
            if (origin !== false) {
                const ori = origin === true ? tile.name : origin;
                const got = amount > 0;
                const val = Math.abs(amount);
                const startMessage = `just ${got ? 'got' : 'lost'} ${val}`;
                const oriMessage = ori ? ` ${amount > 0 ? 'from' : 'to'} ${ori}` : '';
                const data = `${startMessage}${oriMessage}`;
                console.log(`Notifying that ${player.name} ${data}`);
                this.socketService.broadcastGlobalMessage(
                    match.playerOrder,
                    id => id === player.id ?
                    `You ${data}` :
                    `${player.name} ${data}`
                );
            }
        }
        this.saveAndBroadcastMatch(match);
        return playerState.money - startAmount;
    }

    private getPlayerProperties(match: Match, player: Player) {
        return match.board.tiles.filter(title => title.owner === player.id) as OwnableTile[];
    }

    private win(match: Match, winner: Player) {
        console.log(`${winner.name} WINS`);
        this.socketService.broadcastGlobalMessage(
            match.playerOrder,
            id => id === winner.id ?
            `You have won!` :
            `${winner.name} has won`
        );
        const lost = match.playerOrder.filter(Boolean).filter(p => p !== winner.id);
        lost.forEach(id => {
            const player = this.playerService.getPlayer(id);
            const playerState = this.getPlayerState(match, player);
            playerState.victory = VictoryState.LOST;
        });
        const winnerState = this.getPlayerState(match, winner);
        winnerState.victory = VictoryState.WON;
        match.over = true;
        this.saveAndBroadcastMatch(match);
    }

    private async transferFromTo(match: Match, from: Player, to: Player, amount: number) {
        console.log(`Transfering ${amount} from ${from.name} to ${to.name}`);
        const toOrigin = amount > 0 ? false : to.name;
        const actualAmount = await this.givePlayer(match, from, -amount, toOrigin);
        console.log(`${to.name} will receive ${-actualAmount}`);
        const fromOrigin = toOrigin ? false : from.name;
        await this.givePlayer(match, to, -actualAmount, fromOrigin);
        this.saveAndBroadcastMatch(match);
    }

    private sendToJail(match: Match, player: Player) {
        const playerState = this.getPlayerState(match, player);
        this.move(match, player, 10);
        playerState.prison = 2;
        playerState.equalDie = 0;
        this.socketService.broadcastGlobalMessage(
            match.playerOrder,
            id => id === player.id ?
            `You have gone to jail!` :
            `${player.name} has gone to jail.`
        );
    }

    private async onPass(match: Match, player: Player, position: number) {
        const tile = match.board.tiles[position];
        this.move(match, player, position);
        switch (tile.type) {
            case 'start':
                await this.givePlayer(match, player, 300, true);
                break;
        }
    }

    broadcastMatchState(match: Match) {
        this.boardService.postProcessBoard(match.board);
        const players = match.playerOrder;
        this.socketService.emit('match', match, players);
    }

    private move(match: Match, player: Player, to: number) {
        const playerState = this.getPlayerState(match, player);
        playerState.position = to;
        this.saveAndBroadcastMatch(match);
    }

    private getPlayerState(match: Match, player: Player | string) {
        const id = typeof player === 'string' ? player : player.id;
        return match.playerState[id];
    }

    private sleep(n: number) {
        return new Promise<void>(r => {
            setTimeout(() => {
                r();
            }, n);
        });
    }

}
