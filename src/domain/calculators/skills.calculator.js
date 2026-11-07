import { normalizeKey } from '../../helpers/string.helper.js';

/**
 * Computes skill bonuses, minimum roll rules (Silver Tongue, Reliable Talent), and skill advantages.
 * @param {Array} rawSkills - Raw skills array from character sheet.
 * @param {Object} computedAttrs - Output of calculateAttributes.
 * @param {number} pb - Proficiency bonus.
 * @param {number} jackOfAllTrades - Half PB (if feature active, else 0).
 * @param {boolean} hasSilverTongue - Whether character has Silver Tongue trait.
 * @param {boolean} hasReliableTalent - Whether character has Reliable Talent trait.
 * @param {Array} allEquipped - Array of equipped items.
 * @returns {Array} Computed skills array.
 */
export function calculateSkills(
    rawSkills = [],
    computedAttrs = {},
    pb = 2,
    jackOfAllTrades = 0,
    hasSilverTongue = false,
    hasReliableTalent = false,
    allEquipped = []
) {
    return (rawSkills || []).map(s => {
        const attrObj = computedAttrs[s.attr] || { mod: 0 };
        let bonus = attrObj.mod;
        if (s.profType === 'P') bonus += pb * 2;
        else if (s.profType === 'C') bonus += pb;
        else bonus += jackOfAllTrades;

        const isSilverTongueSkill = hasSilverTongue && (s.id === 'persuasion' || s.id === 'deception');
        const isReliableTalentSkill = hasReliableTalent && (s.profType === 'C' || s.profType === 'P');
        const applyMinTen = s.minTen !== undefined ? !!s.minTen : (isSilverTongueSkill || isReliableTalentSkill);
        let minTenSource = '';
        let minTenDesc = '';
        if (applyMinTen) {
            if (isSilverTongueSkill) {
                minTenSource = 'Silver Tongue (Eloquence Bard)';
                minTenDesc = `Any d20 roll of 9 or lower on the die becomes a 10 (Total roll: minimum ${10 + bonus}).`;
            } else if (isReliableTalentSkill) {
                minTenSource = 'Reliable Talent (Rogue)';
                minTenDesc = `Any d20 roll of 9 or lower on proficient checks becomes a 10 (Total roll: minimum ${10 + bonus}).`;
            } else if (s.minTenSource) {
                minTenSource = s.minTenSource;
                minTenDesc = s.minTenDesc || `Any d20 roll of 9 or lower on the die becomes a 10 (Total roll: minimum ${10 + bonus}).`;
            } else {
                minTenSource = 'Reliable Talent / Feature';
                minTenDesc = `Any d20 roll of 9 or lower on the die becomes a 10 (Total roll: minimum ${10 + bonus}).`;
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
        });

        return {
            ...s,
            valNum: bonus,
            valStr: bonus >= 0 ? `+${bonus}` : `${bonus}`,
            minVal: applyMinTen ? (10 + bonus) : null,
            minTenSource,
            minTenDesc,
            hasAdvantage,
            advantageSources: [...new Set(advantageSources)]
        };
    });
}
