/**
 * Motor de Plantilla Gráfica (Template Engine)
 * Genera el gráfico vectorial SVG para cada tarjeta individual.
 * Garantiza un tamaño de letra y flecha UNIFORME para todo el lote,
 * tomando como referencia el número con mayor cantidad de dígitos.
 */

export const ARROW_PATHS = {
  up: 'M50 8 L92 50 L70 50 L70 92 L30 92 L30 50 L8 50 Z',
  down: 'M30 8 L70 8 L70 50 L92 50 L50 92 L8 50 L30 50 Z',
  left: 'M92 30 L92 70 L50 70 L50 92 L8 50 L50 8 L50 30 Z',
  right: 'M8 30 L8 70 L50 70 L50 92 L92 50 L50 8 L50 30 Z'
};

let _canvasContext = null;

/**
 * Mide el ancho exacto del texto en fuente Arial Bold usando Canvas en navegador
 * o un mapa preciso por carácter como fallback.
 */
function getTextWidth(text, fontSize) {
  if (typeof document !== 'undefined') {
    try {
      if (!_canvasContext) {
        const canvas = document.createElement('canvas');
        _canvasContext = canvas.getContext('2d');
      }
      if (_canvasContext) {
        _canvasContext.font = `bold ${fontSize}px Arial, "Helvetica Neue", Helvetica, sans-serif`;
        return _canvasContext.measureText(text).width;
      }
    } catch {
      // Fallback
    }
  }

  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if ('MWmw'.includes(char)) {
      width += fontSize * 0.88;
    } else if ('023456789ODGHNQU'.includes(char)) {
      width += fontSize * 0.68;
    } else if ('ABCEFKPRSTVXYZ'.includes(char)) {
      width += fontSize * 0.64;
    } else if ('JL'.includes(char)) {
      width += fontSize * 0.54;
    } else if ('I1ifl1t'.includes(char)) {
      width += fontSize * 0.36;
    } else {
      width += fontSize * 0.60;
    }
  }
  return width;
}

/**
 * Genera el marcado SVG para una tarjeta individual.
 * @param {string} labelText - Texto numérico de la tarjeta actual (ej: E1)
 * @param {number} widthMm - Ancho de tarjeta en mm
 * @param {number} heightMm - Alto de tarjeta en mm
 * @param {string} direction - Dirección de la flecha
 * @param {string} maxLabelText - Texto más largo de todo el lote (ej: E90) para mantener tamaño uniforme
 */
export function generateCardSvgContent(labelText, widthMm, heightMm, direction = 'down', maxLabelText = labelText, arrowColor = '#0090ff') {
  const arrowPath = ARROW_PATHS[direction] || ARROW_PATHS.down;
  
  // 1. Tamaño de fuente base (~82% de la altura)
  let fontSize = heightMm * 0.82;
  
  // 2. Calcular ancho con medición exacta de caracteres
  let maxTextWidth = getTextWidth(maxLabelText, fontSize);
  let currentTextWidth = getTextWidth(labelText, fontSize);

  // 3. Dimensiones de la flecha y separación de seguridad (gap)
  let arrowHeight = heightMm * 0.80;
  let arrowWidth = Math.min(widthMm * 0.38, arrowHeight * 0.75);
  let gap = Math.max(2.5, heightMm * 0.06);

  let totalWidthForMax = maxTextWidth + gap + arrowWidth;
  const maxAllowedWidth = widthMm * 0.94; // Utilizar hasta el 94% del ancho de la tarjeta

  // 4. Si la etiqueta más larga excede el ancho permitido, reducir la escala de TODO el lote por igual
  if (totalWidthForMax > maxAllowedWidth) {
    const scaleFactor = maxAllowedWidth / totalWidthForMax;
    fontSize *= scaleFactor;
    currentTextWidth = getTextWidth(labelText, fontSize);
    arrowWidth *= scaleFactor;
    arrowHeight *= scaleFactor;
    gap *= scaleFactor;
  }

  // 5. Centrado horizontal del bloque de la tarjeta actual usando el tamaño de tipografía uniforme
  const currentBlockWidth = currentTextWidth + gap + arrowWidth;
  const startX = (widthMm - currentBlockWidth) / 2;

  let textX, arrowX, arrowY;

  if (direction === 'left') {
    arrowX = startX;
    arrowY = (heightMm - arrowHeight) / 2;
    textX = startX + arrowWidth + gap;
  } else {
    textX = startX;
    arrowX = startX + currentTextWidth + gap;
    arrowY = (heightMm - arrowHeight) / 2;
  }

  const arrowScaleX = (arrowWidth / 100).toFixed(4);
  const arrowScaleY = (arrowHeight / 100).toFixed(4);

  return `
    <g class="card-content">
      <!-- Fondo Blanco Limpio -->
      <rect width="${widthMm}" height="${heightMm}" fill="#ffffff" />
      
      <svg viewBox="0 0 ${widthMm} ${heightMm}" x="0" y="0" width="${widthMm}" height="${heightMm}">
        <g>
          <!-- Texto Uniforme en Arial Bold (#000000) -->
          <text x="${textX.toFixed(2)}" y="${(heightMm * 0.54).toFixed(2)}" 
                font-family="Arial, 'Helvetica Neue', Helvetica, sans-serif" 
                font-weight="bold" 
                font-size="${fontSize.toFixed(2)}" 
                fill="#000000" 
                text-anchor="start" 
                dominant-baseline="central">${labelText}</text>

          <!-- Flecha de color dinámico -->
          <g transform="translate(${arrowX.toFixed(2)}, ${arrowY.toFixed(2)}) scale(${arrowScaleX}, ${arrowScaleY})">
            <path d="${arrowPath}" fill="${arrowColor}" />
          </g>
        </g>
      </svg>
    </g>
  `;
}
