/**
 * D&D 5e Canonical Feats Compendium (PHB, XGE, TCE).
 * Structured Single Source of Truth (SSOT) for feats, prerequisites, half-feat ASI bonuses, and descriptions.
 */

export const DND_5E_FEATS = Object.freeze([
    {
        id: 'actor',
        name: 'Actor',
        category: 'half-feat',
        prerequisite: '',
        asi: { choose: ['CHA'], amount: 1 },
        desc: 'Increase your Charisma score by 1, to a maximum of 20. You have advantage on Charisma (Deception) and Charisma (Performance) checks when trying to pass yourself off as a different person. You can mimic the speech of another person or the sounds made by other creatures that you have heard for at least 1 minute.',
        source: 'PHB'
    },
    {
        id: 'alert',
        name: 'Alert',
        category: 'combat',
        prerequisite: '',
        asi: null,
        desc: 'You gain a +5 bonus to initiative. You cannot be surprised while you are conscious. Other creatures don’t gain advantage on attack rolls against you as a result of being unseen by you.',
        source: 'PHB'
    },
    {
        id: 'athlete',
        name: 'Athlete',
        category: 'half-feat',
        prerequisite: '',
        asi: { choose: ['STR', 'DEX'], amount: 1 },
        desc: 'Increase your Strength or Dexterity score by 1, to a maximum of 20. When you are prone, standing up uses only 5 feet of your movement. Climbing doesn’t cost you extra movement. You can make a running long jump or running high jump after moving only 5 feet on foot.',
        source: 'PHB'
    },
    {
        id: 'crossbow-expert',
        name: 'Crossbow Expert',
        category: 'combat',
        prerequisite: '',
        asi: null,
        desc: 'You ignore the loading quality of crossbows with which you are proficient. Being within 5 feet of a hostile creature doesn’t impose disadvantage on your ranged attack rolls. When you use the Attack action and attack with a one-handed weapon, you can use a bonus action to attack with a hand crossbow you are holding.',
        source: 'PHB'
    },
    {
        id: 'dual-wielder',
        name: 'Dual Wielder',
        category: 'combat',
        prerequisite: '',
        asi: null,
        desc: 'You gain a +1 bonus to AC while you are wielding a separate melee weapon in each hand. You can use two-weapon fighting even when the one-handed melee weapons you are wielding aren’t light. You can draw or stow two one-handed weapons when you would normally be able to draw or stow only one.',
        source: 'PHB'
    },
    {
        id: 'fey-touched',
        name: 'Fey Touched',
        category: 'half-feat',
        prerequisite: '',
        asi: { choose: ['INT', 'WIS', 'CHA'], amount: 1 },
        desc: 'Increase your Intelligence, Wisdom, or Charisma score by 1, to a maximum of 20. You learn the Misty Step spell and one 1st-level spell of your choice from the divination or enchantment school of magic. You can cast each of these spells once without expending a spell slot per long rest, and you can also cast them using spell slots of the appropriate level.',
        source: 'TCE'
    },
    {
        id: 'great-weapon-master',
        name: 'Great Weapon Master',
        category: 'combat',
        prerequisite: '',
        asi: null,
        desc: 'On your turn, when you score a critical hit with a melee weapon or reduce a creature to 0 hit points with one, you can make one melee weapon attack as a bonus action. Before you make a melee attack with a heavy weapon that you are proficient with, you can choose to take a -5 penalty to the attack roll; if the attack hits, you add +10 to the attack’s damage.',
        source: 'PHB'
    },
    {
        id: 'healer',
        name: 'Healer',
        category: 'general',
        prerequisite: '',
        asi: null,
        desc: 'When you use a healer’s kit to stabilize a dying creature, that creature also regains 1 hit point. As an action, you can spend one use of a healer’s kit to tend to a creature and restore 1d6 + 4 hit points to it, plus additional hit points equal to the creature’s maximum number of Hit Dice. That creature cannot regain hit points from this feat again until it finishes a short or long rest.',
        source: 'PHB'
    },
    {
        id: 'heavy-armor-master',
        name: 'Heavy Armor Master',
        category: 'half-feat',
        prerequisite: 'Proficiency with heavy armor',
        asi: { choose: ['STR'], amount: 1 },
        desc: 'Increase your Strength score by 1, to a maximum of 20. While you are wearing heavy armor, bludgeoning, piercing, and slashing damage that you take from nonmagical attacks is reduced by 3.',
        source: 'PHB'
    },
    {
        id: 'inspiring-leader',
        name: 'Inspiring Leader',
        category: 'general',
        prerequisite: 'Charisma 13 or higher',
        asi: null,
        desc: 'You can spend 10 minutes inspiring your companions. When you do so, choose up to six friendly creatures (which can include yourself) within 30 feet who can see or hear you and understand you. Each creature gains temporary hit points equal to your level + your Charisma modifier. A creature can’t gain temporary hit points from this feat again until it finishes a short or long rest.',
        source: 'PHB'
    },
    {
        id: 'lucky',
        name: 'Lucky',
        category: 'general',
        prerequisite: '',
        asi: null,
        desc: 'You have 3 luck points per long rest. Whenever you make an attack roll, ability check, or saving throw, you can spend one luck point to roll an additional d20 and choose which d20 to use. You can also spend one luck point when an attack roll is made against you to roll a d20 and choose whether the attack uses the attacker’s roll or yours.',
        source: 'PHB'
    },
    {
        id: 'mage-slayer',
        name: 'Mage Slayer',
        category: 'combat',
        prerequisite: '',
        asi: null,
        desc: 'When a creature within 5 feet of you casts a spell, you can use your reaction to make a melee weapon attack against that creature. When you damage a creature that is concentrating on a spell, that creature has disadvantage on the saving throw it makes to maintain its concentration. You have advantage on saving throws against spells cast by creatures within 5 feet of you.',
        source: 'PHB'
    },
    {
        id: 'magic-initiate',
        name: 'Magic Initiate',
        category: 'magic',
        prerequisite: '',
        asi: null,
        desc: 'Choose a class: bard, cleric, druid, sorcerer, warlock, or wizard. You learn two cantrips of your choice from that class’s spell list. In addition, choose one 1st-level spell from that same list. You learn that spell and can cast it at its lowest level once per long rest.',
        source: 'PHB'
    },
    {
        id: 'mobile',
        name: 'Mobile',
        category: 'combat',
        prerequisite: '',
        asi: null,
        desc: 'Your speed increases by 10 feet. When you use the Dash action, difficult terrain doesn’t cost you extra movement on that turn. When you make a melee attack against a creature, you don’t provoke opportunity attacks from that creature for the rest of the turn, whether you hit or not.',
        source: 'PHB'
    },
    {
        id: 'polearm-master',
        name: 'Polearm Master',
        category: 'combat',
        prerequisite: '',
        asi: null,
        desc: 'When you take the Attack action and attack with only a glaive, halberd, quarterstaff, or spear, you can use a bonus action to make a melee attack with the opposite end of the weapon (1d4 bludgeoning damage). While you are wielding a glaive, halberd, pike, quarterstaff, or spear, other creatures provoke an opportunity attack from you when they enter the reach you have with that weapon.',
        source: 'PHB'
    },
    {
        id: 'resilient',
        name: 'Resilient',
        category: 'half-feat',
        prerequisite: '',
        asi: { choose: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], amount: 1 },
        desc: 'Choose one ability score. Increase the chosen ability score by 1, to a maximum of 20. You gain proficiency in saving throws using the chosen ability.',
        source: 'PHB'
    },
    {
        id: 'sentinel',
        name: 'Sentinel',
        category: 'combat',
        prerequisite: '',
        asi: null,
        desc: 'When you hit a creature with an opportunity attack, the creature’s speed becomes 0 for the rest of the turn. Creatures provoke opportunity attacks from you even if they take the Disengage action before leaving your reach. When a creature within 5 feet of you makes an attack against a target other than you (and that target doesn’t have this feat), you can use your reaction to make a melee weapon attack against the attacking creature.',
        source: 'PHB'
    },
    {
        id: 'shadow-touched',
        name: 'Shadow Touched',
        category: 'half-feat',
        prerequisite: '',
        asi: { choose: ['INT', 'WIS', 'CHA'], amount: 1 },
        desc: 'Increase your Intelligence, Wisdom, or Charisma score by 1, to a maximum of 20. You learn the Invisibility spell and one 1st-level spell of your choice from the illusion or necromancy school of magic. You can cast each of these spells once without expending a spell slot per long rest, and you can also cast them using spell slots of the appropriate level.',
        source: 'TCE'
    },
    {
        id: 'sharpshooter',
        name: 'Sharpshooter',
        category: 'combat',
        prerequisite: '',
        asi: null,
        desc: 'Attacking at long range doesn’t impose disadvantage on your ranged weapon attack rolls. Your ranged weapon attacks ignore half cover and three-quarters cover. Before you make an attack with a ranged weapon that you are proficient with, you can choose to take a -5 penalty to the attack roll; if the attack hits, you add +10 to the attack’s damage.',
        source: 'PHB'
    },
    {
        id: 'shield-master',
        name: 'Shield Master',
        category: 'combat',
        prerequisite: '',
        asi: null,
        desc: 'If you take the Attack action on your turn, you can use a bonus action to try to shove a creature within 5 feet of you with your shield. If you aren’t incapacitated, you can add your shield’s AC bonus to any Dexterity saving throw you make against a spell or other harmful effect that targets only you. If you are subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you can use your reaction to interpose your shield and take no damage if you succeed on the saving throw.',
        source: 'PHB'
    },
    {
        id: 'skill-expert',
        name: 'Skill Expert',
        category: 'half-feat',
        prerequisite: '',
        asi: { choose: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], amount: 1 },
        desc: 'Increase one ability score of your choice by 1, to a maximum of 20. You gain proficiency in one skill of your choice. Choose one skill in which you have proficiency; you gain expertise with that skill, meaning your proficiency bonus is doubled for any ability check you make with it.',
        source: 'TCE'
    },
    {
        id: 'tavern-brawler',
        name: 'Tavern Brawler',
        category: 'half-feat',
        prerequisite: '',
        asi: { choose: ['STR', 'CON'], amount: 1 },
        desc: 'Increase your Strength or Constitution score by 1, to a maximum of 20. You are proficient with improvised weapons. Your unarmed strike uses a d4 for damage. When you hit a creature with an unarmed strike or an improvised weapon on your turn, you can use a bonus action to attempt to grapple the target.',
        source: 'PHB'
    },
    {
        id: 'telekinetic',
        name: 'Telekinetic',
        category: 'half-feat',
        prerequisite: '',
        asi: { choose: ['INT', 'WIS', 'CHA'], amount: 1 },
        desc: 'Increase your Intelligence, Wisdom, or Charisma score by 1, to a maximum of 20. You learn the Mage Hand cantrip. You can cast it without verbal or somatic components, you can make the spectral hand invisible, and its range increases by 30 feet. As a bonus action, you can telekinetically shove one creature you can see within 30 feet of you; target must succeed on a Strength saving throw (DC 8 + PB + chosen ability mod) or be moved 5 feet toward or away from you.',
        source: 'TCE'
    },
    {
        id: 'telepathic',
        name: 'Telepathic',
        category: 'half-feat',
        prerequisite: '',
        asi: { choose: ['INT', 'WIS', 'CHA'], amount: 1 },
        desc: 'Increase your Intelligence, Wisdom, or Charisma score by 1, to a maximum of 20. You can speak telepathically to any creature you can see within 60 feet of you in a language you know. You can cast the Detect Thoughts spell without expending a spell slot or requiring components once per long rest.',
        source: 'TCE'
    },
    {
        id: 'tough',
        name: 'Tough',
        category: 'general',
        prerequisite: '',
        asi: null,
        desc: 'Your hit point maximum increases by an amount equal to twice your level when you gain this feat. Whenever you gain a level thereafter, your hit point maximum increases by an additional 2 hit points.',
        source: 'PHB'
    },
    {
        id: 'war-caster',
        name: 'War Caster',
        category: 'magic',
        prerequisite: 'The ability to cast at least one spell',
        asi: null,
        desc: 'You have advantage on Constitution saving throws that you make to maintain your concentration on a spell when you take damage. You can perform the somatic components of spells even when you have weapons or a shield in one or both hands. When a hostile creature’s movement provokes an opportunity attack from you, you can use your reaction to cast a spell at the creature, rather than making an opportunity attack (casting time of 1 action and target only that creature).',
        source: 'PHB'
    }
]);

export function findFeat(idOrName = '') {
    if (!idOrName) return null;
    const query = String(idOrName).toLowerCase().replace(/[^a-z0-9]/g, '');
    const feat = DND_5E_FEATS.find(f => {
        const fId = f.id.replace(/[^a-z0-9]/g, '');
        const fName = f.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return fId === query || fName === query;
    });
    if (!feat) return null;
    if (feat.asi && !feat.asi.attributes) {
        return {
            ...feat,
            asi: {
                ...feat.asi,
                attributes: feat.asi.choose || []
            }
        };
    }
    return feat;
}
