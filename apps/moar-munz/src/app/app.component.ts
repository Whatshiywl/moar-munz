import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

@Component({
  selector: 'moar-munz-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  version$ = this.http.get<{ version: string }>('/api/v1/version').pipe(map(r => r.version));

  constructor(private http: HttpClient) {}

}
