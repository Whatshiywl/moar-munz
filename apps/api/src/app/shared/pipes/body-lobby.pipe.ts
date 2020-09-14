import { PipeTransform, Injectable } from '@nestjs/common';
import { DataBody, LobbyBody, PlayerBody, SocketBody } from '../../socket/socket.interfaces';
import { LobbyService } from '../../lobby/lobby.service';
import { PlayerService } from '../db/player.service';
import { JWTService } from '../jwt/jwt.service';

type InBody = SocketBody & DataBody<{ lobbyId: string }> & PlayerBody
type OutBody = SocketBody & DataBody<{ lobbyId: string }> & LobbyBody;

@Injectable()
export class BodyLobbyPipe implements PipeTransform<InBody, OutBody> {

    constructor(
        private jwtService: JWTService,
        private lobbyService: LobbyService,
        private playerService: PlayerService
    ) { }

    transform(body: InBody) {
        const lobbyId = body.data?.lobbyId || this.getLobbyIdFromPlayer(body);
        const lobby = this.lobbyService.getLobby(lobbyId);
        return { ...body, lobby };
    }

    private getLobbyIdFromPlayer(body: InBody) {
        const player = body.player || this.getPlayerFromToken(body.token);
        return player.lobby;
    }

    private getPlayerFromToken(token: string) {
        const data = this.jwtService.getPayload(token);
        return this.playerService.getPlayer(data.uuid);
    }
}
