import { Lobby, PlayerState, VictoryState, Match, Player, OwnableTile } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { SocketService } from "../../socket/socket.service";
import { BoardService } from "./board.service";
import { LowDbService } from "./lowdb.service";
import { PlayerService } from "./player.service";

@Injectable()
export class MatchService {

  constructor(
    private db: LowDbService,
    private playerService: PlayerService,
    private socketService: SocketService,
    private boardService: BoardService
  ) { }

  generateMatch(lobby: Lobby) {
    const id = lobby.id;
    const playerOrder = [ ...lobby.playerOrder ];
    const options = { ...lobby.options };
    const playerState: {
      [id: string]: PlayerState;
    } = { };
    playerOrder.filter(Boolean).forEach((playerId, i) => {
      playerState[playerId] = {
        position: 0,
        money: 2000,
        victory: VictoryState.UNDEFINED,
        playAgain: false,
        prison: 0,
        equalDie: 0,
        turn: i === 0
      };
    });
    const board = this.boardService.getBoard(lobby.options.board);
    const match: Match = {
      id,
      turn: 0,
      lastDice: [ 1, 1 ],
      playerOrder,
      playerState,
      options,
      board,
      locked: false,
      over: false
    };
    this.db.createMatch(match);
    this.saveAndBroadcastMatch(match);
  }

  getMatch(id: string) {
    return this.db.readMatch(id);
  }

  saveMatch(match: Match) {
    this.db.updateMatch(match);
  }

  saveAndBroadcastMatch(match: Match) {
    this.saveMatch(match);
    this.broadcastMatchState(match);
  }

  private broadcastMatchState(match: Match) {
    this.boardService.postProcessBoard(match.board);
    const players = match.playerOrder;
    this.socketService.emit('match', match, players);
  }

  async removePlayer(lobby: Lobby, match: Match, player: Player) {
    const index = match.playerOrder.findIndex(s => s === player.id);
    if (index < 0) return;
    const playerState = match.playerState[player.id];
    if (match.options.ai) {
      const aiId = lobby.playerOrder[index];
      match.playerOrder[index] = aiId;
      match.playerState[aiId] = { ...playerState };
      match.board.tiles.forEach(tile => {
        if (tile.owner === player.id) tile.owner = aiId;
      });
    } else {
      if (playerState.turn) await this.setNextPlayer(match, player);
      match.playerOrder[index] = undefined;
      match.board.tiles.forEach(tile => {
        if (tile.owner === player.id) {
          tile.owner = undefined;
          if (this.boardService.isRentableTile(tile)) tile.level = 0;
        }
      });
    }
    delete match.playerState[player.id];
    this.saveAndBroadcastMatch(match);
  }

  getPlayerProperties(match: Match, player: Player) {
    return match.board.tiles.filter(title => title.owner === player.id) as OwnableTile[];
  }

  async setNextPlayer(match: Match, player: Player) {
    const playerState = match.playerState[player.id];
    playerState.turn = false;
    const index = match.playerOrder.findIndex(id => id === player.id);
    const next = this.getNextPlayer(match, index);
    next.state.turn = true;
    const nextPlayer = this.playerService.getPlayer(next.id);
    console.log('next player', nextPlayer);
    if (nextPlayer.ai) {
      const players = match.playerOrder.map(p => this.playerService.getPlayer(p));
      const humanPlayers = players.filter(p => !p.ai);
      if (humanPlayers.length === 0) return console.log('Abord infinite AI match!');
      else return nextPlayer;
    }
  }

  getNextPlayer(match: Match, index: number) {
    while (true) {
      index = (index + 1) % match.playerOrder.length;
      const nextPlayerId = match.playerOrder[index];
      if (!nextPlayerId) continue;
      const nextPlayerState = match.playerState[nextPlayerId];
      if (!nextPlayerState || nextPlayerState.victory === VictoryState.LOST) continue;
      return { id: nextPlayerId, state: nextPlayerState };
    }
  }
}
