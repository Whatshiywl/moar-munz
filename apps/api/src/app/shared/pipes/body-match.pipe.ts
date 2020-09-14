import { PipeTransform, Injectable } from '@nestjs/common';
import { DataBody, MatchBody, PlayerBody, SocketBody } from '../../socket/socket.interfaces';
import { MatchService } from '../../match/match.service';
import { PlayerService } from '../db/player.service';
import { JWTService } from '../jwt/jwt.service';

type InBody = SocketBody & DataBody<{ matchId: string }> & PlayerBody
type OutBody = SocketBody & DataBody<{ matchId: string }> & MatchBody;

@Injectable()
export class BodyMatchPipe implements PipeTransform<InBody, OutBody> {

    constructor(
        private jwtService: JWTService,
        private matchService: MatchService,
        private playerService: PlayerService,
    ) { }

    transform(body: InBody) {
        const matchId = body.data?.matchId || this.getMatchIdFromPlayer(body);
        const match = this.matchService.getMatch(matchId);
        return { ...body, match };
    }

    private getMatchIdFromPlayer(body: InBody) {
        const player = body.player || this.getPlayerFromToken(body.token);
        return player.lobby;
    }

    private getPlayerFromToken(token: string) {
        const data = this.jwtService.getPayload(token);
        return this.playerService.getPlayer(data.uuid);
    }
}