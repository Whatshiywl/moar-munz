import { PromptPayload, Player, Prompt, PromptAction } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { PromptService } from "../prompt/prompt.service";
import { AIService } from "../shared/services/ai.service";
import { PlayerService } from "../shared/services/player.service";
import { SocketService } from "../socket/socket.service";
import { Engine, Gear } from "./engine.decorators";

@Engine()
@Injectable()
export class PromptEngine {

  constructor (
    private aiService: AIService,
    private socketService: SocketService,
    private playerService: PlayerService,
    private promptService: PromptService
  ) { }

  @Gear('prompt')
  async onPrompt<T>(action: PromptAction<T>, payload: PromptPayload<T>) {
    const { playerId } = action.body;
    const player = this.playerService.getPlayer(playerId);
    if (player.prompt) await this.updatePayload<T>(payload);
    else await this.promptPayload<T>(payload);
  }

  private async promptPayload<T>(payload: PromptPayload<T>) {
    const { playerId, prompt } = payload.actions.prompt.body;
    const player = this.playerService.getPlayer(playerId);
    player.prompt = payload;
    this.playerService.saveAndBroadcast(player);
    const client = player.ai ? undefined : this.socketService.getClient(player.id);
    if (!player.ai && !client) return;
    this.submitPrompt(player, prompt, client);
  }

  private submitPrompt(player: Player, prompt: Prompt, client?: SocketIO.Socket) {
    console.log(`Question: ${prompt.message}`);
    if (client) client.emit('new prompt', prompt);
    else this.aiService.answer(prompt).then(p => {
      this.promptService.answer(player.id, p);
    });
  }

  private updatePayload<T>(payload: PromptPayload<T>) {
    const { playerId, prompt } = payload.actions.prompt.body;
    const player = this.playerService.getPlayer(playerId);
    if (player.ai) return; // AIs are supposed to respond to prompts immediately, so no time/need for updates
    const client = this.socketService.getClient(player.id);
    if (!client || !prompt) return undefined;
    player.prompt = payload;
    this.playerService.saveAndBroadcast(player);
    client.emit('update prompt', prompt);
  }

}
