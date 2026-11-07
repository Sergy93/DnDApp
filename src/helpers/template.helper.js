/**
 * Template interpolation helper for standard D&D 5e sheet tokens.
 * Follows AGENTS.md standardized tokens: {{PB}}, {{DC}}, {{spellAtk}}, {{bardicDie}}, {{songOfRestDie}}, {{vesselHours}}.
 */
export class TemplateHelper {
    /**
     * Interpolates standardized mustache tokens into the target text.
     * @param {string} text - Text containing placeholders.
     * @param {Object} context - Substitution values.
     * @returns {string}
     */
    static interpolate(text, context = {}) {
        if (!text || typeof text !== 'string') return '';
        const pb = context.pb !== undefined ? context.pb : 2;
        const pbStr = typeof pb === 'number' ? (pb >= 0 ? `+${pb}` : `${pb}`) : String(pb);
        const spellDC = context.spellDC !== undefined ? context.spellDC : 10;
        const spellAtk = context.spellAtk !== undefined ? context.spellAtk : (context.spellAtkStr !== undefined ? context.spellAtkStr : '+2');
        const bardicDie = context.bardicDie || '1d8';
        const songOfRestDie = context.songOfRestDie || '1d6';
        const vesselHours = context.vesselHours !== undefined ? context.vesselHours : (typeof pb === 'number' ? pb * 2 : 4);

        return text
            .replace(/\{\{PB\}\}/g, pbStr)
            .replace(/\{\{DC\}\}/g, String(spellDC))
            .replace(/\{\{spellAtk\}\}/g, String(spellAtk))
            .replace(/\{\{bardicDie\}\}/g, String(bardicDie))
            .replace(/\{\{songOfRestDie\}\}/g, String(songOfRestDie))
            .replace(/\{\{vesselHours\}\}/g, String(vesselHours));
    }
}
