import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../shared/socket/socket.service';
import { FormControl } from '@angular/forms';
import { sample } from 'lodash';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'moar-munz-play',
  templateUrl: './play.component.html',
  styleUrls: ['./play.component.scss']
})
export class PlayComponent implements OnInit, OnDestroy {
  debug = false;

  ready = new FormControl(false);
  socketId: string;

  lobby;

  match;
  isMyTurn: boolean;

  notificationData: {
    message: string;
    options?: string[];
    callback?: (answer: string) => void;
  };

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
        if (this.debug) {
          setTimeout(() => {
            if (this.isMyTurn) this.throwDice();
          }, 100);
        }
      })
      this.socket.on('ask question', (question, callback) => {
        this.notificationData = { ...question, callback };
        if (this.debug) {
          setTimeout(() => {
            this.onQuestionAnswer(sample(question.options));
          }, 100);
        }
      });
      this.socket.on('notification', (message: string) => {
        this.notificationData = { message };
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
    this.notificationData.callback(answer);
    this.notificationData = undefined;
  }

}
