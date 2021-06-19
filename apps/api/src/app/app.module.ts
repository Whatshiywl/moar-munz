import { Module } from '@nestjs/common';
import { RouterModule } from 'nest-router';
import { ServeStaticModule } from '@nestjs/serve-static';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { join } from 'path';
import { routes } from './routes';
import { LowDbService } from './shared/services/lowdb.service';
import { MatchService } from './match/match.service';
import { SocketGateway } from './socket/socket.gateway';
import { LobbyService } from './lobby/lobby.service';
import { UUIDService } from './shared/services/uuid.service';
import { JWTService } from './shared/services/jwt.service';
import { PlayerService } from './shared/services/player.service';
import { SocketService } from './socket/socket.service';
import { BoardService } from './shared/services/board.service';
import { BodyLobbyPipe } from './shared/pipes/body-lobby.pipe';
import { BodyMatchPipe } from './shared/pipes/body-match.pipe';
import { BodyPlayerPipe } from './shared/pipes/body-player.pipe';
import { MatchGateway } from './match/match.gateway';
import { LobbyGateway } from './lobby/lobby.gateway';
import { AIService } from './shared/services/ai.service';
import { ChatGateway } from './chat/chat.gateway';
import { BodyMessagePipe } from './shared/pipes/body-message.pipe';
import { PromptService } from './shared/services/prompt.service';

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
    MatchGateway,
    LobbyGateway,
    ChatGateway,
    UUIDService,
    JWTService,
    LowDbService,
    MatchService,
    LobbyService,
    PlayerService,
    SocketService,
    BoardService,
    BodyPlayerPipe,
    BodyLobbyPipe,
    BodyMatchPipe,
    BodyMessagePipe,
    AIService,
    PromptService
  ]
})
export class AppModule {}
