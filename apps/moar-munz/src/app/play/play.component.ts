import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../shared/socket/socket.service';
import { sample } from 'lodash';
import { Observable, pipe, Subject, Subscription } from 'rxjs';
import { Board, Lobby, Match, Player, PlayerComplete, Tile } from '@moar-munz/api-interfaces';
import { ChatComponent } from '../chat/chat.component';
import { Store } from '@ngrx/store';
import { filter, map } from 'rxjs/operators';
import copy from 'fast-copy';

@Component({
  selector: 'moar-munz-play',
  templateUrl: './play.component.html',
  styleUrls: ['./play.component.scss']
})
export class PlayComponent implements OnInit, OnDestroy {
  debug = false;
  @ViewChild(ChatComponent) chatComponent: ChatComponent;

  player: PlayerComplete;
  uuid: string;
  first: boolean;

  lobby$: Observable<Lobby>;
  lobby: Lobby;

  match$: Observable<Match>;
  match: Match;
  board: Board;

  tileDisplayOrder: { tile: Tile, i: number }[];

  playerTurn: string;
  isMyTurn: boolean;

  players: (PlayerComplete)[];

  activeTrade;

  notificationData: {
    message: string;
    options?: string[];
    callback?: (answer: string) => void;
  };
  answerSubscription: Subscription;

  targetViewportDimentions = {
    w: 0, h: 0
  };

  tileClicked$: Subject<Tile>;

  constructor(
    private socket: SocketService,
    private route: ActivatedRoute,
    private router: Router,
    private store: Store<{
      lobby: Lobby,
      match: Match
    }>
  ) {
    const filterCopy = <T>() => pipe<Observable<T>, Observable<T>, Observable<T>>(filter(el => Boolean(el)), map(el => copy(el)));
    this.lobby$ = this.store.select('lobby').pipe(filterCopy());
    this.match$ = this.store.select('match').pipe(filterCopy());
  }

  async ngOnInit() {
    console.log('debug play component on init', this.debug);
    this.uuid = sessionStorage.getItem('uuid');
    this.tileClicked$ = new Subject<Tile>();
    const params = this.route.snapshot.params;
    console.log('play component params', params);
    const id = params.id;
    this.socket.connect();
    this.lobby$.subscribe(this.onLobbyUpdate.bind(this));
    this.match$.subscribe(this.onMatchUpdate.bind(this));
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
  }

  onLobbyUpdate(lobby: Lobby) {
    console.log('lobby', lobby);
    this.lobby = lobby;
    this.updatePlayers();
    this.first = this.uuid === lobby.playerOrder[0];
  }

  onMatchUpdate(match: Match) {
    console.log('match', match);
    // DEBUG
    if (!this.match) {
      setTimeout(() => {
        const player = this.players.find(p => p.id !== this.player.id);
        this.openPlayerChat(player);
      }, 1000);
    }
    // DEBUG
    this.match = match;
    this.tileDisplayOrder = this.getTileDisplayOrder(match.board);
    this.playerTurn = Object.keys(match.playerState).find(playerId => {
      const playerState = match.playerState[playerId];
      return playerState.turn;
    });
    this.isMyTurn = this.playerTurn === this.uuid;
    this.updatePlayers();
    this.first = this.uuid === match.playerOrder[0];
    if (this.debug) {
      setTimeout(() => {
        if (this.isMyTurn) this.throwDice();
      }, 100);
    }
  }

  private updatePlayers() {
    this.players = this.getPlayers();
    this.player = this.players.find(p => p.id === this.uuid);
    localStorage.setItem('player', JSON.stringify(this.player));
  }

  ngOnDestroy() {
    console.log('destroy play component');
    this.socket.disconnect(true);
  }

  openPlayerChat(player: PlayerComplete) {
    if (player.id === this.player.id) return;
    this.chatComponent.addTab(player, true);
  }

  private getTileDisplayOrder(board: Board) {
    const tiles = board.tiles;
    const order = [ ];
    // FIRST LINE
    for (let i = 0; i < board.lineLength; i++) {
      order.push(i);
    }
    // SECOND LINE AND FOURTH
    for (let i = 0; i < board.lineLength; i++) {
      order.push(10 + i);
      order.push(tiles.length - 1 - i);
    }
    // THIRD LINE
    for (let i = 0; i < board.lineLength; i++) {
      order.push(3 * board.lineLength - 1 - i);
    }
    return order.map(i => ({ tile: tiles[i], i }));
  }

  throwDice() {
    this.socket.emit('throw dice');
  }

  onReady(ready: boolean) {
    this.socket.emit('ready', { ready });
  }

  onLobbyPlayerClick(player: PlayerComplete) {
    this.socket.emit('remove player', { id: player.id });
  }

  onLobbyAddAI() {
    this.socket.emit('add ai');
  }

  onQuestionAnswer(answer: string) {
    this.notificationData.callback(answer);
    this.notificationData = undefined;
  }

  onTileClicked(tile: Tile) {
    this.tileClicked$.next(tile);
  }

  onTileMouseEnter(tile: Tile) {
    this.highlightTile(tile, true);
  }

  onTileMouseLeave(tile: Tile) {
    this.highlightTile(tile, false);
  }

  onPlayerMouseEnter(player: Player) {
    const props = this.getPlayerProperties(player);
    console.log(props);
    props.forEach(tile => this.highlightTile(tile, true));
  }

  onPlayerMouseLeave(player: Player) {
    this.getPlayerProperties(player)
    .forEach(tile => this.highlightTile(tile, false));
  }

  onOptionMouseEnter(option: string) {
    const tile = this.match.board.tiles.find(t => option.includes(t.name));
    if (!tile) return;
    this.highlightTile(tile, true);
  }

  onOptionMouseLeave(option: string) {
    const tile = this.match.board.tiles.find(t => option.includes(t.name));
    if (!tile) return;
    this.highlightTile(tile, false);
  }

  highlightTile(tile: Tile, state: boolean) {
    tile.highlighted = state;
    const owner = this.players.find(p => p.id === tile.owner);
    if (!owner) return;
    owner.highlighted = state;
  }

  private getPlayers() {
    return this.lobby.playerOrder.filter(Boolean).map(playerId => {
      const matchPlayer = this.match?.playerState[playerId];
      const lobbyPlayer = this.lobby?.players[playerId];
      return { ...matchPlayer, ...lobbyPlayer };
    });
  }

  getPlayerProperties(player: Player) {
    return this.match.board.tiles
    .filter(tile => tile.owner === player.id);
  }

}
