import { Player, WorldtourTile } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { MatchService } from "../../shared/services/match.service";
import { AbstractPromptFactory } from "./abstract.factory";

@Injectable()
export class WorldtourPromptFactory extends AbstractPromptFactory<string> {

  constructor(
    private matchService: MatchService
  ) {
    super('worldtourPromptFactory');
  }

  async build(player: Player) {
    const board = this.matchService.getBoard(player.matchId);
    const tile = this.matchService.getTileWithPlayer(player) as WorldtourTile;
    const options = [ 'No', ...board.tiles.filter(t => {
        if (t.type !== 'deed') return false;
        if (t.owner && t.owner !== player.id) return false;
        return true;
    }).map(t => t.name) ];
    if (!options.length) return;
    const message = `Would you like to travel for ${tile.cost}?\nIf so, where to?`;
    return this.select(player, message, options);
  }

}
