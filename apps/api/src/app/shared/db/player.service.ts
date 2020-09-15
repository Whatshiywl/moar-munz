import { Lobby, Player } from '@moar-munz/api-interfaces';
import { Injectable } from '@nestjs/common';
import { JWTService } from '../jwt/jwt.service';
import { LowDbService } from '../lowdb/lowdb.service';
import { UUIDService } from '../uuid/uuid.service';

@Injectable()
export class PlayerService {

    constructor(
        private db: LowDbService,
        private uuidService: UUIDService,
        private jwtService: JWTService
    ) { }

    generatePlayer(id: string, lobby: Lobby) {
        const player: Player = {
            id,
            name: this.generateRandomName(),
            lobby: lobby.id
        };
        this.db.createPlayer(player);
        return player;
    }

    getOrGenPlayerByToken(token: string, lobby: Lobby) {
        if (!token) {
            const uuid = this.uuidService.generateUUID(2);
            token = this.jwtService.genToken({ uuid });
        }
        const payload = this.jwtService.getPayload(token);
        return { token, player: this.generatePlayer(payload.uuid, lobby) };
    }

    getPlayer(id: string): Player {
        return this.db.readPlayer(id);
    }

    savePlayer(player) {
        if (typeof player === 'string') throw new TypeError('Expecting player as object, got string');
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