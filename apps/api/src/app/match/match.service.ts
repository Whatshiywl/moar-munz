import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { cloneDeep, sample, groupBy } from 'lodash';
import { LowDbService } from '../shared/lowdb/lowdb.service';
import { Player, PlayerService } from '../shared/db/player.service';
import { Board, BoardService, Tile } from '../shared/db/board.service';
import { SocketService } from '../socket/socket.service';

export interface Match {
    id: string,
    turn: 0,
    lastDice: [ number, number ],
    players: string[],
    board: Board,
    locked: boolean,
    over: boolean,
    worldcup: string
}

@Injectable()
export class MatchService {

    constructor(
        private db: LowDbService,
        private playerService: PlayerService,
        private socketService: SocketService,
        private boardService: BoardService
    ) { }

    generateMatch(boardName: string, ...players: Player[]) {
        const id = players[0].lobby;
        const board = this.boardService.getBoard(boardName);
        const match: Match = {
            id,
            turn: 0,
            lastDice: [ 1, 1 ],
            players: [ ],
            board,
            locked: false,
            over: false,
            worldcup: ''
        };
        players.forEach(player => {
            match.board.tiles[0].players.push(player.id);
            match.players.push(player.id);
            player.position = 0;
            player.money = 2000;
            player.tiles = [ ];
            this.playerService.savePlayer(player);
        });
        this.db.createMatch(match);
        this.saveAndBroadcastMatch(match);
        return match;
    }

    getMatch(id: string) {
        return this.db.readMatch(id);
    }

    saveMatch(match: Match) {
        this.db.updateMatch(match);
    }

    removePlayer(match: Match, player: Player) {
        const index = match.players.findIndex(s => s === player.id);
        const fullTurns = Math.floor(match.turn / match.players.length) + (match.turn % match.players.length > index ? 1 : 0);
        match.turn -= fullTurns;
        match.players.splice(index, 1);
        match.board.tiles.forEach(tile => {
            if (tile.owner === player.id) {
                tile.owner = undefined;
                if (tile.level) tile.level = 0;
            }
            const playerIndex = tile.players.findIndex(s => s === player.id);
            if (playerIndex >= 0) tile.players.splice(playerIndex, 1);
        });
        this.saveAndBroadcastMatch(match);
    }

    saveAndBroadcastMatch(match) {
        this.saveMatch(match);
        this.broadcastMatchState(match);
    }

    async play(match: Match, player: Player) {
        if (match.locked || match.over) return;
        const playerTurn = match.players[match.turn % match.players.length];
        if (playerTurn !== player.id) return;
        if (player.lost) return;
        match.locked = true;
        console.log(`${player.name}'s turn`);
        this.saveAndBroadcastMatch(match);
        const move = await this.onStart(match, player);
        this.saveAndBroadcastMatch(match);
        const dice: [ number, number ] = [ Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6) ];
        match.lastDice = dice;
        const diceResult = typeof move === 'number' ? move : dice.reduce((acc, n) => acc + n, 0);
        if (await this.onPlay(match, player, dice)) {
            this.saveAndBroadcastMatch(match);
            const tiles = match.board.tiles;
            const start = player.position;
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
        if (player.playAgain && !player.lost) player.playAgain = false;
        else {
            while(true) {
                match.turn++;
                const index = match.turn % match.players.length;
                const id = match.players[index];
                const nextPlayer = this.playerService.getPlayer(id);
                if (!nextPlayer.lost) break;
            }
        }
        match.locked = false;
        this.playerService.savePlayer(player);
        this.saveAndBroadcastMatch(match);
    }

    private async onStart(match: Match, player: Player) {
        const tile = match.board.tiles[player.position];
        switch (tile.type) {
            case 'worldtour':
                if (player.money < tile.cost) return;
                const options = [ 'No', ...match.board.tiles.filter(t => {
                    if (t.type !== 'deed') return false;
                    if (t.owner && t.owner !== player.id) return false;
                    return true;
                }).map(t => t.name) ];
                if (!options.length) return;
                const question = this.socketService.ask(player.id,
                `Would you like to travel for ${tile.cost}?\nIf so, where to?`,
                options);
                const answer = await question;
                if (answer !== options[0]) {
                    this.givePlayer(match, player, -tile.cost, false);
                    let goToIndex = match.board.tiles.findIndex(t => t.name === answer);
                    if (goToIndex < player.position) goToIndex += match.board.tiles.length;
                    return goToIndex - player.position;
                }
                break;
        }
    }

