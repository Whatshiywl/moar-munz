import { Injectable } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { Trade, TradeForm, TradeSide } from "@moar-munz/api-interfaces";
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
    this.socket.on('update trade', (side: TradeSide, callback: (confirmed: Trade | false) => void) => {
      console.log(Date.now(), 'incoming trade', side.player, side.form, side.hash);
      const tradeId = side.player;
      const meConfirmed = this.checkConfirmed(tradeId, side);
      const themConfirmed = side.form.confirmed;
      const theirSide = this._trades[tradeId].theirSide;
      this.tradeUpdated$.next(theirSide);
      if (!meConfirmed || !themConfirmed) callback(false);
      else {
        const mySide: TradeSide = {
          player: this.player.id,
          form: this._trades[tradeId].myForm.value
        };
        const trade: Trade = { sides: [ mySide, theirSide ] };
        callback(trade);
      }
    });

    this.socket.on('end trade', (id: string) => {
      const tradeData = this._trades[id];
      console.log(Date.now(), 'end trade', id, tradeData.myForm.value, tradeData.theirSide.form);
      this._trades[id].myForm.reset(this.newTradeForm(), { emitEvent: false });
      this._trades[id].theirSide = this.newTradeSide(id);
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
    console.log(Date.now(), 'outgoing trade', side.player, side.form, side.hash);
    this.socket.emit('update trade', { side, player: tradeId });
  }

  private updateTrade(tradeId: string, side: TradeSide) {
    const { hash } = this._trades[tradeId].theirSide;
    this._trades[tradeId].theirSide = side;
    if (hash && side.hash !== hash) {
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
    formGroup.valueChanges.subscribe(_ => {
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
      value: undefined,
      sentiment: 'question',
      confirmed: false
    } as TradeForm;
  }

}
