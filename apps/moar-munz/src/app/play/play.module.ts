import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';

import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { lobbyReducer } from '../shared/reducers/lobby.reducer';
import { matchReducer } from '../shared/reducers/match.reducer';
import { LobbyEffects } from '../shared/effects/lobby.effects';
import { MatchEffects } from '../shared/effects/match.effects';

import { PlayComponent } from '../play/play.component';
import { ChatComponent } from '../chat/chat.component';
import { TileComponent } from '../tile/tile.component';
import { SocketService } from '../shared/socket/socket.service';
import { LightenPipe } from '../shared/pipes/lighten.pipe';
import { MaterialModule } from '../material.module';
import { PlayerService } from '../shared/services/player.service';
import { LobbyComponent } from '../lobby/lobby.component';
import { LobbyService } from '../shared/services/lobby.service';

const config: SocketIoConfig = { url: window.location.origin, options: { autoConnect: false } };

@NgModule({
  declarations: [
    PlayComponent,
    TileComponent,
    ChatComponent,
    LobbyComponent,
    LightenPipe,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([{ path: '', component: PlayComponent }]),
    SocketIoModule,
    ReactiveFormsModule,
    StoreModule.forRoot({
      lobby: lobbyReducer,
      match: matchReducer
    }),
    EffectsModule.forRoot([
      LobbyEffects,
      MatchEffects
    ]),
    MaterialModule
  ],
  providers: [
    SocketService,
    PlayerService,
    LobbyService
  ],
  exports: [ PlayComponent ]
})
export class PlayModule {}
