import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../shared/socket/socket.service';
import { sample } from 'lodash';
import { Observable, pipe, Subject, Subscription } from 'rxjs';
import { Board, Lobby, Match, Player, PlayerComplete, Tile } from '@moar-munz/api-interfaces';
import { ChatComponent } from '../chat/chat.component';
import { Store } from '@ngrx/store';
import { filter, map } from 'rxjs/operators';
import copy from 'fast-copy';

type PlayerCard = { player: PlayerComplete, properties: Tile[] }

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

  tileOrder: number[];
  tileDisplayOrder: { tile: Tile, i: number }[];
  tiles: Tile[];

  playerTurn: string;
  isMyTurn: boolean;

  players: PlayerComplete[];
  playerCards: PlayerCard[] = [];

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
    }>,
    private cd: ChangeDetectorRef
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
    this.updateMatch(match);
    this.tileOrder = this.tileOrder || this.getTileOrder(this.match.board);
    const displayOrder = this.getTileDisplayOrder(this.match.board);
    this.tileDisplayOrder = this.tileDisplayOrder || displayOrder;
    const tiles = [];
    displayOrder.forEach(data => tiles[data.i] = data.tile);
    this.tiles = tiles;
    this.playerTurn = Object.keys(this.match.playerState).find(playerId => {
      const playerState = this.match.playerState[playerId];
      return playerState.turn;
    });
    this.isMyTurn = this.playerTurn === this.uuid;
    this.updatePlayers();
    this.first = this.uuid === this.match.playerOrder[0];
    if (this.debug) {
      setTimeout(() => {
        if (this.isMyTurn) this.throwDice();
      }, 100);
    }
  }

  private updatePlayers() {
    this.players = this.getPlayers();
    this.players.forEach(player => {
      const properties = this.getPlayerProperties(player);
      const cardIndex = this.playerCards.findIndex(c => c.player.id === player.id);
      if (cardIndex < 0) this.playerCards.push({ player, properties });
      else {
        this.playerCards[cardIndex].player = player;
        this.playerCards[cardIndex].properties = properties;
      }
    });
    this.player = this.players.find(p => p.id === this.uuid);
    sessionStorage.setItem('player', JSON.stringify(this.player));
  }

  ngOnDestroy() {
    console.log('destroy play component');
    this.socket.disconnect(true);
  }

  openPlayerChat(player: PlayerComplete) {
    if (player.id === this.player.id) return;
    this.chatComponent.addTab(player, true);
  }

  private getTileOrder(board: Board) {
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
    return order;
  }

  private getTileDisplayOrder(board: Board) {
    const { tiles } = board;
    return this.tileOrder.map(i => ({ tile: tiles[i], i }));
  }

  throwDice() {
    this.socket.emit('throw dice');
  }

  onReady(ready: boolean) {
    this.socket.emit('ready', { ready });
  }

  onLobbyPlayerClick(player: Player) {
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

  onCardMouseEnter(card: PlayerCard) {
    const props = card.properties;
    props.forEach(tile => this.highlightTile(tile, true));
  }

  onCardMouseLeave(card: PlayerCard) {
    const props = card.properties;
    props.forEach(tile => this.highlightTile(tile, false));
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
      const playerCard = this.playerCards.find(c => c.player.id === playerId);
      const highlighted = playerCard?.player.highlighted || false;
      return { ...matchPlayer, ...lobbyPlayer, highlighted };
    });
  }

  getPlayerProperties(player: Player) {
    return this.match?.board.tiles
    .filter(tile => tile.owner === player.id);
  }

  private updateMatch(match: Match) {
    if (!this.match) return this.match = match;
    const keys: (keyof Match)[] = [
      'turn', 'lastDice', 'playerState', 'locked', 'over'
    ];
    keys.forEach(key => (this.match[key] as any) = match[key]);
    this.updateBoard(match.board);
  }

  private updateBoard(board: Board) {
    board.tiles.forEach((tile, i) => {
      for (const key in tile) {
        const value = tile[key];
        this.match.board.tiles[i][key] = value;
      }
    });
  }

}
