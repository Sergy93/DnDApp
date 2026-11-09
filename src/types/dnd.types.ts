/**
 * Canonical D&D 5e Domain & Database TypeScript Type Contracts.
 * Zero-duplication Single Source of Truth for Character Sheet, SQLite/D1, and Compendiums.
 */

export type AttributeKey = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export interface AttributeScore {
    score: number;
    profSave: boolean;
    mod?: number;
    saveVal?: number;
    saveStr?: string;
    hasAdvantage?: boolean;
    sources?: string[];
}

export type CharacterAttributes = Record<AttributeKey, AttributeScore>;

export interface CharacterClassInfo {
    name: string;
    subclass?: string;
    level: number;
    hitDie?: string;
}

export interface CharacterIdentity {
    name: string;
    race: string;
    classes: CharacterClassInfo[];
    background?: string;
    alignment?: string;
    experience?: number;
    imageUrl?: string;
    gender?: string;
    age?: string;
    height?: string;
    weight?: string;
    eyes?: string;
    skin?: string;
    hair?: string;
}

export interface CharacterVitals {
    currentHp: number;
    maxHp: number;
    tempHp: number;
    inspiration: number;
    hitDiceSpent: boolean[];
    deathSaves?: DeathSaves;
}

export interface DeathSaves {
    successes: [boolean, boolean, boolean];
    failures: [boolean, boolean, boolean];
}

export interface CharacterSkill {
    id: string;
    name: string;
    attr: AttributeKey;
    prof: '' | 'half' | 'C' | 'P'; // empty, jack of all trades, proficient, expertise
    customBonus?: number;
    valNum?: number;
    valStr?: string;
    hasAdvantage?: boolean;
    advSources?: string[];
    passiveScore?: number;
}

export interface WeaponItem {
    name: string;
    attrMode?: 'str' | 'dex' | 'finesse' | 'cha' | 'int' | 'wis';
    dice?: string;
    damageType?: string;
    propsRaw?: string;
    bonusAtk?: number;
    bonusDmg?: number;
    equipped?: boolean;
    notes?: string;
}

export interface ArmorItem {
    name: string;
    type: 'light' | 'medium' | 'heavy' | 'shield' | 'accessory';
    baseAc: number;
    stealthDisadv?: boolean;
    equipped: boolean;
    special?: string;
    grantedSpells?: string[];
    resistances?: string[];
    advantageSkills?: string[];
    advantageAttrs?: string[];
    advantageSaves?: string[];
    statBonuses?: Record<string, number>;
}

export interface ConsumableItem {
    name: string;
    qty: string | number;
    desc?: string;
}

export interface StoryItem {
    name: string;
    desc?: string;
    isSpecial?: boolean;
    isMagic?: boolean;
    equipped?: boolean;
    grantedSpells?: string[];
    resistances?: string[];
    advantageSkills?: string[];
    advantageAttrs?: string[];
    advantageSaves?: string[];
    statBonuses?: Record<string, number>;
}

export interface ToolItem {
    name: string;
    desc?: string;
    icon?: string;
    isInstrument?: boolean;
}

export interface WealthHoldings {
    pp: number;
    gp: number;
    ep: number;
    sp: number;
    cp: number;
}

export interface CharacterInventory {
    wealth: WealthHoldings;
    weapons: WeaponItem[];
    armors: ArmorItem[];
    consumables: ConsumableItem[];
    story: StoryItem[];
    tools: ToolItem[];
}

export interface SpellSlot {
    level: string;
    max: number;
    spent: boolean[];
    reset?: 'Short Rest' | 'Long Rest' | string;
}

export interface KnownSpell {
    name: string;
    source?: string;
    sourceType?: string;
    prepared?: boolean;
    alwaysPrepared?: boolean;
    level?: number;
}

export interface CharacterMagic {
    slots: SpellSlot[];
    spells: KnownSpell[];
}

