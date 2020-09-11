import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { cloneDeep } from 'lodash';
import { LobbyService } from '../shared/db/lobby.service';
import { PlayerService } from '../shared/db/player.service';
import { JWTService } from '../shared/jwt/jwt.service';
import { UUIDService } from '../shared/uuid/uuid.service';
import { MatchService } from '../shared/db/match.service';

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
        private lobbyService: LobbyService,
        private uuidService: UUIDService,
        private playerService: PlayerService,
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
        const payload = this.jwtService.getPayload(token);
        const player = this.playerService.getPlayer(payload.uuid);
        if (!player) return;
        const lobby = this.lobbyService.getLobby(player.lobby);
        if (!lobby) return;
        const index = lobby.players.findIndex(s => s === payload.uuid);
        lobby.players.splice(index, 1);
        this.lobbyService.saveLobby(lobby);
        this.playerService.deletePlayer(payload.uuid);
        this.notifyLobbyChanges(lobby);
        const data = this.jwtService.getPayload(token);
        console.log(`unmapped ${data.uuid} ${clientId}`);
        delete this.sessions[data.uuid];
        return { player, payload, lobby };
    }

    handleEnterLobby(lobbyId: string, clientToken: string) {
        const lobby = this.lobbyService.getLobby(lobbyId);
        if (!lobby || !lobby.open) return false;
        if (!clientToken) {
            const uuid = this.uuidService.generateUUID(2);
            clientToken = this.jwtService.genToken({ uuid });
        }
        const payload = this.jwtService.getPayload(clientToken);
        const player = this.playerService.generatePlayer(payload.uuid);
        if (!player) return false;
        if (!lobby.players.includes(payload.uuid)) {
            lobby.players.push(payload.uuid);
            player.lobby = lobbyId;
        }
        this.lobbyService.saveLobby(lobby);
        this.playerService.savePlayer(player);
        this.notifyLobbyChanges(lobby);
        return { token: clientToken, uuid: payload.uuid };
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

    notifyLobbyChanges(l) {
        const lobby = cloneDeep(l);
        let namespace;
        for (let i = 0; i < lobby.players.length; i++) {
            const id = lobby.players[i];
            const socketId = this.getClient(id).id;
            namespace = (namespace || this.getServer()).to(socketId);
            const player = this.playerService.getPlayer(id);
            player.color = this.getPlayerColors(i);
            this.playerService.savePlayer(player);
            lobby.players[i] = player;
        }
        if (!namespace) return;
        namespace.emit('update lobby', lobby);
    }

    notify(id: string, message: string) {
        const client = this.getClient(id);
        if (!client) return undefined;
        client.emit('notification', message);
    }

    private getPlayerColors(i: number) {
        const colors = [
            'red', 'blue', 'darkorange', 'green', 'blueviolet', 'deepskyblue'
        ];
        return colors[i];
    }
}