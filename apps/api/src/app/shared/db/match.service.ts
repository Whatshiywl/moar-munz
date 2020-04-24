import { Injectable } from '@nestjs/common';
import { cloneDeep, sample } from 'lodash';
import { LowDbService } from '../lowdb/lowdb.service';
import { PlayerService } from './player.service';
import { board } from './board';
import { SocketService } from '../../socket/socket.service';

@Injectable()
export class MatchService {

    constructor(
        private db: LowDbService,
        private playerService: PlayerService,
        private socketService: SocketService
    ) { }

    generateMatch(...players: any[]) {
        const id = players[0].lobby;
        const match = {
            id,
            turn: 0,
            lastDice: [ 1, 1 ],
            players: [ ],
            board: cloneDeep(board)
        };
        players.forEach(player => {
            match.board[0].players.push(player.id);
            match.players.push(player.id);
            player.position = 0;
            player.money = 2000;
            player.titles = [ ];
            this.playerService.savePlayer(player);
        });
        this.db.createMatch(match);
        return match;
    }

    getMatch(id: string) {
        return this.db.readMatch(id);
    }

    saveMatch(match) {
        this.db.updateMatch(match);
    }

    saveAndBroadcastMatch(match) {
        this.saveMatch(match);
        this.broadcastMatchState(match);
    }

