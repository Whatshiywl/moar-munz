import { Match, Message, Player } from '@moar-munz/api-interfaces';
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

    ask<T extends ReadonlyArray<unknown>>(player: Player, question: string, options: T) {
        type A = typeof options[number];
        if (player.ai) {
            return new Promise<A>((resolve, reject) => {
                console.log(`Question: ${question}`);
                const answer = this.aiService.answer(question, options);
                console.log(`Answer: ${answer}`);
                resolve(answer);
            });
        } else {
            const client = this.getClient(player.id);
            if (!client) return undefined;
            return new Promise<A>((resolve, reject) => {
                console.log(`Question: ${question}`);
                client.emit('ask question', {
                    message: question, options
                }, (answer: A) => {
                    console.log(`Answer: ${answer}`);
                    resolve(answer);
                });
            });
        }
    }

    notify(player: Player, message: string) {
        const client = this.getClient(player.id);
        client?.emit('notification', message);
    }

    notifyAll(message: string, players: string[]) {
        this.emit('notification', message, players);
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

    emit(event: string, body: any, players: string[]) {
        const namespace = this.getNamespaceFromIdList(players);
        if (!namespace) return;
        namespace.emit(event, body);
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
