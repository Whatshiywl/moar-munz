import { Injectable } from "@angular/core";
import { Board, Match, Tile } from "@moar-munz/api-interfaces";
import { Store } from "@ngrx/store";
import copy from "fast-copy";
import { Observable, pipe, Subject } from "rxjs";
import { filter, map } from "rxjs/operators";

@Injectable()
export class MatchService {

  private _match$: Observable<Match>;
  private _match: Match;

  private _matchChange$: Subject<Match>;
  private _tileClicked$: Subject<Tile>;

  constructor(
    private store: Store<{
      match: Match
    }>
  ) {
    this._matchChange$ = new Subject<Match>();
    this._tileClicked$ = new Subject<Tile>();
    const filterCopy = <T>() => pipe<Observable<T>, Observable<T>, Observable<T>>(filter(el => Boolean(el)), map(el => copy(el)));
    this._match$ = this.store.select('match').pipe(filterCopy());
    this._match$.subscribe(match => {
      // console.log('match', match);
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
