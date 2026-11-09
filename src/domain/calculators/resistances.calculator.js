import DND_RULES from '../../dnd-data/dnd-rules.json' with { type: "json" };
import { normalizeKey } from '../../helpers/string.helper.js';
import { RaceProvider } from '../providers/race.provider.js';
import { getAllEquippedItems } from '../items/equipped-items.helper.js';

const DAMAGE_TYPES = DND_RULES.damageTypes;

/**
 * Pure domain calculator for compiling all active character damage resistances
 * across race, vital sheet properties, combat traits, and equipped items.
 *
 * @param {Object} character - Character sheet object.
 * @returns {Array<{ id: string, name: string, icon: string, source: string, sources: Array<string> }>}
 */
export function resolveCharacterResistances(character) {
    const map = new Map();

    const addRes = (idOrName, source) => {
        const norm = normalizeKey(idOrName);
        if (!norm) return;
        const dt = DAMAGE_TYPES.find(t => normalizeKey(t.id) === norm || normalizeKey(t.name) === norm);
        const id = dt ? dt.id : norm;
        const name = dt ? dt.name : (idOrName.charAt(0).toUpperCase() + idOrName.slice(1));
        const icon = dt ? dt.icon : '🛡️';

        if (!map.has(id)) {
            map.set(id, { id, name, icon, sources: [source] });
        } else {
            const entry = map.get(id);
            if (!entry.sources.includes(source)) {
                entry.sources.push(source);
            }
        }
    };

    // 1. Inherent racial resistances from RaceProvider
    const raceRes = RaceProvider.getResistances(character?.identity?.race);
    const raceLabel = character?.identity?.race ? `Race: ${character.identity.race}` : 'Race';
    raceRes.forEach(r => addRes(r, raceLabel));

    // 2. Explicit array in character.vitals.damageResistances if defined
    if (Array.isArray(character?.vitals?.damageResistances)) {
        character.vitals.damageResistances.forEach(r => addRes(r, 'Character Sheet / Vitals'));
    }

    // 3. Scan combat traits (e.g. Tiefling Infernal Resistance, class features)
    const traits = character?.combat?.traits || [];
    traits.forEach(t => {
        const text = `${t.name || ''} ${t.desc || ''}`.toLowerCase();
        DAMAGE_TYPES.forEach(dt => {
            const typeName = dt.id;
            const reg = new RegExp(`(?:resistance|resistant)\\s+to\\s+[^.]*?\\b${typeName}\\b`, 'i');
            if (reg.test(text)) {
                addRes(dt.id, t.name || 'Trait');
            }
        });
    });

    // 4. Scan all equipped items (armors, accessories, story items, weapons)
    const allEquipped = getAllEquippedItems(character);

    allEquipped.forEach(item => {
        const itemRes = Array.isArray(item.resistances) ? item.resistances : [];
        itemRes.forEach(r => {
            addRes(r, item.name || 'Equipment');
        });
    });

    return Array.from(map.values()).map(r => ({
        ...r,
        source: r.sources.join(', ')
    }));
}
