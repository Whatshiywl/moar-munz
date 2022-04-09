import { Player, RentableTile, WorldcupTile } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { BoardService } from "../../shared/services/board.service";
import { MatchService } from "../../shared/services/match.service";
import { AbstractPromptFactory } from "./abstract.factory";

@Injectable()
export class WorldcupPromptFactory extends AbstractPromptFactory<string> {

  constructor(
    private matchService: MatchService,
    private boardService: BoardService
  ) {
    super('worldcupPromptFactory');
  }

  async build(player: Player) {
    const board = this.matchService.getBoard(player.matchId);
    const tile = this.matchService.getTileWithPlayer(player) as WorldcupTile;
    const deeds = board.tiles.filter(t => t.type === 'deed') as RentableTile[];
    const options = deeds.filter(t => {
        if (!t.owner || t.owner !== player.id) return false;
        return true;
    }).map(t => {
        const rent = this.boardService.getFullRent(board, t) / (t.worldcup ? 2 : 1);
        return `${t.name} (${rent})`;
    });
    if (!options.length) return;
    const tileName = tile.name.toLocaleLowerCase();
    const message = `Set the location to host the next ${tileName}!`;
    return this.select(player, message, options);
  }

}
