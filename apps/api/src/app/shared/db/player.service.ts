import { Injectable } from '@nestjs/common';
import { LowDbService } from '../lowdb/lowdb.service';

export interface Player {
    id: string,
    name: string,
    lobby: string,
    properties: string[], // TODO: remove
    lost: boolean, // TODO: remove
    won: boolean, // TODO: remove
    position: number, // TODO: remove
    playAgain: boolean, // TODO: remove
    money: number, // TODO: remove
    prision: number, // TODO: remove
    equalDie: number, // TODO: remove
    tiles: string[] // TODO: remove
}

@Injectable()
export class PlayerService {

    constructor(
        private db: LowDbService
    ) { }

    generatePlayer(socketId: string) {
        const player: Player = {
            id: socketId,
            name: this.generateRandomName(),
            lobby: '',
            properties: [ ],
            lost: false,
            won: false,
            position: 0,
            playAgain: false,
            money: 2000,
            prision: 0,
            equalDie: 0,
            tiles: [ ]

        };
        this.db.createPlayer(player);
        return player;
    }

    getPlayer(id: string) {
        return this.db.readPlayer(id);
    }

    savePlayer(player) {
        if (typeof player === 'string') throw new TypeError('Expecting player as object, got string');
        return this.db.updatePlayer(player);
    }

    deletePlayer(id: string) {
        return this.db.deletePlayer(id);
    }

    onPlayerReady(player, ready: boolean) {
        player.ready = ready;
        this.savePlayer(player);
    }

    private generateRandomName() {
        const firstNames = [
            'Amazing', 'Beautiful', 'Cocky', 'Dreadful', 'Elegant', 'Fabulous',
            'Great', 'Hilarious', 'Idiot', 'Just', 'Kind', 'Legend', 'Motivated',
            'Nuanced', 'Optimized', 'Peaceful', 'Quiet', 'Robust', 'Sassy',
            'Tenacious', 'Ugly', 'Valiant', 'Wacky', 'Xenial', 'Yappy', 'Zealous'
        ];
        const secondNames = [
            'Android', 'Barnicle', 'Captain', 'Dairy', 'Eagle', 'Fagot', 'Garbage',
            'Humanoid', 'Influencer', 'Juggler', 'Kiddo', 'Lamb', 'Magnet', 'Nuisance',
            'Organ', 'Priest', 'Quotation', 'Raspberry', 'Snapper', 'Tortoise',
            'Unicorn', 'Voice', 'Waffle', 'Xylophone', 'Yacht', 'Zebra'
        ];
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const secondName = secondNames[Math.floor(Math.random() * secondNames.length)];
        return `${firstName} ${secondName}`;
    }

}