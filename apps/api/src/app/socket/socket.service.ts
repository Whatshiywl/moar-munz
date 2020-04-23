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
            client.emit('ask question', {
                question, options
            }, (answer: A) => {
                console.log('ANSWER', answer);
                resolve(answer);
            });
        });
    }
}