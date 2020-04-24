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
    ReactiveFormsModule
  ],
  providers: [
    SocketService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
