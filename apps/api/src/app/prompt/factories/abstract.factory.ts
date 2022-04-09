import { Player, Prompt } from "@moar-munz/api-interfaces";
import { PromptFactory } from "./prompt.factory";

export abstract class AbstractPromptFactory<T> implements PromptFactory<T> {

  constructor(public readonly name: string) { }

  build(player: Player): Promise<Prompt<T>> {
    throw new Error("Method not implemented.");
  }

  getHash(player: Player): string {
    return `${player.matchId}|${player.id}`;
  }

  alert(player: Player, message: string): Prompt<void> {
    const id = this.getHash(player);
    return { id, factoryName: this.name, type: 'alert', message };
  }

  confirm(player: Player, message: string): Prompt<boolean> {
    const id = this.getHash(player);
    return { id, factoryName: this.name, type: 'confirm', message };
  }

  select(player: Player, message: string, options: T[]): Prompt<T> {
    const id = this.getHash(player);
    return { id, factoryName: this.name, type: 'select', message, options };
  }
}
