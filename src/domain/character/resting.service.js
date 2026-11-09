import { REST_TYPES } from '../constants/dnd.constants.js';

/**
 * Pure domain service implementing D&D 5e RAW resting mechanics (PHB p. 186).
 * Free of UI/DOM side effects, completely deterministic and testable.
 */
export class RestingService {
    /**
     * Applies Short Rest mechanics to character data.
     * @param {Object} character - Character data.
     * @param {number} [diceCount=0] - Number of hit dice to spend.
     * @returns {Object} { character, summary }
     */
    static applyShortRest(character, diceCount = 0) {
        if (!character) return { character, summary: {} };

        if (!character.vitals) character.vitals = {};
        if (!Array.isArray(character.vitals.hitDiceSpent)) {
            character.vitals.hitDiceSpent = [];
        }

        const count = Math.max(0, parseInt(diceCount, 10) || 0);
        const availableIndices = [];
        character.vitals.hitDiceSpent.forEach((spent, i) => {
            if (!spent) availableIndices.push(i);
        });

        const actualSpent = Math.min(count, availableIndices.length);
        for (let i = 0; i < actualSpent; i++) {
            character.vitals.hitDiceSpent[availableIndices[i]] = true;
        }

        // Recharge short rest spell slots (e.g. Warlock Pact Magic)
        const rechargedSlots = [];
        (character.magic?.slots || []).forEach(s => {
            if ((s.reset || '').toLowerCase().includes(REST_TYPES.SHORT)) {
                if (Array.isArray(s.spent)) {
                    s.spent = s.spent.map(() => false);
                }
                rechargedSlots.push(s.level);
            }
        });

        // Recharge short rest combat resources (e.g. Ki, Wild Shape, Channel Divinity, Bardic Inspiration at 5+)
        const rechargedResources = [];
        (character.combat?.resources || []).forEach(r => {
            if ((r.reset || '').toLowerCase().includes(REST_TYPES.SHORT)) {
                if (Array.isArray(r.spent)) {
                    r.spent = r.spent.map(() => false);
                }
                rechargedResources.push(r.name);
            }
        });

        // Clear death saves
        character.deathSaves = {
            successes: [false, false, false],
            failures: [false, false, false]
        };

        const totalHitDice = character.vitals.hitDiceSpent.length;
        const availableHitDice = character.vitals.hitDiceSpent.filter(s => !s).length;

        return {
            character,
            summary: {
                requestedCount: count,
                actualSpent,
                rechargedSlots,
                rechargedResources,
                availableHitDice,
                totalHitDice,
                allRecharged: [...rechargedSlots, ...rechargedResources]
            }
        };
    }

    /**
     * Applies Long Rest mechanics to character data (PHB p. 186).
     * @param {Object} character - Character data.
     * @returns {Object} { character, summary }
     */
    static applyLongRest(character) {
        if (!character) return { character, summary: {} };

        if (!character.vitals) character.vitals = {};
        if (!Array.isArray(character.vitals.hitDiceSpent)) {
            character.vitals.hitDiceSpent = [];
        }

        const maxHp = character.vitals.maxHp || 1;
        character.vitals.currentHp = maxHp;
        character.vitals.tempHp = 0;

        // D&D 5e RAW: Regain spent Hit Dice up to half total (minimum 1)
        const totalHd = character.vitals.hitDiceSpent.length || 1;
        const maxRegained = Math.max(1, Math.floor(totalHd / 2));
        let regainedCount = 0;

        for (let i = 0; i < character.vitals.hitDiceSpent.length; i++) {
            if (character.vitals.hitDiceSpent[i] && regainedCount < maxRegained) {
                character.vitals.hitDiceSpent[i] = false;
                regainedCount++;
            }
        }

        // Clear death saves & concentration
        character.deathSaves = {
            successes: [false, false, false],
            failures: [false, false, false]
        };
        character.concentration = {
            active: false,
            spellName: ''
        };

        // Fully recharge all spell slots
        (character.magic?.slots || []).forEach(s => {
            if (Array.isArray(s.spent)) {
                s.spent = s.spent.map(() => false);
            }
        });

        // Fully recharge all combat resources
        (character.combat?.resources || []).forEach(r => {
            if (Array.isArray(r.spent)) {
                r.spent = r.spent.map(() => false);
            }
        });

        const remainingSpent = character.vitals.hitDiceSpent.filter(Boolean).length;
        const availableHd = totalHd - remainingSpent;

        return {
            character,
            summary: {
                restoredHp: maxHp,
                regainedCount,
                maxRegained,
                totalHd,
                availableHd,
                remainingSpent
            }
        };
    }
}
