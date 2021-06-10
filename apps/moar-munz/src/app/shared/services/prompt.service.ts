import { Injectable } from "@angular/core";
import { SocketService } from "../socket/socket.service";
import { MatchService } from "./match.service";
import { sample } from 'lodash';
import { first } from 'rxjs/operators';

@Injectable()
export class PromptService {
  // TODO: move debug state to store
  private debug: boolean;
  private _awaitingResponse: boolean;

  private _notificationData: {
    message: string;
    options?: string[];
    callback?: (answer: string) => void;
  };

  constructor(
    private socket: SocketService,
    private matchService: MatchService,
  ) {
    this.socket.on('ask question', (question, callback) => {
      console.log('question asked')
      this._awaitingResponse = true;
      this._notificationData = { ...question, callback };
      if (this.debug) {
        setTimeout(() => {
          this.answer(sample(question.options));
        }, 100);
      }
      this.matchService.tileClicked$.pipe(first()).subscribe(tile => {
        const clickAnswer = question.options.find(o => o.includes(tile.name));
        if (clickAnswer) {
          this.answer(clickAnswer);
        }
      });
    });
    this.socket.on('notification', (message: string) => {
      this._notificationData = { message };
    });
  }

  get awaitingResponse() { return this._awaitingResponse; }
  get notificationData() { return this._notificationData; }

  answer(answer: string) {
    if (this._notificationData.callback) {
      this._notificationData.callback(answer);
    }
    this._notificationData = undefined;
    this._awaitingResponse = false;
  }
}
