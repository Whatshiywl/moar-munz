import { RawTile, Tile } from './tile.interfaces';

export interface RawBoard {
  tiles: RawTile[]
}
  
export interface Board extends RawBoard {
  lineLength: number,
  tiles: Tile[]
}