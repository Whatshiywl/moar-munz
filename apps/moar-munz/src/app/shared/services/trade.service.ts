import { Injectable } from "@angular/core";
import { Trade } from "@moar-munz/api-interfaces";
import { SocketService } from "../socket/socket.service";

@Injectable()
export class TradeService {

  activeTrade: string;
  private _trades: {
    [is: string]: Trade
  };

  constructor(
    private socket: SocketService
  ) { }

  get trade() { return this._trades[this.activeTrade] }

  update() {
    if (!this.activeTrade) return;
    this.socket.emit('update trade', this._trades[this.activeTrade]);
  }

}
