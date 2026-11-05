// Área visible compartida por SVG y PDF. El texto ocupa su caja completa,
// independientemente de la cantidad de dígitos de otras tarjetas del lote.
export function getCardContentLayout(width, height, direction, showArrow, labelText = '') {
  const paddingX = width * 0.035;
  const contentHeight = height * 0.84;
  const arrowWidth = showArrow ? Math.min(width * 0.21, contentHeight * 0.58) : 0;
  const gap = showArrow ? width * 0.025 : 0;
  const textWidth = width - 2 * paddingX - arrowWidth - gap;
  // Reservar la altura de los diacríticos y de letras con descendentes.
  // La altura de mayúsculas (0,718 em) por sí sola recorta Ñ, Á, Ü, etc.
  const decomposed = labelText.normalize('NFD');
  const ascent = /\p{M}/u.test(decomposed) ? 0.95 : 0.74;
  const descent = /[gjpqyçÇ]/u.test(labelText) ? 0.23 : 0.02;
  const fontSize = contentHeight / (ascent + descent);
  return {
    textX: paddingX + (showArrow && direction === 'left' ? arrowWidth + gap : 0),
    textWidth,
    fontSize,
    baseline: (height - contentHeight) / 2 + ascent * fontSize,
    arrowX: direction === 'left' ? paddingX : paddingX + textWidth + gap,
    arrowY: (height - contentHeight) / 2,
    arrowWidth,
    arrowHeight: contentHeight
  };
}