    private async onPlay(match: Match, player: Player, die: number[]) {
        const tile = match.board.tiles[player.position];
        switch (tile.type) {
            case 'prision':
                if (player.prision > 0) {
                    if (die[0] === die[1]) {
                        player.prision = 0;
                        player.playAgain = true;
                    } else {
                        player.prision--;
                        console.log('not pairs, cant leave jail');
                        return false;
                    }
                }
                break;
            default:
                if (die[0] === die[1]) {
                    player.equalDie = (player.equalDie || 0) + 1;
                    if (player.equalDie === 3) {
                        this.sendToJail(match, player);
                        console.log('3 pairs, go to jail');
                        return false;
                    } else {
                        player.playAgain = true;
                    }
                } else {
                    player.equalDie = 0;
                }
                break;
        }
        return true;
    }

    private async onLand(match: Match, player: Player, position: number, diceResult: number) {
        const tile = match.board.tiles[position];
        console.log(player.id, player.name, 'landed on', tile);
        switch (tile.type) {
            case 'prision':
                player.prision = 2;
                break;
            case 'worldcup':
                const wcOptions = match.board.tiles.filter(t => {
                    if (t.type !== 'deed') return false;
                    if (!t.owner || t.owner !== player.id) return false;
                    return true;
                }).map(t => `${t.name} (${this.getRawRent(t)})`);
                if (!wcOptions.length) return;
                const wcQuestions = this.socketService.ask(player.id,
                `Set the location to host the next worldcup!`,
                wcOptions);
                const wcAnswer = await wcQuestions;
                const wcAnswerValue = wcAnswer.match(/^([^\(]+)/)[1].trim();
                const worldcupIndex = match.board.tiles.findIndex(t => t.name === wcAnswerValue);
                match.worldcup = match.board[worldcupIndex].name;
                break;
            case 'deed':
                if (!tile.owner) {
                    if (tile.price > player.money) return;
                    const options = [ 'No' ];
                    for (let n = tile.level; n < tile.rent.length - 1; n++) {
                        const levelDifference = n - tile.level;
                        const cost = tile.building * levelDifference;
                        if (tile.price + cost > player.money) break;
                        options.push(`${n} (${tile.price + cost})`);
                    }
                    if (options.length === 1) return;
                    const question = this.socketService.ask(player.id, 
                    `Would you like to buy ${tile.name} for ${tile.price}?\nIf so, how many houses do you want (${tile.building} each)?`,
                    options);
                    const answer = await question;
                    if (answer !== options[0]) {
                        const answerValue = parseInt(answer.match(/^([^\(]+)/)[1].trim(), 10);
                        player.properties.push(tile.name);
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
                            if (cost > player.money) break;
                            options.push(`${n} (${cost})`);
                        }
                        if (options.length === 1) return;
                        const question = this.socketService.ask(player.id,
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
                        const cost = this.getFullRent(match, tile);
                        await this.transferFromTo(match, player, owner, cost);
                        const value = 2 * this.getTileValue(tile);
                        if (player.money >= value) {
                            const question = this.socketService.ask(player.id,
                            `Would you like to buy ${tile.name} from ${owner.name} for ${value}?`,
                            [ 'No', 'Yes' ] as const);
                            const answer = await question;
                            if (answer === 'Yes') {
                                await this.transferFromTo(match, player, owner, value);
                                const tileIndex = owner.properties.findIndex(name => name === tile.name);
                                owner.properties.splice(tileIndex, 1);
                                player.properties.push(tile.name);
                                tile.owner = player.id;
                                this.playerService.savePlayer(player);
                                this.playerService.savePlayer(owner);
                                this.saveAndBroadcastMatch(match);
                                await this.onLand(match, player, position, diceResult);
                            }
                        }
                    }
                }
                break;
            case 'company':
                if (!tile.owner) {
                    if (tile.price > player.money) return;
                    const question = this.socketService.ask(player.id, 
                    `Would you like to buy ${tile.name} for ${tile.price}?`,
                    [ 'No', 'Yes' ] as const);
                    const answer = await question;
                    if (answer !== 'No') {
                        player.properties.push(tile.name);
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
                    if (tile.price > player.money) return;
                    const question = this.socketService.ask(player.id, 
                    `Would you like to buy ${tile.name} for ${tile.price}?`,
                    [ 'No', 'Yes' ] as const);
                    const answer = await question;
                    if (answer !== 'No') {
                        player.properties.push(tile.name);
                        tile.owner = player.id;
                        await this.givePlayer(match, player, -tile.price, false);
                        const boardRails = match.board.tiles.filter(t => t.type === 'railroad');
                        const ownedRails = boardRails.filter(t => t.owner === player.id);
                        ownedRails.forEach(t => t.level = ownedRails.length);
                    }
                } else {
                    if (tile.owner !== player.id) {
                        const owner = this.playerService.getPlayer(tile.owner);
                        const cost = this.getRawRent(tile);
                        await this.transferFromTo(match, player, owner, cost);
                    }
                }
                break;
            case 'tax':
                const ownedProperties = match.board.tiles.filter(t => t.owner === player.id);
                const propretyValue = ownedProperties.reduce((acc, t) => acc += this.getTileValue(t), 0);
                const totalValue = player.money + propretyValue;
                const tax = tile.tax;
                const taxAmount = Math.ceil(totalValue * tax);
                await this.givePlayer(match, player, -taxAmount, true);
                break;
            case 'chance':
                const cards = [
                    async () => this.sendToJail(match, player),
                    async () => this.move(match, player, 0),
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
                    async () => this.givePlayer(match, player, -500, true)
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

    private getRawRent(tile: Tile) {
        return tile.rent[tile.level - 1];
    }

    private getFullRent(match: Match, tile: Tile) {
        let rent = this.getRawRent(tile);
        if (match.worldcup === tile.name) rent *= 2;
        if (tile.type === 'deed') {
            const sameColor = match.board.tiles.filter(t => t.type === 'deed' && t.color === tile.color);
            const sameColorOwner = sameColor.filter(t => t.owner === tile.owner);
            if (sameColor.length === sameColorOwner.length) rent *= 2;
            const tileIndex = match.board.tiles.findIndex(t => t.name === tile.name);
            const lineLength = match.board.tiles.length / 4;
            const line = Math.floor(tileIndex / lineLength);
            const sameLine = match.board.tiles.filter((t, i) => t.type === 'deed' && Math.floor(i / lineLength) === line);
            const sameTileOwner = sameLine.filter(t => t.owner === tile.owner);
            if (sameLine.length === sameTileOwner.length) rent *= 2;
        }
        return rent;
    }

    private async givePlayer(match: Match, player: Player, amount: number, origin?: string | boolean) {
        while (player.properties.length && player.money + amount < 0) {
            const options = player.properties.map(name => {
                const prop = match.board.tiles.find(t => t.name === name);
                const value = this.getTileValue(prop);
                return `${name} (${value})`;
            });
            const question = this.socketService.ask(player.id,
            `You must sell some properties.\nAmount remaining: ${Math.abs(player.money + amount)}`,
            options);
            const answer = await question;
            const answerName = answer.match(/^([^\(]+)/)[1].trim();
            const answerTile = match.board.tiles.find(t => t.name === answerName);
            const answerValue = this.getTileValue(answerTile);
            const tileIndex = player.properties.findIndex(p => p === answerName);
            answerTile.owner = undefined;
            answerTile.level = 0;
            player.properties.splice(tileIndex, 1);
            player.money += answerValue;
            if (answerTile.type === 'railroad') {
                const boardRails = match.board.tiles.filter(t => t.type === 'railroad');
                const ownedRails = boardRails.filter(t => t.owner === player.id);
                ownedRails.forEach(t => t.level = ownedRails.length);
            }
            this.saveAndBroadcastMatch(match);
        }
        const startAmount = player.money;
        player.money += amount;
        const tile = match.board.tiles[player.position];
        if (player.money < 0) {
            console.log(`${player.name} LOSES`);
            player.money = 0;
            player.lost = true;
            const playerIndex = tile.players.findIndex(id => id === player.id);
            tile.players.splice(playerIndex, 1);
            const lost = [ ];
            const notLost = match.players.filter(id => {
                if (id === player.id) return false;
                const otherPlayer = this.playerService.getPlayer(id);
                if (otherPlayer.lost) {
                    lost.push(id);
                    return false;
                } else return true;
            });
            if (notLost.length === 1) {
                const winner = this.playerService.getPlayer(notLost[0]);
                this.win(match, winner);
            } else {
                this.socketService.notify(player.id, `You have lost. Git gud.`);
            }
        } else {
            if (origin !== false) {
                const ori = origin === true ? tile.name : origin;
                const got = amount > 0;
                const val = Math.abs(amount);
                const message = `You just ${got ? 'got' : 'lost'} ${val}`;
                const oriMessage = ori ? `\n${amount > 0 ? 'from' : 'to'} ${ori}` : '';
                this.socketService.notify(player.id, `${message}${oriMessage}.`);
            }
        }
        this.playerService.savePlayer(player);
        return player.money - startAmount;
    }

    private win(match: Match, winner: Player) {
        console.log(`${winner.name} WINS`);
        this.socketService.notify(winner.id, 'You have won!');
        const lost = match.players.filter(p => p !== winner.id);
        lost.forEach(id => {
            this.socketService.notify(id, `${winner.name} has won!`);
            const player = this.playerService.getPlayer(id);
            player.lost = true;
            this.playerService.savePlayer(player);
        });
        winner.won = true;
        match.over = true;
    }

    private async transferFromTo(match: Match, from: Player, to: Player, amount: number) {
        console.log(`Transfering ${amount} from ${from.name} to ${to.name}`);
        amount = await this.givePlayer(match, from, -amount, to.name);
        console.log(`${to.name} will receive ${-amount}`);
        await this.givePlayer(match, to, -amount, !to.won ? from.name : false);
        this.saveAndBroadcastMatch(match);
    }

    private getTileValue(tile: Tile) {
        let value = tile.price;
        if (tile.building) {
            value += tile.building * (tile.level - 1);
        }
        return value;
    }

    private sendToJail(match: Match, player: Player) {
        this.move(match, player, 10);
        player.prision = 2;
        player.equalDie = 0;
        this.socketService.notify(player.id, `You have gone to jail!`);
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

    postProcessMatch(match) {
        for (let t = 0; t < match.board.tiles.length; t++) {
            const tile = match.board.tiles[t];
            const markers = [ ];
            tile.players.forEach((playerId, i) => {
                const found = match.players.find(p => p.id === playerId);
                markers.push({ ...found, i });
            });
            tile.players = markers;
            if (tile.owner) {
                tile.value = this.getTileValue(tile);
                if (tile.level) {
                    tile.currentRent = this.getFullRent(match, tile);
                }
            }
            tile.worldcup = match.worldcup === tile.name;
            const j = t % match.board.lineLength;
            const s = Math.floor(t / match.board.lineLength);
            const pos = [ ];
            if (s === 0) {
                pos[0] = j;
                pos[1] = 0;
            } else if (s === 1) {
                pos[0] = match.board.lineLength;
                pos[1] = j
            } else if (s === 2) {
                pos[0] = match.board.lineLength - j;
                pos[1] = match.board.lineLength;
            } else {
                pos[0] = 0;
                pos[1] = match.board.lineLength - j;
            }
            tile['x'] = pos[0];
            tile['y'] = pos[1];
        }
        const playerTurn = match.players[match.turn % match.players.length];
        match['playerTurn'] = playerTurn;
    }

    broadcastMatchState(_match) {
        const match = cloneDeep(_match);
        let namespace;
        for (let i = 0; i < match.players.length; i++) {
            const id = match.players[i];
            const socketId = this.socketService.getClient(id).id;
            namespace = (namespace || this.socketService.getServer()).to(socketId);
            const player = this.playerService.getPlayer(id);
            match.players[i] = player;
        }
        if (!namespace) return;
        this.postProcessMatch(match);
        namespace.emit('match', match);
    }

    private move(match: Match, player: Player, to: number) {
        const fromTile = match.board.tiles[player.position];
        const toTile = match.board.tiles[to];
        const playerIndex = fromTile.players.findIndex(p => p === player.id);
        fromTile.players.splice(playerIndex, 1);
        toTile.players.push(player.id);
        player.position = to;
        this.playerService.savePlayer(player);
    }

    private sleep(n: number) {
        return new Promise(r => {
            setTimeout(() => {
                r();
            }, n);
        });
    }

}