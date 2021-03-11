import { NgModule } from "@angular/core";

import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@NgModule({
    imports: [
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
    exports: [
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
    ]
})
export class MaterialModule {}