export interface CombatResource {
    id?: string;
    name: string;
    uses?: number;
    usesKey?: string;
    spent: boolean[];
    reset?: 'Short Rest' | 'Long Rest' | 'Short/Long Rest' | string;
    sourceItem?: string;
    displayName?: string;
    displayReset?: string;
}

export interface CombatTrait {
    name: string;
    desc: string;
    source?: string;
    badge?: string;
    badgeIcon?: string;
    active?: boolean;
    displayName?: string;
    displayDesc?: string;
}

export interface CharacterCondition {
    id: string;
    source?: string;
}

export interface CharacterConcentration {
    active: boolean;
    spellName: string;
}

export interface SessionLogEntry {
    id?: string;
    icon?: string;
    title?: string;
    text: string;
    time?: string;
    timestamp?: string;
}

export interface CharacterCombat {
    resources: CombatResource[];
    traits: CombatTrait[];
    bladesongActive?: boolean;
}

export interface CharacterProgression {
    customProgression?: Record<string, any>;
}

export interface QuestEntry {
    id: string;
    title: string;
    desc?: string;
    completed: boolean;
}

/**
 * Root canonical Character Document.
 * Matches client character.json, IndexedDB cache, and LocalStorage.
 */
export interface CharacterDocument {
    id: string;
    slug: string;
    identity: CharacterIdentity;
    vitals: CharacterVitals;
    attributes: CharacterAttributes;
    skills: CharacterSkill[];
    inventory: CharacterInventory;
    magic: CharacterMagic;
    combat: CharacterCombat;
    progression: CharacterProgression;
    conditions: (string | CharacterCondition)[];
    concentration: CharacterConcentration;
    deathSaves: DeathSaves;
    statusNotes?: string;
    quests: QuestEntry[];
    campaignNotes?: string;
    sessionLog?: SessionLogEntry[];
    version: number;
    schema_version: number;
    client_updated_at: number;
    created_at?: string;
    updated_at?: string;
}

/**
 * SQLite/D1 Characters Table Row representation.
 * STRICT schema columns matching db/schema.sql and character-db.schema.js.
 */
export interface CharacterDbRow {
    id: string;
    user_id: string;
    slug: string;
    name: string;
    race: string;
    total_level: number;
    classes_summary: string;
    identity_json: string;
    vitals_json: string;
    attributes_json: string;
    skills_json: string;
    inventory_json: string;
    magic_json: string;
    combat_json: string;
    progression_json: string;
    conditions_json: string;
    concentration_json: string;
    death_saves_json: string;
    status_notes: string;
    quests_json: string;
    campaign_notes: string;
    version: number;
    schema_version: number;
    client_updated_at: number;
    created_at?: string;
    updated_at?: string;
}

/**
 * Compendium Entities
 */
export interface CompendiumSpell {
    id: string;
    name: string;
    source: string;
    level: number;
    school: string;
    time: any;
    range: any;
    duration: any;
    meta?: { ritual?: boolean };
    classes?: any;
    desc?: string;
    damage?: string;
    actionType?: string;
    conc?: boolean;
}

export interface CompendiumClass {
    id?: string;
    name: string;
    hitDie: string;
    subclassAliases?: Record<string, any>;
    featuresSync?: Record<string, any>;
    spellcasting?: {
        ability?: AttributeKey;
        casterType?: 'full' | 'half' | 'third' | 'pact' | 'artificer';
    };
    progression?: any[];
}

export interface CompendiumRace {
    id?: string;
    name: string;
    source?: string;
    speed?: string;
    traits?: any[];
    asi?: Record<string, number>;
}

export interface CompendiumBackground {
    id?: string;
    name: string;
    source?: string;
    skills?: string[];
}

export interface AllCompendiumsPayload {
    classes: Record<string, CompendiumClass> | CompendiumClass[];
    races: Record<string, CompendiumRace> | CompendiumRace[];
    backgrounds: Record<string, CompendiumBackground> | CompendiumBackground[];
    spells: { spell?: CompendiumSpell[] } | CompendiumSpell[];
    version?: number;
}