    async play(match: any, player: any) {
        if (match.locked) return;
        if (player.lost) {
            match.turn += 2;
            this.saveAndBroadcastMatch(match);
            return;
        }
        match.locked = true;
        this.saveAndBroadcastMatch(match);
        const move = await this.onStart(player, match);
        this.saveAndBroadcastMatch(match);
        const dice = [ Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6) ];
        match.lastDice = dice;
        const diceResult = typeof move === 'number' ? move : dice.reduce((acc, n) => acc + n, 0);
        if (await this.onPlay(player, match, dice)) {
            this.saveAndBroadcastMatch(match);
            const titles = match.board;
            const start = player.position;
            for (let i = 1; i <= diceResult; i++) {
                const position = (start + i) % titles.length;
                await this.onPass(player, match, position);
                this.saveAndBroadcastMatch(match);
                await this.sleep(250);
                if (i === diceResult) {
                    this.saveAndBroadcastMatch(match);
                    await this.onLand(player, match, position, diceResult);
                    this.saveAndBroadcastMatch(match);
                }
            }
        }
        match.turn++;
        match.locked = false;
        this.playerService.savePlayer(player);
        this.saveAndBroadcastMatch(match);
    }

    private async onStart(player, match) {
        const title = match.board[player.position];
        switch (title.type) {
            case 'start':
                break;
            case 'prision':
                break;
            case 'worldcup':
                break;
            case 'worldtour':
                if (player.money < title.cost) return;
                const options = [ 'No', ...match.board.filter(t => {
                    if (t.type !== 'deed') return false;
                    if (t.owner && t.owner !== player.id) return false;
                    return true;
                }).map(t => t.name) ];
                if (!options.length) return;
                const question = this.socketService.ask(player.id,
                `Would you like to travel for ${title.cost}?\nIf so, where to?`,
                options);
                const answer = await question;
                if (answer !== options[0]) {
                    this.givePlayer(match, player, -title.cost);
                    let goToIndex = match.board.findIndex(t => t.name === answer);
                    if (goToIndex < player.position) goToIndex += match.board.length;
                    return goToIndex - player.position;
                }
                break;
        }
    }

    private async onPlay(player, match, die: number[]) {
        const title = match.board[player.position];
        switch (title.type) {
            case 'prision':
                if (player.prision > 0) {
                    if (die[0] === die[1]) {
                        player.prision = 0;
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
                    }
                } else {
                    player.equalDie = 0;
                }
                break;
        }
        return true;
    }

    private async onLand(player, match, position: number, diceResult: number) {
        const title = match.board[position];
        console.log(player.id, player.name, 'landed on', title);
        switch (title.type) {
            case 'start':
                break;
            case 'prision':
                player.prision = 2;
                break;
            case 'worldcup':
                const wcOptions = match.board.filter(t => {
                    if (t.type !== 'deed') return false;
                    if (!t.owner || t.owner !== player.id) return false;
                    return true;
                }).map(t => `${t.name} (${t.rent[t.level - 1]})`);
                if (!wcOptions.length) return;
                const wcQuestions = this.socketService.ask(player.id,
                `Set the location to host the next worldcup!`,
                wcOptions);
                const wcAnswer = await wcQuestions;
                const wcAnswerValue = wcAnswer.match(/^([^\(]+)/)[1].trim();
                const worldcupIndex = match.board.findIndex(t => t.name === wcAnswerValue);
                match.worldcup = match.board[worldcupIndex].name;
                break;
            case 'worldtour':
                break;
            case 'deed':
                if (!title.owner) {
                    if (title.price > player.money) return;
                    const options = [ 'No' ];
                    for (let n = title.level; n < title.rent.length - 1; n++) {
                        const levelDifference = n - title.level;
                        const cost = title.building * levelDifference;
                        if (title.price + cost > player.money) break;
                        options.push(`${n} (${title.price + cost})`);
                    }
                    if (options.length === 1) return;
                    const question = this.socketService.ask(player.id, 
                    `Would you like to buy ${title.name} for ${title.price}?\nIf so, how many houses do you want (${title.building} each)?`,
                    options);
                    const answer = await question;
                    if (answer !== options[0]) {
                        const answerValue = parseInt(answer.match(/^([^\(]+)/)[1].trim(), 10);
                        player.properties.push(title.name);
                        title.owner = player.id;
                        const levelDifference = answerValue - title.level;
                        const cost = title.building * levelDifference;
                        const amount = title.price + cost;
                        await this.givePlayer(match, player, -amount);
                        title.level = answerValue + 1;
                    }
                } else {
                    if (title.owner === player.id) {
                        const options = [ 'No' ];
                        for (let n = title.level; n < title.rent.length; n++) {
                            const levelDifference = n + 1 - title.level;
                            const cost = title.building * levelDifference;
                            if (cost > player.money) break;
                            options.push(`${n} (${cost})`);
                        }
                        if (options.length === 1) return;
                        const question = this.socketService.ask(player.id,
                        `Would you like to improve your property?\nIf so, to how many houses (${title.building} each extra)?`,
                        options);
                        const answer = await question;
                        if (answer !== options[0]) {
                            const answerValue = parseInt(answer.match(/^([^\(]+)/)[1].trim(), 10);
                            const levelDifference = answerValue + 1 - title.level;
                            const cost = title.building * levelDifference;
                            await this.givePlayer(match, player, -cost);
                            title.level = answerValue + 1;
                        }
                    } else {
                        const owner = this.playerService.getPlayer(title.owner);
                        let cost = title.rent[title.level - 1];
                        if (title.worldcup) cost *= 2;
                        await this.transferFromTo(match, player, owner, cost);
                        const value = 2 * this.getTitleValue(title);
                        if (player.money >= value) {
                            const question = this.socketService.ask(player.id,
                            `Would you like to buy ${title.name} from ${owner.name} for ${value}?`,
                            [ 'No', 'Yes' ] as const);
                            const answer = await question;
                            if (answer === 'Yes') {
                                await this.transferFromTo(match, player, owner, value);
                                const titleIndex = owner.properties.findIndex(t => t.name === title.name);
                                owner.properties.splice(titleIndex, 1);
                                player.properties.push(title.name);
                                title.owner = player.id;
                                this.playerService.savePlayer(player);
                                this.playerService.savePlayer(owner);
                                this.saveAndBroadcastMatch(match);
                                await this.onLand(player, match, position, diceResult);
                            }
                        }
                    }
                }
                break;
            case 'company':
                if (!title.owner) {
                    if (title.price > player.money) return;
                    const question = this.socketService.ask(player.id, 
                    `Would you like to buy ${title.name} for ${title.price}?`,
                    [ 'No', 'Yes' ] as const);
                    const answer = await question;
                    if (answer !== 'No') {
                        player.properties.push(title.name);
                        title.owner = player.id;
                        await this.givePlayer(match, player, -title.price);
                    }
                } else {
                    if (title.owner !== player.id) {
                        const owner = this.playerService.getPlayer(title.owner);
                        const cost = diceResult * title.multiplier;
                        await this.transferFromTo(match, player, owner, cost);
                    }
                }
                break;
            case 'railroad':
                if (!title.owner) {
                    if (title.price > player.money) return;
                    const question = this.socketService.ask(player.id, 
                    `Would you like to buy ${title.name} for ${title.price}?`,
                    [ 'No', 'Yes' ] as const);
                    const answer = await question;
                    if (answer !== 'No') {
                        player.properties.push(title.name);
                        title.owner = player.id;
                        await this.givePlayer(match, player, -title.price);
                        const boardRails = match.board.filter(t => t.type === 'railroad');
                        const ownedRails = boardRails.filter(t => t.owner === player.id);
                        ownedRails.forEach(t => t.level = ownedRails.length);
                    }
                } else {
                    if (title.owner !== player.id) {
                        const owner = this.playerService.getPlayer(title.owner);
                        const cost = title.rent[title.level - 1];
                        await this.transferFromTo(match, player, owner, cost);
                    }
                }
                break;
            case 'tax':
                const ownedProperties = match.board.filter(t => t.owner === player.id);
                const propretyValue = ownedProperties.reduce((acc, t) => acc += this.getTitleValue(t), 0);
                const totalValue = player.money + propretyValue;
                const tax = title.tax;
                const taxAmount = Math.ceil(totalValue * tax);
                await this.givePlayer(match, player, -taxAmount);
                break;
            case 'chance':
                const cards = [
                    async () => this.sendToJail(match, player),
                    async () => this.givePlayer(match, player, 50),
                    async () => this.givePlayer(match, player, 75),
                    async () => this.givePlayer(match, player, 100),
                    async () => this.givePlayer(match, player, 125),
                    async () => this.givePlayer(match, player, 150),
                    async () => this.givePlayer(match, player, 200),
                    async () => this.givePlayer(match, player, 300),
                    async () => this.givePlayer(match, player, 500),
                    async () => this.givePlayer(match, player, 1500),
                    async () => this.givePlayer(match, player, -50),
                    async () => this.givePlayer(match, player, -75),
                    async () => this.givePlayer(match, player, -100),
                    async () => this.givePlayer(match, player, -125),
                    async () => this.givePlayer(match, player, -150),
                    async () => this.givePlayer(match, player, -200),
                    async () => this.givePlayer(match, player, -300),
                    async () => this.givePlayer(match, player, -500)
                ];
                const card = sample(cards);
                await card();
                break;
        }
    }

    private async givePlayer(match, player, amount: number) {
        while (player.properties.length && player.money + amount < 0) {
            const options = player.properties.map(name => {
                const title = match.board.find(t => t.name === name);
                const value = this.getTitleValue(title);
                return `${name} (${value})`;
            });
            const question = this.socketService.ask(player.id,
            `You must sell some properties.\nAmount remaining: ${Math.abs(player.money + amount)}`,
            options);
            const answer = await question;
            const answerName = answer.match(/^([^\(]+)/)[1].trim();
            const answerTitle = match.board.find(t => t.name === answerName);
            const answerValue = this.getTitleValue(answerTitle);
            const titleIndex = player.properties.findIndex(p => p === answerName);
            answerTitle.owner = undefined;
            answerTitle.level = 0;
            player.properties.splice(titleIndex, 1);
            player.money += answerValue;
            if (answerTitle.type === 'railroad') {
                const boardRails = match.board.filter(t => t.type === 'railroad');
                const ownedRails = boardRails.filter(t => t.owner === player.id);
                ownedRails.forEach(t => t.level = ownedRails.length);
            }
            this.saveAndBroadcastMatch(match);
        }
        const startAmount = player.money;
        player.money += amount;
        if (player.money < 0) {
            console.log(`${player.id} LOSES`);
            player.money = 0;
            player.lost = true;
        }
        this.playerService.savePlayer(player);
        return player.money - startAmount;
    }

    private async transferFromTo(match, from, to, amount: number) {
        console.log(`Transfering ${amount} from ${from.name} to ${to.name}`);
        amount = await this.givePlayer(match, from, -amount);
        console.log(`${to.name} will receive ${-amount}`);
        await this.givePlayer(match, to, -amount);
        this.saveAndBroadcastMatch(match);
    }

    private getTitleValue(title) {
        let value = title.price;
        if (title.building) {
            value += title.building * (title.level - 1);
        }
        return value;
    }

    private sendToJail(match, player) {
        this.move(match, player, 10);
    }

    private async onPass(player, match, position: number) {
        const title = match.board[position];
        this.move(match, player, position);
        switch (title.type) {
            case 'start':
                await this.givePlayer(match, player, 300);
                break;
            case 'prision':
                break;
            case 'worldcup':
                break;
            case 'worldtour':
                break;
        }
    }

    postProcessMatch(match) {
        const lineLength = match.board.length / 4;
        match['lineLength'] = lineLength;
        for (let t = 0; t < match.board.length; t++) {
            const title = match.board[t];
            const markers = [ ];
            title.players.forEach((playerId, i) => {
                const found = match.players.find(p => p.id === playerId);
                markers.push({ ...found, i });
            });
            title.players = markers;
            if (title.owner) {
                title.value = this.getTitleValue(title);
                if (title.level) {
                    title.currentRent = title.rent[title.level - 1];
                }
            }
            if (match.worldcup === title.name) {
                title.worldcup = true;
                title.currentRent *= 2;
            }
            const j = t % lineLength;
            const s = Math.floor(t / lineLength);
            const pos = [ ];
            if (s === 0) {
                pos[0] = j;
                pos[1] = 0;
            } else if (s === 1) {
                pos[0] = lineLength;
                pos[1] = j
            } else if (s === 2) {
                pos[0] = lineLength - j;
                pos[1] = lineLength;
            } else {
                pos[0] = 0;
                pos[1] = lineLength - j;
            }
            title['x'] = pos[0];
            title['y'] = pos[1];
        }
        const playerTurn = match.players[match.turn % match.players.length];
        match['playerTurn'] = playerTurn;
    }

    broadcastMatchState(_match) {
        const match = cloneDeep(_match);
        let namespace;
        for (let i = 0; i < match.players.length; i++) {
            const id = match.players[i];
            namespace = (namespace || this.socketService.getServer()).to(id);
            const player = this.playerService.getPlayer(id);
            match.players[i] = player;
        }
        if (!namespace) return;
        this.postProcessMatch(match);
        namespace.emit('match', match);
    }

    private move(match, player, to: number) {
        const fromTitle = match.board[player.position];
        const toTitle = match.board[to];
        const playerIndex = fromTitle.players.findIndex(p => p === player.id);
        fromTitle.players.splice(playerIndex, 1);
        toTitle.players.push(player.id);
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