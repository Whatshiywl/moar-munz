import { Module } from '@nestjs/common';
import { RouterModule } from 'nest-router';
import { ServeStaticModule } from '@nestjs/serve-static';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { join } from 'path';
import { routes } from './routes';
import { LowDbService } from './shared/services/lowdb.service';
import { EngineService } from './engine/engine.service';
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
import { EngineGateway } from './engine/engine.gateway';
import { LobbyGateway } from './lobby/lobby.gateway';
import { AIService } from './shared/services/ai.service';
import { ChatGateway } from './chat/chat.gateway';
import { BodyMessagePipe } from './shared/pipes/body-message.pipe';
import { MatchService } from './shared/services/match.service';

import { PromptGateway } from './prompt/prompt.gateway';
import { PromptService } from './prompt/prompt.service';
import { WorldtourPromptFactory } from './prompt/factories/worldtour.factory';
import { WorldcupPromptFactory } from './prompt/factories/worldcup.factory';
import { BuyDeedPromptFactory } from './prompt/factories/buydeed.factory';
import { ImproveDeedPromptFactory } from './prompt/factories/improvedeed.factory';
import { AquireDeedPromptFactory } from './prompt/factories/aquiredeed.factory';
import { BuyTilePromptFactory } from './prompt/factories/buytile.factory';
import { SellTilesPromptFactory } from './prompt/factories/selltiles.factory';
import { TradeGateway } from './trade/trade.gateway';
import { PubSubService } from './shared/services/pubsub.service';

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
    EngineGateway,
    LobbyGateway,
    ChatGateway,
    TradeGateway,
    UUIDService,
    JWTService,
    LowDbService,
    EngineService,
    LobbyService,
    PlayerService,
    SocketService,
    BoardService,
    BodyPlayerPipe,
    BodyLobbyPipe,
    BodyMatchPipe,
    BodyMessagePipe,
    AIService,
    MatchService,
    PubSubService,

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
