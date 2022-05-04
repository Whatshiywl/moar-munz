import { MatchState, Player, PromptAnswerPayload, WorldtourTile } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { MatchService } from "../../shared/services/match.service";
import { PlayerService } from "../../shared/services/player.service";
import { PubSubService } from "../../pubsub/pubsub.service";
import { AbstractPromptFactory } from "./abstract.factory";

@Injectable()
export class WorldtourPromptFactory extends AbstractPromptFactory<string> {

  constructor(
    private playerService: PlayerService,
    private matchService: MatchService,
    private pubsubService: PubSubService
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
    return this.select(message, options);
  }

  async onAnswer(payload: PromptAnswerPayload<string>) {
    const { body, callback } = payload.actions["prompt-answer"];
    const { playerId, prompt: { answer, options } } = body;
    if (answer !== options[0]) this.processTour(playerId, answer);
    const checkBalancePayload = this.pubsubService.changeAction(payload, callback);
    this.pubsubService.publish(checkBalancePayload);
  }

  private processTour(playerId: string, answer: string) {
    const player = this.playerService.getPlayer(playerId);
    const board = this.matchService.getBoard(player.matchId);
    const tile = board.tiles[player.state.position] as WorldtourTile;
    if (player.state.money < tile.cost) return;
    this.playerService.addMoney(playerId, -tile.cost);
    let goToIndex = board.tiles.findIndex(t => t.name === answer);
    if (goToIndex < player.state.position) goToIndex += board.tiles.length;
    const walkDistance = goToIndex - player.state.position;
    this.matchService.setLastDice(player.matchId, [undefined, undefined]);
    this.playerService.setWalkDistance(playerId, walkDistance);
    this.matchService.setState(player.matchId, MatchState.PLAYING);
    return;
  }

}
