import { readFileSync, readdirSync } from 'fs';
import { cloneDeep } from 'lodash';
import * as path from 'path';
import { jsonc } from 'jsonc';

export class BoardService {

  baseFolder = `${__dirname}/assets/boards`;

  boards: { [name: string]: any } = { };

  constructor() {
    const boardFiles = readdirSync(this.baseFolder);
    for (const fileName of boardFiles) {
      console.log(`Loading ${fileName}`);
      const name = fileName.replace('.jsonc', '');
      const pathToFile = path.join(this.baseFolder, fileName);
      try {
        const file = readFileSync(pathToFile).toString();
        const board = jsonc.parse(file);
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
