export type PromptType = 'alert' | 'confirm' | 'select';

export interface Prompt<T = any> {
  id: string,
  factoryName: string,
  type?: PromptType;
  message: string;
  options?: T[];
  answer?: T;
}

export type PromptCallback<T = any> = (answer: T) => void;
