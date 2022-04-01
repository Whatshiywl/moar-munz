import { Injectable } from "@angular/core";
import { Lobby } from "@moar-munz/api-interfaces";
import copy from "fast-copy";
import { Observable } from "rxjs";
import { filter, map } from "rxjs/operators";
import { SocketService } from "../socket/socket.service";

@Injectable()
export class LobbyService {

  private _lobby$: Observable<Lobby>;
  private _lobby: Lobby;

  constructor(
    private socket: SocketService
  ) {
    this._lobby$ = this.socket.onLobby$.pipe(
      filter(el => Boolean(el)),
      map(({ payload: lobby }) => copy(lobby))
    );
    this._lobby$.subscribe(lobby => {
      console.log('lobby', lobby);
      this._lobby = lobby;
    });
  }

  get lobby() { return this._lobby; }

}
