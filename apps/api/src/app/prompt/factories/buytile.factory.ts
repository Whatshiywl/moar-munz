import { Player, RentableTile } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { MatchService } from "../../shared/services/match.service";
import { AbstractPromptFactory } from "./abstract.factory";

@Injectable()
export class BuyTilePromptFactory extends AbstractPromptFactory<boolean> {

  constructor(
    private matchService: MatchService,
  ) {
    super('buyTilePromptFactory');
  }

  async build(player: Player) {
    const tile = this.matchService.getTileWithPlayer(player) as RentableTile;
    const message = `Would you like to buy ${tile.name} for ${tile.price}?`;
    return this.confirm(player, message);
  }

}
