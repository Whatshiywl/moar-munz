import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { SocketService } from '../shared/socket/socket.service';
import { Player, PlayerComplete, Tile } from '@moar-munz/api-interfaces';
import { ChatComponent } from '../chat/chat.component';
import { PlayerService } from '../shared/services/player.service';
import { MatchService } from '../shared/services/match.service';
import { TradeService } from '../shared/services/trade.service';

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

  currentRoll: number[] = [ ];

  constructor(
    private socket: SocketService,
    public playerService: PlayerService,
    private matchService: MatchService,
    public tradeService: TradeService,
    private cd: ChangeDetectorRef
  ) { }

  async ngOnInit() {
    console.log('debug play component on init', this.debug);
    this.uuid = sessionStorage.getItem('uuid');
    this.socket.connect();
    this.socket.on('dice roll', (dice: number[]) => {
      this.currentRoll[0] = dice[0];
      this.currentRoll[1] = dice[1];
    });
    this.matchService.matchChange$.subscribe(this.onMatchUpdate.bind(this));
    this.playerService.playerChange$.subscribe(this.updatePlayerCards.bind(this));
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

  onTileClicked(index: number) {
    const tile = this.getTile(index);
    this.matchService.clickTile(tile);
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
    this.cd.detectChanges();
  }

  getDieMarginLeft(die: number) {
    return `${-30 * die + 15}px`;
  }

}
