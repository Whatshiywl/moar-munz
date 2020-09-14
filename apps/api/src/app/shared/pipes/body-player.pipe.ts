import { PipeTransform, Injectable } from '@nestjs/common';
import { PlayerBody, SocketBody } from '../../socket/socket.interfaces';
import { PlayerService } from '../db/player.service';
import { JWTService } from '../jwt/jwt.service';

type InBody = SocketBody
type OutBody = SocketBody & PlayerBody;

@Injectable()
export class BodyPlayerPipe implements PipeTransform<InBody, OutBody> {

    constructor(
        private jwtService: JWTService,
        private playerService: PlayerService
    ) { }

    transform(body: InBody) {
        const token = body.token;
        const data = this.jwtService.getPayload(token);
        const player = this.playerService.getPlayer(data.uuid);
        return { ...body, player };
    }
}
