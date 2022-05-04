import { Module } from '@nestjs/common';
import { RouterModule } from 'nest-router';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { routes } from './routes';
import { EngineModule } from './engines/engine.module';
import { SocketModule } from './socket/socket.module';
import { PubSubModule } from './pubsub/pubsub.module';
import { LowDbModule } from './lowdb/lowdb.module';

import { AppController } from './app.controller';

import { ChatGateway } from './chat/chat.gateway';
import { SocketGateway } from './socket/socket.gateway';
import { EngineGateway } from './engines/engine.gateway';
import { LobbyGateway } from './lobby/lobby.gateway';
import { TradeGateway } from './trade/trade.gateway';
import { PromptGateway } from './prompt/prompt.gateway';

import { AppService } from './app.service';
import { LobbyService } from './lobby/lobby.service';
import { UUIDService } from './shared/services/uuid.service';
import { JWTService } from './shared/services/jwt.service';
import { PlayerService } from './shared/services/player.service';
import { BoardService } from './shared/services/board.service';
import { AIService } from './shared/services/ai.service';
import { MatchService } from './shared/services/match.service';
import { PromptService } from './prompt/prompt.service';


import { WorldtourPromptFactory } from './prompt/factories/worldtour.factory';
import { WorldcupPromptFactory } from './prompt/factories/worldcup.factory';
import { BuyDeedPromptFactory } from './prompt/factories/buydeed.factory';
import { ImproveDeedPromptFactory } from './prompt/factories/improvedeed.factory';
import { AquireDeedPromptFactory } from './prompt/factories/aquiredeed.factory';
import { BuyTilePromptFactory } from './prompt/factories/buytile.factory';
import { SellTilesPromptFactory } from './prompt/factories/selltiles.factory';

@Module({
  imports: [
    RouterModule.forRoutes(routes),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'moar-munz')
    }),
    LowDbModule,
    SocketModule,
    PubSubModule,
    EngineModule
  ],
  controllers: [
    AppController
  ],
  providers: [
    AppService,

    SocketGateway,
    EngineGateway,
    LobbyGateway,
    ChatGateway,
    TradeGateway,

    UUIDService,
    JWTService,
    LobbyService,
    PlayerService,
    BoardService,
    AIService,
    MatchService,

    // TODO: Create PromptModule
    PromptGateway,
    PromptService,
    WorldtourPromptFactory,
    WorldcupPromptFactory,
    BuyDeedPromptFactory,
    ImproveDeedPromptFactory,
    AquireDeedPromptFactory,
    BuyTilePromptFactory,
    SellTilesPromptFactory
  ]
})
export class AppModule {}
