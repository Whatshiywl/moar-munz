import { Player, Prompt, PromptType } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import * as SocketIO from "socket.io";
import { SocketService } from "../socket/socket.service";
import { AIService } from "../shared/services/ai.service";
import { PlayerService } from "../shared/services/player.service";
import { Subject } from "rxjs";
import { filter, first } from "rxjs/operators";
import { AbstractPromptFactory } from "./factories/abstract.factory";
import { WorldtourPromptFactory } from "./factories/worldtour.factory";
import { WorldcupPromptFactory } from "./factories/worldcup.factory";
import { BuyDeedPromptFactory } from "./factories/buydeed.factory";
import { ImproveDeedPromptFactory } from "./factories/improvedeed.factory";
import { AquireDeedPromptFactory } from "./factories/aquiredeed.factory";
import { BuyTilePromptFactory } from "./factories/buytile.factory";
import { SellTilesPromptFactory } from "./factories/selltiles.factory";

@Injectable()
export class PromptService {

  private answerSubject: Subject<{ playerId: string, prompt: Prompt }>;

  constructor(
    private socket: SocketService,
    private aiService: AIService,
    private playerService: PlayerService,
    public readonly worldtourPromptFactory: WorldtourPromptFactory,
    public readonly worldcupPromptFactory: WorldcupPromptFactory,
    public readonly buyDeedPromptFactory: BuyDeedPromptFactory,
    public readonly improveDeedPromptFactory: ImproveDeedPromptFactory,
    public readonly aquireDeedPromptFactory: AquireDeedPromptFactory,
    public readonly buyTilePromptFactory: BuyTilePromptFactory,
    public readonly sellTilesPromptFactory: SellTilesPromptFactory
  ) {
    this.answerSubject = new Subject<{ playerId: string, prompt: Prompt }>();
  }

  typeGuard<T extends void | boolean | string>(prompt: Prompt<any>, ...factories: AbstractPromptFactory<T>[]): prompt is Prompt<T> {
    return factories.reduce((acc, factory) => acc || prompt.factoryName === factory.name, false);
  }

  async process<T extends void | boolean | string>(player: Player, factory: AbstractPromptFactory<T>): Promise<Prompt<T>> {
    const prompt = await factory.build(player);
    if (!prompt) return;
    if (player.prompt) return this.updatePrompt<T>(player, prompt);
    else return this.promptPlayer<T>(player, prompt);
  }

  private promptPlayer<T>(player: Player, prompt: Prompt<T>) {
    player.prompt = prompt;
    this.playerService.savePlayer(player);
    const client = player.ai ? undefined : this.socket.getClient(player.id);
    if (!player.ai && !client) return;
    return this.submitPrompt<T>(player, prompt, client);
  }

  private submitPrompt<T>(player: Player, prompt: Prompt, client?: SocketIO.Socket) {
    console.log(`Question: ${prompt.message}`);
    if (client) client.emit('new prompt', prompt);
    else this.aiService.answer(prompt).then(p => {
      this.answer(player.id, p);
    });
    return this.onAnswer$<T>(player);
  }

  async update<T = any>(player: Player) {
    const prompt = player.prompt;
    if (!prompt) return;
    const factory = this[prompt.factoryName] as AbstractPromptFactory<T>;
    if (!factory) return;
    if (!factory.build) return;
    if (factory.name !== prompt.factoryName) {
      console.error(`Factory name not matching! Expected ${prompt.factoryName}, got ${factory.name}`);
      return;
    }
    const newPrompt = await factory.build(player);
    return this.updatePrompt<T>(player, newPrompt);
  }

  private updatePrompt<T>(player: Player, prompt: Prompt) {
    if (player.ai) return;
    const client = this.socket.getClient(player.id);
    if (!client || !prompt) return undefined;
    player.prompt = prompt;
    this.playerService.savePlayer(player);
    client.emit('update prompt', prompt);
    return this.onAnswer$<T>(player);
  }

  onAnswer$<T>(player: Player) {
    return new Promise<Prompt<T>>((resolve, reject) => {
      let latest: Prompt;
      this.answerSubject.pipe(
        filter(({ playerId }) => {
          return playerId === player.id;
        }),
        first()
      ).subscribe(
        ({ prompt }) => latest = prompt,
        (err: any) => reject(err),
        () => resolve(latest)
      );
    });
  }

  answer(playerId: string, prompt: Prompt) {
    console.log(`Answer: ${prompt.answer}`);
    const player = this.playerService.getPlayer(playerId);
    delete player.prompt;
    this.answerSubject.next({ playerId, prompt });
  }

}
