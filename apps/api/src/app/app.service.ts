import { Match, MatchState } from '@moar-munz/api-interfaces';
import { Injectable } from '@nestjs/common';
import { MatchService } from './shared/services/match.service';
import { PlayerService } from './shared/services/player.service';

@Injectable()
export class AppService {

  private readonly cleanupTTL = 1 * 60 * 1000;

  constructor(
    private matchService: MatchService,
    private playerService: PlayerService
  ) { }

  getData() {
    return { message: 'Welcome to api!' };
  }

  cleanupStale() {
    const now = Date.now();
    const matches = this.matchService.getAllMatches();
    for (const matchId in matches) {
      const match = matches[matchId] as Match;
      const age = now - (match as any).mtime;
      if (age < this.cleanupTTL) return;

      const activePlayers = this.playerService.getPlayersByMatchId(matchId);
      const nonAiPlayers = activePlayers.filter(player => !player.ai);

      if (match.state === MatchState.OVER || !nonAiPlayers.length) {
        for (const { id: playerId } of activePlayers) {
          this.playerService.delete(playerId);
        }
        this.matchService.delete(matchId);
      }
    };
  }
}
