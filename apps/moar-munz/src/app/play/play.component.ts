import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { SocketService } from '../shared/socket/socket.service';
import { sample } from 'lodash';
import { Subject, Subscription } from 'rxjs';
import { Player, PlayerComplete, Tile } from '@moar-munz/api-interfaces';
import { ChatComponent } from '../chat/chat.component';
import { first } from 'rxjs/operators';
import { PlayerService } from '../shared/services/player.service';
import { MatchService } from '../shared/services/match.service';

type PlayerCard = { player: PlayerComplete, properties: Tile[] }

@Component({
  selector: 'moar-munz-play',
  templateUrl: './play.component.html',
  styleUrls: ['./play.component.scss']
})
export class PlayComponent implements OnInit, OnDestroy {
  debug = false;
  @ViewChild(ChatComponent) chatComponent: ChatComponent;

  uuid: string;

  playerCards: PlayerCard[] = [];

  highlighted: {
    players: { [id: string]: boolean },
    tiles: boolean[]
  } = {
    players: { },
    tiles: [ ]
  }

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
    public playerService: PlayerService,
    private matchService: MatchService
  ) { }

  async ngOnInit() {
    console.log('debug play component on init', this.debug);
    this.uuid = sessionStorage.getItem('uuid');
    this.tileClicked$ = new Subject<Tile>();
    this.socket.connect();
    this.matchService.matchChange$.subscribe(this.onMatchUpdate.bind(this));
    this.playerService.playerChange$.subscribe(this.updatePlayerCards.bind(this));
    this.socket.on('ask question', (question, callback) => {
      console.log('question asked')
      this.notificationData = { ...question, callback };
      if (this.debug) {
        setTimeout(() => {
          this.onQuestionAnswer(sample(question.options));
        }, 100);
      }
      if (this.answerSubscription) this.answerSubscription.unsubscribe();
      this.tileClicked$.pipe(first()).subscribe(tile => {
        const clickAnswer = question.options.find(o => o.includes(tile.name));
        if (clickAnswer) {
          this.onQuestionAnswer(clickAnswer);
        }
      });
    });
    this.socket.on('notification', (message: string) => {
      this.notificationData = { message };
    });
  }

  get players() {
    return this.playerService.players;
  }

  get match() { return this.matchService.match; }

  get tiles() { return this.match.board.tiles; }

  getTile(index: number) {
    return this.tiles[index];
  }

  getTileIndex(tile: Tile) {
    return this.tiles.findIndex(t => t.name === tile.name);
  }

  private onMatchUpdate() {
    if (!this.highlighted.tiles.length) {
      this.tiles.forEach(_ => this.highlighted.tiles.push(false));
    }
    if (this.debug) {
      setTimeout(() => {
        if (this.playerService.isMyTurn) this.throwDice();
      }, 100);
    }
  }

  private updatePlayerCards(players: PlayerComplete[]) {
    if (!Object.keys(this.highlighted.players).length) {
      players.forEach(p => this.highlighted.players[p.id] = false);
    }
    players?.forEach(player => {
      const properties = this.getPlayerProperties(player);
      const cardIndex = this.playerCards.findIndex(c => c.player.id === player.id);
      if (cardIndex < 0) this.playerCards.push({ player, properties });
      else {
        this.playerCards[cardIndex].player = player;
        this.playerCards[cardIndex].properties = properties;
      }
    });
  }

  private getPlayerProperties(player: Player) {
    return this.match?.board.tiles
    .filter(tile => tile.owner === player.id);
  }

  ngOnDestroy() {
    console.log('destroy play component');
    this.socket.disconnect(true);
  }

  openPlayerChat(player: PlayerComplete, event: MouseEvent) {
    event.stopPropagation();
    if (player.id === this.playerService.player.id) return;
    this.chatComponent.addTab(player, true, true);
  }

  throwDice() {
    this.socket.emit('throw dice');
  }

  onQuestionAnswer(answer: string) {
    this.notificationData.callback(answer);
    this.notificationData = undefined;
  }

  onTileClicked(index: number) {
    const tile = this.getTile(index);
    this.tileClicked$.next(tile);
  }

  highlightCardProperties(properties: Tile[], state: boolean) {
    properties.forEach(tile => this.highlightTile(tile, state));
  }

  highlightOption(option: string, state: boolean) {
    const tile = this.match.board.tiles.find(t => option.includes(t.name));
    if (!tile) return;
    this.highlightTile(tile, state);
  }

  highlightTile(index: number, state: boolean): void;
  highlightTile(tile: Tile, state: boolean): void;
  highlightTile(tileOrIndex: Tile | number, state: boolean) {
    const index = typeof tileOrIndex === 'number' ? tileOrIndex : this.getTileIndex(tileOrIndex);
    const tile = this.getTile(index);
    this.highlighted.tiles[index] = state;
    const owner = this.players?.find(p => p.id === tile.owner);
    if (!owner) return;
    this.highlighted.players[owner.id] = state;
  }

  isPlayerHighlighted(id: string) {
    return this.highlighted.players[id];
  }

  isTileHighlighted(index: number) {
    return this.highlighted.tiles[index];
  }

  toggleDebug() {
    this.debug = !this.debug;
    console.warn(`Debug mode ${this.debug ? 'enabled' : 'disabled'}!`);
  }

}
