import {
    DEFAULT_ABILITY_SCORE,
    ABILITY_MODIFIER_OFFSET,
    ABILITY_MODIFIER_DIVISOR,
    BASE_PROFICIENCY_BONUS,
    ABILITIES,
    ABILITY_KEYS,
    calculateAbilityModifier,
    DND_5E_SKILLS
} from '../constants/dnd.constants.js';

const SKILL_TO_ATTR_MAP = Object.freeze(
    Object.fromEntries(
        (DND_5E_SKILLS || []).flatMap(s => [
            [s.id.toLowerCase().replace(/[^a-z0-9]/g, ''), s.attr],
            [s.name.toLowerCase().replace(/[^a-z0-9]/g, ''), s.attr]
        ])
    )
);

/**
 * Pure calculation functions for character ability scores and saving throws.
 */

export const ATTR_KEYS = ABILITY_KEYS;

/**
 * Pure helper to resolve single attribute modifier from character attributes.
 * @param {Object} attributes - Attributes dictionary.
 * @param {string} attrKey - 3-letter attribute key (e.g. 'STR', 'DEX').
 * @returns {number} Integer modifier.
 */
export function resolveAttributeMod(attributes, attrKey) {
    if (!attributes || !attrKey) return 0;
    const canonKey = String(attrKey).toUpperCase();
    const raw = attributes[canonKey];
    return calculateAbilityModifier(raw?.score);
}

/**
 * Computes ability scores, modifiers, equipment bonuses, and saving throws.
 * @param {Object} attributes - Raw character attributes map.
 * @param {Array} allEquipped - Array of all currently equipped items.
 * @param {number} [pb=BASE_PROFICIENCY_BONUS] - Proficiency bonus.
 * @param {Object} [character=null] - Full character object for trait/race inspection.
 * @returns {Object} Computed attributes map.
 */
