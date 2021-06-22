import { DeedTile, Player } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { MatchService } from "../../shared/services/match.service";
import { AbstractPromptFactory } from "./abstract.factory";

@Injectable()
export class ImproveDeedPromptFactory extends AbstractPromptFactory<string> {

  constructor(
    private matchService: MatchService
  ) {
    super('improveDeedPromptFactory');
  }

  async build(player: Player) {
    const tile = this.matchService.getTileWithPlayer(player) as DeedTile;
    const options = [ 'No' ];
    for (let n = tile.level; n < tile.rent.length; n++) {
      const levelDifference = n + 1 - tile.level;
      const cost = tile.building * levelDifference;
      if (cost > this.matchService.getPlayerMoney(player)) break;
      options.push(`${n} (${cost})`);
    }
    if (options.length === 1) return;
    const message = `Would you like to improve your property?\nIf so, to how many houses (${tile.building} each extra)?`;
    return this.select(player, message, options);
  }

}
