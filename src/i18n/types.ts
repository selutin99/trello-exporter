import type { en } from './locales/en';

export type Locale = 'ru' | 'en';
export type MessageKey = keyof typeof en;
export type Messages = { [Key in MessageKey]: string };
