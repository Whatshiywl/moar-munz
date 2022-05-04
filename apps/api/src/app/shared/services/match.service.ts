import { PlayerState, VictoryState, Match, Player, OwnableTile, RentableTile, MatchOptions, MatchState } from "@moar-munz/api-interfaces";
import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { SocketService } from "../../socket/socket.service";
import { BoardService } from "./board.service";
import { LowDbService } from "../../lowdb/lowdb.service";
import { PlayerService } from "./player.service";
import { Subject } from "rxjs";
import { debounceTime } from 'rxjs/operators';
import { UUIDService } from "./uuid.service";

@Injectable()
export class MatchService implements OnApplicationBootstrap {

  matchBroadcastSubject: Subject<Match>;

  constructor(
    private db: LowDbService,
    private uuidService: UUIDService,
    private playerService: PlayerService,
    private socketService: SocketService,
    private boardService: BoardService,
  ) { }

  onApplicationBootstrap() {
    this.matchBroadcastSubject = new Subject<Match>();
    this.matchBroadcastSubject.pipe(
      debounceTime(100)
    ).subscribe(match => {
      this.boardService.postProcessBoard(match.board);
      const players = match.playerOrder;
      this.socketService.emit('match', match, players);
    });
  }

  generateMatch(options: MatchOptions) {
    const id = this.uuidService.generateUUID();
    const board = this.boardService.getBoard(options.board);
    const match: Match = {
      id,
      playerOrder: [ ],
      open: true,
      turn: 0,
      lastDice: [ 1, 1 ],
      options,
      board,
      locked: false,
      state: MatchState.LOBBY
    };
    this.db.createMatch(match);
    this.saveAndBroadcast(match);
    return match;
  }

  initMatch(match: Match) {
    const firstPlayerId = match.playerOrder[0];
    if (!firstPlayerId) return;
    this.playerService.setTurn(firstPlayerId, true);
    match.open = false;
    match.state = MatchState.IDLE;
    this.saveAndBroadcast(match);
  }

  getAllMatches() {
    return this.db.readAllMatches();
  }

  getMatch(id: string) {
    return this.db.readMatch(id);
  }

  saveMatch(match: Match) {
    this.db.updateMatch(match);
  }

  saveAndBroadcast(match: Match) {
    this.saveMatch(match);
    this.broadcastMatchState(match);
  }

  broadcastMatchState(match: Match) {
    this.matchBroadcastSubject.next(match);
  }

  removePlayer(lobbyOrder: string[], player: Player) {
    const match = this.getMatch(player.matchId);
    const index = match.playerOrder.findIndex(s => s === player.id);
    if (index < 0) return;
    const playerState = player.state;
    if (match.options.ai) {
      const aiId = lobbyOrder[index];
      match.playerOrder[index] = aiId;
      this.playerService.setState(aiId, playerState);
      match.board.tiles.forEach(tile => {
        if (tile.owner === player.id) tile.owner = aiId;
      });
    } else {
      if (playerState.turn) this.computeNextPlayer(player.matchId);
      match.playerOrder[index] = undefined;
      match.board.tiles.forEach(tile => {
        if (tile.owner === player.id) {
          tile.owner = undefined;
          if (this.boardService.isRentableTile(tile)) tile.level = 0;
        }
      });
    }
    this.saveAndBroadcast(match);
  }

  delete(id: string) {
    return this.db.deleteMatch(id);
  }

  getPlayerProperties(player: Player) {
    const board = this.getBoard(player.matchId);
    return board.tiles.filter(title => title.owner === player.id) as OwnableTile[];
  }

  hasHumanPlayers(id: string) {
    const playerOrder = this.getPlayerOrder(id);
    for (const playerId of playerOrder) {
      const player = this.playerService.getPlayer(playerId);
      if (!player.ai) return true;
    }
    return false;
  }

  private getCurrentPlayer(id: string) {
    const match = this.getMatch(id);
    const playerId = match.playerOrder.find(id => {
      return this.playerService.getState(id).turn;
    });
    return this.playerService.getPlayer(playerId);
  }

  computeNextPlayer(id: string) {
    const playerOrder = this.getPlayerOrder(id);
    const currentPlayer = this.getCurrentPlayer(id);
    this.playerService.updateState(currentPlayer.id, { turn: false });
    const index = playerOrder.findIndex(id => id === currentPlayer.id);
    const nextPlayer = this.getNextPlayer(id, index);
    this.playerService.updateState(nextPlayer.id, { turn: true });
    console.log('next player', nextPlayer);
    return nextPlayer;
  }

