import { test } from 'vitest';
import assert from 'node:assert/strict';
import { translations, chooseLocale } from '../src/i18n';
import { runtimeSettings } from '../src/trello/runtime';

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

test('new and legacy callback paths discard incoming query and fragments', () => {
  for (const prefix of ['', 'prototype/']) {
    const settings = runtimeSettings(`https://example.com/trello-exporter/${prefix}probe.html?board=TEST0001&clientId=public-client&code=synthetic#secret=synthetic`);
    assert.equal(settings.redirectUri, `https://example.com/trello-exporter/${prefix}authorize.html?clientId=public-client`);
  }
});

test('invalid public client IDs fail closed', () => {
  assert.throws(() => runtimeSettings('https://example.com/probe.html?clientId=bad%3Fvalue'));
});
