import { Player, Prompt, PromptAnswerObj, PromptAnswerPayload, PromptObj, PubSubActionObj, PubSubPayload } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { PlayerService } from "../shared/services/player.service";
import { AbstractPromptFactory } from "./factories/abstract.factory";
import { PubSubService } from "../pubsub/pubsub.service";
import { WorldtourPromptFactory } from "./factories/worldtour.factory";
import { WorldcupPromptFactory } from "./factories/worldcup.factory";
import { BuyDeedPromptFactory } from "./factories/buydeed.factory";
import { ImproveDeedPromptFactory } from "./factories/improvedeed.factory";
import { AquireDeedPromptFactory } from "./factories/aquiredeed.factory";
import { BuyTilePromptFactory } from "./factories/buytile.factory";
import { SellTilesPromptFactory } from "./factories/selltiles.factory";

@Injectable()
export class PromptService {

  private factories: AbstractPromptFactory<any>[];

  constructor(
    private playerService: PlayerService,
    private pubsubService: PubSubService,
    private worldtourPromptFactory: WorldtourPromptFactory,
    private worldcupPromptFactory: WorldcupPromptFactory,
    private buyDeedPromptFactory: BuyDeedPromptFactory,
    private improveDeedPromptFactory: ImproveDeedPromptFactory,
    private aquireDeedPromptFactory: AquireDeedPromptFactory,
    private buyTilePromptFactory: BuyTilePromptFactory,
    private sellTilesPromptFactory: SellTilesPromptFactory
  ) {

    this.factories = [
      this.worldtourPromptFactory,
      this.worldcupPromptFactory,
      this.buyDeedPromptFactory,
      this.improveDeedPromptFactory,
      this.aquireDeedPromptFactory,
      this.buyTilePromptFactory,
      this.sellTilesPromptFactory
    ];
  }

  async publish<T extends void | boolean | string>(player: Player, factory: AbstractPromptFactory<T>, callback: string, actions: PubSubActionObj<any> = { }): Promise<boolean> {
    const prompt = await factory.build(player);
    if (prompt) {
      const payload = this.promptToPayload(player.matchId, player.id, prompt, callback, actions);
      this.pubsubService.publish(payload);
      return false;
    } else {
      this.pubsubService.publish({
        action: callback,
        actions
      });
      return true;
    }
  }

  private promptToPayload<T>(matchId: string, playerId: string, prompt: Prompt<T>, callback?: string, actions: PubSubActionObj<any> = { }) {
    const payload: PubSubPayload<PromptObj<T> | PromptAnswerObj<T>, 'prompt'> = {
      matchId,
      action: 'prompt',
      actions: {
        ...actions,
        prompt: {
          body: { playerId: playerId, prompt }
        },
        'prompt-answer': {
          body: { playerId: playerId, prompt },
          callback
        }
      }
    };
    return payload;
  }

  private async onAnswer<T>(payload: PromptAnswerPayload<T>) {
    const action = payload.actions["prompt-answer"];
    const factory = this.factories.find(f => f.name === action.body.prompt.factoryName);
    await factory.onAnswer(payload);
  }

  answer(playerId: string, prompt: Prompt) {
    console.log(`Answer: ${prompt.answer}`);
    const player = this.playerService.getPlayer(playerId);
    const payload = player.prompt;
    delete player.prompt;
    this.playerService.saveAndBroadcast(player);
    const answerPayload = this.pubsubService.changeAction<PromptAnswerPayload<any>>(payload, 'prompt-answer');
    answerPayload.actions["prompt-answer"].body.prompt = prompt;
    this.onAnswer(answerPayload)
    .catch(err => console.error(err));
  }

}
