import { Injectable } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { SocketService } from '../socket/socket.service';
import { Action } from '@ngrx/store';

export class SocketEffects<T> {

  updateSubject$ = new Subject<T>();

  loadPayload$: Observable<{ type: string, payload: T }>;

  constructor(
    private eventName: string,
    private actionType: Action,
    private socket: SocketService
  ) {
    this.loadPayload$ = createEffect(() => this.updateSubject$.asObservable()
    .pipe(
      map(payload => ({
        type: this.actionType.type,
        payload
      }))
    ));
    this.socket.on(this.eventName, (payload: T) => {
      console.log(`Socket event ${this.eventName} caught on effect`);
      this.updateSubject$.next(payload);
    });
  }
}
