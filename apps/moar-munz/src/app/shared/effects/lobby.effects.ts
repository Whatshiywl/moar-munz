import { Injectable } from '@angular/core';
import { SocketService } from '../socket/socket.service';
import { Lobby } from '@moar-munz/api-interfaces';
import { create } from '../actions/lobby.actions';
import { SocketEffects } from './socket.effects';

@Injectable()
export class LobbyEffects extends SocketEffects<Lobby> {
  constructor(socket: SocketService) {
    super('update lobby', create, socket);
  }
}
