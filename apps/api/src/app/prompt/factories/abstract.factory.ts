import { Player, Prompt } from "@moar-munz/api-interfaces";

export abstract class AbstractPromptFactory<T> {

  constructor(public readonly name: string) { }

  build(_: Player): Promise<Prompt<T>> {
    throw new Error(`Method not implemented for ${this.name}`);
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
}
