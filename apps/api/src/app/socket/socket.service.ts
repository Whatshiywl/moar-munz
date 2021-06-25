import { Match, Message, Player, TradeSide } from '@moar-munz/api-interfaces';
import { Injectable } from '@nestjs/common';
import { Namespace, Server, Socket } from 'socket.io';
import { AIService } from '../shared/services/ai.service';
import { JWTService } from '../shared/services/jwt.service';

@Injectable()
export class SocketService {
    private server: Server;

    sessions: {
        [id: string]: {
            token: string,
            data: {
                uuid: string
            },
            client: Socket
        }
    };

    constructor(
        private jwtService: JWTService,
        private aiService: AIService
    ) { }

    initServer(server: Server) {
        this.server = server;
        this.sessions = { };
    }

    getServer() {
        return this.server;
    }

    getClient(id: string) {
        return (this.sessions[id] || { }).client;
    }

    connect(client: Socket) {
        const token = client.handshake.query.token;
        try {
            const data = this.jwtService.getPayload(token);
            console.log(`mapped ${data.uuid} ${client.id}`);
            this.sessions[data.uuid] = {
                token,
                data,
                client
            };
        } catch (error) {
            console.error('Invalid token on connect:', token);
        }
    }

    disconnect(client: Socket) {
        const token = client.handshake.query.token;
        const data = this.jwtService.getPayload(token);
        console.log(`unmapped ${data.uuid} ${client.id}`);
        delete this.sessions[data.uuid];
    }

    getNamespaceFromIdList(ids: string[]) {
        let namespace: Namespace;
        for (const id of ids.filter(Boolean)) {
            const socketId = this.getClient(id)?.id;
            if (!socketId) continue;
            namespace = (namespace || this.getServer()).to(socketId);
        }
        return namespace;
    }

    emit(event: string, body: any, players: string[], callback?: Function) {
        const namespace = this.getNamespaceFromIdList(players);
        if (!namespace) return;
        namespace.emit(event, body, callback);
    }

    updateTradeSide(side: TradeSide, id: string) {
        const client = this.getClient(id);
        if (!client) return;
        return new Promise<boolean>((resolve, reject) => {
            client.emit('update trade', side, resolve);
        });
    }

    broadcastMessage(message: Message) {
        this.emit('message', message, message.recipients);
    }

    broadcastMessageWithAlternativeMessage(message: Message, selector: (id: string) => string) {
        message.recipients.forEach(id => {
            const data = selector(id);
            const recipients = [ id ];
            const tmpMessage = { ...message, recipients, data } as Message;
            this.broadcastMessage(tmpMessage);
        });
    }

    broadcastGlobalMessage(recipients: string[], payload: string);
    broadcastGlobalMessage(recipients: string[], payload: (id: string) => string);
    broadcastGlobalMessage(recipients: string[], payload: string | ((id: string) => string)) {
        const baseMessage = { type: 'global', from: 'global' };
        if (typeof payload === 'string') {
            this.broadcastMessage({ ...baseMessage, recipients, data: payload } as Message);
        } else {
            recipients.forEach(id => {
                const data = payload(id);
                const message = {
                    type: 'global',
                    from: 'global',
                    recipients: [ id ],
                    data
                } as Message;
                this.broadcastMessage(message);
            });
        }
    }
}
