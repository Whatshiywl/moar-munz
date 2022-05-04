import { DeedTile, DynamicTile, AfterRentPaymentPayload, MatchState, AfterRentPaymentAction, DeedAquireConfirmedAction } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { AquireDeedPromptFactory } from "../prompt/factories/aquiredeed.factory";
import { PromptService } from "../prompt/prompt.service";
import { PubSubService } from "../pubsub/pubsub.service";
import { BoardService } from "../shared/services/board.service";
import { MatchService } from "../shared/services/match.service";
import { PlayerService } from "../shared/services/player.service";
import { Engine, Gear } from "./engine.decorators";

@Engine()
@Injectable()
export class RentEngine {

  constructor (
    private playerService: PlayerService,
    private matchService: MatchService,
    private boardService: BoardService,
    private pubsubService: PubSubService,
    private promptService: PromptService,
    private aquireDeedPromptFactory: AquireDeedPromptFactory
  ) { }

  @Gear('after-rent-payment')
  async onAfterRentPayment(action: AfterRentPaymentAction, payload: AfterRentPaymentPayload) {
    const { playerId } = action.body;
    const player = this.playerService.getPlayer(playerId);
    const tile = this.matchService.getTileWithPlayer(player) as DeedTile & DynamicTile;
    const value = 2 * this.boardService.getTileValue(tile);
    if (player.state.money < value) return this.pubsubService.publishPlay(playerId, true);
    const playPayload = this.pubsubService.getPlayPayload(playerId, true);
    const deedAquirePayload = this.pubsubService.addActions(payload, {
      'deed-aquire-confirmed': {
        body: { playerId }
      }
    });
    const promptPayload = this.pubsubService.addActions(deedAquirePayload, playPayload.actions);
    this.promptService.publish(player, this.aquireDeedPromptFactory, 'deed-aquire-confirmed', promptPayload.actions);
  }

  @Gear('deed-aquire-confirmed')
  async onDeedAquireConfirmed(action: DeedAquireConfirmedAction) {
    const { playerId } = action.body;
    const player = this.playerService.getPlayer(playerId);
    const tile = this.matchService.getTileWithPlayer(player) as DeedTile & DynamicTile;
    this.matchService.setTileOwner(tile.name, player);
    this.matchService.setState(player.matchId, MatchState.MOVING);
    this.pubsubService.publishPlay(playerId, true);
  }
}
