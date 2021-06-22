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

  private readonly prompts: { [id: string]: Prompt };

  private answerSubject: Subject<Prompt>;

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
    this.prompts = { };
    this.answerSubject = new Subject<Prompt>();
  }

  alert(player: Player, message: string) {
    return this.processPrompt<void>('alert', player, message);
  }

  confirm(player: Player, message: string) {
    return this.processPrompt<boolean>('confirm', player, message);
  }

  select<T>(player: Player, message: string, options: T[]) {
    return this.processPrompt<T>('select', player, message, options);
  }

  getHash(player: Player) {
    return `${player.lobby}|${player.id}`;
  }

  async process<T extends void | boolean | string>(player: Player, factory: AbstractPromptFactory<T>): Promise<Prompt<T>> {
    const prompt = await factory.build(player);
    if (!prompt) return;
    if (!this.prompts[prompt.id]) {
      this.prompts[prompt.id] = prompt;
      return this.promptPlayer<T>(player, prompt)
    } else return this.updatePrompt<T>(player, prompt);
  }

  async update<T = any>(player: Player) {
    const hash = this.getHash(player);
    const prompt = this.prompts[hash];
    if (!prompt) return;
    const factory = this[prompt.factoryName] as AbstractPromptFactory<T>;
    if (!factory) return;
    if (!factory.build) return;
    if (factory.name !== prompt.factoryName) {
      console.error(`Factory name not matching! Expected ${prompt.factoryName}, got ${factory.name}`);
      return;
    }
    const newPrompt = await factory.build(player);
    this.prompts[hash] = newPrompt;
    return newPrompt;
  }

  private processPrompt<T>(type: PromptType, player: Player, message: string, options?: T[]) {
    const hash = this.getHash(player);
    const prompt: Prompt<T> = {
      id: hash, factoryName: 'none', type, message, options
    };
    if (!this.prompts[hash]) {
      this.prompts[hash] = prompt;
      return this.promptPlayer<T>(player, prompt);
    } else return this.updatePrompt<T>(player, prompt);
  }

  private promptPlayer<T>(player: Player, prompt: Prompt<T>) {
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

  private updatePrompt<T>(player: Player, prompt: Prompt) {
    if (player.ai) return;
    const client = this.socket.getClient(player.id);
    if (!client || !prompt) return undefined;
    const hash = prompt.id;
    this.prompts[hash] = prompt;
    client.emit('update prompt', prompt);
    return this.onAnswer$<T>(player);
  }

  onAnswer$<T>(player: Player) {
    const hash = this.getHash(player);
    return new Promise<Prompt<T>>((resolve, reject) => {
      let latest: Prompt;
      this.answerSubject.pipe(
        filter(prompt => {
          return prompt.id === hash;
        }),
        first()
      ).subscribe(
        (value: Prompt) => latest = value,
        (err: any) => reject(err),
        () => resolve(latest)
      );
    });
  }

  answer(playerId: string, prompt: Prompt) {
    console.log(`Answer: ${prompt.answer}`);
    const player = this.playerService.getPlayer(playerId);
    const hash = this.getHash(player);
    delete this.prompts[hash];
    this.answerSubject.next(prompt);
  }

}
