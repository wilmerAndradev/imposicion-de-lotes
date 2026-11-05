import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLayout } from './layoutEngine.js';

test('10 × 5 cm: diez piezas exactas por hoja Carta y A4', () => {
  for (const paperSize of ['letter', 'a4']) {
    const layout = calculateLayout({ paperSize, cardWidth: 100, cardHeight: 50, endNum: 21 });
    assert.equal(layout.cardsPerPage, 10);
    assert.equal(layout.totalPages, 3);
    assert.deepEqual(layout.pages.map(p => p.cards.length), [10, 10, 1]);
    assert.equal(layout.pages[0].cards[0].x, (layout.sheetWidth - 200) / 2);
    assert.equal(layout.pages[0].cards[0].y, (layout.sheetHeight - 250) / 2);
    assert.deepEqual(layout.pages.flatMap(p => p.cards.map(c => c.number)), Array.from({ length: 21 }, (_, i) => i + 1));
    for (const card of layout.pages.flatMap(p => p.cards)) {
      assert.equal(card.width, 100);
      assert.equal(card.height, 50);
      assert.ok(card.x + card.width <= layout.sheetWidth);
      assert.ok(card.y + card.height <= layout.sheetHeight);
    }
  }
});

test('horizontal mejora de seis a ocho; automática elige diez', () => {
  const config = { cardWidth: 100, cardHeight: 50, paperOrientation: 'landscape' };
  assert.equal(calculateLayout({ ...config, pageMargin: 10, gutterSize: 5 }).cardsPerPage, 6);
  assert.equal(calculateLayout(config).cardsPerPage, 8);
  assert.equal(calculateLayout({ ...config, paperOrientation: 'auto' }).cardsPerPage, 10);
});

test('automática también elige horizontal y respeta márgenes y separación', () => {
  const layout = calculateLayout({ cardWidth: 50, cardHeight: 100, pageMargin: 3, gutterSize: 2 });
  assert.equal(layout.resolvedOrientation, 'landscape');
  assert.equal(layout.cardsPerPage, 10);
  assert.ok(layout.pages[0].cards[0].x >= 3);
  assert.equal(layout.pages[0].cards[1].x - layout.pages[0].cards[0].x, 52);
});

test('10 × 5 cm con margen y separación de 0,5 cm: ocho piezas centradas', () => {
  const layout = calculateLayout({ cardWidth: 100, cardHeight: 50, pageMargin: 5, gutterSize: 5 });
  assert.equal(layout.cardsPerPage, 8);
  for (const page of layout.pages.filter(p => p.cards.length === 8)) {
    const first = page.cards[0];
    const last = page.cards.at(-1);
    const right = layout.sheetWidth - last.x - last.width;
    const bottom = layout.sheetHeight - last.y - last.height;
    assert.ok(Math.abs(first.x - right) < 1e-9);
    assert.ok(Math.abs(first.y - bottom) < 1e-9);
    assert.ok(first.x >= 5 && first.y >= 5);
    assert.ok(Math.abs(first.y - 32.2) < 1e-9);
    assert.equal(page.cards[1].x - first.x - first.width, 5);
    assert.equal(page.cards[2].y - first.y - first.height, 5);
  }
});

test('piezas inválidas o demasiado grandes no salen del papel', () => {
  for (const config of [{ cardWidth: 0 }, { cardHeight: -1 }, { cardWidth: 500 }, { pageMargin: 200 }, { gutterSize: -1 }]) {
    const layout = calculateLayout(config);
    assert.ok(layout.error);
    assert.equal(layout.cardsPerPage, 0);
    assert.equal(layout.pages[0].cards.length, 0);
  }
});

test('marcas visibles en PDF, dentro del papel y fuera de las piezas', () => {
  const layout = calculateLayout({ cardWidth: 100, cardHeight: 50 });
  const cards = layout.pages[0].cards;
  const lines = layout.getCropMarksForPage(cards);
  assert.equal(layout.showCropMarks, true);
  assert.ok(lines.length > 0);
  for (const line of lines) {
    assert.ok(line.x1 >= 0 && line.x2 <= layout.sheetWidth);
    assert.ok(line.y1 >= 0 && line.y2 <= layout.sheetHeight);
    for (const c of cards) {
      assert.ok(!(line.x1 === line.x2
        ? line.x1 >= c.x && line.x1 <= c.x + c.width && line.y2 > c.y && line.y1 < c.y + c.height
        : line.y1 >= c.y && line.y1 <= c.y + c.height && line.x2 > c.x && line.x1 < c.x + c.width));
    }
  }
  const hidden = calculateLayout({ showCropMarks: false });
  assert.deepEqual(hidden.getCropMarksForPage(hidden.pages[0].cards), []);
});
