import { Component, Input } from '@angular/core';
import { CompanyTile, DeedTile, Match, Player, RailroadTile, Tile, TileType, VictoryState } from '@moar-munz/api-interfaces';
import { MatchService } from '../shared/services/match.service';
import { PlayerService } from '../shared/services/player.service';
import { TradeService } from '../shared/services/trade.service';

@Component({
  selector: 'moar-munz-tile',
  templateUrl: './tile.component.html',
  styleUrls: ['./tile.component.scss']
})
export class TileComponent {

  @Input() index: number;
  @Input() highlighted: boolean;

  tile: Tile;
  tileData: {
    players: (Player)[],
    owner?: Player,
    level?: number,
    levelString?: string,
    value?: string,
    info?: string,
    highlightColor?: string,
    indicators?: string[]
  } = { players: [ ] };

  private readonly tradeAllowedTypes: TileType[] = [
    'company', 'deed', 'railroad'
  ];

  constructor(
    private matchService: MatchService,
    private playerService: PlayerService,
    private tradeService: TradeService
  ) {
    this.matchService.matchChange$.subscribe(this.onMatchChanged.bind(this));
    this.playerService.playerChange$.subscribe(this.onPlayersChanged.bind(this));
  }

  private onMatchChanged(match: Match) {
    this.tile = match.board.tiles[this.index];
    this.tileData.level = this.getTileLevel(this.tile);
    this.tileData.levelString = this.getTileLevelString();
    this.tileData.value = this.getTilePrice(this.tile);
    this.tileData.info = this.getTileInfo(this.tile);
    this.tileData.indicators = this.getTileIndicators(this.tile);
    this.tileData.owner = this.getTileOwner(this.tile);
  }

  private onPlayersChanged(players: Player[]) {
    this.tileData.players = this.getPlayersInTile(players);
  }

  getTileOwner(tile: Tile) {
    return this.playerService.getPlayer(tile.owner);
  }

  getPlayersInTile(players: Player[]) {
    return players?.filter(player => {
      return player.state.victory !== VictoryState.LOST && player.state.position === this.index;
    }) || [ ];
  }

  getTileLevel(tile: Tile) {
    switch (tile.type) {
      case 'deed':
      case 'railroad':
        return tile.level;
      default:
        return undefined;
    }
  }

  getTileLevelString() {
    return this.tileData.level ? ' ('+(this.tileData.level-1)+')' : '';
  }

  getTilePrice(tile: Tile) {
    switch (tile.type) {
      case 'deed':
      case 'railroad':
      case 'company':
        return `${tile.value || tile.price}`;
    }
  }

  getTileInfo(tile: Tile) {
    switch (tile.type) {
      case 'deed':
      case 'railroad':
        if (!tile.currentRent) return;
        return `${tile.currentRent}`;
      case 'company':
        if (!tile.multiplier) return;
        return `x${tile.multiplier}`;
      case 'tax':
        if (!tile.tax) return;
        return `${100 * tile.tax}%`;
    }
  }

  getTileHighlightColor() {
    return this.tileData.owner?.color || 'white';
  }

  getTileIndicators(tile: Tile) {
    const indicators = this.getTypeSpecificIndicators(tile);
    for (let i = 0; i < tile.power; i++) indicators.push([ 'star' ]);
    if (tile.worldcup) indicators.push([ 'sentiment_very_satisfied' ]);
    return indicators;
  }

  getTypeSpecificIndicators(tile: Tile) {
    switch (tile.type) {
      case 'deed':
        return this.getDeedIndicators(tile);
      case 'railroad':
        return this.getRailIndicators(tile);
      case 'company':
        return this.getCompanyIndicators(tile);
      default:
        return [ ];
    }
  }

  getDeedIndicators(tile: DeedTile) {
    if (!this.tileData.level) return [ ];
    if (tile.level === 1) return [ 'flag' ];
    if (tile.level === tile.rent.length) return [ 'location_city' ];
    const indicators = [ ];
    for (let i = 0; i < tile.level - 1; i++) {
      indicators.push('home');
    }
    return indicators;
  }

  getRailIndicators(tile: RailroadTile) {
    if (!this.tileData.level) return [ ];
    const indicators = [ ];
    for (let i = 0; i < tile.level; i++) {
      indicators.push('directions_railway');
    }
    return indicators;
  }

  getCompanyIndicators(tile: Tile & CompanyTile) {
    return tile.owner ? [ 'work' ] : [ ];
  }

  canTrade() {
    if (!this.tile) return false;
    if (!this.tile.owner) return false;
    const isTypeAllowed = this.tradeAllowedTypes.includes(this.tile.type);
    if (!isTypeAllowed) return false;
    const player = this.playerService.player;
    return this.tile.owner === player.id;
  }

  toggleTrade(event: MouseEvent, tileName: string) {
    event.stopPropagation();
    if (!tileName) return;
    this.tradeService.toggleTile(tileName);
  }

}
