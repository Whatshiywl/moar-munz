import { Injectable } from "@angular/core";
import { SocketService } from "../socket/socket.service";
import { MatchService } from "./match.service";
import { sample } from 'lodash';
import { first } from 'rxjs/operators';
import { Prompt, PromptCallback } from "@moar-munz/api-interfaces";

@Injectable()
export class PromptService {
  // TODO: move debug state to store
  private debug: boolean;

  private _promptData: {
    prompt: Prompt<any>,
    callback?: PromptCallback
  };

  constructor(
    private socket: SocketService,
    private matchService: MatchService,
  ) {
    this.socket.on('new prompt', (prompt: Prompt, callback: PromptCallback) => {
      console.log('prompt received');
      this._promptData = { prompt, callback };
      if (this.debug) {
        setTimeout(() => {
          this.answer(sample(prompt.options));
        }, 100);
      }
      this.matchService.tileClicked$.pipe(first()).subscribe(tile => {
        const clickAnswer = prompt.options.find(o => o.includes(tile.name));
        if (clickAnswer) {
          this.answer(clickAnswer);
        }
      });
    });
    this.socket.on('update prompt', (prompt: Prompt) => {
      this._promptData.prompt = prompt;
    });
  }

  get awaitingResponse() { return Boolean(this._promptData); }
  get prompt() { return this._promptData.prompt; }

  answer(answer?: string | boolean) {
    if (this._promptData.callback) {
      this._promptData.callback(answer);
    }
    this._promptData = undefined;
  }
}