  private getNextPlayer(id: string, index: number) {
    const match = this.getMatch(id);
    while (true) {
      index = (index + 1) % match.playerOrder.length;
      const nextPlayerId = match.playerOrder[index];
      if (!nextPlayerId) continue;
      const nextPlayerState = this.playerService.getState(nextPlayerId);
      if (!nextPlayerState || nextPlayerState.victory === VictoryState.LOST) continue;
      return this.playerService.getPlayer(nextPlayerId);
    }
  }

  lock(id: string) {
    this.setLocked(id, true);
  }

  unlock(id: string) {
    this.setLocked(id, false);
  }

  private setLocked(id: string, locked: boolean) {
    const match = this.getMatch(id);
    match.locked = locked;
    this.saveAndBroadcast(match);
  }

  setLastDice(id: string, dice: [ number, number ]) {
    const match = this.getMatch(id);
    match.lastDice = dice;
    this.socketService.emit('dice roll', dice, match.playerOrder);
    this.saveAndBroadcast(match);
  }

  isPlayable(id: string) {
    const match = this.getMatch(id);
    return match && !match.locked && ![ MatchState.LOBBY, MatchState.OVER ].includes(match.state);
  }

  getLastDice(id: string) {
    const match = this.getMatch(id);
    return match.lastDice;
  }

  getBoard(id: string) {
    const match = this.getMatch(id);
    return match.board;
  }

  getBoardSize(id: string) {
    const board = this.getBoard(id);
    return board.tiles.length;
  }

  getState(matchId: string) {
    const match = this.getMatch(matchId);
    if (!match) return;
    return match.state;
  }

  setState(matchId: string, state: MatchState) {
    const match = this.getMatch(matchId);
    match.state = state;
    this.saveAndBroadcast(match);
  }

  move(player: Player, to: number) {
    const match = this.getMatch(player.matchId);
    const playerState = player.state;
    playerState.position = to;
    this.saveAndBroadcast(match);
  }

  removeOwnerFromTile(id: string, tileName: string) {
    const match = this.getMatch(id);
    const tile = match.board.tiles.find(t => t.name === tileName);
    delete tile.owner;
    if (this.boardService.isRentableTile(tile)) {
      tile.level = 0;
      delete tile.currentRent;
    }
    this.saveAndBroadcast(match);
  }

  getTileValue(id: string, tileName: string) {
    const board = this.getBoard(id);
    const tile = board.tiles.find(t => t.name === tileName) as OwnableTile;
    return this.boardService.getTileValue(tile);
  }

  addPlayerMoney(player: Player, amount: number) {
    const match = this.getMatch(player.matchId);
    const state = player.state;
    state.money += +amount;
    this.saveAndBroadcast(match);
  }

  setTileLevel(id: string, tileName: string, level: number) {
    const match = this.getMatch(id);
    const tile = match.board.tiles.find(t => t.name === tileName) as RentableTile;
    tile.level = level;
    this.saveAndBroadcast(match);
  }

  setWorldcup(id: string, tileName: string) {
    const match = this.getMatch(id);
    const tiles = match.board.tiles;
    tiles.forEach(t => {
      t.worldcup = t.name === tileName;
    });
    this.saveAndBroadcast(match);
  }

  setTileOwner(tileName: string, player: Player) {
    const match = this.getMatch(player.matchId);
    const tile = match.board.tiles.find(t => t.name === tileName) as RentableTile;
    tile.owner = player.id;
    this.saveAndBroadcast(match);
  }

  getTileAtPosition(id: string, position: number) {
    const board = this.getBoard(id);
    return board.tiles[position];
  }

  getPlayerOrder(id: string) {
    const match = this.getMatch(id);
    return match.playerOrder;
  }

  setPlayerVictory(player: Player, victory: VictoryState) {
    const match = this.getMatch(player.matchId);
    const state = player.state;
    state.victory = victory;
    this.saveAndBroadcast(match);
  }

  getTileWithPlayer(player: Player) {
    const position = player.state.position;
    const board = this.getBoard(player.matchId);
    return board.tiles[position];
  }

  setMatchOver(id: string) {
    const match = this.getMatch(id);
    match.state = MatchState.OVER;
    this.saveAndBroadcast(match);
  }

}
