import { Injectable } from "@angular/core";
import { SocketService } from "../socket/socket.service";
import { MatchService } from "./match.service";
import { sample } from 'lodash';
import { Prompt } from "@moar-munz/api-interfaces";

@Injectable()
export class PromptService {
  // TODO: move debug state to store
  private debug: boolean;

  private _prompt: Prompt;

  constructor(
    private socket: SocketService,
    private matchService: MatchService,
  ) {
    this.matchService.tileClicked$.pipe().subscribe(tile => {
      if (!this._prompt || !this.prompt.options) return;
      const clickAnswer = this._prompt.options.find(o => o.includes(tile.name));
      if (clickAnswer) {
        this.answer(clickAnswer);
      }
    });
    this.socket.onPromptNew$.subscribe(({ payload: prompt }) => {
      console.log('prompt received');
      this._prompt = prompt;
      if (this.debug) {
        setTimeout(() => {
          this.answer(sample(prompt.options));
        }, 100);
      }
    });
    this.socket.onPromptUpdate$.subscribe(({ payload: prompt }) => {
      this._prompt = prompt;
    });
  }

  get awaitingResponse() { return Boolean(this._prompt); }
  get prompt() { return this._prompt; }

  answer(answer?: string | boolean) {
    this._prompt.answer = answer;
    this.socket.emit('prompt answer', this._prompt);
    this._prompt = undefined;
  }
}
