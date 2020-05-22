import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { cloneDeep } from 'lodash';
import { LobbyService } from '../shared/db/lobby.service';
import { PlayerService } from '../shared/db/player.service';
import { MatchService } from '../shared/db/match.service';
import { SocketService } from './socket.service';

@WebSocketGateway()
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

    constructor(
        private lobbyService: LobbyService,
        private playerService: PlayerService,
        private matchService: MatchService,
        private socketService: SocketService
    ) { }

    afterInit() {
        console.log('server init');
    }

    handleConnection(@ConnectedSocket() client: Socket) {
        console.log('handleConnection', client.id);
    }

    @SubscribeMessage('enter lobby')
    onEnterLobby(@MessageBody() data: { id: string }, @ConnectedSocket() client: Socket) {
        const lobby = this.lobbyService.getLobby(data.id);
        if (!lobby || !lobby.open) return false;
        const player = this.playerService.generatePlayer(client.id);
        if (!player) return false;
        if (!lobby.players.includes(client.id)) {
            lobby.players.push(client.id);
            player.lobby = data.id;
        }
        this.lobbyService.saveLobby(lobby);
        this.playerService.savePlayer(player);
        this.notifyLobbyChanges(lobby);
        return client.id;
    }

    handleDisconnect(@ConnectedSocket() client: Socket) {
        console.log('handleDisconnect', client.id);
        const player = this.playerService.getPlayer(client.id);
        if (!player) return;
        const lobby = this.lobbyService.getLobby(player.lobby);
        if (!lobby) return;
        const index = lobby.players.findIndex(s => s === client.id);
        lobby.players.splice(index, 1);
        this.lobbyService.saveLobby(lobby);
        this.playerService.deletePlayer(client.id);
        this.notifyLobbyChanges(lobby);
        return lobby;
    }

    @SubscribeMessage('ready')
    onReady(@MessageBody() ready: boolean, @ConnectedSocket() client: Socket) {
        console.log('onReady', client.id);
        const player = this.playerService.getPlayer(client.id);
        if (!player) return;
        const lobby = this.lobbyService.getLobby(player.lobby);
        if (!lobby) return;
        player.ready = ready;
        this.playerService.savePlayer(player);
        const everyoneReady = this.isEveryoneReady(lobby);
        if (everyoneReady) {
            lobby.open = false;
            this.lobbyService.saveLobby(lobby);
            this.notifyStartGame(lobby);
        } else {
            this.notifyLobbyChanges(lobby);
        }
    }

    @SubscribeMessage('throw dice')
    async onThrowDice(@ConnectedSocket() client: Socket) {
        const player = this.playerService.getPlayer(client.id);
        if (!player) return;
        const match = this.matchService.getMatch(player.lobby);
        if (!match) return;
        await this.matchService.play(match, player);
    }

    private isEveryoneReady(lobby) {
        for (const playerId of lobby.players) {
            const p = this.playerService.getPlayer(playerId);
            if (!p.ready) return false;
        }
        return true;
    }

    private notifyLobbyChanges(l) {
        const lobby = cloneDeep(l);
        let namespace;
        for (let i = 0; i < lobby.players.length; i++) {
            const id = lobby.players[i];
            namespace = (namespace || this.socketService.getServer()).to(id);
            const player = this.playerService.getPlayer(id);
            player.color = this.getPlayerColors(i);
            this.playerService.savePlayer(player);
            lobby.players[i] = player;
        }
        if (!namespace) return;
        namespace.emit('update lobby', lobby);
    }

    private notifyStartGame(_lobby) {
        const lobby = cloneDeep(_lobby);
        const players = lobby.players.map(id => this.playerService.getPlayer(id));
        const match = cloneDeep(this.matchService.generateMatch(...players));
        this.matchService.saveAndBroadcastMatch(match);
    }

    private getPlayerColors(i: number) {
        const colors = [
            'red', 'blue', 'darkorange', 'green', 'blueviolet', 'deepskyblue'
        ];
        return colors[i];
    }

}