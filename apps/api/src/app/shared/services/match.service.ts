import { Lobby, PlayerState, VictoryState, Match, Player, OwnableTile, RentableTile } from "@moar-munz/api-interfaces";
import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { SocketService } from "../../socket/socket.service";
import { BoardService } from "./board.service";
import { LowDbService } from "./lowdb.service";
import { PlayerService } from "./player.service";
import { Subject } from "rxjs";
import { debounceTime } from 'rxjs/operators';

@Injectable()
export class MatchService implements OnApplicationBootstrap {

  matchBroadcastSubject: Subject<Match>;

  constructor(
    private db: LowDbService,
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
    this.matchBroadcastSubject.next(match);
  }

  removePlayer(lobbyOrder: string[], player: Player) {
    const match = this.getMatch(player.lobby);
    const index = match.playerOrder.findIndex(s => s === player.id);
    if (index < 0) return;
    const playerState = match.playerState[player.id];
    if (match.options.ai) {
      const aiId = lobbyOrder[index];
      match.playerOrder[index] = aiId;
      match.playerState[aiId] = { ...playerState };
      match.board.tiles.forEach(tile => {
        if (tile.owner === player.id) tile.owner = aiId;
      });
    } else {
      if (playerState.turn) this.setNextPlayer(player.lobby);
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

  getPlayerProperties(player: Player) {
    const board = this.getBoard(player.lobby);
    return board.tiles.filter(title => title.owner === player.id) as OwnableTile[];
  }

  private hasHumanPlayers(id: string) {
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
      return match.playerState[id].turn;
    });
    return this.playerService.getPlayer(playerId);
  }

  setNextPlayer(id: string) {
    const playerOrder = this.getPlayerOrder(id);
    const currentPlayer = this.getCurrentPlayer(id);
    this.updatePlayerState(currentPlayer, { turn: false });
    const index = playerOrder.findIndex(id => id === currentPlayer.id);
    const nextPlayer = this.getNextPlayer(id, index);
    this.updatePlayerState(nextPlayer, { turn: true });
    console.log('next player', nextPlayer);
    if (nextPlayer.ai) {
      if (this.hasHumanPlayers(id)) return nextPlayer;
      else console.log('Abord infinite AI match!');
    }
  }

  private getNextPlayer(id: string, index: number) {
    const match = this.getMatch(id);
    while (true) {
      index = (index + 1) % match.playerOrder.length;
      const nextPlayerId = match.playerOrder[index];
      if (!nextPlayerId) continue;
      const nextPlayerState = match.playerState[nextPlayerId];
      if (!nextPlayerState || nextPlayerState.victory === VictoryState.LOST) continue;
      return this.playerService.getPlayer(nextPlayerId);
    }
  }

  setLocked(id: string, locked: boolean) {
    const match = this.getMatch(id);
    match.locked = locked;
    this.saveAndBroadcastMatch(match);
  }

  setLastDice(id: string, dice: [ number, number ]) {
    const match = this.getMatch(id);
    match.lastDice = dice;
    this.saveAndBroadcastMatch(match);
  }

  isPlayable(id: string) {
    const match = this.getMatch(id);
    return match && !match.locked && !match.over;
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

  getPlayerState(player: Player) {
    const match = this.getMatch(player.lobby);
    return match.playerState[player.id];
  }

  move(player: Player, to: number) {
    const match = this.getMatch(player.lobby);
    const playerState = match.playerState[player.id];
    playerState.position = to;
    this.saveAndBroadcastMatch(match);
  }

  removeOwnerFromTile(id: string, tileName: string) {
    const match = this.getMatch(id);
    const tile = match.board.tiles.find(t => t.name === tileName);
    delete tile.owner;
    if (this.boardService.isRentableTile(tile)) {
      tile.level = 0;
      delete tile.currentRent;
    }
    this.saveAndBroadcastMatch(match);
  }

  getTileValue(id: string, tileName: string) {
    const board = this.getBoard(id);
    const tile = board.tiles.find(t => t.name === tileName) as OwnableTile;
    return this.boardService.getTileValue(tile);
  }

  getPlayerMoney(player: Player) {
    const playerState = this.getPlayerState(player);
    return playerState.money;
  }

  addPlayerMoney(player: Player, amount: number) {
    const match = this.getMatch(player.lobby);
    const state = match.playerState[player.id];
    state.money += amount;
    this.saveAndBroadcastMatch(match);
  }

  setPlayerMoney(player: Player, amount: number) {
    const match = this.getMatch(player.lobby);
    const state = match.playerState[player.id];
    state.money = amount;
    this.saveAndBroadcastMatch(match);
  }

  setTileLevel(id: string, tileName: string, level: number) {
    const match = this.getMatch(id);
    const tile = match.board.tiles.find(t => t.name === tileName) as RentableTile;
    tile.level = level;
    this.saveAndBroadcastMatch(match);
  }

  setWorldcup(id: string, tileName: string) {
    const match = this.getMatch(id);
    const tiles = match.board.tiles;
    tiles.forEach(t => {
      t.worldcup = t.name === tileName;
    });
    this.saveAndBroadcastMatch(match);
  }

  setTileOwner(tileName: string, player: Player) {
    const match = this.getMatch(player.lobby);
    const tile = match.board.tiles.find(t => t.name === tileName) as RentableTile;
    tile.owner = player.id;
    this.saveAndBroadcastMatch(match);
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
    const match = this.getMatch(player.lobby);
    const state = match.playerState[player.id];
    state.victory = victory;
    this.saveAndBroadcastMatch(match);
  }

  getPlayerPosition(player: Player) {
    const state = this.getPlayerState(player);
    return state.position;
  }

  getTileWithPlayer(player: Player) {
    const position = this.getPlayerPosition(player);
    const board = this.getBoard(player.lobby);
    return board.tiles[position];
  }

  updatePlayerState(player: Player, updated: Partial<PlayerState>) {
    const match = this.getMatch(player.lobby);
    const state = match.playerState[player.id];
    match.playerState[player.id] = { ...state, ...updated };
    this.saveAndBroadcastMatch(match);
  }

  setMatchOver(id: string) {
    const match = this.getMatch(id);
    match.over = true;
    this.saveAndBroadcastMatch(match);
  }

}
