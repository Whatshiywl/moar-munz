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
  tax?: number
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
        board.lineLength = board.tiles.length / 4;
        this.boards[name] = board;
      } catch (error) {
        console.error(`Error loading ${fileName}`);
        console.error(error);
      }
    }
  }
  
  getBoard(name: string) {
    return cloneDeep(this.boards[name]);
  }

  getBoards() {
    return Object.keys(this.boards);
  }

}
