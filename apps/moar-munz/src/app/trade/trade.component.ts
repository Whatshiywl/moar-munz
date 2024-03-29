import { Component } from "@angular/core";
import { TradeSentiment } from "@moar-munz/api-interfaces";
import { TradeService } from "../shared/services/trade.service";

@Component({
  selector: 'moar-munz-trade',
  templateUrl: './trade.component.html',
  styleUrls: ['./trade.component.scss']
})
export class TradeComponent {

  constructor(
    public tradeService: TradeService
  ) { }

  get tradeData() { return this.tradeService.tradeData }

  toggleConfirm() {
    const confirmed = this.tradeData.myForm.get('confirmed').value;
    this.tradeData.myForm.get('confirmed').setValue(!confirmed);
  }

  setSentiment(sentiment: TradeSentiment) {
    this.tradeData.myForm.get('sentiment').setValue(sentiment);
  }

  isMySentiment(sentiment: TradeSentiment) {
    return this.tradeData.myForm.get('sentiment').value === sentiment;
  }

  isTheirSentiment(sentiment: TradeSentiment) {
    return this.tradeData.theirSide.form.sentiment === sentiment;
  }

  removeTile(tileName: string) {
    this.tradeService.toggleTile(tileName);
  }

}
