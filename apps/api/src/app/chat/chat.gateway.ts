import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { UsePipes } from '@nestjs/common';
import { BodyPlayerPipe } from '../shared/pipes/body-player.pipe';
import { ChatService } from './chat.service';
import { MatchBody, PlayerBody, SocketMessageBody } from '../socket/socket.interfaces';
import { BodyMatchPipe } from '../shared/pipes/body-match.pipe';

type ChatBody = SocketMessageBody & MatchBody & PlayerBody;

@WebSocketGateway()
export class ChatGateway {

    constructor(
        private chatService: ChatService
    ) { }

    @UsePipes(BodyPlayerPipe, BodyMatchPipe)
    @SubscribeMessage('send message')
    onMessage(@MessageBody() body: ChatBody) {
        const { player, match, message } = body;
        if (!player || !message) return;
        this.chatService.broadcastMessage(message, match);
    }

}