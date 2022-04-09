import { Injectable } from '@nestjs/common';
import { PlayerService } from '../shared/services/player.service';
import { Match, Player } from '@moar-munz/api-interfaces';
import { MatchService } from '../shared/services/match.service';
import { EngineService } from '../engine/engine.service';

@Injectable()
export class LobbyService {

    constructor(
        private playerService: PlayerService,
        private matchService: MatchService,
        private engineService: EngineService
    ) { }

    async removePlayer(match: Match, player: Player, replace: boolean) {
        if (!match.playerOrder.find(id => id === player.id)) return;
        replace = replace && match.options.ai;
        let aiPlayer: Player;
        if (replace) {
            aiPlayer = this.addAI(match, player);
        } else {
            this.deletePlayer(match, player);
        }
        this.matchService.removePlayer(match.playerOrder, player);
        this.playerService.deletePlayer(player.id);
        if (aiPlayer) await this.engineService.play(aiPlayer.id);
    }

    private deletePlayer(match: Match, player: Player) {
        const order = match.playerOrder.findIndex(id => id === player.id);
        match.playerOrder[order] = undefined;
        this.saveAndBroadcastLobby(match);
    }

    addAI(match: Match, replace?: Player) {
        const ai = this.playerService.getOrGenPlayerByToken(undefined, match, true);
        if (replace) {
            ai.player.name = `${replace.name} (AI)`;
            this.playerService.savePlayer(ai.player);
            this.replacePlayer(match, replace, ai.player);
        } else {
            this.addPlayerAtFirstFreeSpot(match, ai.player);
        }
        this.saveAndBroadcastLobby(match);
        if (!replace) {
            const order = match.playerOrder.findIndex(id => id === ai.player.id);
            this.onPlayerReady(match, match.playerOrder[order], true);
        }
        return ai.player;
    }

    onEnterLobby(match: Match, token: string) {
        if (!match.open) return false;
        const playerData = this.playerService.getOrGenPlayerByToken(token, match, false);
        const player = playerData.player;
        token = playerData.token;
        if (!player) return false;
        this.addPlayerAtFirstFreeSpot(match, player);
        this.saveAndBroadcastLobby(match);
        return playerData;
    }

    private replacePlayer(match: Match, from: Player, to: Player) {
        const order = match.playerOrder.findIndex(id => id === from.id);
        match.playerOrder[order] = to.id;

    }

    private addPlayerAtFirstFreeSpot(match: Match, player: Player) {
        if (!match.playerOrder.includes(player.id)) {
            const order = this.getFirstFreeSpot(match);
            match.playerOrder[order] = player.id;
            const color = this.getPlayerColor(order);
            player.color = color;
            this.playerService.savePlayer(player);
        }
    }

    private getFirstFreeSpot(match: Match) {
        for (let i = 0; i <= match.playerOrder.length; i++) {
            if (!match.playerOrder[i]) {
                return i;
            }
        }
    }

    onPlayerReady(match: Match, player: string | Player, ready: boolean) {
        if (typeof player === 'string') player = this.playerService.getPlayer(player);
        player.ready = ready;
        this.playerService.savePlayer(player);
        const everyoneReady = this.isEveryoneReady(match);
        console.log(`Everyone ready? ${everyoneReady}`);
        if (everyoneReady) {
            this.matchService.initMatch(match);
        } else {
            this.notifyLobbyChanges(match);
        }
    }

    private isEveryoneReady(match: Match) {
        for (const playerId of match.playerOrder.filter(Boolean)) {
            const player = this.playerService.getPlayer(playerId);
            if (!player.ready) return false;
        }
        return true;
    }

    private saveAndBroadcastLobby(match: Match) {
        this.matchService.saveAndBroadcastMatch(match);
    }

    private notifyLobbyChanges(match: Match) {
        this.matchService.broadcastMatchState(match);
    }

    private getPlayerColor(i: number) {
        const colors = [
            'red', 'blue', 'darkorange', 'green', 'blueviolet', 'deepskyblue'
        ];
        return colors[i];
    }

}
