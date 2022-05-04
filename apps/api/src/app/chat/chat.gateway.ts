import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { UsePipes } from '@nestjs/common';
import { SocketMessageBody } from '../socket/socket.interfaces';
import { SocketService } from '../socket/socket.service';
import { BodyMessagePipe } from '../socket/pipes/body-message.pipe';

@WebSocketGateway()
export class ChatGateway {

    constructor(
        private socketService: SocketService
    ) { }

    @UsePipes(BodyMessagePipe)
    @SubscribeMessage('send message')
    onMessage(@MessageBody() body: SocketMessageBody) {
        const { message } = body;
        if (!message) return;
        this.socketService.broadcastMessage(message);
    }

}
