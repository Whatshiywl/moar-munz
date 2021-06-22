import { OwnableTile, Player } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { BoardService } from "../../shared/services/board.service";
import { MatchService } from "../../shared/services/match.service";
import { PlayerService } from "../../shared/services/player.service";
import { AbstractPromptFactory } from "./abstract.factory";

@Injectable()
export class AquireDeedPromptFactory extends AbstractPromptFactory<boolean> {

  constructor(
    private matchService: MatchService,
    private boardService: BoardService,
    private playerService: PlayerService
  ) {
    super('aquireDeedPromptFactory');
  }

  async build(player: Player) {
    const tile = this.matchService.getTileWithPlayer(player) as OwnableTile;
    const value = 2 * this.boardService.getTileValue(tile);
    const owner = this.playerService.getPlayer(tile.owner);
    const message = `Would you like to buy ${tile.name} from ${owner.name} for ${value}?`;
    return this.confirm(player, message);
  }

}
