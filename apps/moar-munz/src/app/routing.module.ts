import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { SessionGuard } from './shared/guards/session.guard';

const routes: Routes = [
  {
    path: 'play/:id',
    loadChildren: () => import('./play/play.module').then(m => m.PlayModule),
    canActivate: [ SessionGuard ]
  },
  { path: '', component: HomeComponent, canActivate: [ SessionGuard ] },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule]
})
export class RoutingModule { }
