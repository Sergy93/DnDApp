/**
 * Centralized ErrorHandler & Telemetry Diagnostic Service.
 * Eliminates silent .catch(() => {}) patterns and maintains an in-memory ring buffer of operational events.
 */

export const ERROR_SEVERITY = Object.freeze({
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL'
});

export class ErrorHandler {
    static _buffer = [];
    static _maxBufferLength = 100;
    static _listeners = new Set();
    static _initialized = false;

    /**
     * Initializes global error listeners on window if running in browser.
     */
    static init() {
        if (this._initialized) return;
        this._initialized = true;

        if (typeof window !== 'undefined') {
            window.__DND_DIAGNOSTICS__ = {
                getLogs: () => this.getLogs(),
                clear: () => this.clear(),
                dump: () => console.table(this.getLogs())
            };

            window.addEventListener('unhandledrejection', (event) => {
                this.handle(event.reason || 'Unhandled Promise Rejection', 'window.unhandledrejection', ERROR_SEVERITY.ERROR);
            });

            window.addEventListener('error', (event) => {
                this.handle(event.error || event.message || 'Window Error', 'window.onerror', ERROR_SEVERITY.ERROR);
            });
        }
    }

    /**
     * Logs an event or error with structured severity and context.
     * @param {Error|string} err - Error object or error description.
     * @param {string} [context='general'] - Operational context (e.g. 'sync', 'compendium', 'vitals').
     * @param {string} [severity=ERROR_SEVERITY.ERROR] - ERROR_SEVERITY level.
     * @returns {Object} Structured log entry.
     */
    static handle(err, context = 'general', severity = ERROR_SEVERITY.ERROR) {
        const message = err instanceof Error ? err.message : String(err || 'Unknown error');
        const stack = err instanceof Error ? err.stack : null;
        const timestamp = new Date().toISOString();

        const entry = {
            id: 'err_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
            timestamp,
            severity,
            context,
            message,
            stack
        };

        this._buffer.unshift(entry);
        if (this._buffer.length > this._maxBufferLength) {
            this._buffer.pop();
        }

        // Notify subscribers
        for (const listener of this._listeners) {
            try {
                listener(entry);
            } catch (e) {
                console.error('[ErrorHandler] Error in subscriber callback:', e);
            }
        }

        if (severity === ERROR_SEVERITY.CRITICAL || severity === ERROR_SEVERITY.ERROR) {
            console.error(`[${context.toUpperCase()}] [${severity}] ${message}`, stack || '');
        } else if (severity === ERROR_SEVERITY.WARNING) {
            console.warn(`[${context.toUpperCase()}] [${severity}] ${message}`);
        } else {
            console.info(`[${context.toUpperCase()}] [${severity}] ${message}`);
        }

        return entry;
    }

    static warn(message, context = 'general') {
        return this.handle(message, context, ERROR_SEVERITY.WARNING);
    }

    static info(message, context = 'general') {
        return this.handle(message, context, ERROR_SEVERITY.INFO);
    }

    /**
     * Subscribes to new error events.
     * @param {Function} callback - (entry) => void
     * @returns {Function} Unsubscribe function.
     */
    static onLog(callback) {
        if (typeof callback !== 'function') return () => {};
        this._listeners.add(callback);
        return () => this._listeners.delete(callback);
    }

    /**
     * Returns all buffered telemetry logs.
     * @returns {Array<Object>}
     */
    static getLogs() {
        return [...this._buffer];
    }

    /**
     * Clears telemetry buffer.
     */
    static clear() {
        this._buffer = [];
    }
}
