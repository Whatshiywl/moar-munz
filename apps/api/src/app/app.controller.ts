import { Controller, Get, Post, Body } from '@nestjs/common';

import { LobbyOptions, Message } from '@moar-munz/api-interfaces';

import { AppService } from './app.service';
import { UUIDService } from './shared/services/uuid.service';
import { LobbyService } from './lobby/lobby.service';
import { JWTService } from './shared/services/jwt.service';
import { BoardService } from './shared/services/board.service';
import { pick } from 'lodash';

@Controller()
export class AppController {
  constructor(
    private appService: AppService,
    private lobbyService: LobbyService,
    private jwtService: JWTService,
    private uuidService: UUIDService,
    private boardService: BoardService
    ) {}

  @Get('hello')
  getData(): Message {
    return this.appService.getData();
  }

  @Get('token')
  getToken() {
    const uuid = this.uuidService.generateUUID(2);
    const token = this.jwtService.genToken({ uuid });
    return { token, uuid };
  }

  @Post('lobby')
  postLobby(@Body() options: LobbyOptions) {
    const lobby = this.lobbyService.generateLobby({
      ...{ board: 'classic', ai: false },
      ...options
    });
    return lobby;
  }

  @Get('boards')
  getBoards() {
    return this.boardService.getBoards();
  }

  @Get('version')
  getVersion() {
    const pkg = require('../../../../package.json');
    return pick(pkg, 'version');
  }

}
