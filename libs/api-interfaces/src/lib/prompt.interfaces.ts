export type PromptType = 'alert' | 'confirm' | 'select';

export interface Prompt<T = any> {
  factoryName: string,
  type?: PromptType;
  message: string;
  options?: T[];
  answer?: T;
}
