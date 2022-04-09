import { Match, Player, PlayerState, VictoryState } from '@moar-munz/api-interfaces';
import { Injectable } from '@nestjs/common';
import { JWTService } from './jwt.service';
import { LowDbService } from './lowdb.service';
import { UUIDService } from './uuid.service';
import { sample } from 'lodash';

@Injectable()
export class PlayerService {

    constructor(
        private db: LowDbService,
        private uuidService: UUIDService,
        private jwtService: JWTService
    ) { }

    private generatePlayer(id: string, match: Match, ai: boolean) {
        const name = `${this.generateRandomName()}${ai ? ' (AI)' : ''}`;
        const player: Player = {
            id,
            name,
            matchId: match.id,
            ai,
            color: 'black',
            ready: false,
            state: {
                victory: VictoryState.UNDEFINED,
                position: 0,
                playAgain: false,
                money: 2000,
                prison: 0,
                equalDie: 0,
                turn: false
            }
        };
        this.db.createPlayer(player);
        return player;
    }

    getOrGenPlayerByToken(token: string, match: Match, ai: boolean) {
        if (!token) {
            const uuid = this.uuidService.generateUUID(2);
            token = this.jwtService.genToken({ uuid });
        }
        const payload = this.jwtService.getPayload(token);
        return { token, player: this.generatePlayer(payload.uuid, match, ai) };
    }

    getPlayer(id: string): Player {
        return this.db.readPlayer(id);
    }

    savePlayer(player: Player) {
        return this.db.updatePlayer(player);
    }

    deletePlayer(id: string) {
        return this.db.deletePlayer(id);
    }

    getPlayersByMatchId(matchId: string) {
        return this.db.readPlayersByMatchId(matchId);
    }

    getState(id: string) {
        const player = this.getPlayer(id);
        return player?.state;
    }

    setState(id: string, state: PlayerState) {
        const player = this.getPlayer(id);
        if (!player) return;
        player.state = { ...state };
        return this.savePlayer(player);
    }

    setTurn(id: string, turn: boolean) {
        const player = this.getPlayer(id);
        if (!player) return;
        player.state.turn = turn;
        return this.savePlayer(player);
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
        const firstName = sample(firstNames);
        const secondName = sample(secondNames);
        return `${firstName} ${secondName}`;
    }

}
