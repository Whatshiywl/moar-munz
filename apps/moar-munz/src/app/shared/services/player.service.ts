import { Injectable } from "@angular/core";
import { Match, Player, PlayerState } from "@moar-munz/api-interfaces";
import { Observable, Subject } from "rxjs";
import { filter, map, mergeMap, tap } from 'rxjs/operators';
import copy from 'fast-copy';
import { SocketService } from "../socket/socket.service";
import { HttpClient } from "@angular/common/http";

@Injectable()
export class PlayerService {
  readonly uuid: string;

  private match$: Observable<Match>;

  private _playerOrder: string[];
  private _playerState: { [id: string]: PlayerState };
  private _playerMap: { [id: string]: Player; };

  private _players: Player[];
  private _player: Player;

  private _playerTurnId: string;
  private _playerTurn: Player;
  private _isMyTurn: boolean;

  private _playerChange$: Subject<Player[]>;

  constructor(
    private socket: SocketService,
    private http: HttpClient
  ) {
    this.uuid = sessionStorage.getItem('uuid');
    this._playerChange$ = new Subject<Player[]>();
    this.match$ = this.socket.onMatch$.pipe(
      filter(el => Boolean(el)),
      map(({ payload: match }) => copy(match))
    );

    this.match$.pipe(
      tap(match => {
        this._playerOrder = match.playerOrder;
      }),
      mergeMap(match => this.fetchPlayers(match.id)),
    ).subscribe(players => {
      const playerState: { [id: string]: PlayerState } = { };
      const playerMap: { [id: string]: Player } = { };
      players.forEach(player => {
        playerMap[player.id] = player;
        const { state } = player;
        playerState[player.id] = state;
        if (state.turn) {
          this._playerTurnId = player.id;
          this._isMyTurn = player.id === this.uuid;
        }
      });
      this._playerState = playerState;
      this._playerMap = playerMap;
      this.updatePlayers();
    });
  }

  get playerOrder() { return this._playerOrder }
  get playerStates() { return this._playerState }
  get playerMap() { return this._playerMap }

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

  public getPlayer(id: string) {
    if (!this.playerMap) return;
    return this.playerMap[id];
  }

  public getPlayers(): Player[] {
    return this._playerOrder.filter(Boolean).map(playerId => {
      return this._playerMap[playerId];
    });
  }

  private fetchPlayers(matchId: string) {
    return this.http.get<Player[]>(`/api/v1/players?matchId=${matchId}`);
  }

}
