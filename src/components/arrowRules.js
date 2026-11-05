export const ARROW_DIRECTIONS = { up: 'Arriba', down: 'Abajo', left: 'Izquierda', right: 'Derecha' };

export function compileArrowRules(inputs) {
  const directionsByNumber = {};
  const errors = [];
  for (const direction of Object.keys(ARROW_DIRECTIONS)) {
    for (const token of (inputs[direction] || '').split(/[,;\s]+/).filter(Boolean)) {
      const number = Number(token);
      if (!/^\d+$/.test(token) || !Number.isSafeInteger(number)) {
        errors.push(`«${token}» no es un número entero válido.`);
        continue;
      }
      if (directionsByNumber[number] && directionsByNumber[number] !== direction) {
        errors.push(`El número ${number} tiene más de una orientación. Déjalo en una sola lista.`);
        continue;
      }
      directionsByNumber[number] = direction;
    }
  }
  return { directionsByNumber, errors: [...new Set(errors)] };
}

// Usado por la vista previa y el PDF para aplicar exactamente la misma selección.
export function resolveCardArrow(card, defaultDirection, showArrow, selection) {
  if (!showArrow) return { showArrow: false, direction: defaultDirection };
  if (selection?.mode !== 'selected') return { showArrow: true, direction: defaultDirection };
  const direction = card.number == null ? undefined : selection.directionsByNumber[card.number];
  return { showArrow: !!direction, direction: direction || defaultDirection };
}
