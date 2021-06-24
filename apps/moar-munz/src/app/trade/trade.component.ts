import { Component } from "@angular/core";
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

}
