import { Player, Prompt } from "@moar-munz/api-interfaces";

export interface PromptFactory<T> {

  build(player: Player): Promise<Prompt<T>>;
  getHash(player: Player): string;

}
