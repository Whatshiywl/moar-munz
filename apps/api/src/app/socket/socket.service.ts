import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JWTService } from '../shared/jwt/jwt.service';

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
        private jwtService: JWTService
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
        const data = this.jwtService.getPayload(token);
        console.log(`mapped ${data.uuid} ${client.id}`);
        this.sessions[data.uuid] = {
            token,
            data,
            client
        }
    }

    disconnect(clientId: string, token: string) {
        const data = this.jwtService.getPayload(token);
        console.log(`unmapped ${data.uuid} ${clientId}`);
        delete this.sessions[data.uuid];
    }

    ask<T extends ReadonlyArray<unknown>>(id: string, question: string, options: T) {
        type A = typeof options[number];
        const client = this.getClient(id);
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

    notify(id: string, message: string) {
        const client = this.getClient(id);
        if (!client) return undefined;
        client.emit('notification', message);
    }
}