export function calculateAttributes(
    attributes = {},
    allEquipped = [],
    pb = BASE_PROFICIENCY_BONUS,
    character = null
) {
    const computedAttrs = {};

    ATTR_KEYS.forEach(k => {
        const raw = attributes?.[k] || { score: DEFAULT_ABILITY_SCORE, profSave: false };
        const baseScore = typeof raw.score === 'number'
            ? raw.score
            : (parseInt(raw.score, 10) || DEFAULT_ABILITY_SCORE);
        let bonusFromItems = 0;
        let itemSaveBonus = 0;
        let hasAttrAdvantage = false;
        let hasFullAttrAdvantage = false;
        let isSkillSpecificAdvantage = false;
        const attrAdvantageSources = [];
        let hasSaveAdvantage = false;
        const saveAdvantageSources = [];

        const attrFullName = {
            STR: 'strength',
            DEX: 'dexterity',
            CON: 'constitution',
            INT: 'intelligence',
            WIS: 'wisdom',
            CHA: 'charisma'
        }[k] || '';

        allEquipped.forEach(item => {
            const sb = item.statBonuses;
            if (sb) {
                if (sb[k]) bonusFromItems += parseInt(sb[k], 10) || 0;
                const sbAttr = String(sb.attr || '').toUpperCase();
                if (sbAttr === k) {
                    if (sb.attrMode === 'advantage') {
                        hasAttrAdvantage = true;
                        hasFullAttrAdvantage = true;
                        attrAdvantageSources.push(item.name || 'Equipment');
                    } else if (sb.attrVal) {
                        bonusFromItems += parseInt(sb.attrVal, 10) || 0;
                    }
                }

                const rawSaveType = sb.saveType ? String(sb.saveType).trim() : '';
                const saveType = rawSaveType.toUpperCase();
                const saveVal = parseInt(sb.saveVal, 10) || 0;
                const isTargetSave = (saveType === 'ALL' || saveType === k) && Boolean(rawSaveType);
                if (isTargetSave) {
                    if (sb.saveMode === 'advantage') {
                        hasSaveAdvantage = true;
                        saveAdvantageSources.push(item.name || 'Equipment');
                    } else if (saveVal) {
                        itemSaveBonus += saveVal;
                    }
                }
            }

            // Direct advantage arrays on items
            if (Array.isArray(item.advantageAttrs)) {
                item.advantageAttrs.forEach(a => {
                    if (String(a).toUpperCase() === k) {
                        hasAttrAdvantage = true;
                        hasFullAttrAdvantage = true;
                        attrAdvantageSources.push(item.name || 'Equipment');
                    }
                });
            }
            if (Array.isArray(item.advantageSaves)) {
                item.advantageSaves.forEach(s => {
                    const su = String(s).toUpperCase();
                    if (su === 'ALL' || su === k) {
                        hasSaveAdvantage = true;
                        saveAdvantageSources.push(item.name || 'Equipment');
                    }
                });
            }

            // Direct skill advantage arrays on items (e.g. Ring of Consilium Dubium with Persuasion & Deception)
            if (Array.isArray(item.advantageSkills) && item.advantageSkills.length > 0) {
                const matchedSkills = [];
                item.advantageSkills.forEach(sk => {
                    const norm = String(sk).toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (SKILL_TO_ATTR_MAP[norm] === k) {
                        matchedSkills.push(sk);
                    }
                });
                if (matchedSkills.length > 0) {
                    hasAttrAdvantage = true;
                    isSkillSpecificAdvantage = true;
                    const label = item.name ? `${item.name} (${matchedSkills.join(', ')})` : 'Equipment';
                    if (!attrAdvantageSources.includes(label)) {
                        attrAdvantageSources.push(label);
                    }
                }
            }

            // Advantage mentioned in item description or special properties
            const itemText = (item.desc || '') + ' ' + (item.special || '');
            if (itemText.toLowerCase().includes('advantage')) {
                const normText = itemText.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (normText.includes(`advantageon${attrFullName}check`) || normText.includes(`advantageon${k.toLowerCase()}check`)) {
                    hasAttrAdvantage = true;
                    hasFullAttrAdvantage = true;
                    if (!attrAdvantageSources.includes(item.name)) attrAdvantageSources.push(item.name || 'Equipment');
                }
                // Check if item text specifies advantage on a skill associated with this attribute (only if not already matched)
                const alreadyMatchedForItem = attrAdvantageSources.some(s => s.startsWith(item.name || 'Equipment'));
                if (!alreadyMatchedForItem) {
                    const matchedSkillsFromText = [];
                    DND_5E_SKILLS.forEach(sk => {
                        if (sk.attr === k) {
                            const skNorm = sk.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (normText.includes(`advantageon${skNorm}`) || normText.includes(`advantageon${sk.id}`)) {
                                matchedSkillsFromText.push(sk.name);
                            }
                        }
                    });
                    if (matchedSkillsFromText.length > 0) {
                        hasAttrAdvantage = true;
                        isSkillSpecificAdvantage = true;
                        const label = item.name ? `${item.name} (${[...new Set(matchedSkillsFromText)].join(', ')})` : 'Equipment';
                        if (!attrAdvantageSources.includes(label)) {
                            attrAdvantageSources.push(label);
                        }
                    }
                }
                if (normText.includes(`advantageon${attrFullName}save`) || normText.includes(`advantageon${k.toLowerCase()}save`) ||
                    (normText.includes('advantageonsavingthrow') && (normText.includes(`all${attrFullName}`) || normText.includes('allsavingthrow')))) {
                    hasSaveAdvantage = true;
                    if (!saveAdvantageSources.includes(item.name)) saveAdvantageSources.push(item.name || 'Equipment');
                }
            }
        });

        // Racial and character traits advantage inspection
        const traits = [
            ...(character?.combat?.traits || []),
            ...(character?.traits || [])
        ];
        traits.forEach(t => {
            const text = (t.name || '') + ' ' + (t.desc || '');
            if (text.toLowerCase().includes('advantage')) {
                const normText = text.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (normText.includes(`advantageon${attrFullName}check`) || normText.includes(`advantageon${k.toLowerCase()}check`)) {
                    hasAttrAdvantage = true;
                    hasFullAttrAdvantage = true;
                    if (!attrAdvantageSources.includes(t.name)) attrAdvantageSources.push(t.name || 'Trait');
                }
                // Check if trait grants advantage on skill of this attribute
                const matchedTraitSkills = [];
                DND_5E_SKILLS.forEach(sk => {
                    if (sk.attr === k) {
                        const skNorm = sk.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (normText.includes(`advantageon${skNorm}`) || normText.includes(`advantageon${sk.id}`)) {
                            matchedTraitSkills.push(sk.name);
                        }
                    }
                });
                if (matchedTraitSkills.length > 0) {
                    hasAttrAdvantage = true;
                    isSkillSpecificAdvantage = true;
                    const label = t.name ? `${t.name} (${[...new Set(matchedTraitSkills)].join(', ')})` : 'Trait';
                    if (!attrAdvantageSources.includes(label)) {
                        attrAdvantageSources.push(label);
                    }
                }
                if (normText.includes(`advantageon${attrFullName}save`) || normText.includes(`advantageon${k.toLowerCase()}save`)) {
                    hasSaveAdvantage = true;
                    if (!saveAdvantageSources.includes(t.name)) saveAdvantageSources.push(t.name || 'Trait');
                }
                if (normText.includes('gnomecunning') && [ABILITIES.INT, ABILITIES.WIS, ABILITIES.CHA].includes(k)) {
                    hasSaveAdvantage = true;
                    if (!saveAdvantageSources.includes('Gnome Cunning (vs Magic)')) saveAdvantageSources.push('Gnome Cunning (vs Magic)');
                }
                if (normText.includes('dwarvenresilience') && k === ABILITIES.CON) {
                    hasSaveAdvantage = true;
                    if (!saveAdvantageSources.includes('Dwarven Resilience (vs Poison)')) saveAdvantageSources.push('Dwarven Resilience (vs Poison)');
                }
                if (normText.includes('feyancestry') && [ABILITIES.WIS, ABILITIES.CHA].includes(k)) {
                    hasSaveAdvantage = true;
                    if (!saveAdvantageSources.includes('Fey Ancestry (vs Charmed)')) saveAdvantageSources.push('Fey Ancestry (vs Charmed)');
                }
                if (normText.includes('dangersense') && k === ABILITIES.DEX) {
                    hasSaveAdvantage = true;
                    if (!saveAdvantageSources.includes('Danger Sense')) saveAdvantageSources.push('Danger Sense');
                }
            }
        });

        const score = baseScore + bonusFromItems;
        const mod = calculateAbilityModifier(score);
        const save = mod + (raw.profSave ? pb : 0) + itemSaveBonus;

        computedAttrs[k] = {
            score,
            baseScore,
            bonusFromItems,
            mod,
            modStr: mod >= 0 ? `+${mod}` : `${mod}`,
            save,
            saveStr: save >= 0 ? `+${save}` : `${save}`,
            profSave: !!raw.profSave,
            itemSaveBonus,
            hasAttrAdvantage,
            hasFullAttrAdvantage,
            isSkillSpecificAdvantage,
            attrAdvantageSources: [...new Set(attrAdvantageSources)],
            hasSaveAdvantage,
            saveAdvantageSources: [...new Set(saveAdvantageSources)]
        };
    });

    return computedAttrs;
}
