import { DeedTile, DynamicTile, OwnableTile, PlayAction, Player, PromptAnswerPayload } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { BoardService } from "../../shared/services/board.service";
import { MatchService } from "../../shared/services/match.service";
import { PlayerService } from "../../shared/services/player.service";
import { PubSubService } from "../../pubsub/pubsub.service";
import { AbstractPromptFactory } from "./abstract.factory";

@Injectable()
export class AquireDeedPromptFactory extends AbstractPromptFactory<boolean> {

  constructor(
    private matchService: MatchService,
    private boardService: BoardService,
    private playerService: PlayerService,
    private pubsubService: PubSubService
  ) {
    super('aquireDeedPromptFactory');
  }

  async build(player: Player) {
    const tile = this.matchService.getTileWithPlayer(player) as OwnableTile;
    const value = 2 * this.boardService.getTileValue(tile);
    const owner = this.playerService.getPlayer(tile.owner);
    const message = `Would you like to buy ${tile.name} from ${owner.name} for ${value}?`;
    return this.confirm(message);
  }

  async onAnswer(payload: PromptAnswerPayload<boolean>) {
    const { body, callback } = payload.actions["prompt-answer"];
    const { playerId, prompt } = body;
    const end = async () => {
      await this.pubsubService.publishPlay(playerId, (payload.actions['play'] as PlayAction).body.forceUnlock);
    };
    const player = this.playerService.getPlayer(playerId);
    if (!prompt?.answer) {
      return end();
    }
    const tile = this.matchService.getTileWithPlayer(player) as DeedTile & DynamicTile;
    if (tile.owner === player.id) {
      return end();
    }
    const value = 2 * this.boardService.getTileValue(tile);
    this.pubsubService.publishTransfer(player.id, tile.owner, value, callback, payload.actions);
  }

}
