import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../material.module';

import { HomeComponent } from '../home/home.component';

@NgModule({
  declarations: [
    HomeComponent
  ],
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MaterialModule
  ],
  providers: [ ],
  exports: [ HomeComponent ]
})
export class HomeModule {}
