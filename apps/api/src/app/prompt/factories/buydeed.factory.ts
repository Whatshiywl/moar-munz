import { DeedTile, Player } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { MatchService } from "../../shared/services/match.service";
import { AbstractPromptFactory } from "./abstract.factory";

@Injectable()
export class BuyDeedPromptFactory extends AbstractPromptFactory<string> {

  constructor(
    private matchService: MatchService
  ) {
    super('buyDeedPromptFactory');
  }

  async build(player: Player) {
    const tile = this.matchService.getTileWithPlayer(player) as DeedTile;
    const options = [ 'No' ];
    for (let n = tile.level; n < tile.rent.length - 1; n++) {
      const levelDifference = n - tile.level;
      const cost = tile.building * levelDifference;
      if (tile.price + cost > this.matchService.getPlayerMoney(player)) break;
      options.push(`${n} (${tile.price + cost})`);
    }
    if (options.length === 1) return;
    const message = `Would you like to buy ${tile.name} for ${tile.price}?\nIf so, how many houses do you want (${tile.building} each)?`;
    return this.select(player, message, options);
  }

}
