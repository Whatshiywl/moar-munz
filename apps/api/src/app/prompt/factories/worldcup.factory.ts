import { Player, PromptAnswerPayload, RentableTile, WorldcupTile } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { BoardService } from "../../shared/services/board.service";
import { MatchService } from "../../shared/services/match.service";
import { PlayerService } from "../../shared/services/player.service";
import { PubSubService } from "../../shared/services/pubsub.service";
import { AbstractPromptFactory } from "./abstract.factory";

@Injectable()
export class WorldcupPromptFactory extends AbstractPromptFactory<string> {

  constructor(
    private playerService: PlayerService,
    private matchService: MatchService,
    private boardService: BoardService,
    private pubsubService: PubSubService
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
    return this.select(message, options);
  }

  async onAnswer(payload: PromptAnswerPayload<string>) {
    const { body, callback } = payload.actions["prompt-answer"];
    const { playerId, prompt } = body;
    const wcAnswerValue = prompt.answer.match(/^([^\(]+)/)[1].trim();
    const player = this.playerService.getPlayer(playerId);
    this.matchService.setWorldcup(player.matchId, wcAnswerValue);
    const checkBalancePayload = this.pubsubService.changeAction(payload, callback);
    this.pubsubService.publish(checkBalancePayload);
  }

}
