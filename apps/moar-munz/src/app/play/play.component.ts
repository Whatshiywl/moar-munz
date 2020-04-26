import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../shared/socket/socket.service';
import { FormControl } from '@angular/forms';
import { sample } from 'lodash';
import { debounceTime, first } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';

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
  answerSubscription: Subscription;

  targetViewportDimentions = {
    w: 0, h: 0
  };

  titleClicked$: Subject<any>;
  
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
    this.titleClicked$ = new Subject<any>();
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
        console.log('question asked')
        this.notificationData = { ...question, callback };
        if (this.debug) {
          setTimeout(() => {
            this.onQuestionAnswer(sample(question.options));
          }, 100);
        }
        if (this.answerSubscription) this.answerSubscription.unsubscribe();
        this.answerSubscription = this.titleClicked$
        .subscribe(title => {
          const clickAnswer = question.options.find(o => o.includes(title.name));
          if (clickAnswer) {
            this.onQuestionAnswer(clickAnswer);
            this.answerSubscription.unsubscribe();
          }
        });
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

  onTitleClicked(title) {
    this.titleClicked$.next(title);
  }

  onTitleMouseEnter(title) {
    this.highlightTitle(title, true);
  }

  onTitleMouseLeave(title) {
    this.highlightTitle(title, false);
  }

  onPlayerMouseEnter(player) {
    player.properties.map(p => {
      return this.match.board.find(title => title.name === p);
    }).forEach(t => {
      this.highlightTitle(t, true)
    });
  }

  onPlayerMouseLeave(player) {
    player.properties.map(p => {
      return this.match.board.find(title => title.name === p);
    }).forEach(t => {
      this.highlightTitle(t, false)
    });
  }

  onOptionMouseEnter(option) {
    const title = this.match.board.find(t => option.includes(t.name));
    if (!title) return;
    this.highlightTitle(title, true);
  }

  onOptionMouseLeave(option) {
    const title = this.match.board.find(t => option.includes(t.name));
    if (!title) return;
    this.highlightTitle(title, false);
  }

  highlightTitle(title, state: boolean) {
    title.highlighted = state;
    const owner = this.match.players.find(p => p.id === title.owner);
    if (!owner) return;
    owner.highlighted = state;
  }

}
