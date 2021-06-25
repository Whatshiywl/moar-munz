import { Injectable } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { TradeForm, TradeSide } from "@moar-munz/api-interfaces";
import { Subject } from "rxjs";
import { SocketService } from "../socket/socket.service";
import { PlayerService } from "./player.service";

interface TradeData {
  myForm: FormGroup,
  theirSide: TradeSide
}

@Injectable()
export class TradeService {

  private _activeTrade: string;
  private _trades: {
    [id: string]: TradeData
  } = { };

  public readonly tradeUpdated$: Subject<TradeSide>;

  constructor(
    private socket: SocketService,
    private playerService: PlayerService,
    private fb: FormBuilder
  ) {
    this.tradeUpdated$ = new Subject<TradeSide>();
    this.socket.on('update trade', (side: TradeSide, callback: (confirmed: boolean) => void) => {
      const tradeId = side.player;
      const confirmed = this.checkConfirmed(tradeId, side);
      console.log('trade updated', this._trades[tradeId].theirSide);
      this.tradeUpdated$.next(this._trades[tradeId].theirSide);
      callback(confirmed);
    });
  }

  private checkConfirmed(tradeId: string, side: TradeSide) {
    const tradeData = this._trades[tradeId];
    if (tradeData) this.updateTrade(tradeId, side);
    else this.createNewTrade(tradeId, side);
    return this._trades[tradeId].myForm.get('confirmed').value;
  }

  get activeTrade() { return this._activeTrade }
  set activeTrade(tradeId: string) {
    this._activeTrade = tradeId;
    if (!tradeId) return;
    if (!this._trades[tradeId]) {
      this.createNewTrade(tradeId);
    }
  }

  get tradeData() { return this._trades[this.activeTrade] }
  get player() { return this.playerService.player }

  update(tradeId?: string) {
    tradeId = tradeId || this.activeTrade;
    const tradeData = this._trades[tradeId];
    const form = tradeData.myForm.value as TradeForm;
    const side: TradeSide = { player: this.player.id, form };
    console.log('updating side', side);
    this.socket.emit('update trade', { side, player: tradeId });
  }

  private updateTrade(tradeId: string, side: TradeSide) {
    const otherSide = this._trades[tradeId].theirSide;
    this._trades[tradeId].theirSide = side;
    if (side.hash !== otherSide.hash) {
      this._trades[tradeId].myForm.get('confirmed').setValue(false);
      this.update(tradeId);
    }
  }

  private createNewTrade(tradeId: string, side?: TradeSide) {
    const form = this.newTradeForm();
    const formGroup = this.fb.group({
      tiles: this.fb.array(form.tiles),
      value: this.fb.control(form.value || ''),
      sentiment: this.fb.control(form.sentiment),
      confirmed: this.fb.control(form.confirmed)
    });
    side = side || this.newTradeSide(tradeId);
    this._trades[tradeId] = {
      theirSide: side,
      myForm: formGroup
    };
    formGroup.valueChanges.subscribe(value => {
      this.update(tradeId);
    });
  }

  private newTradeSide(player: string) {
    return {
      player,
      form: this.newTradeForm()
    } as TradeSide;
  }

  private newTradeForm() {
    return {
      tiles: [ ],
      value: 0,
      sentiment: 'question',
      confirmed: false
    } as TradeForm;
  }

}
