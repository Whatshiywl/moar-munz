import { Injectable } from "@angular/core";
import { Lobby, Match } from "@moar-munz/api-interfaces";
import { Store } from "@ngrx/store";
import copy from "fast-copy";
import { Observable, pipe, Subject } from "rxjs";
import { filter, map } from "rxjs/operators";

@Injectable()
export class LobbyService {

  private _lobby$: Observable<Lobby>;
  private _lobby: Lobby;

  constructor(
    private store: Store<{
      lobby: Lobby
    }>
  ) {
    const filterCopy = <T>() => pipe<Observable<T>, Observable<T>, Observable<T>>(filter(el => Boolean(el)), map(el => copy(el)));
    this._lobby$ = this.store.select('lobby').pipe(filterCopy());
    this._lobby$.subscribe(lobby => {
      console.log('lobby', lobby);
      this._lobby = lobby;
    });
  }

  get lobby() { return this._lobby; }

}
