import test from 'node:test';
import assert from 'node:assert/strict';
import { detectLanguage, languageName, isCJK } from '../functions/lib/lang.js';
import { onRequestPost as rewrite } from '../functions/api/rewrite.js';
import { _resetForTests } from '../functions/lib/guard.js';

const zhText = '本專案旨在將人工智慧生成的文字改寫得更自然，讓讀者讀起來不會有生硬的感覺。系統會偵測輸入文字的語言，並以相同語言輸出，避免誤將中文當成西班牙文處理。';

test('detección: idiomas sin espacios por script', () => {
  assert.equal(detectLanguage(zhText), 'zh');
  assert.equal(detectLanguage('これは日本語のテストです。ひらがなとカタカナが含まれます。'), 'ja');
  assert.equal(detectLanguage('이것은 한국어 문장입니다. 테스트입니다.'), 'ko');
});

test('detección: latinos por palabras funcionales', () => {
  assert.equal(detectLanguage('The quick brown fox jumps over the lazy dog and this is a test of the system'), 'en');
  assert.equal(detectLanguage('El proyecto tiene una descripción para los usuarios que no es muy larga pero es útil'), 'es');
  assert.equal(detectLanguage('Le projet est une description pour les utilisateurs qui est dans le système'), 'fr');
  assert.equal(detectLanguage('Das Projekt ist eine Beschreibung für die Benutzer und nicht das System'), 'de');
});

test('detección: sin señal suficiente devuelve und', () => {
  assert.equal(detectLanguage(''), 'und');
  assert.equal(detectLanguage('xyz abc'), 'und');
  assert.equal(languageName('und'), 'the same language as the input text');
  assert.equal(languageName('und', 'es'), 'el mismo idioma que el texto de entrada');
});

test('isCJK reconoce los idiomas sin espacios', () => {
  assert.equal(isCJK(zhText), true);
  assert.equal(isCJK('plain english text'), false);
});

test('rewrite: texto chino se detecta como zh y no como es', async () => {
  _resetForTests();
  const res = await rewrite({
    request: new Request('https://rewrite.trujillomingorance.com/api/rewrite', {
      method: 'POST',
      headers: { Origin: 'https://rewrite.trujillomingorance.com', 'CF-Connecting-IP': '5.5.5.5', 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: zhText, mode: 'stealth', language: 'auto' })
    }),
    env: {}
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.language, 'zh');
  assert.equal(data.success, true);
});
