export interface TradeForm {
  tiles: string[],
  value: number,
  sentiment: 'negative' | 'question' | 'positive',
  confirmed: boolean
}

export interface TradeSide {
  player: string,
  form: TradeForm
}

export interface Trade {
  sides: [ TradeSide, TradeSide ]
}
