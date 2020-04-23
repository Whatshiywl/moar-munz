import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'moar-munz-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  constructor(
    private http: HttpClient,
    private router: Router
    ) {}

  async createNewGame() {
    //http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    const response = await this.http.get<{uuid: string}>('/api/v1/uuid').toPromise();
    this.router.navigate([ `/play/${response.uuid}` ]);
  }

}
