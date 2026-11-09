import test from 'node:test';
import assert from 'node:assert/strict';
import { RestingService } from '../../src/domain/character/resting.service.js';

test('RestingService - D&D 5e RAW Mechanics Parity', async (t) => {
    await t.test('Short Rest spends hit dice and recharges short rest resources', () => {
        const char = {
            vitals: {
                currentHp: 15,
                maxHp: 30,
                hitDiceSpent: [false, false, false, false]
            },
            deathSaves: { successes: [true, false, false], failures: [true, true, false] },
            magic: {
                slots: [
                    { level: '1st Level', reset: 'Long Rest', spent: [true, true] },
                    { level: 'Pact Slot', reset: 'Short Rest', spent: [true, true] }
                ]
            },
            combat: {
                resources: [
                    { name: 'Ki Points', reset: 'Short Rest', spent: [true, true, false] },
                    { name: 'Rage', reset: 'Long Rest', spent: [true, false] }
                ]
            }
        };

        const { summary } = RestingService.applyShortRest(char, 2);

        assert.equal(summary.actualSpent, 2);
        assert.equal(summary.availableHitDice, 2);
        assert.deepEqual(char.vitals.hitDiceSpent, [true, true, false, false]);

        // Long rest slots untouched, short rest slots restored
        assert.deepEqual(char.magic.slots[0].spent, [true, true]);
        assert.deepEqual(char.magic.slots[1].spent, [false, false]);

        // Long rest resources untouched, short rest resources restored
        assert.deepEqual(char.combat.resources[0].spent, [false, false, false]);
        assert.deepEqual(char.combat.resources[1].spent, [true, false]);

        // Death saves cleared
        assert.deepEqual(char.deathSaves, {
            successes: [false, false, false],
            failures: [false, false, false]
        });
    });

    await t.test('Long Rest fully restores HP, all slots, and up to half total hit dice', () => {
        const char = {
            vitals: {
                currentHp: 5,
                tempHp: 8,
                maxHp: 40,
                hitDiceSpent: [true, true, true, true, true, true] // 6 hit dice spent
            },
            deathSaves: { successes: [true, false, false], failures: [true, true, false] },
            concentration: { active: true, spellName: 'Bless' },
            magic: {
                slots: [
                    { level: '1st Level', reset: 'Long Rest', spent: [true, true] },
                    { level: '2nd Level', reset: 'Long Rest', spent: [true] }
                ]
            },
            combat: {
                resources: [
                    { name: 'Bardic Inspiration', reset: 'Short/Long Rest', spent: [true, true] },
                    { name: 'Rage', reset: 'Long Rest', spent: [true, true, true] }
                ]
            }
        };

        const { summary } = RestingService.applyLongRest(char);

        // Restores full HP and clears temp HP
        assert.equal(char.vitals.currentHp, 40);
        assert.equal(char.vitals.tempHp, 0);

        // Regains half total hit dice: floor(6 / 2) = 3 regained
        assert.equal(summary.regainedCount, 3);
        assert.equal(summary.maxRegained, 3);
        assert.equal(summary.availableHd, 3);
        assert.deepEqual(char.vitals.hitDiceSpent, [false, false, false, true, true, true]);

        // Concentration and death saves cleared
        assert.equal(char.concentration.active, false);
        assert.deepEqual(char.deathSaves, {
            successes: [false, false, false],
            failures: [false, false, false]
        });

        // All spell slots and combat resources restored
        assert.deepEqual(char.magic.slots[0].spent, [false, false]);
        assert.deepEqual(char.magic.slots[1].spent, [false]);
        assert.deepEqual(char.combat.resources[0].spent, [false, false]);
        assert.deepEqual(char.combat.resources[1].spent, [false, false, false]);
    });
});
