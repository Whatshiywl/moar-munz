import { Controller, Get, Post, Body } from '@nestjs/common';

import { Message } from '@moar-munz/api-interfaces';

import { AppService } from './app.service';
import { UUIDService } from './shared/uuid/uuid.service';
import { LobbyService } from './shared/db/lobby.service';
import { JWTService } from './shared/jwt/jwt.service';
import { BoardService } from './shared/db/board.service';

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
  postLobby(@Body() body: { board: string } = { board: 'main' }) {
    const lobby = this.lobbyService.generateLobby(body.board || 'main');
    return lobby;
  }

  @Get('boards')
  getBoards() {
    return this.boardService.getBoards();
  }

}
