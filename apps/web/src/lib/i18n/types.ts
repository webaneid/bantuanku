export type Locale = "id" | "en";

export interface Messages {
  [key: string]: string | Messages;
}

export interface TranslateParams {
  [key: string]: string | number;
}
