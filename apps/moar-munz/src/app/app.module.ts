import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { RoutingModule } from './routing.module';
import { MaterialModule } from './material.module';
import { HomeModule } from './home/home.module';

import { AppComponent } from './app.component';
import { SessionGuard } from './shared/guards/session.guard';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RoutingModule,
    HomeModule,
    MaterialModule
  ],
  providers: [
    SessionGuard
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
