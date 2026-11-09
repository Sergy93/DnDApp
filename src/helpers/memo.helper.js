/**
 * Lightweight functional memoization helper for Alpine.js reactive components.
 * Caches the return value of an expensive getter/computation and only recalculates
 * when the dependency signature string changes.
 * 
 * @param {Function} computeFn - The function that computes the value (bound to 'this').
 * @param {Function} getDepsKey - Function returning a primitive string/number representing the dependency state.
 * @returns {Function} Memoized function that can be used in getters or methods.
 */
export function createMemo(computeFn, getDepsKey) {
    let lastKey = null;
    let cachedResult = null;

    return function() {
        const currentKey = getDepsKey.call(this);
        if (lastKey !== null && currentKey === lastKey) {
            return cachedResult;
        }
        lastKey = currentKey;
        cachedResult = computeFn.call(this);
        return cachedResult;
    };
}
