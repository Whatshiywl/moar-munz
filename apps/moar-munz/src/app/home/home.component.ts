import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'moar-munz-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  matchOptions: FormGroup;
  boards: string[] = [ ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.matchOptions = this.fb.group({
      board: this.fb.control(''),
      ai: this.fb.control(false)
    });
  }
  
  async ngOnInit() {
    const boards = await this.http.get<string[]>('/api/v1/boards').toPromise();
    this.boards = boards;
    this.matchOptions.controls['board'].setValue(boards[0]);
  }

  async createNewGame() {
    const options = this.matchOptions.value;
    const lobbyResponse = await this.http.post<{ id: string }>('/api/v1/lobby', options).toPromise();
    this.router.navigate([ `/play/${lobbyResponse.id}` ]);
  }

}
