import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { UsePipes } from '@nestjs/common';
import { ChatService } from './chat.service';
import { MatchBody, SocketMessageBody } from '../socket/socket.interfaces';
import { BodyMatchPipe } from '../shared/pipes/body-match.pipe';
import { BodyMessagePipe } from '../shared/pipes/body-message.pipe';

type ChatBody = SocketMessageBody & MatchBody;

@WebSocketGateway()
export class ChatGateway {

    constructor(
        private chatService: ChatService
    ) { }

    @UsePipes(BodyMatchPipe, BodyMessagePipe)
    @SubscribeMessage('send message')
    onMessage(@MessageBody() body: ChatBody) {
        const { match, message } = body;
        if (!match || !message) return;
        this.chatService.broadcastMessage(message, match);
    }

}
