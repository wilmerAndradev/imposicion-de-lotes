/**
 * Motor de Imposición (Layout Engine)
 * Realiza los cálculos matemáticos de cuadrícula, distribución en páginas
 * y posicionamiento exacto de tarjetas y marcas de corte en milímetros.
 */

// Medidas predefinidas de papel en milímetros
export const PAPER_SIZES = {
  letter: { name: 'Carta', width: 215.9, height: 279.4 },
  a4: { name: 'A4', width: 210.0, height: 297.0 }
};

/**
 * Calcula la imposición (diagramación) completa para un lote de tarjetas.
 * 
 * @param {Object} config - Configuración seleccionada por el usuario
 * @returns {Object} Datos de cálculo de grilla, páginas y posiciones
 */
export function calculateLayout(config) {
  const {
    prefix = 'E',
    startNum = 1,
    endNum = 90,
    padZeros = 'none',
    cardWidth = 60,   // mm
    cardHeight = 40,  // mm
    paperSize = 'letter',
    paperOrientation = 'portrait',
    gutterSize = 5,   // mm (separación de corte)
    pageMargin = 10,  // mm
    showCropMarks = true,
    showCardOutline = true,
    cropMarkLength = 4, // mm
    cropMarkOffset = 1.5 // mm de distancia desde el borde
  } = config;

  // 1. Obtener dimensiones del papel según tamaño y orientación
  const basePaper = PAPER_SIZES[paperSize] || PAPER_SIZES.letter;
  const sheetWidth = paperOrientation === 'landscape' ? basePaper.height : basePaper.width;
  const sheetHeight = paperOrientation === 'landscape' ? basePaper.width : basePaper.height;

  // 2. Área utilizable en la hoja
  const usableWidth = sheetWidth - (pageMargin * 2);
  const usableHeight = sheetHeight - (pageMargin * 2);

  // 3. Calcular cuántas columnas y filas entran
  // Para N elementos con gutter G entre ellos: AnchoTotal = N*W + (N-1)*G <= usableWidth
  // => N*(W + G) - G <= usableWidth => N <= (usableWidth + G) / (W + G)
  const cols = Math.max(1, Math.floor((usableWidth + gutterSize) / (cardWidth + gutterSize)));
  const rows = Math.max(1, Math.floor((usableHeight + gutterSize) / (cardHeight + gutterSize)));
  const cardsPerPage = cols * rows;

  // 4. Centrar la grilla resultante en la hoja
  const totalGridWidth = (cols * cardWidth) + ((cols - 1) * gutterSize);
  const totalGridHeight = (rows * cardHeight) + ((rows - 1) * gutterSize);
  const startX = (sheetWidth - totalGridWidth) / 2;
  const startY = (sheetHeight - totalGridHeight) / 2;

  // 5. Eficiencia de uso de papel
  const usableArea = sheetWidth * sheetHeight;
  const usedArea = cardsPerPage * (cardWidth * cardHeight);
  const efficiency = Math.round((usedArea / usableArea) * 100);

  // 6. Generar lista de tarjetas con sus etiquetas numéricas
  const totalCards = Math.max(0, endNum - startNum + 1);
  const items = [];
  
  for (let i = 0; i < totalCards; i++) {
    const num = startNum + i;
    let numStr = String(num);
    if (padZeros === '2') numStr = numStr.padStart(2, '0');
    if (padZeros === '3') numStr = numStr.padStart(3, '0');

    const labelText = `${prefix}${numStr}`;
    items.push({
      index: i,
      number: num,
      labelText
    });
  }

  // 7. Agrupar tarjetas en páginas
  const totalPages = Math.ceil(totalCards / cardsPerPage) || 1;
  const pages = [];

  for (let p = 0; p < totalPages; p++) {
    const pageItems = items.slice(p * cardsPerPage, (p + 1) * cardsPerPage);
    const placedCards = [];

    pageItems.forEach((item, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);

      const x = startX + col * (cardWidth + gutterSize);
      const y = startY + row * (cardHeight + gutterSize);

      placedCards.push({
        ...item,
        x,
        y,
        width: cardWidth,
        height: cardHeight,
        col,
        row
      });
    });

    pages.push({
      pageIndex: p,
      pageNumber: p + 1,
      cards: placedCards
    });
  }

  // 8. Generar marcas de corte para la página si están activadas
  // Calculamos las líneas de corte para cada tarjeta colocada
  const getCropMarksForPage = (pageCards) => {
    if (!showCropMarks || pageCards.length === 0) return [];

    const lines = [];
    const len = cropMarkLength;
    const off = cropMarkOffset;

    // Para evitar marcas de corte duplicadas sobrepuestas, guardamos un set de claves
    const addedLines = new Set();

    const addLine = (x1, y1, x2, y2) => {
      const key = `${x1.toFixed(2)},${y1.toFixed(2)}-${x2.toFixed(2)},${y2.toFixed(2)}`;
      if (!addedLines.has(key)) {
        addedLines.add(key);
        lines.push({ x1, y1, x2, y2 });
      }
    };

    pageCards.forEach(c => {
      const left = c.x;
      const right = c.x + c.width;
      const top = c.y;
      const bottom = c.y + c.height;

      // Esquina Superior Izquierda (Top-Left)
      addLine(left - off - len, top, left - off, top);             // Horizontal Izq
      addLine(left, top - off - len, left, top - off);             // Vertical Arriba

      // Esquina Superior Derecha (Top-Right)
      addLine(right + off, top, right + off + len, top);           // Horizontal Der
      addLine(right, top - off - len, right, top - off);           // Vertical Arriba

      // Esquina Inferior Izquierda (Bottom-Left)
      addLine(left - off - len, bottom, left - off, bottom);       // Horizontal Izq
      addLine(left, bottom + off, left, bottom + off + len);       // Vertical Abajo

      // Esquina Inferior Derecha (Bottom-Right)
      addLine(right + off, bottom, right + off + len, bottom);     // Horizontal Der
      addLine(right, bottom + off, right, bottom + off + len);     // Vertical Abajo
    });

    return lines;
  };

  // 9. Determinar el texto de la etiqueta más larga del lote para uniformidad de tipografía
  const maxLabelText = items.reduce((max, item) => item.labelText.length > max.length ? item.labelText : max, items[0]?.labelText || `${prefix}${endNum}`);

  return {
    sheetWidth,
    sheetHeight,
    cardWidth,
    cardHeight,
    cols,
    rows,
    cardsPerPage,
    totalCards,
    totalPages,
    efficiency,
    pages,
    maxLabelText,
    showCardOutline,
    getCropMarksForPage
  };
}
