import { Player, Prompt, PromptType } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import * as SocketIO from "socket.io";
import { SocketService } from "../../socket/socket.service";
import { AIService } from "./ai.service";

@Injectable()
export class PromptService {

  private readonly prompts: { [id: string]: {
    prompt: Prompt, promise: Promise<Prompt>
  } };

  constructor(
    private socket: SocketService,
    private aiService: AIService
  ) {
    this.prompts = { };
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

  private processPrompt<T>(type: PromptType, player: Player, message: string, options?: T[]) {
    const prompt: Prompt<T> = {
      type, message, options
    };
    const hash = this.getHash(player);
    if (!this.prompts[hash]) {
      const promise = this.promptPlayer<T>(player, prompt);
      this.prompts[hash] = {
        prompt, promise
      };
      return promise;
    } else return this.updatePrompt<T>(player, prompt);
  }

  private promptPlayer<T>(player: Player, prompt: Prompt<T>) {
    const client = player.ai ? undefined : this.socket.getClient(player.id);
    if (!player.ai && !client) return;
    const hash = this.getHash(player);
    return this.submitPrompt<T>(hash, prompt, client);
  }

  private submitPrompt<T>(hash: string, prompt: Prompt, client?: SocketIO.Socket) {
    return new Promise<Prompt<T>>((resolve, reject) => {
      const onAnswer = ((answer: T) => {
        console.log(`Answer: ${answer}`);
        const prompt = this.prompts[hash].prompt;
        delete this.prompts[hash];
        prompt.answer = answer;
        resolve(prompt);
      }).bind(this);

      console.log(`Question: ${prompt.message}`);
      if (client) client.emit('new prompt', prompt, onAnswer);
      else this.aiService.answer(prompt).then(onAnswer);
    });
  }

  private updatePrompt<T>(player: Player, prompt: Prompt) {
    if (player.ai) return;
    const client = this.socket.getClient(player.id);
    if (!client || !prompt) return undefined;
    const hash = this.getHash(player);
    const promptData = this.prompts[hash];
    promptData.prompt = prompt;
    client.emit('update prompt', prompt);
    return promptData.promise as Promise<Prompt<T>>;
  }

}
