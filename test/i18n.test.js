import test from 'node:test';
import assert from 'node:assert/strict';
import { translations, chooseLocale } from '../prototype/i18n.js';
import { runtimeSettings } from '../prototype/runtime.js';

test('Russian and English cover the same interface keys', () => {
  assert.deepEqual(Object.keys(translations.ru).sort(), Object.keys(translations.en).sort());
  assert.equal(chooseLocale('ru-RU'), 'ru');
  assert.equal(chooseLocale('fr-FR'), 'en');
});

test('OAuth callback excludes Trello context, authorization codes, and board IDs', () => {
  const settings = runtimeSettings('https://example.com/prototype/probe.html?board=TEST0001&clientId=public-client&code=secret&signature=unused');
  assert.equal(settings.redirectUri, 'https://example.com/prototype/authorize.html?clientId=public-client');
  assert.equal(settings.boardReference, 'TEST0001');
});
