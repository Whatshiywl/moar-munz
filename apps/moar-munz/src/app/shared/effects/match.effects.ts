import { Injectable } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { SocketService } from '../socket/socket.service';
import { Match } from '@moar-munz/api-interfaces';
import { create } from '../actions/match.actions';

@Injectable()
export class MatchEffects {

  updateSubject$ = new Subject<Match>();

  loadMatch$ = createEffect(() => this.updateSubject$.asObservable().pipe(
    map(match => ({ type: create.type, payload: match }))
  ));

  constructor(
    private socket: SocketService
  ) {
    this.socket.on('match', (match: Match) => {
      this.updateSubject$.next(match);
    });
  }
}
