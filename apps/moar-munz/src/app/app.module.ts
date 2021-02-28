import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';

import { StoreModule } from '@ngrx/store';
import { lobbyReducer } from './shared/reducers/lobby.reducer';

import { EffectsModule } from '@ngrx/effects';

import { AppComponent } from './app.component';
import { RoutingModule } from './routing.module';
import { PlayComponent } from './play/play.component';
import { HomeComponent } from './home/home.component';
import { SocketService } from './shared/socket/socket.service';
import { LightenPipe } from './shared/pipes/lighten.pipe';
import { SessionGuard } from './shared/guards/session.guard';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TileComponent } from './tile/tile.component';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ChatComponent } from './chat/chat.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { LobbyEffects } from './shared/effects/lobby.effects';
import { matchReducer } from './shared/reducers/match.reducer';
import { MatchEffects } from './shared/effects/match.effects';
import { SocketEffects } from './shared/effects/socket.effects';

const config: SocketIoConfig = { url: window.location.origin, options: { autoConnect: false } };

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    PlayComponent,
    TileComponent,
    ChatComponent,
    LightenPipe
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    RoutingModule,
    SocketIoModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    StoreModule.forRoot({
      lobby: lobbyReducer,
      match: matchReducer
    }),
    EffectsModule.forRoot([
      LobbyEffects,
      MatchEffects
    ]),
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatCardModule,
    MatListModule,
    MatDividerModule,
    MatIconModule,
    MatSlideToggleModule,
    MatToolbarModule,
    MatGridListModule,
    MatSidenavModule,
    MatTabsModule,
    MatInputModule,
    MatFormFieldModule
  ],
  providers: [
    SocketService,
    SessionGuard
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
