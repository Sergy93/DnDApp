import {
    BASE_PROFICIENCY_BONUS,
    DEFAULT_SONG_OF_REST_DIE,
    DEFAULT_MARTIAL_ARTS_DIE
} from '../domain/constants/dnd.constants.js';

/**
 * Template interpolation helper for standard D&D 5e sheet tokens.
 * Supports: {{PB}}, {{DC}}, {{spellAtk}}, {{bardicDie}}, {{songOfRestDie}}, {{vesselHours}},
 * {{sneakAttackDie}}, {{martialArtsDie}}, {{superiorityDie}}, {{rageDamage}}, {{psionicDie}}.
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
        const pb = context.pb !== undefined ? context.pb : BASE_PROFICIENCY_BONUS;
        const pbStr = typeof pb === 'number' ? (pb >= 0 ? `+${pb}` : `${pb}`) : String(pb);
        const spellDC = context.spellDC !== undefined ? context.spellDC : 10;
        const spellAtk = context.spellAtk !== undefined ? context.spellAtk : (context.spellAtkStr !== undefined ? context.spellAtkStr : `+${BASE_PROFICIENCY_BONUS}`);
        const bardicDie = context.bardicDie || '1d8';
        const songOfRestDie = context.songOfRestDie || DEFAULT_SONG_OF_REST_DIE;
        const sneakAttackDie = context.sneakAttackDie || '1d6';
        const martialArtsDie = context.martialArtsDie || DEFAULT_MARTIAL_ARTS_DIE;
        const superiorityDie = context.superiorityDie || '1d8';
        const rageDamage = context.rageDamage || '+2';
        const psionicDie = context.psionicDie || '1d6';
        const vesselHours = context.vesselHours !== undefined ? context.vesselHours : (typeof pb === 'number' ? pb * 2 : 4);

        return text
            .replace(/\{\{PB\}\}/g, pbStr)
            .replace(/\{\{DC\}\}/g, String(spellDC))
            .replace(/\{\{spellAtk\}\}/g, String(spellAtk))
            .replace(/\{\{bardicDie\}\}/g, String(bardicDie))
            .replace(/\{\{songOfRestDie\}\}/g, String(songOfRestDie))
            .replace(/\{\{sneakAttackDie\}\}/g, String(sneakAttackDie))
            .replace(/\{\{martialArtsDie\}\}/g, String(martialArtsDie))
            .replace(/\{\{superiorityDie\}\}/g, String(superiorityDie))
            .replace(/\{\{rageDamage\}\}/g, String(rageDamage))
            .replace(/\{\{psionicDie\}\}/g, String(psionicDie))
            .replace(/\{\{vesselHours\}\}/g, String(vesselHours));
    }
}
