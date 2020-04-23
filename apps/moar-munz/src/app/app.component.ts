import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Message } from '@moar-munz/api-interfaces';

@Component({
  selector: 'moar-munz-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  hello$ = this.http.get<Message>('/api/v1/hello');
  constructor(private http: HttpClient) {}

}
