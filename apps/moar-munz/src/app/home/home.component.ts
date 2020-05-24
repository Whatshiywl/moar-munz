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
    const lobbyResponse = await this.http.post<{ id: string }>('/api/v1/lobby', undefined).toPromise();
    this.router.navigate([ `/play/${lobbyResponse.id}` ]);
  }

}
