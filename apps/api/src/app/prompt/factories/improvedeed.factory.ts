import { DeedTile, DynamicTile, Player, PromptAnswerPayload } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { MatchService } from "../../shared/services/match.service";
import { PlayerService } from "../../shared/services/player.service";
import { PubSubService } from "../../pubsub/pubsub.service";
import { AbstractPromptFactory } from "./abstract.factory";

@Injectable()
export class ImproveDeedPromptFactory extends AbstractPromptFactory<string> {

  constructor(
    private matchService: MatchService,
    private playerService: PlayerService,
    private pubsubService: PubSubService
  ) {
    super('improveDeedPromptFactory');
  }

  async build(player: Player) {
    const tile = this.matchService.getTileWithPlayer(player) as DeedTile;
    const options = [ 'No' ];
    for (let n = tile.level; n < tile.rent.length; n++) {
      const levelDifference = n + 1 - tile.level;
      const cost = tile.building * levelDifference;
      if (cost > this.playerService.getState(player.id)?.money) break;
      options.push(`${n} (${cost})`);
    }
    if (options.length === 1) return;
    const message = `Would you like to improve your property?\nIf so, to how many houses (${tile.building} each extra)?`;
    return this.select(message, options);
  }

  async onAnswer(payload: PromptAnswerPayload<string>) {
    const { body, callback } = payload.actions["prompt-answer"];
    const { playerId, prompt: { answer, options } } = body;
    const player = this.playerService.getPlayer(playerId);
    if (answer !== options[0]) {
      this.processImprovement(player, answer);
    }
    const checkBalancePayload = this.pubsubService.changeAction(payload, callback);
    this.pubsubService.publish(checkBalancePayload);
  }

  private processImprovement(player: Player, answer: string) {
    const tile = this.matchService.getTileWithPlayer(player) as DeedTile & DynamicTile;
    if (tile.owner !== player.id) return;
    const answerValue = parseInt(answer.match(/^([^\(]+)/)[1].trim(), 10);
    const levelDifference = answerValue + 1 - tile.level;
    const cost = tile.building * levelDifference;
    if (cost > this.playerService.getState(player.id)?.money) return;
    this.playerService.addMoney(player.id, -cost);
    this.matchService.setTileLevel(player.matchId, tile.name, answerValue + 1);
  }

}
