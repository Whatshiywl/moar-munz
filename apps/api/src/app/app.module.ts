import { Module } from '@nestjs/common';
import { RouterModule } from 'nest-router';
import { ServeStaticModule } from '@nestjs/serve-static';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { join } from 'path';
import { routes } from './routes';
import { LowDbService } from './shared/lowdb/lowdb.service';
import { MatchService } from './shared/db/match.service';
import { SocketGateway } from './socket/socket.gateway';
import { LobbyService } from './shared/db/lobby.service';
import { UUIDService } from './shared/uuid/uuid.service';
import { JWTService } from './shared/jwt/jwt.service';
import { PlayerService } from './shared/db/player.service';
import { SocketService } from './socket/socket.service';
import { BoardService } from './shared/db/board.service';

@Module({
  imports: [
    RouterModule.forRoutes(routes),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'moar-munz')
    })
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SocketGateway,
    UUIDService,
    JWTService,
    LowDbService,
    MatchService,
    LobbyService,
    PlayerService,
    SocketService,
    BoardService
  ]
})
export class AppModule {}
