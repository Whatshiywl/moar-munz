export type PubSubActionBody = Record<string, unknown>;
export type PubSubAction<B extends PubSubActionBody = PubSubActionBody, C extends string = string> = { body: B, callback?: C };
export type PubSubActionObj<T extends PubSubAction = PubSubAction, A extends string = string> = Record<A, T>;

export interface PubSubPayload<O extends PubSubActionObj = PubSubActionObj, A extends (string | number | symbol) = keyof O> {
  matchId: string,
  action: A,
  actions: O & PubSubActionObj
};

export interface PubSubMessage<P extends PubSubPayload = PubSubPayload> {
  payload: P,
  ack: () => void
}

export type PlayAction = PubSubAction<{ playerId: string, forceUnlock: boolean }>;
export type PlayObj = PubSubActionObj<PlayAction, 'play'>;
export type PlayPayload = PubSubPayload<PlayObj>;
export type PlayMessage = PubSubMessage<PlayPayload>;


export type TransferBody = { from: string, to: string, amount: number };
export type TransferAction = PubSubAction<TransferBody>;
export type TransferObj = PubSubActionObj<TransferAction, 'transfer'>;
export type TransferPayload = PubSubPayload<TransferObj>;
export type TransferMessage = PubSubMessage<TransferPayload>;

export type TransferCompleteAction = PubSubAction<TransferBody>;
export type TransferCompleteObj = PubSubActionObj<TransferCompleteAction, 'transfer-complete'>;
export type TransferCompletePayload = PubSubPayload<TransferCompleteObj>;
export type TransferCompleteMessage = PubSubMessage<TransferCompletePayload>;


export type AfterRentPaymentAction = PubSubAction<{ playerId: string }>;
export type AfterRentPaymentObj = PubSubActionObj<AfterRentPaymentAction, 'after-rent-payment'>;
export type AfterRentPaymentPayload = PubSubPayload<AfterRentPaymentObj>;
export type AfterRentPaymentMessage = PubSubMessage<AfterRentPaymentPayload>;

export type DeedAquireConfirmedAction = PubSubAction<{ playerId: string }>;
export type DeedAquireConfirmedObj = PubSubActionObj<DeedAquireConfirmedAction, 'deed-aquire-confirmed'>;
export type DeedAquireConfirmedPayload = PubSubPayload<DeedAquireConfirmedObj>;
export type DeedAquireConfirmedMessage = PubSubMessage<DeedAquireConfirmedPayload>;


export type DeductBody = { playerId: string, amount: number };
export type DeductAction = PubSubAction<DeductBody>;
export type DeductObj = PubSubActionObj<DeductAction, 'deduct'>;
export type DeductPayload = PubSubPayload<DeductObj>;
export type DeductMessage = PubSubMessage<DeductPayload>;

export type CheckBalanceBody = DeductBody & { origin: string };
export type CheckBalanceAction = PubSubAction<CheckBalanceBody>;
export type CheckBalanceObj = PubSubActionObj<CheckBalanceAction, 'check-balance'>;
export type CheckBalancePayload = PubSubPayload<CheckBalanceObj>;
export type CheckBalanceMessage = PubSubMessage<CheckBalancePayload>;


export type WinBody = { playerId: string };
export type WinAction = PubSubAction<WinBody>;
export type WinObj = PubSubActionObj<WinAction, 'win'>;
export type WinPayload = PubSubPayload<WinObj>;
export type WinMessage = PubSubMessage<WinPayload>;
