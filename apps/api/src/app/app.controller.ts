import { Controller, Get } from '@nestjs/common';

import { Message } from '@moar-munz/api-interfaces';

import { AppService } from './app.service';
import { UUIDService } from './shared/uuid/uuid.service';
import { LobbyService } from './shared/db/lobby.service';

@Controller()
export class AppController {
  constructor(
    private appService: AppService,
    private lobbyService: LobbyService
    ) {}

  @Get('hello')
  getData(): Message {
    return this.appService.getData();
  }

  @Get('uuid')
  getUUID() {
    const lobby = this.lobbyService.generateLobby();
    const uuid = lobby.id;
    return { uuid };
  }

}
