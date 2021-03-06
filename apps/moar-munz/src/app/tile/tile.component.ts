import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CompanyTile, DeedTile, Lobby, LobbyState, Match, Player, PlayerState, RailroadTile, RentableTile, Tile, VictoryState } from '@moar-munz/api-interfaces';

@Component({
  selector: 'moar-munz-tile',
  templateUrl: './tile.component.html',
  styleUrls: ['./tile.component.scss']
})
export class TileComponent implements OnChanges {

  @Input() match: Match;
  @Input() lobby: Lobby;
  @Input() tile: Tile;
  @Input() index: number;

  @Input() 
  players: (Player & PlayerState & LobbyState)[];

  tileData: {
    players: (Player & PlayerState & LobbyState)[],
    owner?: Player & LobbyState,
    level?: number,
    levelString?: string,
    value?: string,
    info?: string,
    highlightColor?: string,
    indicators?: string[]
  } = { players: [ ] };

  ngOnChanges(changes: SimpleChanges) {
    if (changes.lobby) {
      this.tileData.owner = changes.lobby.currentValue.players[this.tile.owner];
    }
    if (changes.players) {
      this.tileData.players = this.getPlayersInTile(this.index);
    }
    if (changes.tile) {
      const tile = changes.tile.currentValue as Tile;
      this.tileData.level = this.getTileLevel(tile);
      this.tileData.levelString = this.getTileLevelString();
      this.tileData.value = this.getTilePrice(tile);
      this.tileData.info = this.getTileInfo(tile);
      this.tileData.indicators = this.getTileIndicators(tile);
    }
  }

  getTileOwner(tile: Tile) {
    return this.lobby?.players[tile.owner];
  }

  getPlayersInTile(t: number) {
    return this.players
    .filter(player => {
      return player.victory !== VictoryState.LOST && player.position === t;
    });
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

}
