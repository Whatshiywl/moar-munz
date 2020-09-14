import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../shared/socket/socket.service';
import { FormControl } from '@angular/forms';
import { sample } from 'lodash';
import { debounceTime, map } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';

@Component({
  selector: 'moar-munz-play',
  templateUrl: './play.component.html',
  styleUrls: ['./play.component.scss']
})
export class PlayComponent implements OnInit, OnDestroy {
  debug = false;

  ready = new FormControl(false);
  uuid: string;

  lobby;

  match;
  playerTurn: string;
  isMyTurn: boolean;

  players;

  notificationData: {
    message: string;
    options?: string[];
    callback?: (answer: string) => void;
  };
  answerSubscription: Subscription;

  targetViewportDimentions = {
    w: 0, h: 0
  };

  tileClicked$: Subject<any>;
  
  constructor(
    private socket: SocketService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    console.log('play component on init', this.debug);
    this.uuid = sessionStorage.getItem('uuid');
    this.ready.setValue(false);
    this.ready.valueChanges.pipe(debounceTime(300)).subscribe(ready => {
      if (ready === undefined) return;
      this.socket.emit('ready', { ready });
    });
    this.tileClicked$ = new Subject<any>();
    this.route.params.subscribe(params => {
      const id = params.id;
      this.socket.connect();
      this.socket.on('update lobby', lobby => {
        console.log('lobby updated', lobby);
        this.lobby = lobby;
        this.players = this.getPlayers();
      });
      this.socket.on('match', match => {
        console.log('match', match);
        this.match = match;
        this.playerTurn = match.playerOrder[match.turn % match.playerOrder.length];
        this.isMyTurn = this.playerTurn === this.uuid;
        this.players = this.getPlayers();
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
        this.answerSubscription = this.tileClicked$
        .subscribe(tile => {
          const clickAnswer = question.options.find(o => o.includes(tile.name));
          if (clickAnswer) {
            this.onQuestionAnswer(clickAnswer);
            this.answerSubscription.unsubscribe();
          }
        });
      });
      this.socket.on('notification', (message: string) => {
        this.notificationData = { message };
      });
      this.socket.emit('enter lobby', { lobbyId: id }, (response: { token: string, uuid: string }) => {
        if (!response) {
          alert('This lobby has closed! :(');
          this.router.navigate([ '/' ]);
        }
      });
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

  onTileClicked(tile) {
    this.tileClicked$.next(tile);
  }

  onTileMouseEnter(tile) {
    this.highlightTile(tile, true);
  }

  onTileMouseLeave(tile) {
    this.highlightTile(tile, false);
  }

  onPlayerMouseEnter(player) {
    this.getPlayerProperties(player)
    .forEach(tile => this.highlightTile(tile, true));
  }

  onPlayerMouseLeave(player) {
    this.getPlayerProperties(player)
    .forEach(tile => this.highlightTile(tile, false));
  }

  onOptionMouseEnter(option) {
    const tile = this.match.board.tiles.find(t => option.includes(t.name));
    if (!tile) return;
    this.highlightTile(tile, true);
  }

  onOptionMouseLeave(option) {
    const tile = this.match.board.tiles.find(t => option.includes(t.name));
    if (!tile) return;
    this.highlightTile(tile, false);
  }

  highlightTile(tile, state: boolean) {
    tile.highlighted = state;
    const owner = this.players.find(p => p.id === tile.owner);
    if (!owner) return;
    owner.highlighted = state;
  }

  private getPlayers() {
    return this.lobby.playerOrder.map(playerId => {
      const matchPlayer = this.match?.playerState[playerId];
      const lobbyPlayer = this.lobby?.players[playerId];
      return { ...matchPlayer, ...lobbyPlayer };
    });
  }

  getPlayersInTile(t) {
    return this.players
    .filter(player => {
      return player.position === t;
    });
  }

  getPlayerProperties(player) {
    return this.match.board.tiles
    .filter(tile => tile.owner === player.id);
  }

}
