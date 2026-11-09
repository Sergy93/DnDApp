import { normalizeKey } from '../../helpers/string.helper.js';
import { BASE_PROFICIENCY_BONUS } from '../constants/dnd.constants.js';

/**
 * Pure calculator for weapon attack bonuses, damage modifiers, and formatted attack cards.
 * Supports standard STR/DEX/Finesse as well as PHB/XGE/TCE alternative attack attributes:
 * - Hexblade Warlock (XGE): Hex Warrior (CHA)
 * - Battle Smith / Armorer Artificer (TCE): Battle Ready / Arcane Armor (INT)
 * - Monk (PHB): Martial Arts (DEX on monk weapons)
 */

const MONK_WEAPON_KEYWORDS = [
    'unarmed', 'shortsword', 'club', 'dagger', 'handaxe', 'javelin',
    'lighthammer', 'mace', 'quarterstaff', 'sickle', 'spear', 'staff'
];

const ARMORER_WEAPON_KEYWORDS = [
    'thundergauntlet', 'thunderpulse', 'lightninglauncher', 'forcedemolisher'
];

function detectCharacterWeaponRules(character) {
    if (!character) return { isHexblade: false, isBattleSmith: false, isArmorer: false, isMonk: false };
    const classes = character?.identity?.classes || [];
    const traits = character?.combat?.traits || [];
    const traitText = traits.map(t => normalizeKey(`${t?.name || ''} ${t?.desc || ''}`)).join(' ');

    let isHexblade = traitText.includes('hexwarrior');
    let isBattleSmith = traitText.includes('battleready');
    let isArmorer = traitText.includes('armorermodel') || traitText.includes('arcanearmor');
    let isMonk = traitText.includes('martialarts');

    for (const c of classes) {
        const cName = normalizeKey(c?.name);
        const sName = normalizeKey(c?.subclass);
        if (cName === 'warlock' && sName.includes('hexblade')) isHexblade = true;
        if (cName === 'artificer' && sName.includes('battlesmith')) isBattleSmith = true;
        if (cName === 'artificer' && sName.includes('armorer')) isArmorer = true;
        if (cName === 'monk' && (parseInt(c?.level, 10) || 0) >= 1) isMonk = true;
    }

    return { isHexblade, isBattleSmith, isArmorer, isMonk };
}

/**
 * Computes attack and damage strings for weapons, handling finesse, attribute scaling, and magical bonuses.
 * @param {Array} weapons - Inventory weapons.
 * @param {Object} computedAttrs - Attributes map with calculated modifiers.
 * @param {number} [pb=BASE_PROFICIENCY_BONUS] - Proficiency bonus.
 * @param {Object} [character=null] - Optional character object for class feature rules (Hex Warrior, Battle Ready, Martial Arts).
 * @returns {Array} Computed weapons array.
 */
export function calculateWeapons(
    weapons = [],
    computedAttrs = {},
    pb = BASE_PROFICIENCY_BONUS,
    character = null
) {
    const rules = detectCharacterWeaponRules(character);

    return (weapons || []).map((w, idx) => {
        const nameBonusMatch = (w.name || '').match(/\+(\d+)/);
        const nameBonus = nameBonusMatch ? parseInt(nameBonusMatch[1], 10) : 0;
        const magicBonus = parseInt(w.magicBonus !== undefined ? w.magicBonus : nameBonus, 10) || 0;
        const isMagical = Boolean(w.magical || magicBonus > 0);
        const normName = normalizeKey(w.name || '');
        const mode = String(w.attrMode || '').toLowerCase();

        const strMod = computedAttrs.STR?.mod || 0;
        const dexMod = computedAttrs.DEX?.mod || 0;
        const intMod = computedAttrs.INT?.mod || 0;
        const chaMod = computedAttrs.CHA?.mod || 0;

        let usedAttr = 'STR';
        if (mode === 'dex') {
            usedAttr = 'DEX';
        } else if (mode === 'cha') {
            usedAttr = 'CHA';
        } else if (mode === 'int') {
            usedAttr = 'INT';
        } else if (mode === 'wis') {
            usedAttr = 'WIS';
        } else if (mode === 'finesse') {
            usedAttr = (dexMod >= strMod) ? 'DEX' : 'STR';
        }

        let currentBestMod = (computedAttrs[usedAttr] || computedAttrs.STR || { mod: 0 }).mod;

        // 1. Monk Martial Arts: can use DEX instead of STR for monk weapons
        const isMonkWeapon = Boolean(
            w.monkWeapon ||
            (rules.isMonk && MONK_WEAPON_KEYWORDS.some(kw => normName.includes(kw)))
        );
        if (isMonkWeapon && dexMod > currentBestMod) {
            usedAttr = 'DEX';
            currentBestMod = dexMod;
        }

        // 2. Artificer Battle Ready (INT with magic weapons) or Armorer Arcane Armor weapons
        const isArmorerWeapon = Boolean(
            w.arcaneArmorWeapon ||
            (rules.isArmorer && ARMORER_WEAPON_KEYWORDS.some(kw => normName.includes(kw)))
        );
        const isBattleReadyWeapon = Boolean(
            w.battleReady ||
            isArmorerWeapon ||
            (rules.isBattleSmith && isMagical)
        );
        if (isBattleReadyWeapon && intMod > currentBestMod) {
            usedAttr = 'INT';
            currentBestMod = intMod;
        }

        // 3. Warlock Hexblade: Hex Warrior (CHA with pact/hex weapon or non-two-handed weapon)
        const isTwoHanded = String(w.properties || w.notes || '').toLowerCase().includes('two-handed');
        const isHexWeapon = Boolean(
            w.hexWeapon ||
            w.pactWeapon ||
            (rules.isHexblade && !isTwoHanded)
        );
        if (isHexWeapon && chaMod > currentBestMod) {
            usedAttr = 'CHA';
            currentBestMod = chaMod;
        }

        const attrMod = (computedAttrs[usedAttr] || computedAttrs.STR || { mod: 0 }).mod;
        const atkBonus = attrMod + (w.proficient !== false ? pb : 0) + magicBonus;
        const dmgMod = attrMod + magicBonus;
        let dmgModStr = '';
        if (dmgMod > 0) dmgModStr = `+${dmgMod}`;
        else if (dmgMod < 0) dmgModStr = `-${Math.abs(dmgMod)}`;
        const dmgStr = `${w.dice || ''} ${dmgModStr} ${w.damageType || ''}`.replace(/\s+/g, ' ').trim();

        return {
            ...w,
            originalIndex: idx,
            usedAttr,
            atkStr: atkBonus >= 0 ? `+${atkBonus}` : `${atkBonus}`,
            dmgStr
        };
    });
}
