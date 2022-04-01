import { Injectable } from "@angular/core";
import { Lobby, LobbyState, Match, Player, PlayerState, PlayerComplete } from "@moar-munz/api-interfaces";
import { Observable, Subject } from "rxjs";
import { filter, map } from 'rxjs/operators';
import copy from 'fast-copy';
import { SocketService } from "../socket/socket.service";

@Injectable()
export class PlayerService {
  readonly uuid: string;

  private lobby$: Observable<Lobby>;
  private match$: Observable<Match>;

  private _playerOrder: string[];
  private _playerState: { [id: string]: PlayerState };
  private _lobbyPlayers: { [id: string]: Player & LobbyState; };

  private _players: PlayerComplete[];
  private _player: PlayerComplete;

  private _playerTurnId: string;
  private _playerTurn: PlayerComplete;
  private _isMyTurn: boolean;

  private _playerChange$: Subject<PlayerComplete[]>;

  constructor(
    private socket: SocketService
  ) {
    this.uuid = sessionStorage.getItem('uuid');
    this._playerChange$ = new Subject<PlayerComplete[]>();
    this.lobby$ = this.socket.onLobby$.pipe(
      filter(el => Boolean(el)),
      map(({ payload: lobby }) => copy(lobby))
    );
    this.match$ = this.socket.onMatch$.pipe(
      filter(el => Boolean(el)),
      map(({ payload: match }) => copy(match))
    );

    this.lobby$.subscribe(lobby => {
      this._playerOrder = lobby.playerOrder;
      this._lobbyPlayers = lobby.players;
    });

    this.match$.subscribe(match => {
      this._playerState = match.playerState;
      this._playerTurnId = Object.keys(match.playerState).find(playerId => {
        const playerState = match.playerState[playerId];
        return playerState.turn;
      });
      this._isMyTurn = this._playerTurnId === this.uuid;
      this.updatePlayers();
    });
  }

  get playerOrder() { return this._playerOrder }
  get playerStates() { return this._playerState }
  get lobbyPlayers() { return this._lobbyPlayers }

  get players() { return this._players }
  get player() { return this._player }

  get first() { return this._playerOrder ? this.uuid === this._playerOrder[0] : false }
  get playerTurnId() { return this._playerTurnId }
  get playerTurn() { return this._playerTurn }
  get isMyTurn() { return this._isMyTurn }

  get playerChange$() { return this._playerChange$ };

  private updatePlayers() {
    this._players = this.getPlayers();
    this._player = this._players.find(p => p.id === this.uuid);
    this._playerTurn = this._players.find(p => p.id === this._playerTurnId);
    setTimeout(() => {
      this._playerChange$.next(this._players);
    }, 0);
  }

  public getPlayers(): PlayerComplete[] {
    return this._playerOrder.filter(Boolean).map(playerId => {
      const matchPlayer = this._playerState[playerId];
      const lobbyPlayer = this._lobbyPlayers[playerId];
      return { ...matchPlayer, ...lobbyPlayer };
    });
  }

}
