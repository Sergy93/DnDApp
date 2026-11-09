import { normalizeKey } from '../../helpers/string.helper.js';
import {
    BASE_PROFICIENCY_BONUS,
    EXPERTISE_MULTIPLIER,
    DEFAULT_MIN_ROLL_THRESHOLD
} from '../constants/dnd.constants.js';

/**
 * Computes skill bonuses, minimum roll rules, and skill advantages.
 * Pure domain calculator, completely decoupled from specific classes or races.
 * @param {Array} rawSkills - Raw skills array from character sheet.
 * @param {Object} computedAttrs - Output of calculateAttributes.
 * @param {number} [pb=BASE_PROFICIENCY_BONUS] - Proficiency bonus.
 * @param {Object} skillRules - Generic skill modifier rules ({ jackOfAllTrades, minRollRules }).
 * @param {Array} allEquipped - Array of equipped items.
 * @returns {Array} Computed skills array.
 */
export function calculateSkills(
    rawSkills = [],
    computedAttrs = {},
    pb = BASE_PROFICIENCY_BONUS,
    skillRules = {},
    allEquipped = []
) {
    const jackOfAllTrades = skillRules?.jackOfAllTrades || 0;
    const minRollRules = Array.isArray(skillRules?.minRollRules) ? skillRules.minRollRules : [];

    return (rawSkills || []).map(s => {
        const attrObj = computedAttrs[s.attr] || { mod: 0 };
        let bonus = attrObj.mod;
        if (s.profType === 'P') bonus += pb * EXPERTISE_MULTIPLIER;
        else if (s.profType === 'C') bonus += pb;
        else bonus += jackOfAllTrades;

        // Generic minRoll rule evaluation
        const matchedRule = minRollRules.find(r => typeof r.applies === 'function' && r.applies(s));
        const hasRuleMin = !!matchedRule;
        const applyMinTen = s.minTen !== undefined ? !!s.minTen : hasRuleMin;

        let minTenSource = '';
        let minTenDesc = '';
        if (applyMinTen) {
            if (matchedRule) {
                const targetRoll = matchedRule.minRoll || DEFAULT_MIN_ROLL_THRESHOLD;
                minTenSource = matchedRule.source || 'Feature Rule';
                minTenDesc = matchedRule.desc || `Any d20 roll of 9 or lower on the die becomes a ${targetRoll} (Total roll: minimum ${targetRoll + bonus}).`;
            } else if (s.minTenSource) {
                minTenSource = s.minTenSource;
                minTenDesc = s.minTenDesc || `Any d20 roll of 9 or lower on the die becomes a ${DEFAULT_MIN_ROLL_THRESHOLD} (Total roll: minimum ${DEFAULT_MIN_ROLL_THRESHOLD + bonus}).`;
            } else {
                minTenSource = 'Reliable Talent / Feature';
                minTenDesc = `Any d20 roll of 9 or lower on the die becomes a ${DEFAULT_MIN_ROLL_THRESHOLD} (Total roll: minimum ${DEFAULT_MIN_ROLL_THRESHOLD + bonus}).`;
            }
        }

        // Advantage check:
        let hasAdvantage = false;
        const advantageSources = [];

        // Check base skill note if not an unequipped item note
        if (s.note && String(s.note).toLowerCase().includes('advantage')) {
            hasAdvantage = true;
            advantageSources.push(s.noteSource || 'Sheet Note');
        }

        // If parent ability check has advantage, all derived skill checks have advantage
        if (attrObj.hasAttrAdvantage) {
            hasAdvantage = true;
            advantageSources.push(...(attrObj.attrAdvantageSources || []));
        }

        // Check all equipped items granting advantage on this skill
        allEquipped.forEach(item => {
            const advSkills = Array.isArray(item.advantageSkills) ? item.advantageSkills : [];
            const normSkillId = normalizeKey(s.id);
            const normSkillName = normalizeKey(s.name);
            const matches = advSkills.some(ask => {
                const n = normalizeKey(ask);
                return n === normSkillId || n === normSkillName;
            });
            if (matches) {
                hasAdvantage = true;
                if (!advantageSources.includes(item.name)) {
                    advantageSources.push(item.name || 'Equipment');
                }
            }

            // Also check item description / special text for advantage on this skill
            const itemText = normalizeKey(`${item.desc || ''} ${item.special || ''}`);
            if (itemText.includes('advantage') && (itemText.includes(normSkillId) || itemText.includes(normSkillName))) {
                hasAdvantage = true;
                if (!advantageSources.includes(item.name)) {
                    advantageSources.push(item.name || 'Equipment');
                }
            }
        });

        return {
            ...s,
            valNum: bonus,
            valStr: bonus >= 0 ? `+${bonus}` : `${bonus}`,
            minVal: applyMinTen ? ((matchedRule?.minRoll || DEFAULT_MIN_ROLL_THRESHOLD) + bonus) : null,
            minTenSource,
            minTenDesc,
            hasAdvantage,
            advantageSources: [...new Set(advantageSources)]
        };
    });
}
