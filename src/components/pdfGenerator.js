/**
 * Motor de Generación PDF (PDF Generator)
 * Utiliza jsPDF para construir el documento PDF vectorial multipágina listo para impresión.
 * Genera texto y flecha azul gigantes que abarcan entre el 80-85% del alto de la tarjeta.
 */

import { jsPDF } from 'jspdf';

/**
 * Genera y descarga el archivo PDF de la imposición completa.
 */
export function generatePdf(layoutData, arrowDirection = 'down', filename = 'lote_impresion.pdf', arrowColor = '#0090ff') {
  const {
    sheetWidth,
    sheetHeight,
    pages,
    getCropMarksForPage
  } = layoutData;

  const orientation = sheetWidth > sheetHeight ? 'landscape' : 'portrait';

  // Inicializar documento jsPDF en milímetros
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: [sheetWidth, sheetHeight],
    compress: true
  });

  pages.forEach((page, pageIndex) => {
    if (pageIndex > 0) {
      doc.addPage([sheetWidth, sheetHeight], orientation);
    }

    // 1. Dibujar Tarjetas de la Página con tipografía uniforme
    page.cards.forEach(card => {
      drawCardOnPdf(doc, card, arrowDirection, layoutData.maxLabelText, arrowColor);
      
      // Dibujar borde recuadro de corte si está activado
      if (layoutData.showCardOutline) {
        doc.setDrawColor(160, 160, 160); // Gris fino
        doc.setLineWidth(0.12);          // Hairline 0.12 mm
        doc.rect(card.x, card.y, card.width, card.height, 'S');
      }
    });

    // 2. Dibujar Marcas de Corte en Vectorial
    const cropLines = getCropMarksForPage(page.cards);
    doc.setDrawColor(0, 0, 0); // Negro puro
    doc.setLineWidth(0.12);    // Línea fina hairline de 0.12 mm

    cropLines.forEach(line => {
      doc.line(line.x1, line.y1, line.x2, line.y2);
    });
  });

  // Guardar y descargar PDF
  doc.save(filename);
}

/**
 * Dibuja el contenido vectorial de una tarjeta individual dentro del documento PDF,
 * ocupando el máximo espacio vertical y horizontal de la tarjeta (80%+).
 */
function drawCardOnPdf(doc, card, direction, maxLabelText = card.labelText, arrowColor = '#0090ff') {
  const { x, y, width, height, labelText } = card;

  // Fondo blanco de tarjeta
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, width, height, 'F');

  // Tamaño de fuente objetivo gigante (~82% del alto de la tarjeta)
  const maxCharCount = maxLabelText.length;
  let fontSizePt = height * 0.82 * 2.83465; // 1mm ≈ 2.83465 pt

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0); // Pure Black #000000
  doc.setFontSize(fontSizePt);

  // Calcular anchos con la fuente seleccionada
  let maxTextWidthMm = doc.getTextWidth(maxLabelText);
  let currentTextWidthMm = doc.getTextWidth(labelText);

  // Dimensiones de la flecha en mm
  let arrowBoxH = height * 0.80;
  let arrowBoxW = Math.min(width * 0.38, arrowBoxH * 0.75);
  let gap = Math.max(2.5, height * 0.06);

  let totalWidthForMax = maxTextWidthMm + gap + arrowBoxW;
  const maxAllowedWidth = width * 0.94; // Utilizar hasta el 94% del ancho

  // Si la etiqueta más larga sobrepasa el 94% del ancho, escalar TODO el lote uniformemente
  if (totalWidthForMax > maxAllowedWidth) {
    const scaleFactor = maxAllowedWidth / totalWidthForMax;
    fontSizePt *= scaleFactor;
    doc.setFontSize(fontSizePt);

    currentTextWidthMm = doc.getTextWidth(labelText);
    arrowBoxW *= scaleFactor;
    arrowBoxH *= scaleFactor;
    gap *= scaleFactor;
  }

  const currentBlockWidth = currentTextWidthMm + gap + arrowBoxW;
  const startX = Math.max(x + 0.5, x + (width - currentBlockWidth) / 2);
  const fontSizeMm = fontSizePt / 2.83465;
  const textY = y + (height / 2) + (fontSizeMm * 0.32);

  if (direction === 'left') {
    const arrowX = startX;
    const arrowY = y + (height - arrowBoxH) / 2;
    drawColorArrow(doc, arrowX, arrowY, arrowBoxW, arrowBoxH, 'left', arrowColor);

    const textX = startX + arrowBoxW + gap;
    doc.text(labelText, textX, textY);
  } else {
    const textX = startX;
    doc.text(labelText, textX, textY);

    const arrowX = startX + currentTextWidthMm + gap;
    const arrowY = y + (height - arrowBoxH) / 2;
    drawColorArrow(doc, arrowX, arrowY, arrowBoxW, arrowBoxH, direction, arrowColor);
  }
}

/**
 * Dibuja la flecha vectorial con color dinámico.
 */
function drawColorArrow(doc, x, y, w, h, direction, arrowColor = '#0090ff') {
  // Convertir hex a RGB
  const r = parseInt(arrowColor.slice(1, 3), 16);
  const g = parseInt(arrowColor.slice(3, 5), 16);
  const b = parseInt(arrowColor.slice(5, 7), 16);
  doc.setFillColor(r, g, b);
  doc.setDrawColor(r, g, b);

  if (direction === 'down') {
    const stemW = w * 0.52;
    const stemH = h * 0.50;
    const stemX = x + (w - stemW) / 2;
    doc.rect(stemX, y, stemW, stemH, 'F');

    const headTopY = y + stemH;
    const headBottomY = y + h;
    doc.triangle(
      x, headTopY,
      x + w, headTopY,
      x + (w / 2), headBottomY,
      'F'
    );
  } else if (direction === 'up') {
    const headBottomY = y + (h * 0.50);
    doc.triangle(
      x + (w / 2), y,
      x, headBottomY,
      x + w, headBottomY,
      'F'
    );

    const stemW = w * 0.52;
    const stemH = h * 0.50;
    const stemX = x + (w - stemW) / 2;
    doc.rect(stemX, y + (h * 0.50), stemW, stemH, 'F');
  } else if (direction === 'right') {
    const stemW = w * 0.52;
    const stemH = h * 0.48;
    const stemY = y + (h - stemH) / 2;
    doc.rect(x, stemY, stemW, stemH, 'F');

    const headLeftX = x + stemW;
    const headRightX = x + w;
    doc.triangle(
      headLeftX, y,
      headLeftX, y + h,
      headRightX, y + (h / 2),
      'F'
    );
  } else if (direction === 'left') {
    const headRightX = x + (w * 0.48);
    doc.triangle(
      x, y + (h / 2),
      headRightX, y,
      headRightX, y + h,
      'F'
    );

    const stemW = w * 0.52;
    const stemH = h * 0.48;
    const stemY = y + (h - stemH) / 2;
    doc.rect(x + (w * 0.48), stemY, stemW, stemH, 'F');
  }
}
