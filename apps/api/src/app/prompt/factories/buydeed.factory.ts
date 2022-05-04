import { DeedTile, Player, PromptAnswerPayload } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { groupBy } from "lodash";
import { MatchService } from "../../shared/services/match.service";
import { PlayerService } from "../../shared/services/player.service";
import { PubSubService } from "../../shared/services/pubsub.service";
import { AbstractPromptFactory } from "./abstract.factory";

@Injectable()
export class BuyDeedPromptFactory extends AbstractPromptFactory<string> {

  constructor(
    private matchService: MatchService,
    private playerService: PlayerService,
    private pubsubService: PubSubService
  ) {
    super('buyDeedPromptFactory');
  }

  async build(player: Player) {
    const tile = this.matchService.getTileWithPlayer(player) as DeedTile;
    const options = [ 'No' ];
    for (let n = tile.level; n < tile.rent.length - 1; n++) {
      const levelDifference = n - tile.level;
      const cost = tile.building * levelDifference;
      if (tile.price + cost > this.playerService.getState(player.id)?.money) break;
      options.push(`${n} (${tile.price + cost})`);
    }
    if (options.length === 1) return;
    const message = `Would you like to buy ${tile.name} for ${tile.price}?\nIf so, how many houses do you want (${tile.building} each)?`;
    return this.select(message, options);
  }

  async onAnswer(payload: PromptAnswerPayload<string>) {
    const { body, callback } = payload.actions["prompt-answer"];
    const { playerId, prompt: { answer, options } } = body;
    const play = (answer === options[0]) || this.processBuy(playerId, answer);
    if (!play) return;
    const checkBalancePayload = this.pubsubService.changeAction(payload, callback);
    this.pubsubService.publish(checkBalancePayload);
  }

  private processBuy(playerId: string, answer: string) {
    const player = this.playerService.getPlayer(playerId);
    const board = this.matchService.getBoard(player.matchId);
    const tile = board.tiles[player.state.position] as DeedTile;
    const answerValue = parseInt(answer.match(/^([^\(]+)/)[1].trim(), 10);
    this.matchService.setTileOwner(tile.name, player);
    const levelDifference = answerValue - tile.level;
    const cost = tile.building * levelDifference;
    const amount = tile.price + cost;
    if (amount > player.state.money) return true;
    this.playerService.addMoney(player.id, -amount);
    this.matchService.setTileLevel(player.matchId, tile.name, answerValue + 1);
    const monopolies = this.getPlayerMonopolies(player);
    if (monopolies >= 4) {
      this.pubsubService.publishWin(playerId);
      return false;
    }
    return true;
  }

  private getPlayerMonopolies(player: Player) {
    const board = this.matchService.getBoard(player.matchId);
    const colorGroups = groupBy(board.tiles, 'color');
    let monopolies = 0;
    Object.keys(colorGroups)
      .filter(key => key !== 'undefined')
      .map(key => colorGroups[key])
      .forEach(group => {
        const ownedByPlayer = group.filter(t => t.owner === player.id);
        if (ownedByPlayer.length === group.length) monopolies++;
      });
    return monopolies;
  }

}
