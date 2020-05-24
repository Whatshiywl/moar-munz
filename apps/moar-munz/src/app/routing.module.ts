import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router'; // CLI imports router
import { PlayComponent } from './play/play.component';
import { HomeComponent } from './home/home.component';
import { SessionGuard } from './shared/guards/session.guard';

const routes: Routes = [
  { path: 'play/:id', component: PlayComponent, canActivate: [ SessionGuard ] },
  { path: '', component: HomeComponent },
  { path: '**', redirectTo: '' }
]; // sets up routes constant where you define your routes

// configures NgModule imports and exports
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class RoutingModule { }