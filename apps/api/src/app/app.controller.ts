import { Controller, Get, Post, Body, Query } from '@nestjs/common';

import { MatchOptions } from '@moar-munz/api-interfaces';

import { AppService } from './app.service';
import { UUIDService } from './shared/services/uuid.service';
import { LobbyService } from './lobby/lobby.service';
import { JWTService } from './shared/services/jwt.service';
import { BoardService } from './shared/services/board.service';
import { pick } from 'lodash';
import { PlayerService } from './shared/services/player.service';
import { MatchService } from './shared/services/match.service';

@Controller()
export class AppController {
  constructor(
    private appService: AppService,
    private jwtService: JWTService,
    private uuidService: UUIDService,
    private boardService: BoardService,
    private playersService: PlayerService,
    private matchService: MatchService
    ) {}

  @Get('hello')
  getData() {
    return this.appService.getData();
  }

  @Get('token')
  getToken() {
    const uuid = this.uuidService.generateUUID(2);
    const token = this.jwtService.genToken({ uuid });
    return { token, uuid };
  }

  @Post('lobby')
  postLobby(@Body() options: MatchOptions) {
    const match = this.matchService.generateMatch({
      ...{ board: 'classic', ai: false },
      ...options
    });
    return match;
  }

  @Get('boards')
  getBoards() {
    return this.boardService.getBoards();
  }

  @Get('players')
  getPlayers(@Query('matchId') matchId: string) {
    return this.playersService.getPlayersByMatchId(matchId);
  }

  @Post('cleanup')
  cleanupStale() {
    this.appService.cleanupStale();
  }

  @Get('version')
  getVersion() {
    const pkg = require('../../../../package.json');
    return pick(pkg, 'version');
  }

}
