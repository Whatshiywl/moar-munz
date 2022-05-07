import type { WinAction, WinPayload } from "@moar-munz/api-interfaces";
import { VictoryState } from "@moar-munz/api-interfaces";
import { MatchService } from "../shared/services/match.service";
import { PlayerService } from "../shared/services/player.service";
import { SocketService } from "../socket/socket.service";
import { Engine, Gear } from "./engine.decorators";

@Engine()
export class WinEngine {

  constructor (
    private playerService: PlayerService,
    private matchService: MatchService,
    private socketService: SocketService
  ) { }

  @Gear('win')
  onWin(action: WinAction, payload: WinPayload) {
    const { matchId } = payload;
    const { playerId } = action.body;
    const winner = this.playerService.getPlayer(playerId);
    if (winner.matchId !== matchId) return;
    console.log(`${winner.name} WINS`);
    const playerOrder = this.matchService.getPlayerOrder(winner.matchId);
    this.socketService.broadcastGlobalMessage(
      playerOrder,
      id => id === winner.id
        ? `You have won!`
        : `${winner.name} has won`
    );
    const lost = playerOrder.filter(Boolean).filter(p => p !== winner.id);
    lost.forEach(id => {
      const player = this.playerService.getPlayer(id);
      this.matchService.setPlayerVictory(player, VictoryState.LOST);
    });
    this.matchService.setPlayerVictory(winner, VictoryState.WON);
    this.matchService.setMatchOver(winner.matchId);
  }
}
