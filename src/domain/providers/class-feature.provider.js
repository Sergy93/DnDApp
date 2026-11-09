import { normalizeKey } from '../../helpers/string.helper.js';
import {
    BASE_PROFICIENCY_BONUS,
    JACK_OF_ALL_TRADES_DIVISOR,
    DEFAULT_MIN_ROLL_THRESHOLD,
    SKILL_IDS,
    PROFICIENCY_LEVELS
} from '../constants/dnd.constants.js';

/**
 * Checks whether a character has an active class, subclass, trait, or progression feature.
 * @param {Object} character - Character sheet data object.
 * @param {Array<string>|string} keywords - Feature keyword(s) to match.
 * @returns {boolean}
 */
export function hasCharacterFeature(character, keywords = []) {
    const list = Array.isArray(keywords) ? keywords : [keywords];
    const normKeywords = list.map(normalizeKey).filter(Boolean);
    if (normKeywords.length === 0) return false;

    // 1. Scan identity classes and subclasses
    const classes = character?.identity?.classes || [];
    for (const c of classes) {
        if (normKeywords.includes(normalizeKey(c?.name))) return true;
        if (normKeywords.includes(normalizeKey(c?.subclass))) return true;
    }

    // 2. Scan combat traits
    const traits = character?.combat?.traits || [];
    for (const t of traits) {
        const text = normalizeKey(`${t?.name || ''} ${t?.desc || ''}`);
        if (normKeywords.some(kw => text.includes(kw))) return true;
    }

    // 3. Scan progression unlocked features
    const progression = character?.progression || {};
    for (const classKey of Object.keys(progression)) {
        const levels = progression[classKey] || [];
        for (const lvl of levels) {
            const feats = lvl?.feats || [];
            for (const f of feats) {
                const normFeat = normalizeKey(typeof f === 'string' ? f : f?.name);
                if (normKeywords.some(kw => normFeat.includes(kw))) return true;
            }
        }
    }
    return false;
}

/**
 * Provider responsible for resolving class-specific feature rules and dynamic values,
 * decoupling them from generic domain calculators.
 */
export class ClassFeatureProvider {
    /**
     * Resolves generic skill modifier rules from class features (e.g. Jack of All Trades, Silver Tongue, Reliable Talent).
     * @param {Object} character - Character sheet data.
     * @param {number} [pb=BASE_PROFICIENCY_BONUS] - Proficiency bonus.
     * @param {Function} [featureChecker=hasCharacterFeature] - Optional feature detector function.
     * @returns {{ hasJackOfAllTrades: boolean, jackOfAllTrades: number, minRollRules: Array<Object> }}
     */
    static resolveSkillRules(
        character,
        pb = BASE_PROFICIENCY_BONUS,
        featureChecker = hasCharacterFeature
    ) {
        const hasJackOfAllTrades = featureChecker(character, ['jackofalltrades']);
        const jackOfAllTrades = hasJackOfAllTrades ? Math.floor(pb / JACK_OF_ALL_TRADES_DIVISOR) : 0;
        const minRollRules = [];

        // Silver Tongue (Bard - College of Eloquence)
        if (featureChecker(character, ['silvertongue'])) {
            minRollRules.push({
                minRoll: DEFAULT_MIN_ROLL_THRESHOLD,
                source: 'Silver Tongue (Eloquence Bard)',
                desc: `Any d20 roll of 9 or lower on the die becomes a ${DEFAULT_MIN_ROLL_THRESHOLD}.`,
                applies: (s) => s.id === SKILL_IDS.PERSUASION || s.id === SKILL_IDS.DECEPTION
            });
        }

        // Reliable Talent (Rogue)
        if (featureChecker(character, ['reliabletalent', 'reliable talent'])) {
            minRollRules.push({
                minRoll: DEFAULT_MIN_ROLL_THRESHOLD,
                source: 'Reliable Talent (Rogue)',
                desc: `Any d20 roll of 9 or lower on proficient checks becomes a ${DEFAULT_MIN_ROLL_THRESHOLD}.`,
                applies: (s) => s.profType === PROFICIENCY_LEVELS.PROFICIENT || s.profType === PROFICIENCY_LEVELS.EXPERTISE
            });
        }

        return {
            hasJackOfAllTrades,
            jackOfAllTrades,
            minRollRules
        };
    }
}
