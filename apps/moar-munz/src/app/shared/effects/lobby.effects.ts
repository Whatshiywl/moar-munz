import { Injectable } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { SocketService } from '../socket/socket.service';
import { Lobby } from '@moar-munz/api-interfaces';
import { create } from '../actions/lobby.actions';

@Injectable()
export class LobbyEffects {

  updateSubject$ = new Subject<Lobby>();

  loadLobby$ = createEffect(() => this.updateSubject$.asObservable().pipe(
    map(lobby => ({ type: create.type, payload: lobby }))
  ));

  constructor(
    private socket: SocketService
  ) {
    this.socket.on('update lobby', (lobby: Lobby) => {
      this.updateSubject$.next(lobby);
    });
  }
}
