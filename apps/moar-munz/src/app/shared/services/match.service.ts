import { Injectable } from "@angular/core";
import { Board, Match, Tile } from "@moar-munz/api-interfaces";
import copy from "fast-copy";
import { Observable, Subject } from "rxjs";
import { filter, map } from "rxjs/operators";
import { SocketService } from "../socket/socket.service";

@Injectable()
export class MatchService {

  private _match$: Observable<Match>;
  private _match: Match;

  private _matchChange$: Subject<Match>;
  private _tileClicked$: Subject<Tile>;

  constructor(
    private socket: SocketService
  ) {
    this._matchChange$ = new Subject<Match>();
    this._tileClicked$ = new Subject<Tile>();
    this._match$ = this.socket.onMatch$.pipe(
      filter(el => Boolean(el)),
      map(({ payload: match }) => copy(match))
    );
    this._match$.subscribe(match => {
      this.updateMatch(match);
      setTimeout(() => {
        this._matchChange$.next(match);
      }, 0);
    });
  }

  get match() { return this._match; }
  get matchChange$() { return this._matchChange$; }
  get tileClicked$() { return this._tileClicked$; }

  clickTile(tile: Tile) {
    this._tileClicked$.next(tile);
  }

  private updateMatch(match: Match) {
    if (!this._match) return this._match = match;
    else this.updateBoard(match.board);
    const keys: (keyof Match)[] = [
      'turn', 'lastDice', 'playerState', 'locked', 'over'
    ];
    keys.forEach(key => (this._match[key] as any) = match[key]);
  }

  private updateBoard(board: Board) {
    board.tiles.forEach((tile, i) => {
      const oldTile = this._match.board.tiles[i];
      for (const key in oldTile) {
        delete oldTile[key];
      }
      for (const key in tile) {
        const value = tile[key];
        oldTile[key] = value;
      }
    });
  }

}
