import { Injectable } from '@nestjs/common';
import { LowDbService } from '../lowdb/lowdb.service';

@Injectable()
export class PlayerService {

    constructor(
        private db: LowDbService
    ) { }

    generatePlayer(socketId: string) {
        const player = {
            id: socketId,
            name: this.generateRandomName(),
            lobby: '',
            properties: [ ]
        };
        this.db.createPlayer(player);
        return player;
    }

    getPlayer(id: string) {
        return this.db.readPlayer(id);
    }

    savePlayer(player) {
        return this.db.updatePlayer(player);
    }

    deletePlayer(id: string) {
        return this.db.deletePlayer(id);
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