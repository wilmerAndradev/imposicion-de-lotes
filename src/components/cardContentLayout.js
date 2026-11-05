// Área visible compartida por SVG y PDF. El texto ocupa su caja completa,
// independientemente de la cantidad de dígitos de otras tarjetas del lote.
export function getCardContentLayout(width, height, direction, showArrow) {
  const paddingX = width * 0.035;
  const contentHeight = height * 0.84;
  const arrowWidth = showArrow ? Math.min(width * 0.21, contentHeight * 0.58) : 0;
  const gap = showArrow ? width * 0.025 : 0;
  const textWidth = width - 2 * paddingX - arrowWidth - gap;
  return {
    textX: paddingX + (showArrow && direction === 'left' ? arrowWidth + gap : 0),
    textWidth,
    // Altura de mayúsculas de Arial/Helvetica Bold: aproximadamente 0,718 em.
    fontSize: contentHeight / 0.718,
    baseline: (height + contentHeight) / 2,
    arrowX: direction === 'left' ? paddingX : paddingX + textWidth + gap,
    arrowY: (height - contentHeight) / 2,
    arrowWidth,
    arrowHeight: contentHeight
  };
}
