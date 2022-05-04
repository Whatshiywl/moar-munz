import { PipeTransform, Injectable } from '@nestjs/common';
import { PlayerBody, SocketBody } from '../socket.interfaces';
import { PlayerService } from '../../shared/services/player.service';
import { JWTService } from '../../shared/services/jwt.service';

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
