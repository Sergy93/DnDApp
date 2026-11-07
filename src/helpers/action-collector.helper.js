import { normalizeKey } from './string.helper.js';

/**
 * Collects action features (bonus actions or reactions) dynamically from resources, traits, and equipped items.
 * @param {'bonus' | 'reaction'} actionType - Type of action to collect.
 * @param {Object} context - Sources: { resources, traits, equipped, bardicDie }.
 * @returns {Array<{ name: string, desc: string }>}
 */
export function collectActionFeatures(actionType, { resources = [], traits = [], equipped = [], bardicDie = '1d8' } = {}) {
    const list = [];
    const seen = new Set();
    const typeKey = String(actionType).toLowerCase();
    const isBonus = typeKey === 'bonus';

    // 1. From tactical resources
    (resources || []).forEach(r => {
        const cost = (r.actionCost || '').toLowerCase();
        if (cost.includes(typeKey)) {
            const key = normalizeKey(r.displayName || r.name);
            if (!seen.has(key)) {
                seen.add(key);
                let name = (r.displayName || r.name).replace(/\{\{bardicDie\}\}/g, bardicDie);
                let desc = r.desc
                    ? r.desc.replace(/\{\{bardicDie\}\}/g, bardicDie)
                    : (r.usesKey ? `Expend 1 use (${r.displayReset || r.reset} reset).` : (isBonus ? 'Bonus action resource.' : 'Reaction resource.'));
                list.push({ name, desc });
            }
        }
    });

    // 2. From traits
    (traits || []).forEach(t => {
        const text = `${t.name || ''} ${t.desc || ''}`.toLowerCase();
        const matches = isBonus
            ? (text.includes('bonus action') || (t.actionCost && t.actionCost.toLowerCase().includes('bonus')))
            : (text.includes('reaction:') || text.includes('as a reaction') || (t.actionCost && t.actionCost.toLowerCase().includes('reaction')));

        if (matches) {
            const key = normalizeKey(t.name);
            if (!seen.has(key)) {
                seen.add(key);
                list.push({
                    name: t.name,
                    desc: t.desc || (isBonus ? 'Bonus action feature.' : 'Reaction feature.')
                });
            }
        }
    });

    // 3. From equipped items
    (equipped || []).forEach(item => {
        const text = `${item.name || ''} ${item.desc || ''} ${item.notes || ''} ${item.properties || ''} ${item.special || ''}`.toLowerCase();
        const cost = (item.actionCost || '').toLowerCase();
        const matches = isBonus
            ? (cost.includes('bonus') || text.includes('bonus action') || text.includes('as a bonus action'))
            : (cost.includes('reaction') || text.includes('reaction:') || text.includes('as a reaction'));

        if (matches) {
            const key = normalizeKey(item.name);
            if (!seen.has(key)) {
                seen.add(key);
                list.push({
                    name: item.name,
                    desc: item.desc || item.special || item.notes || (isBonus ? 'Equipped item bonus action.' : 'Equipped item reaction.')
                });
            }
        }
    });

    return list;
}
