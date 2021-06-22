import { Player } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { BoardService } from "../../shared/services/board.service";
import { MatchService } from "../../shared/services/match.service";
import { AbstractPromptFactory } from "./abstract.factory";

@Injectable()
export class SellTilesPromptFactory extends AbstractPromptFactory<string> {

  constructor(
    private matchService: MatchService,
    private boardService: BoardService
  ) {
    super('sellTilesPromptFactory');
  }

  async build(player: Player) {
    const properties = this.matchService.getPlayerProperties(player);
    const options = [ 'None', ...properties.map(prop => {
      const value = this.boardService.getTileValue(prop);
      return `${prop.name} (${value})`;
    }) ];
    const remainingAmount = Math.abs(this.matchService.getPlayerMoney(player));
    const message = `You must sell some properties.\nAmount remaining: ${remainingAmount}`;
    return this.select(player, message, options);
  }

}
