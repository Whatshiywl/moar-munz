import { Player, Prompt, PromptAnswerPayload } from "@moar-munz/api-interfaces";

export abstract class AbstractPromptFactory<T> {

  constructor(public readonly name: string) { }

  build(_: Player): Promise<Prompt<T>> {
    throw new Error(`Method build not implemented for factory ${this.name}`);
  }

  alert(message: string): Prompt<void> {
    return { factoryName: this.name, type: 'alert', message };
  }

  confirm(message: string): Prompt<boolean> {
    return { factoryName: this.name, type: 'confirm', message };
  }

  select(message: string, options: T[]): Prompt<T> {
    return { factoryName: this.name, type: 'select', message, options };
  }

  async onAnswer(_: PromptAnswerPayload<T>) {
    throw new Error(`Method onAnswer not implemented for factory ${this.name}`);
  }
}
