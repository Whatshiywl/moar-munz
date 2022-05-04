import { PubSubAction, PubSubActionObj, PubSubMessage, PubSubPayload } from "./pubsub.interfaces";

export type PromptType = 'alert' | 'confirm' | 'select';

export type Prompt<T = any> = {
  factoryName: string,
  type?: PromptType;
  message: string;
  options?: T[];
  answer?: T;
}

export type PromptBody<T> = { playerId: string, prompt: Prompt<T> };
export type PromptAction<T> = PubSubAction<PromptBody<T>>;
export type PromptObj<T> = PubSubActionObj<PromptAction<T>, 'prompt'>;
export type PromptPayload<T> = PubSubPayload<PromptObj<T>>;
export type PromptMessage<T> = PubSubMessage<PromptPayload<T>>;

export type PromptAnswerAction<T> = PubSubAction<PromptBody<T>>;
export type PromptAnswerObj<T> = PubSubActionObj<PromptAnswerAction<T>, 'prompt-answer'>;
export type PromptAnswerPayload<T> = PubSubPayload<PromptAnswerObj<T>>;
export type PromptAnswerMessage<T> = PubSubMessage<PromptAnswerPayload<T>>;
