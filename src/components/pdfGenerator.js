/**
 * Motor de Generación PDF (PDF Generator)
 * Utiliza jsPDF para construir el documento PDF vectorial multipágina listo para impresión.
 * Genera texto y flecha azul gigantes que abarcan entre el 80-85% del alto de la tarjeta.
 */

import { jsPDF } from 'jspdf';
import { getCardContentLayout } from './cardContentLayout.js';
import { resolveCardArrow } from './arrowRules.js';

/**
 * Genera y descarga el archivo PDF de la imposición completa.
 */
export function generatePdf(layoutData, arrowDirection = 'down', filename = 'lote_impresion.pdf', arrowColor = '#0090ff', showArrow = true, arrowSelection = null) {
  const {
    sheetWidth,
    sheetHeight,
    pages,
    showCardOutline,
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
      const arrow = resolveCardArrow(card, arrowDirection, showArrow, arrowSelection);
      drawCardOnPdf(doc, card, arrow.direction, layoutData.maxLabelText, arrowColor, arrow.showArrow);
      
      // Dibujar borde recuadro de corte si está activado
      if (layoutData.showCardOutline) {
        doc.setDrawColor(100, 116, 139); // Gris fino
        doc.setLineWidth(0.25);          // Hairline 0.25 mm
        doc.rect(card.x, card.y, card.width, card.height, 'S');
      }
    });

    // 2. Dibujar Marcas de Corte en Vectorial
    if (layoutData.showCropMarks) {
      const cropLines = getCropMarksForPage(page.cards);
      doc.setDrawColor(0, 0, 0); // Negro puro
      doc.setLineWidth(0.25);    // Línea fina hairline de 0.25 mm

      cropLines.forEach(line => {
        doc.line(line.x1, line.y1, line.x2, line.y2);
      });
    }
  });

  // Guardar y descargar PDF
  doc.save(filename);
}

/**
 * Dibuja el contenido vectorial de una tarjeta individual dentro del documento PDF,
 * ocupando el máximo espacio vertical y horizontal de la tarjeta (80%+).
 */
function drawCardOnPdf(doc, card, direction, maxLabelText = card.labelText, arrowColor = '#0090ff', showArrow = true) {
  const { x, y, width, height, labelText } = card;

  // Fondo blanco de tarjeta
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, width, height, 'F');

  const content = getCardContentLayout(width, height, direction, showArrow, labelText);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(content.fontSize * 72 / 25.4);
  const naturalWidth = doc.getTextWidth(labelText);
  if (naturalWidth > 0) {
    doc.text(labelText, x + content.textX, y + content.baseline, {
      horizontalScale: content.textWidth / naturalWidth
    });
  }
  if (showArrow) {
    drawColorArrow(doc, x + content.arrowX, y + content.arrowY,
      content.arrowWidth, content.arrowHeight, direction, arrowColor);
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
