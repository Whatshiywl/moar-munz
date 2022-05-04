import { Player, PromptAnswerPayload } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { BoardService } from "../../shared/services/board.service";
import { MatchService } from "../../shared/services/match.service";
import { PlayerService } from "../../shared/services/player.service";
import { PubSubService } from "../../pubsub/pubsub.service";
import { AbstractPromptFactory } from "./abstract.factory";

@Injectable()
export class SellTilesPromptFactory extends AbstractPromptFactory<string> {

  constructor(
    private matchService: MatchService,
    private boardService: BoardService,
    private playerService: PlayerService,
    private pubsubService: PubSubService
  ) {
    super('sellTilesPromptFactory');
  }

  async build(player: Player) {
    const properties = this.matchService.getPlayerProperties(player);
    const options = [ 'None', ...properties.map(prop => {
      const value = this.boardService.getTileValue(prop);
      return `${prop.name} (${value})`;
    }) ];
    const remainingAmount = Math.abs(this.playerService.getState(player.id)?.money);
    const message = `You must sell some properties.\nAmount remaining: ${remainingAmount}`;
    return this.select(message, options);
  }

  async onAnswer(payload: PromptAnswerPayload<string>) {
    const { body, callback } = payload.actions["prompt-answer"];
    const { playerId, prompt } = body;
    if (prompt && prompt.answer && prompt.answer !== prompt.options[0]) {
      this.processSell(playerId, prompt.answer);
    }
    const checkBalancePayload = this.pubsubService.changeAction(payload, callback);
    this.pubsubService.publish(checkBalancePayload);
  }

  private processSell(playerId: string, answer: string) {
    const player = this.playerService.getPlayer(playerId);
    const { matchId } = player;
    const properties = this.matchService.getPlayerProperties(player);
    const answerName = answer.match(/^([^\(]+)/)[1].trim();
    const answerTile = properties.find(t => t.name === answerName);
    if (!answerTile) return;
    const answerValue = this.matchService.getTileValue(matchId, answerName);
    this.matchService.removeOwnerFromTile(matchId, answerName);
    this.matchService.addPlayerMoney(player, answerValue);
    if (answerTile.type === 'railroad') {
      const board = this.matchService.getBoard(matchId);
      const ownedRails = board.tiles.filter(t => t.type === 'railroad' && t.owner === playerId);
      ownedRails.forEach(t => {
        this.matchService.setTileLevel(matchId, t.name, ownedRails.length);
      });
    }
  }

}
