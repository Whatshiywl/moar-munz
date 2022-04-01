import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SocketIoModule } from 'ngx-socket-io';

import { PlayComponent } from '../play/play.component';
import { ChatComponent } from '../chat/chat.component';
import { TileComponent } from '../tile/tile.component';
import { SocketService } from '../shared/socket/socket.service';
import { LightenPipe } from '../shared/pipes/lighten.pipe';
import { MaterialModule } from '../material.module';
import { PlayerService } from '../shared/services/player.service';
import { LobbyComponent } from '../lobby/lobby.component';
import { LobbyService } from '../shared/services/lobby.service';
import { MatchService } from '../shared/services/match.service';
import { PromptComponent } from '../prompt/prompt.component';
import { PromptService } from '../shared/services/prompt.service';
import { TradeComponent } from '../trade/trade.component';
import { TradeService } from '../shared/services/trade.service';
import { DebounceClickDirective } from '../shared/directives/debounceclick.directive';

@NgModule({
  declarations: [
    PlayComponent,
    TileComponent,
    ChatComponent,
    LobbyComponent,
    PromptComponent,
    TradeComponent,
    LightenPipe,
    DebounceClickDirective
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([{ path: '', component: PlayComponent }]),
    SocketIoModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule
  ],
  providers: [
    SocketService,
    PlayerService,
    LobbyService,
    MatchService,
    PromptService,
    TradeService
  ],
  exports: [ PlayComponent ]
})
export class PlayModule {}
