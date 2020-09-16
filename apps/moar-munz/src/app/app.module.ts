import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';

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

const config: SocketIoConfig = { url: window.location.origin, options: { autoConnect: false } };

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    PlayComponent,
    LightenPipe
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    RoutingModule,
    SocketIoModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatCardModule,
    MatListModule,
    MatDividerModule,
    MatIconModule,
    MatSlideToggleModule
  ],
  providers: [
    SocketService,
    SessionGuard
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
