import { WebSocketServer, WebSocketGateway, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class SocketService implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    clientMap: {
        [id: string]: Socket
    };

    constructor() { }

    getServer() {
        return this.server;
    }

    getClient(id: string) {
        return this.clientMap[id];
    }

    afterInit() {
        this.clientMap = { };
    }

    handleConnection(@ConnectedSocket() client: Socket) {
        console.log('mapped', client.id);
        this.clientMap[client.id] = client;
    }

    handleDisconnect(@ConnectedSocket() client: Socket) {
        delete this.clientMap[client.id];
    }

    ask<T extends ReadonlyArray<unknown>>(id: string, question: string, options: T) {
        type A = typeof options[number];
        const client = this.clientMap[id];
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
        const client = this.clientMap[id];
        if (!client) return undefined;
        client.emit('notification', message);
    }
}