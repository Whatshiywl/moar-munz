export type PubSubActionBody = Record<string, unknown>;
export type PubSubAction<B extends PubSubActionBody = PubSubActionBody, C extends string = string> = { body: B, callback?: C };
export type PubSubActionObj<T extends PubSubAction = PubSubAction, A extends string = string> = Record<A, T>;

export interface PubSubPayload<O extends PubSubActionObj = PubSubActionObj, A extends (string | number | symbol) = keyof O> {
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
export type TransferObj = PubSubActionObj<PubSubAction<TransferBody>, 'transfer'>;
export type TransferPayload = PubSubPayload<TransferObj>;
export type TransferMessage = PubSubMessage<TransferPayload>;

export type TransferCompleteObj = PubSubActionObj<PubSubAction<TransferBody>, 'transfer-complete'>;
export type TransferCompletePayload = PubSubPayload<TransferCompleteObj>;
export type TransferCompleteMessage = PubSubMessage<TransferCompletePayload>;


export type AfterRentPaymentObj = PubSubActionObj<PubSubAction<{ playerId: string }>, 'after-rent-payment'>;
export type AfterRentPaymentPayload = PubSubPayload<AfterRentPaymentObj>;
export type AfterRentPaymentMessage = PubSubMessage<AfterRentPaymentPayload>;

export type DeedAquireConfirmedObj = PubSubActionObj<PubSubAction<{ playerId: string }>, 'deed-aquire-confirmed'>;
export type DeedAquireConfirmedPayload = PubSubPayload<DeedAquireConfirmedObj>;
export type DeedAquireConfirmedMessage = PubSubMessage<DeedAquireConfirmedPayload>;


export type DeductBody = { playerId: string, amount: number };
export type DeductObj = PubSubActionObj<PubSubAction<DeductBody>, 'deduct'>;
export type DeductPayload = PubSubPayload<DeductObj>;
export type DeductMessage = PubSubMessage<DeductPayload>;

export type CheckBalanceBody = DeductBody & { origin: string };
export type CheckBalanceObj = PubSubActionObj<PubSubAction<CheckBalanceBody>, 'check-balance'>;
export type CheckBalancePayload = PubSubPayload<CheckBalanceObj>;
export type CheckBalanceMessage = PubSubMessage<CheckBalancePayload>;


export type WinBody = { playerId: string };
export type WinObj = PubSubActionObj<PubSubAction<WinBody>, 'win'>;
export type WinPayload = PubSubPayload<WinObj>;
export type WinMessage = PubSubMessage<WinPayload>;
