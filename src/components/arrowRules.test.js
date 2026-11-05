import test from 'node:test';
import assert from 'node:assert/strict';
import { compileArrowRules, resolveCardArrow } from './arrowRules.js';
import { calculateLayout } from './layoutEngine.js';
import { generateCardSvgContent } from './templateEngine.js';

test('solo 1, 5 y 7 tienen flechas, con direcciones distintas y en todas las páginas', () => {
  const rules = compileArrowRules({ up: '1, 5', right: '7' });
  assert.deepEqual(rules.errors, []);
  const selection = { mode: 'selected', ...rules };
  const layout = calculateLayout({ prefix: 'Ñ', padZeros: '3', cardWidth: 100, cardHeight: 100, endNum: 12 });
  assert.ok(layout.totalPages > 1);
  for (const card of layout.pages.flatMap(p => p.cards)) {
    const arrow = resolveCardArrow(card, 'down', true, selection);
    assert.equal(arrow.showArrow, [1, 5, 7].includes(card.number));
    if (arrow.showArrow) assert.equal(arrow.direction, card.number === 7 ? 'right' : 'up');
    const svg = generateCardSvgContent(card.labelText, card.width, card.height, arrow.direction, layout.maxLabelText, '#0090ff', arrow.showArrow);
    assert.equal(svg.includes('<path'), arrow.showArrow);
  }
});

test('listas aceptan separadores y ceros, rechazan valores inválidos y orientaciones duplicadas', () => {
  assert.deepEqual(compileArrowRules({ down: '01, 5; 7\n9 9' }).directionsByNumber, { 1: 'down', 5: 'down', 7: 'down', 9: 'down' });
  assert.equal(compileArrowRules({ up: '1', down: '1' }).errors.length, 1);
  for (const input of ['1.5', '-1', 'A1', '1-7', '9007199254740992']) {
    assert.ok(compileArrowRules({ up: input }).errors.length > 0);
  }
});

test('interruptor general, listas vacías, todas las tarjetas y tarjetas sin numeración', () => {
  const selection = { mode: 'selected', directionsByNumber: { 1: 'up' } };
  assert.equal(resolveCardArrow({ number: 1 }, 'down', false, selection).showArrow, false);
  assert.equal(resolveCardArrow({ number: null }, 'down', true, selection).showArrow, false);
  assert.equal(resolveCardArrow({ number: 1 }, 'down', true, { mode: 'selected', directionsByNumber: {} }).showArrow, false);
  assert.deepEqual(resolveCardArrow({ number: 2 }, 'left', true, { mode: 'all' }), { showArrow: true, direction: 'left' });
});
