import type { en } from './locales/en';

export enum Locale {
  Russian = 'ru',
  English = 'en',
}
export type MessageKey = keyof typeof en;
export type Messages = { [Key in MessageKey]: string };
