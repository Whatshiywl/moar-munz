import { readFileSync, readdirSync } from 'fs';
import { cloneDeep } from 'lodash';
import * as path from 'path';
import { jsonc } from 'jsonc';

export interface Tile {
  name: string,
  type: string,
  color: string,
  players: string[],
  level?: number,
  price?: number,
  rent?: number[],
  building?: 50,
  owner?: string,
  cost?: number,
  multiplier?: number,
  tax?: number,
  worldcup?: boolean,
  value: number,
  currentRent: number,
  x: number,
  y: number
}

export interface Board {
  lineLength: number,
  tiles: Tile[]
}

export class BoardService {

  baseFolder = `${__dirname}/assets/boards`;

  boards: { [name: string]: Board } = { };

  constructor() {
    const boardFiles = readdirSync(this.baseFolder);
    for (const fileName of boardFiles) {
      console.log(`Loading ${fileName}`);
      const name = fileName.replace('.jsonc', '');
      const pathToFile = path.join(this.baseFolder, fileName);
      try {
        const file = readFileSync(pathToFile).toString();
        const board = jsonc.parse(file) as Board;
        this.preProcessBoard(board);
        this.boards[name] = board;
      } catch (error) {
        console.error(`Error loading ${fileName}`);
        console.error(error);
      }
    }
  }

  private preProcessBoard(board: Board) {
    board.lineLength = board.tiles.length / 4;
    for (let t = 0; t < board.tiles.length; t++) {
      const tile = board.tiles[t];
      const j = t % board.lineLength;
      const s = Math.floor(t / board.lineLength);
      const pos = [ ];
      if (s === 0) {
        pos[0] = j;
        pos[1] = 0;
      } else if (s === 1) {
        pos[0] = board.lineLength;
        pos[1] = j
      } else if (s === 2) {
        pos[0] = board.lineLength - j;
        pos[1] = board.lineLength;
      } else {
        pos[0] = 0;
        pos[1] = board.lineLength - j;
      }
      tile.x = pos[0];
      tile.y = pos[1];
    }
  }

  postProcessBoard(board: Board) {
    for (let t = 0; t < board.tiles.length; t++) {
      const tile = board.tiles[t];
      if (tile.owner) {
        tile.value = this.getTileValue(tile);
        if (tile.level) {
          tile.currentRent = this.getFullRent(board, tile);
        }
      }
    }
  }
  
  getBoard(name: string) {
    return cloneDeep(this.boards[name]);
  }

  getBoards() {
    return Object.keys(this.boards);
  }

  getRawRent(tile: Tile) {
    return tile.rent[tile.level - 1];
  }

  getTileValue(tile: Tile) {
    let value = tile.price;
    if (tile.building) {
        value += tile.building * (tile.level - 1);
    }
    return value;
  }

  getFullRent(board: Board, tile: Tile) {
      let rent = this.getRawRent(tile);
      if (tile.worldcup) rent *= 2;
      if (tile.type === 'deed') {
          const sameColor = board.tiles.filter(t => t.type === 'deed' && t.color === tile.color);
          const sameColorOwner = sameColor.filter(t => t.owner === tile.owner);
          if (sameColor.length === sameColorOwner.length) rent *= 2;
          const tileIndex = board.tiles.findIndex(t => t.name === tile.name);
          const lineLength = board.tiles.length / 4;
          const line = Math.floor(tileIndex / lineLength);
          const sameLine = board.tiles.filter((t, i) => t.type === 'deed' && Math.floor(i / lineLength) === line);
          const sameTileOwner = sameLine.filter(t => t.owner === tile.owner);
          if (sameLine.length === sameTileOwner.length) rent *= 2;
      }
      return rent;
  }

}
