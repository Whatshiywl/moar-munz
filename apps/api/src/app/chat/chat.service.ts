import { Injectable } from '@nestjs/common';
import { SocketService } from '../socket/socket.service';
import { Match, Message } from '@moar-munz/api-interfaces';

@Injectable()
export class ChatService {

    constructor(
        private socketService: SocketService,
    ) { }

    broadcastMessage(message: Message, match: Match) {
        const players = match.playerOrder;
        this.socketService.emit('message', message, players);
    }

}