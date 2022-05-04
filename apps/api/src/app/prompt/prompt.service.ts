import { Player, Prompt, PromptAnswerObj, PromptAnswerPayload, PromptMessage, PromptObj, PromptPayload, PubSubActionObj, PubSubPayload } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import * as SocketIO from "socket.io";
import { SocketService } from "../socket/socket.service";
import { AIService } from "../shared/services/ai.service";
import { PlayerService } from "../shared/services/player.service";
import { AbstractPromptFactory } from "./factories/abstract.factory";
import { PubSubService } from "../shared/services/pubsub.service";
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
    private socket: SocketService,
    private aiService: AIService,
    private playerService: PlayerService,
    private pubsubService: PubSubService,
    public readonly worldtourPromptFactory: WorldtourPromptFactory,
    public readonly worldcupPromptFactory: WorldcupPromptFactory,
    public readonly buyDeedPromptFactory: BuyDeedPromptFactory,
    public readonly improveDeedPromptFactory: ImproveDeedPromptFactory,
    public readonly aquireDeedPromptFactory: AquireDeedPromptFactory,
    public readonly buyTilePromptFactory: BuyTilePromptFactory,
    public readonly sellTilesPromptFactory: SellTilesPromptFactory
  ) {
    this.pubsubService.on<PromptMessage<any>>('prompt')
    .subscribe(async ({ payload, ack }) => {
      await this.onPrompt(payload);
      ack();
    });

    // In theory, this is not needed, as answers come through client websocket or AI logic
    // this.pubsubService.on<PromptAnswerMessage<any>>('prompt-answer')
    // .subscribe(async ({ payload, ack }) => {
    //   await this.onAnswer(payload);
    //   ack();
    // });

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
      const payload = this.promptToPayload(player.id, prompt, callback, actions);
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

  private promptToPayload<T>(playerId: string, prompt: Prompt<T>, callback?: string, actions: PubSubActionObj<any> = { }) {
    const payload: PubSubPayload<PromptObj<T> | PromptAnswerObj<T>, 'prompt'> = {
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

  private async onPrompt<T>(payload: PromptPayload<T>) {
    const { playerId } = payload.actions.prompt.body;
    const player = this.playerService.getPlayer(playerId);
    if (player.prompt) await this.updatePayload<T>(payload);
    else await this.promptPayload<T>(payload);
  }

  private async onAnswer<T>(payload: PromptAnswerPayload<T>) {
    const action = payload.actions["prompt-answer"];
    const factory = this.factories.find(f => f.name === action.body.prompt.factoryName);
    await factory.onAnswer(payload);
  }

  private async promptPayload<T>(payload: PromptPayload<T>) {
    const { playerId, prompt } = payload.actions.prompt.body;
    const player = this.playerService.getPlayer(playerId);
    player.prompt = payload;
    this.playerService.saveAndBroadcast(player);
    const client = player.ai ? undefined : this.socket.getClient(player.id);
    if (!player.ai && !client) return;
    this.submitPrompt(player, prompt, client);
  }

  private submitPrompt(player: Player, prompt: Prompt, client?: SocketIO.Socket) {
    console.log(`Question: ${prompt.message}`);
    if (client) client.emit('new prompt', prompt);
    else this.aiService.answer(prompt).then(p => {
      this.answer(player.id, p);
    });
  }

  private updatePayload<T>(payload: PromptPayload<T>) {
    const { playerId, prompt } = payload.actions.prompt.body;
    const player = this.playerService.getPlayer(playerId);
    if (player.ai) return; // AIs are supposed to respond to prompts immediately, so no time/need for updates
    const client = this.socket.getClient(player.id);
    if (!client || !prompt) return undefined;
    player.prompt = payload;
    this.playerService.saveAndBroadcast(player);
    client.emit('update prompt', prompt);
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
