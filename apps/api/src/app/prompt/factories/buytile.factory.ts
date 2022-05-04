import { CompanyTile, Player, PromptAnswerPayload, RailroadTile, RentableTile } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { MatchService } from "../../shared/services/match.service";
import { PlayerService } from "../../shared/services/player.service";
import { PubSubService } from "../../shared/services/pubsub.service";
import { AbstractPromptFactory } from "./abstract.factory";

@Injectable()
export class BuyTilePromptFactory extends AbstractPromptFactory<boolean> {

  constructor(
    private playerService: PlayerService,
    private matchService: MatchService,
    private pubsubService: PubSubService
  ) {
    super('buyTilePromptFactory');
  }

  async build(player: Player) {
    const tile = this.matchService.getTileWithPlayer(player) as RentableTile;
    const message = `Would you like to buy ${tile.name} for ${tile.price}?`;
    return this.confirm(message);
  }

  async onAnswer(payload: PromptAnswerPayload<boolean>) {
    const { body, callback } = payload.actions["prompt-answer"];
    const { playerId, prompt: { answer } } = body;
    if (answer) this.processBuy(playerId);
    const checkBalancePayload = this.pubsubService.changeAction(payload, callback);
    this.pubsubService.publish(checkBalancePayload);
  }

  private processBuy(playerId: string) {
    const player = this.playerService.getPlayer(playerId);
    const board = this.matchService.getBoard(player.matchId);
    const tile = board.tiles[player.state.position] as CompanyTile | RailroadTile;
    if (tile.price > player.state.money) return;
    this.playerService.addMoney(player.id, -tile.price);
    this.matchService.setTileOwner(tile.name, player);
    if (tile.type === 'railroad') {
      this.matchService.getBoard(player.matchId).tiles
        .filter(t => t.type === 'railroad')
        .filter(t => t.owner === player.id)
        .map(t => t as RentableTile)
        .forEach((t, _, owned) => {
          this.matchService.setTileLevel(player.matchId, t.name, owned.length);
        });
    }
  }

}
