import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../shared/socket/socket.service';
import { FormControl } from '@angular/forms';

import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'moar-munz-play',
  templateUrl: './play.component.html',
  styleUrls: ['./play.component.scss']
})
export class PlayComponent implements OnInit, OnDestroy {

  ready = new FormControl(false);
  socketId: string;

  lobby;

  match;
  isMyTurn: boolean;

  boardInput;

  targetViewportDimentions = {
    w: 0, h: 0
  };
  
  constructor(
    private socket: SocketService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.ready.setValue(false);
    this.ready.valueChanges.pipe(debounceTime(300)).subscribe(value => {
      if (value === undefined) return;
      this.socket.emit('ready', value);
    });
    this.route.params.subscribe(params => {
      const id = params.id;
      this.socket.connect();
      this.socket.on('update lobby', lobby => {
        console.log('lobby updated', lobby);
        this.lobby = lobby;
      });
      this.socket.on('match', match => {
        console.log('match', match);
        this.match = match;
        this.isMyTurn = match.playerTurn.id === this.socketId;
      })
      this.socket.on('ask question', (question, callback) => {
        this.boardInput = { ...question, callback };
        console.log(this.boardInput);
        // if (question.options[0] === 'No') {
        //   if (Math.random() < 0.6) this.onQuestionAnswer('No');
        //   else this.onQuestionAnswer(sample(question.options));
        // }
      });
      this.socket.emit('enter lobby', { id }, socketId => this.socketId = socketId);
    });
  }

  ngOnDestroy() {
    console.log('destroy play component');
    this.socket.disconnect(true);
  }

  throwDice() {
    this.socket.emit('throw dice');
  }

  onQuestionAnswer(answer: string) {
    this.boardInput.callback(answer);
    this.boardInput = undefined;
  }

}
