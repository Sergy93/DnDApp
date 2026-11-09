/**
 * Composes multiple state and method slices into a single target object,
 * preserving getter descriptors and method bindings.
 * @param {Object} target - Root target component object.
 * @param {...Object} slices - Slices to merge.
 * @returns {Object} Target object with all merged properties and getters.
 */
export function composeSlices(target, ...slices) {
    for (const slice of slices) {
        if (slice && typeof slice === 'object') {
            Object.defineProperties(target, Object.getOwnPropertyDescriptors(slice));
        }
    }
    return target;
}
