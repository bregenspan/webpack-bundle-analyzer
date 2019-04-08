export function isChunkParsed(chunk) {
  return (typeof chunk.parsedSize === 'number');
}

export function walkModules(modules, cb) {
  for (const module of modules) {
    if (cb(module) === false) return false;

    if (module.groups) {
      if (walkModules(module.groups, cb) === false) {
        return false;
      }
    }
  }
}

export function elementIsOutside(elem, container) {
  return !(elem === container || container.contains(elem));
}

/**
 * Returns whether the specified event represents a secondary
 * interaction that could open a context menu
 * (right-click/`Ctrl`-click/secondary-click gesture).
 * @param {FoamTreeEvent} event - Foamtree event
 *  (see https://get.carrotsearch.com/foamtree/demo/api/index.html#event-details)
 * @returns {boolean} -
 */
export function isSecondaryInteractionEvent(event) {
  debugger;
  return event.ctrlKey || (event.touches && event.touches > 1) || event.which === 3
}
