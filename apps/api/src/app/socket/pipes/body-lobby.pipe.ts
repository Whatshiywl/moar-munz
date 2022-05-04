import { PipeTransform, Injectable } from '@nestjs/common';
import { DataBody, MatchBody, PlayerBody, SocketBody } from '../socket.interfaces';
import { PlayerService } from '../../shared/services/player.service';
import { JWTService } from '../../shared/services/jwt.service';
import { MatchService } from '../../shared/services/match.service';

type InBody = SocketBody & DataBody<{ lobbyId: string }> & PlayerBody
type OutBody = SocketBody & DataBody<{ lobbyId: string }> & MatchBody;

@Injectable()
export class BodyLobbyPipe implements PipeTransform<InBody, OutBody> {

    constructor(
        private jwtService: JWTService,
        private matchService: MatchService,
        private playerService: PlayerService
    ) { }

    transform(body: InBody) {
        const matchId = body.data?.lobbyId || this.getMatchIdFromPlayer(body);
        const match = this.matchService.getMatch(matchId);
        return { ...body, match };
    }

    private getMatchIdFromPlayer(body: InBody) {
        const player = body.player || this.getPlayerFromToken(body.token);
        return player.matchId;
    }

    private getPlayerFromToken(token: string) {
        const data = this.jwtService.getPayload(token);
        return this.playerService.getPlayer(data.uuid);
    }
}
