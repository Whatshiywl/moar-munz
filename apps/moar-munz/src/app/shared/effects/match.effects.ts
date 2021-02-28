import { Injectable } from '@angular/core';
import { SocketService } from '../socket/socket.service';
import { Match } from '@moar-munz/api-interfaces';
import { create } from '../actions/match.actions';
import { SocketEffects } from './socket.effects';

@Injectable()
export class MatchEffects extends SocketEffects<Match> {
  constructor(socket: SocketService) {
    super('match', create, socket);
  }
}
