import CHARACTER_DATA from '../../character.json' with { type: "json" };
import { capitalizeWord } from '../../helpers/string.helper.js';
import { ClassSyncService } from '../progression/class-sync.service.js';
import {
    MIN_CHARACTER_LEVEL,
    BASE_PROFICIENCY_BONUS,
    PROFICIENCY_LEVEL_STEP,
    DEFAULT_HIT_DIE
} from '../constants/dnd.constants.js';

/**
 * Service responsible for validating, normalizing, and sanitizing character data.
 * Ensures consistent structural invariants and safe defaults for tracking values.
 */
export class CharacterSanitizerService {
    /**
     * Sanitizes and normalizes character data according to D&D 5e sheet schema.
     * @param {Object} d - Raw character object.
     * @returns {Object} Sanitized character object.
     */
    static sanitize(d) {
        if (!d || typeof d !== 'object') d = JSON.parse(JSON.stringify(CHARACTER_DATA));
        if (!d.identity || typeof d.identity !== 'object') d.identity = {};
        if (!d.vitals || typeof d.vitals !== 'object') d.vitals = {};
        d.vitals.inspiration = Math.max(0, parseInt(d.vitals.inspiration, 10) || 0);
        if (!Array.isArray(d.quests)) d.quests = [];
        if (typeof d.campaignNotes !== 'string') d.campaignNotes = '';
        if (!d.combat || typeof d.combat !== 'object') d.combat = {};
        if (!d.inventory || typeof d.inventory !== 'object') d.inventory = {};

        if (!Array.isArray(d.identity.classes) || d.identity.classes.length === 0) {
            d.identity.classes = [{ name: "Character", subclass: "", level: MIN_CHARACTER_LEVEL, hitDie: DEFAULT_HIT_DIE }];
        }
        d.identity.classes = d.identity.classes.map(c => ({
            ...c,
            name: capitalizeWord(c.name || "Character"),
            subclass: c.subclass ? capitalizeWord(c.subclass) : ''
        }));

        const totalHd = d.identity.classes.reduce((a, b) => a + (b.level || 0), 0) || MIN_CHARACTER_LEVEL;
        const pb = Math.floor((totalHd - MIN_CHARACTER_LEVEL) / PROFICIENCY_LEVEL_STEP) + BASE_PROFICIENCY_BONUS;

        if (!Array.isArray(d.vitals.hitDiceSpent)) d.vitals.hitDiceSpent = [];
        while (d.vitals.hitDiceSpent.length < totalHd) d.vitals.hitDiceSpent.push(false);
        if (d.vitals.hitDiceSpent.length > totalHd) d.vitals.hitDiceSpent = d.vitals.hitDiceSpent.slice(0, totalHd);

        if (!d.deathSaves || !Array.isArray(d.deathSaves.successes) || !Array.isArray(d.deathSaves.failures)) {
            d.deathSaves = { successes: [false, false, false], failures: [false, false, false] };
        }
        if (!d.concentration) d.concentration = { active: false, spellName: "" };
        if (!Array.isArray(d.conditions)) d.conditions = [];
        d.conditions = d.conditions.map(c => {
            if (typeof c === 'string') return { id: c, source: 'General' };
            if (c && typeof c === 'object' && c.id) return { id: c.id, source: c.source || 'General' };
            return null;
        }).filter(Boolean);
        if (!Array.isArray(d.sessionLog)) d.sessionLog = [];
        if (!Array.isArray(d.combat.resources)) d.combat.resources = [];
        if (!Array.isArray(d.combat.traits)) d.combat.traits = [];

        d.combat.resources.forEach(r => {
            const uses = ClassSyncService.resolveResourceMaxUses(r, d.attributes, pb, d);
            if (!Array.isArray(r.spent)) r.spent = [];
            while (r.spent.length < uses) r.spent.push(false);
            if (r.spent.length > uses) r.spent = r.spent.slice(0, uses);
        });

        // Auto-sync spell slots according to official class tables
        ClassSyncService.syncCharacterSpellSlots(d);

        if (!d.magic) d.magic = { slots: [], spells: [] };
        if (!Array.isArray(d.magic.slots)) d.magic.slots = [];
        d.magic.slots.forEach(slot => {
            const max = slot.max || 1;
            if (!Array.isArray(slot.spent)) slot.spent = [];
            while (slot.spent.length < max) slot.spent.push(false);
            if (slot.spent.length > max) slot.spent = slot.spent.slice(0, max);
        });

        if (!Array.isArray(d.magic.spells)) d.magic.spells = [];
        d.magic.spells = d.magic.spells.map(sp => ({
            ...sp,
            name: sp.name || "Spell",
            source: sp.source || 'Custom',
            sourceType: sp.sourceType || 'other'
        }));

        if (!d.inventory.wealth) {
            d.inventory.wealth = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
        } else {
            if (d.inventory.wealth.pp === undefined) d.inventory.wealth.pp = 0;
            if (d.inventory.wealth.gp === undefined) d.inventory.wealth.gp = 0;
            if (d.inventory.wealth.ep === undefined) d.inventory.wealth.ep = 0;
            if (d.inventory.wealth.sp === undefined) d.inventory.wealth.sp = 0;
            if (d.inventory.wealth.cp === undefined) d.inventory.wealth.cp = 0;
        }
        ['armors', 'weapons', 'consumables', 'tools', 'story'].forEach(k => {
            if (!Array.isArray(d.inventory[k])) d.inventory[k] = [];
        });

        // Ensure legacy items with known intrinsic skill/stat advantages retain their equipped status and skills
        d.inventory.story.forEach(item => {
            if (item && item.name && item.name.toLowerCase().includes('consilium dubium')) {
                if (item.equipped === undefined) item.equipped = true;
                if (!Array.isArray(item.advantageSkills) || item.advantageSkills.length === 0) {
                    item.advantageSkills = ['Persuasion', 'Deception'];
                }
            }
        });

        return d;
    }
}
