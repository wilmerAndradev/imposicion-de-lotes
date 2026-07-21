/**
 * Componente de Previsualización Interactiva de Hojas (Preview Viewer)
 * Renderiza la hoja de papel con sus tarjetas y marcas de corte en el navegador.
 */

import { generateCardSvgContent } from './templateEngine.js';

export class PreviewViewer {
  constructor(stageElement, viewportContainer) {
    this.stage = stageElement;
    this.viewport = viewportContainer;
    this.scale = 1.0;
    this.currentPpi = 3.7795275591; // 1 mm en píxeles (a 96 DPI)
  }

  /**
   * Renderiza una página específica de la imposición en el lienzo de la UI.
   * 
   * @param {Object} layoutData - Datos completos calculados por layoutEngine
   * @param {number} pageIndex - Índice de la página a visualizar (0-indexed)
   * @param {string} arrowDirection - Dirección de la flecha ('up', 'down', 'left', 'right')
   */
  renderPage(layoutData, pageIndex = 0, arrowDirection = 'down') {
    if (!layoutData || !layoutData.pages || layoutData.pages.length === 0) {
      this.stage.innerHTML = '<div class="empty-state">No hay tarjetas para mostrar</div>';
      return;
    }

    const page = layoutData.pages[pageIndex] || layoutData.pages[0];
    const { sheetWidth, sheetHeight, getCropMarksForPage } = layoutData;

    // Dimensiones de la hoja en píxeles de pantalla
    const ppi = this.currentPpi;
    const stageWidthPx = sheetWidth * ppi;
    const stageHeightPx = sheetHeight * ppi;

    // Configurar dimensiones físicas del contenedor de la hoja
    this.stage.style.width = `${stageWidthPx}px`;
    this.stage.style.height = `${stageHeightPx}px`;

    // Marcas de corte para esta página
    const cropLines = getCropMarksForPage(page.cards);

    // Construcción del SVG completo de la Hoja de Impresión
    let svgContent = `
      <svg width="${stageWidthPx}" height="${stageHeightPx}" 
           viewBox="0 0 ${sheetWidth} ${sheetHeight}" 
           xmlns="http://www.w3.org/2000/svg"
           style="background-color: #ffffff; display: block;">
        
        <!-- Borde sutil de la hoja -->
        <rect width="${sheetWidth}" height="${sheetHeight}" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.5"/>

        <!-- Dibujar Tarjetas colocadas en la página -->
        <g id="cards-group">
          ${page.cards.map(card => `
            <g transform="translate(${card.x}, ${card.y})">
              <!-- Borde exterior de la tarjeta para recuadro de corte -->
              ${layoutData.showCardOutline ? `<rect width="${card.width}" height="${card.height}" fill="none" stroke="#64748b" stroke-width="0.25" stroke-dasharray="1.5 1.5"/>` : ''}
              
              <!-- Contenido vectorial (Texto + Flecha) con tipografía uniforme -->
              ${generateCardSvgContent(card.labelText, card.width, card.height, arrowDirection, layoutData.maxLabelText)}
            </g>
          `).join('')}
        </g>

        <!-- Dibujar Marcas de Corte -->
        <g id="crop-marks-group">
          ${cropLines.map(line => `
            <line x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}" 
                  stroke="#000000" stroke-width="0.25" stroke-linecap="square"/>
          `).join('')}
        </g>
      </svg>
    `;

    this.stage.innerHTML = svgContent;
    this.updateZoomTransform();
  }

  setZoom(scale) {
    this.scale = Math.max(0.2, Math.min(3.0, scale));
    this.updateZoomTransform();
  }

  zoomIn() {
    this.setZoom(this.scale + 0.15);
  }

  zoomOut() {
    this.setZoom(this.scale - 0.15);
  }

  fitToScreen(sheetWidthMm, sheetHeightMm) {
    if (!this.viewport || !sheetWidthMm || !sheetHeightMm) return;

    const viewportWidth = this.viewport.clientWidth - 48; // padding
    const viewportHeight = this.viewport.clientHeight - 48;

    const stageWidthPx = sheetWidthMm * this.currentPpi;
    const stageHeightPx = sheetHeightMm * this.currentPpi;

    if (stageWidthPx <= 0 || stageHeightPx <= 0) return;

    const scaleX = viewportWidth / stageWidthPx;
    const scaleY = viewportHeight / stageHeightPx;

    // Calcular escala ideal para encajar completamente la hoja en pantalla
    let idealScale = Math.min(scaleX, scaleY);
    idealScale = Math.max(0.2, Math.min(2.5, idealScale));

    this.setZoom(idealScale);

    // Centrar automáticamente el scroll del contenedor
    requestAnimationFrame(() => {
      if (this.viewport) {
        this.viewport.scrollLeft = (this.viewport.scrollWidth - this.viewport.clientWidth) / 2;
        this.viewport.scrollTop = (this.viewport.scrollHeight - this.viewport.clientHeight) / 2;
      }
    });
  }

  updateZoomTransform() {
    if (this.stage) {
      this.stage.style.transform = `scale(${this.scale})`;
    }
  }
}
