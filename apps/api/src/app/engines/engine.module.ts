import { DiscoveryModule, DiscoveryService, MetadataScanner } from "@nestjs/core";
import { Module, OnModuleInit } from "@nestjs/common";
import { AquireDeedPromptFactory } from "../prompt/factories/aquiredeed.factory";
import { BuyDeedPromptFactory } from "../prompt/factories/buydeed.factory";
import { BuyTilePromptFactory } from "../prompt/factories/buytile.factory";
import { ImproveDeedPromptFactory } from "../prompt/factories/improvedeed.factory";
import { SellTilesPromptFactory } from "../prompt/factories/selltiles.factory";
import { WorldcupPromptFactory } from "../prompt/factories/worldcup.factory";
import { WorldtourPromptFactory } from "../prompt/factories/worldtour.factory";
import { PromptService } from "../prompt/prompt.service";
import { AIService } from "../shared/services/ai.service";
import { BoardService } from "../shared/services/board.service";
import { JWTService } from "../shared/services/jwt.service";
import { MatchService } from "../shared/services/match.service";
import { PlayerService } from "../shared/services/player.service";
import { UUIDService } from "../shared/services/uuid.service";
import { PlayEngine } from "./play.engine";
import { PubSubModule } from "../pubsub/pubsub.module";
import { DeductEngine } from "./deduct.engine";
import { ENGINE_METADATA, GEAR_MESSAGE_METADATA, GEAR_METADATA } from "./engine.decorators";
import { PubSubService } from "../pubsub/pubsub.service";
import { TransferEngine } from "./transfer.engine";
import { WinEngine } from "./win.engine";
import { RentEngine } from "./rent.engine";
import { PromptEngine } from "./prompt.engine";

@Module({
  imports: [
    DiscoveryModule,
    PubSubModule
  ],
  providers: [
    PlayEngine,
    PromptEngine,
    DeductEngine,
    TransferEngine,
    RentEngine,
    WinEngine,

    JWTService,
    MatchService,
    PlayerService,
    BoardService,
    PromptService,
    WorldcupPromptFactory,
    WorldtourPromptFactory,
    BuyDeedPromptFactory,
    ImproveDeedPromptFactory,
    AquireDeedPromptFactory,
    BuyTilePromptFactory,
    UUIDService,
    AIService,
    SellTilesPromptFactory
  ]
})
export class EngineModule implements OnModuleInit {

  constructor(
    private discovery: DiscoveryService,
    private metadataScanner: MetadataScanner,
    private pubsubService: PubSubService
  ) { }

  onModuleInit() {
    const wrappers = this.discovery.getProviders();
    const engines = wrappers.filter(provider => provider.metatype && Reflect.getMetadata(ENGINE_METADATA, provider.metatype));
    engines.forEach(engine => {
      const instance = engine.instance;
      const proto = Object.getPrototypeOf(instance);
      this.metadataScanner.scanFromPrototype(instance, proto, methodName => {
        const method = proto[methodName];
        if (!Reflect.getMetadata(GEAR_METADATA, method)) return null;
        const message = Reflect.getMetadata(GEAR_MESSAGE_METADATA, method)
        console.log(engine.name, methodName, message);
        this.pubsubService.on(message)
        .subscribe(async ({ payload, ack }) => {
          const action = payload.actions[payload.action];
          await method.bind(instance)(action, payload);
          ack();
        });
      });
    });
  }

}
