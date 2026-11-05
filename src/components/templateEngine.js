import { getCardContentLayout } from './cardContentLayout.js';

/**
 * Motor de Plantilla Gráfica (Template Engine)
 * Genera el gráfico vectorial SVG para cada tarjeta individual.
 * Ajusta cada etiqueta al ancho disponible y mantiene una altura visible amplia.
 */

export const ARROW_PATHS = {
  up: 'M50 8 L92 50 L70 50 L70 92 L30 92 L30 50 L8 50 Z',
  down: 'M30 8 L70 8 L70 50 L92 50 L50 92 L8 50 L30 50 Z',
  left: 'M92 30 L92 70 L50 70 L50 92 L8 50 L50 8 L50 30 Z',
  right: 'M8 30 L8 70 L50 70 L50 92 L92 50 L50 8 L50 30 Z'
};

/**
 * Genera el marcado SVG para una tarjeta individual.
 * @param {string} labelText - Texto numérico de la tarjeta actual (ej: E1)
 * @param {number} widthMm - Ancho de tarjeta en mm
 * @param {number} heightMm - Alto de tarjeta en mm
 * @param {string} direction - Dirección de la flecha
 * @param {string} maxLabelText - Texto más largo de todo el lote (ej: E90) para mantener tamaño uniforme
 */
export function generateCardSvgContent(labelText, widthMm, heightMm, direction = 'down', maxLabelText = labelText, arrowColor = '#0090ff', showArrow = true) {
  const arrowPath = ARROW_PATHS[direction] || ARROW_PATHS.down;

  const { textX, textWidth, fontSize, baseline, arrowX, arrowY, arrowWidth, arrowHeight } =
    getCardContentLayout(widthMm, heightMm, direction, showArrow, labelText);
  // Los paths originales van de 8 a 92: normalizar su área visible a la caja.
  const arrowScaleX = arrowWidth / 84;
  const arrowScaleY = arrowHeight / 84;

  return `
    <g class="card-content">
      <!-- Fondo Blanco Limpio -->
      <rect width="${widthMm}" height="${heightMm}" fill="#ffffff" />

      <svg viewBox="0 0 ${widthMm} ${heightMm}" x="0" y="0" width="${widthMm}" height="${heightMm}">
        <g>
          <!-- Texto ajustado al área interior -->
          <text x="${textX.toFixed(2)}" y="${baseline.toFixed(4)}"
                font-family="Arial, 'Helvetica Neue', Helvetica, sans-serif"
                font-weight="bold"
                font-size="${fontSize.toFixed(2)}"
                fill="#000000"
                text-anchor="start"
                textLength="${textWidth.toFixed(4)}" lengthAdjust="spacingAndGlyphs">${labelText}</text>

          ${showArrow ? `<!-- Flecha de color dinámico -->
          <g transform="translate(${arrowX.toFixed(2)}, ${arrowY.toFixed(2)}) scale(${arrowScaleX}, ${arrowScaleY}) translate(-8, -8)">
            <path d="${arrowPath}" fill="${arrowColor}" />
          </g>` : ''}
        </g>
      </svg>
    </g>
  `;
}
