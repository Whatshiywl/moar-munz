export type TradeSentiment = 'negative' | 'question' | 'positive';

export interface TradeForm {
  tiles: string[],
  value: number,
  sentiment: TradeSentiment,
  confirmed: boolean
}

export interface TradeSide {
  player: string,
  form: TradeForm,
  hash?: string
}

export interface Trade {
  sides: [ TradeSide, TradeSide ]
}
