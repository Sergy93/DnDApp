// ================= SEGURIDAD DE FILEREADER =================
const SafeFileReader = (typeof window !== 'undefined' && (window.FileReader || FileReader))
    ? (window.FileReader || FileReader)
    : FileReader;

const STORAGE_KEY = 'character_dnd_v18';

import { CHARACTER_DATA } from "./character.js";
import { PHB_SPELLS } from "./spells/spells-phb.js";
import { TCE_SPELLS } from "./spells/spells-tce.js";
import { XGE_SPELLS } from "./spells/spells-xge.js";

const SPELL_SOURCES = [PHB_SPELLS, TCE_SPELLS, XGE_SPELLS];

// ================= BASE DE DATOS DE PROGRESIÓN (D&D 5e 2014) =================
const CLASS_COMPENDIUM = {
    bardo: {
        name: "Bardo",
        subclasses: {
            elocuencia: {
                name: "Colegio de la Elocuencia",
                features: {
                    3: [
                        "Lengua de Plata (Silver Tongue): En Persuasión o Engaño, cualquier 1-9 en el d20 cuenta como 10.",
                        "Palabras Inquietantes (Unsettling Words): Como Acción Adicional, resta 1d8 a la próxima salvación del enemigo."
                    ],
                    6: [
                        "Discurso Infalible (Unfailing Inspiration): Si un aliado usa tu dado de Inspiración Bárdica y falla, conserva el dado."
                    ],
                    14: [
                        "Inspiración Contagiosa (Infectious Inspiration): Al tener éxito un aliado con tu inspiración, otorga otro dado a un compañero cercano como reacción (usos = CAR)."
                    ]
                }
            }
        },
        baseFeatures: {
            1: ["Lanzamiento de Conjuros de Bardo", "Inspiración Bárdica (d6, usos = Carisma)", "Competencias marciales iniciales"],
            2: ["Polifacético (+1/2 competencia a tiradas sin ella)", "Canción de Descanso (+1d6 HP en descanso corto)"],
            3: ["Elección de Colegio Bárdico", "Pericia (doble competencia en dos habilidades)"],
            4: ["Mejora de Característica (ASI) o Dote"],
            5: ["Inspiración Bárdica mejorada a d8", "Fuente de Inspiración (recuperas todos los usos en Descanso Corto o Largo)"],
            6: ["Contraencantamiento"],
            7: ["Conjuros de Nivel 4"],
            8: ["Mejora de Característica (ASI) o Dote"],
            9: ["Canción de Descanso mejorada a +1d8"],
            10: ["Inspiración Bárdica mejorada a d10", "Pericia en dos habilidades más", "Secretos Mágicos (2 conjuros de cualquier clase)"],
            11: ["Conjuros de Nivel 6"],
            12: ["Mejora de Característica (ASI) o Dote"],
            13: ["Canción de Descanso mejorada a +1d10"],
            14: ["Secretos Mágicos (2 conjuros de cualquier clase)"],
            15: ["Inspiración Bárdica mejorada a d12"],
            16: ["Mejora de Característica (ASI) o Dote"],
            17: ["Canción de Descanso mejorada a +1d12", "Conjuros de Nivel 9"],
            18: ["Secretos Mágicos (2 conjuros de cualquier clase)"],
            19: ["Mejora de Característica (ASI) o Dote"],
            20: ["Inspiración Superior (recuperas 1 dado si tiras iniciativa sin ninguno)"]
        }
    },
    brujo: {
        name: "Brujo",
        subclasses: {
            djinni: {
                name: "El Genio (Djinni)",
                features: {
                    1: [
                        "Vaso del Genio (Genie's Vessel): Refugio planar dentro de tu recipiente (CA 15, HP = tu nivel).",
                        "Ira del Genio (Genie's Wrath): Sumas daño de Trueno igual a tu competencia al primer impacto de tu turno."
                    ],
                    6: [
                        "Regalo Elemental (Elemental Gift): Resistencia a Trueno y vuelo de 30' durante 10 min (sin concentración)."
                    ],
                    10: [
                        "Santuario del Recipiente: Puedes introducir hasta 5 aliados en el vaso; obtienen un Descanso Corto en solo 10 min."
                    ],
                    14: [
                        "Deseo Limitado (Limited Wish): Duplica cualquier conjuro de nivel 1 a 6 de 1 acción sin componentes (1 uso cada 1d4 descansos largos)."
                    ]
                }
            }
        },
        baseFeatures: {
            1: ["Patrón Sobrenatural", "Magia de Pacto (recarga en descanso corto)"],
            2: ["Invocaciones Sobrenaturales (2 iniciales)"],
            3: ["Don del Pacto"],
            4: ["Mejora de Característica (ASI) o Dote"],
            5: ["Espacios de Pacto suben a Nivel 3", "Nueva Invocación"],
            6: ["Rasgo de Patrón Sobrenatural"],
            7: ["Espacios de Pacto suben a Nivel 4", "Nueva Invocación"],
            8: ["Mejora de Característica (ASI) o Dote"],
            9: ["Espacios de Pacto suben a Nivel 5", "Nueva Invocación"],
            10: ["Rasgo de Patrón Sobrenatural"],
            11: ["Arcano Místico (Nivel 6)", "3 espacios de pacto"],
            12: ["Mejora de Característica (ASI) o Dote", "Nueva Invocación"],
            13: ["Arcano Místico (Nivel 7)"],
            14: ["Rasgo de Patrón Sobrenatural"],
            15: ["Arcano Místico (Nivel 8)", "Nueva Invocación"],
            16: ["Mejora de Característica (ASI) o Dote"],
            17: ["Arcano Místico (Nivel 9)", "4 espacios de pacto"],
            18: ["Nueva Invocación"],
            19: ["Mejora de Característica (ASI) o Dote"],
            20: ["Maestro del Pacto (recupera todos los espacios tras suplicar 1 min)"]
        }
    }
};

function normalizeKey(str) {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
}

function generateProgressionTree(className, subclassName) {
    const normClass = normalizeKey(className);
    const normSub = normalizeKey(subclassName);

    const classKey = Object.keys(CLASS_COMPENDIUM).find(k => normClass.includes(k) || k.includes(normClass));
    if (!classKey) return [];

    const classObj = CLASS_COMPENDIUM[classKey];
    const subKey = Object.keys(classObj.subclasses || {}).find(k => normSub.includes(k) || k.includes(normSub));
    const subObj = subKey ? classObj.subclasses[subKey] : null;

    const levels = [];
    for (let lvl = 1; lvl <= 20; lvl++) {
        const feats = [];
        if (classObj.baseFeatures && classObj.baseFeatures[lvl]) feats.push(...classObj.baseFeatures[lvl]);
        if (subObj && subObj.features && subObj.features[lvl]) feats.push(...subObj.features[lvl]);
        if (feats.length > 0) {
            levels.push({ level: lvl, title: `Nivel ${lvl}`, feats });
        }
    }
    return levels;
}

const defaultCharacterData = {
    identity: {
        name: "Dorian",
        race: "Tiefling (Glasya)",
        alignment: "Caótico Neutral",
        background: "Criminal / Fugitivo",
        classes: [
            { name: "Bardo", subclass: "Elocuencia", level: 5, hitDie: "d8" },
            { name: "Brujo", subclass: "Djinni", level: 1, hitDie: "d8" }
        ],
        senses: "Visión en Oscuridad (60 pies)",
        languages: ["Común", "Infernal", "Jerga de Ladrones"]
    },
    vitals: {
        speed: "30 pies",
        maxHp: 48,
        currentHp: 48,
        tempHp: 0,
        hitDiceSpent: [false, false, false, false, false, false]
    },
    concentration: { active: false, spellName: "" },
    deathSaves: { successes: [false, false, false], failures: [false, false, false] },
    statusNotes: "",
    attributes: {
        FUE: { score: 8, profSave: false },
        DES: { score: 14, profSave: true },
        CON: { score: 14, profSave: false },
        INT: { score: 10, profSave: false },
        SAB: { score: 12, profSave: false },
        CAR: { score: 18, profSave: true }
    },
    skills: [
        { id: "acrobacias", name: "Acrobacias", attr: "DES", profType: "C" },
        { id: "arcanos", name: "Arcanos", attr: "INT", profType: "·" },
        { id: "atletismo", name: "Atletismo", attr: "FUE", profType: "·" },
        { id: "engano", name: "Engaño", attr: "CAR", profType: "P", note: "Ventaja", minTen: true },
        { id: "historia", name: "Historia", attr: "INT", profType: "·" },
        { id: "intimidacion", name: "Intimidación", attr: "CAR", profType: "C" },
        { id: "interpretacion", name: "Interpretación", attr: "CAR", profType: "C" },
        { id: "investigacion", name: "Investigación", attr: "INT", profType: "C" },
        { id: "juego_manos", name: "Juego de Manos", attr: "DES", profType: "C" },
        { id: "medicina", name: "Medicina", attr: "SAB", profType: "·" },
        { id: "naturaleza", name: "Naturaleza", attr: "INT", profType: "·" },
        { id: "percepcion", name: "Percepción", attr: "SAB", profType: "·" },
        { id: "perspicacia", name: "Perspicacia", attr: "SAB", profType: "·" },
        { id: "persuasion", name: "Persuasión", attr: "CAR", profType: "P", note: "Ventaja", minTen: true },
        { id: "religion", name: "Religión", attr: "INT", profType: "·" },
        { id: "sigilo", name: "Sigilo", attr: "DES", profType: "C" },
        { id: "supervivencia", name: "Supervivencia", attr: "SAB", profType: "·" },
        { id: "trato_animales", name: "Trato c. Animales", attr: "SAB", profType: "·" }
    ],
    combat: {
        resources: [
            { id: "insp_bard", name: "Inspiración Bárdica (1d8)", usesKey: "CAR", actionCost: "Acción Adicional", reset: "Corto/Largo", color: "text-brand-300", spent: [false, false, false, false] },
            { id: "genie_vessel", name: "Vaso del Genio (6h)", uses: 1, actionCost: "Acción", reset: "Largo", color: "text-blue-300", spent: [false] }
        ],
        traits: [
            { name: "Lengua de Plata (Elocuencia 3)", desc: "En Persuasión o Engaño, cualquier 1 a 9 en el d20 se convierte automáticamente en 10." },
            { name: "Palabras Inquietantes (Elocuencia 3)", desc: "Acción Adicional: resta 1d8 a la próxima salvación del enemigo." },
            { name: "Fuente de Inspiración (Bardo 5)", desc: "Recuperas todos los usos de Inspiración Bárdica en Descanso Corto o Largo." },
            { name: "Canción de Descanso (Bardo 2)", desc: "Aliados y tú curan +1d6 extra al gastar dados de golpe en descanso corto." },
            { name: "Vaso del Genio (Brujo 1)", desc: "Entras a tu vasija durante 6 horas (2x Competencia). CA 15, HP 3." },
            { name: "Ira del Genio (Brujo 1)", desc: "Primer impacto de tu turno suma daño por Trueno." },
            { name: "Dote Telepático", desc: "Telepatía a 60 pies. Detectar Pensamientos 1/día sin componentes." },
            { name: "Resistencia Infernal (Tiefling)", desc: "Resistencia al fuego. Visión en la oscuridad a 60 pies." }
        ]
    },
    progression: {},
    magic: {
        slots: [
            { id: "pact", level: "Pacto (B1)", max: 1, reset: "short", spent: [false] },
            { id: "lvl1", level: "Nvl 1", max: 4, reset: "long", spent: [false, false, false, false] },
            { id: "lvl2", level: "Nvl 2", max: 3, reset: "long", spent: [false, false, false] },
            { id: "lvl3", level: "Nvl 3", max: 2, reset: "long", spent: [false, false] }
        ],
        spells: [
            { name: "Eldritch Blast", source: "Brujo", sourceType: "warlock" },
            { name: "Chill Touch", source: "Brujo", sourceType: "warlock" },
            { name: "Vicious Mockery", source: "Bardo", sourceType: "bard" },
            { name: "Mage Hand", source: "Bardo", sourceType: "bard" },
            { name: "Prestidigitation", source: "Bardo", sourceType: "bard" },
            { name: "Minor Illusion", source: "Glasya", sourceType: "glasya" },
            { name: "Dissonant Whispers", source: "Bardo", sourceType: "bard" },
            { name: "Thunderwave", source: "Bardo", sourceType: "bard" },
            { name: "Hex", source: "Brujo", sourceType: "warlock" },
            { name: "Healing Word", source: "Bardo", sourceType: "bard" },
            { name: "Faerie Fire", source: "Bardo", sourceType: "bard" },
            { name: "Disguise Self", source: "Glasya", sourceType: "glasya" },
            { name: "Suggestion", source: "Bardo", sourceType: "bard" },
            { name: "Hold Person", source: "Bardo", sourceType: "bard" },
            { name: "Mirror Image", source: "Bardo", sourceType: "bard" },
            { name: "Detect Thoughts", source: "Dote", sourceType: "telepathic" },
            { name: "Invisibility", source: "Glasya", sourceType: "glasya" },
            { name: "Hypnotic Pattern", source: "Bardo", sourceType: "bard" },
            { name: "Dispel Magic", source: "Bardo", sourceType: "bard" },
            { name: "Dimension Door", source: "Capa", sourceType: "item" }
        ]
    },
    inventory: {
        wealth: { cp: 270, sp: 350, ep: 282, gp: 430 },
        armors: [
            { name: "Cuero Tachonado", type: "light", baseAc: 12, equipped: true, special: "Armadura ligera. Suma toda tu Destreza." }
        ],
        weapons: [
            { name: "Estoque", attrMode: "finesse", dice: "1d8", damageType: "Perforante", proficient: true, properties: ["Sutil"] },
            { name: "Ballesta Ligera", attrMode: "dex", dice: "1d8", damageType: "Perforante", proficient: true, properties: ["80/320'", "Dos Manos", "Recarga"] },
            { name: "Daga", attrMode: "finesse", dice: "1d4", damageType: "Perforante", proficient: true, properties: ["Sutil", "Ligera", "20/60'"] }
        ],
        consumables: [
            { name: "Pociones de Curación (2d4+2)", qty: "2" },
            { name: "Virotes de ballesta", qty: "70" }
        ],
        tools: [
            { name: "Laúd", icon: "🎸", isInstrument: true },
            { name: "Bodhran", icon: "🥁", isInstrument: true },
            { name: "Kit de disfraz", icon: "🎭", isInstrument: false }
        ],
        story: [
            { name: "Moneda de Rostro y Cuervo", desc: "Moneda misteriosa de trama.", isSpecial: true, isMagic: true },
            { name: "Capa del Charlatán", desc: "Puerta dimensional 1 vez al día.", isSpecial: false, isMagic: true }
        ]
    }
};

function sanitizeTracking(d) {
    if (!d || typeof d !== 'object') d = JSON.parse(JSON.stringify(CHARACTER_DATA || defaultCharacterData));

    if (!d.identity) d.identity = JSON.parse(JSON.stringify(defaultCharacterData.identity));
    if (!Array.isArray(d.identity.classes) || d.identity.classes.length === 0) {
        d.identity.classes = [{ name: "Personaje", subclass: "", level: 1, hitDie: "d8" }];
    }

    const totalHd = d.identity.classes.reduce((a, b) => a + (b.level || 0), 0) || 1;
    if (!d.vitals) d.vitals = JSON.parse(JSON.stringify(defaultCharacterData.vitals));
    if (!Array.isArray(d.vitals.hitDiceSpent)) d.vitals.hitDiceSpent = [];
    while (d.vitals.hitDiceSpent.length < totalHd) d.vitals.hitDiceSpent.push(false);
    if (d.vitals.hitDiceSpent.length > totalHd) d.vitals.hitDiceSpent = d.vitals.hitDiceSpent.slice(0, totalHd);

    if (!d.deathSaves || !Array.isArray(d.deathSaves.successes) || !Array.isArray(d.deathSaves.failures)) {
        d.deathSaves = { successes: [false, false, false], failures: [false, false, false] };
    }
    if (!d.concentration) d.concentration = { active: false, spellName: "" };

    if (!d.attributes) d.attributes = JSON.parse(JSON.stringify(defaultCharacterData.attributes));

    if (!d.combat) d.combat = JSON.parse(JSON.stringify(defaultCharacterData.combat));
    if (!Array.isArray(d.combat.resources)) d.combat.resources = [];
    d.combat.resources.forEach(r => {
        const uses = r.uses || 1;
        if (!Array.isArray(r.spent)) r.spent = [];
        while (r.spent.length < uses) r.spent.push(false);
    });

    if (!d.magic) d.magic = { slots: [], spells: [] };
    if (!Array.isArray(d.magic.slots)) d.magic.slots = [];
    d.magic.slots.forEach(slot => {
        const max = slot.max || 1;
        if (!Array.isArray(slot.spent)) slot.spent = [];
        while (slot.spent.length < max) slot.spent.push(false);
    });

    if (!Array.isArray(d.magic.spells)) d.magic.spells = [];
    d.magic.spells = d.magic.spells.map(sp => ({
        name: sp.name || "Conjuro",
        source: sp.source || 'Personalizado',
        sourceType: sp.sourceType || 'other'
    }));

    if (!d.inventory) d.inventory = JSON.parse(JSON.stringify(defaultCharacterData.inventory));
    if (!d.inventory.wealth) d.inventory.wealth = { cp: 0, sp: 0, ep: 0, gp: 0 };
    ['armors', 'weapons', 'consumables', 'tools', 'story'].forEach(k => {
        if (!Array.isArray(d.inventory[k])) d.inventory[k] = [];
    });

    return d;
}

function loadInitialData() {
    const source = (typeof CHARACTER_DATA !== 'undefined' && CHARACTER_DATA) ? CHARACTER_DATA : defaultCharacterData;
    const base = JSON.parse(JSON.stringify(source));
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return sanitizeTracking(base);

    try {
        return sanitizeTracking(JSON.parse(raw));
    } catch (e) {
        console.error("[Storage] Error al parsear datos:", e);
        return sanitizeTracking(base);
    }
}

// ================= CÁLCULO DE ESTADÍSTICAS =================
function computeStats(d) {
    const classes = d?.identity?.classes || [];
    const totalLevel = classes.reduce((acc, c) => acc + (c.level || 0), 0) || 1;
    const profBonus = Math.floor((totalLevel - 1) / 4) + 2;
    const jackOfAllTrades = Math.floor(profBonus / 2);

    const attrKeys = ['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR'];
    const keyMap = { 'STR': 'FUE', 'DEX': 'DES', 'CON': 'CON', 'INT': 'INT', 'WIS': 'SAB', 'CHA': 'CAR' };

    const computedAttrs = {};
    attrKeys.forEach(k => {
        let raw = d?.attributes?.[k];
        if (!raw) {
            const altKey = Object.keys(keyMap).find(alt => keyMap[alt] === k);
            if (altKey && d?.attributes?.[altKey]) raw = d.attributes[altKey];
        }
        if (!raw) raw = { score: 10, profSave: false };

        const score = typeof raw.score === 'number' ? raw.score : (parseInt(raw.score, 10) || 10);
        const mod = Math.floor((score - 10) / 2);
        const save = mod + (raw.profSave ? profBonus : 0);
        computedAttrs[k] = {
            score,
            mod,
            modStr: mod >= 0 ? `+${mod}` : `${mod}`,
            save,
            saveStr: save >= 0 ? `+${save}` : `${save}`,
            profSave: !!raw.profSave
        };
    });

    const computedSkills = (d?.skills || []).map(s => {
        const attrObj = computedAttrs[s.attr] || { mod: 0 };
        let bonus = attrObj.mod;
        if (s.profType === 'P') bonus += profBonus * 2;
        else if (s.profType === 'C') bonus += profBonus;
        else bonus += jackOfAllTrades;

        return {
            ...s,
            valNum: bonus,
            valStr: bonus >= 0 ? `+${bonus}` : `${bonus}`,
            minVal: s.minTen ? (10 + bonus) : null
        };
    });

    const percSkill = computedSkills.find(s => s.id === 'percepcion');
    const passivePerception = 10 + (percSkill ? percSkill.valNum : (computedAttrs.SAB.mod + jackOfAllTrades));
    const initNum = computedAttrs.DES.mod + jackOfAllTrades;

    let calculatedAc = 10 + computedAttrs.DES.mod;
    let armorDesc = `10 + DES (${computedAttrs.DES.modStr})`;

    const equippedArmors = (d?.inventory?.armors || []).filter(a => a.equipped);
    const mainArmor = equippedArmors.find(a => a.type !== 'shield');
    const equippedShield = equippedArmors.find(a => a.type === 'shield');

    if (mainArmor) {
        if (mainArmor.type === 'light') {
            calculatedAc = mainArmor.baseAc + computedAttrs.DES.mod;
            armorDesc = `${mainArmor.name} (${mainArmor.baseAc} + DES)`;
        } else if (mainArmor.type === 'medium') {
            calculatedAc = mainArmor.baseAc + Math.min(2, computedAttrs.DES.mod);
            armorDesc = `${mainArmor.name} (${mainArmor.baseAc} + máx 2)`;
        } else if (mainArmor.type === 'heavy') {
            calculatedAc = mainArmor.baseAc;
            armorDesc = `${mainArmor.name} (${mainArmor.baseAc})`;
        }
    }
    if (equippedShield) {
        calculatedAc += 2;
        armorDesc += " + Escudo";
    }

    const computedWeapons = (d?.inventory?.weapons || []).map((w, idx) => {
        let usedAttr = 'FUE';
        if (w.attrMode === 'dex') usedAttr = 'DES';
        else if (w.attrMode === 'finesse') {
            usedAttr = (computedAttrs.DES.mod >= computedAttrs.FUE.mod) ? 'DES' : 'FUE';
        }

        const attrMod = computedAttrs[usedAttr].mod;
        const atkBonus = attrMod + (w.proficient !== false ? profBonus : 0);
        const dmgStr = `${w.dice} ${attrMod >= 0 ? '+' + attrMod : '-' + Math.abs(attrMod)} ${w.damageType || ''}`.trim();

        return {
            ...w,
            originalIndex: idx,
            usedAttr,
            atkStr: atkBonus >= 0 ? `+${atkBonus}` : `${atkBonus}`,
            dmgStr
        };
    });

    const spellAtkNum = computedAttrs.CAR.mod + profBonus;
    const spellSaveDC = 8 + profBonus + computedAttrs.CAR.mod;
    const bardicUses = Math.max(1, computedAttrs.CAR.mod);
    const hitDiceList = classes.map(c => `${c.level} ${c.hitDie || 'd8'}`).join(' + ');

    return {
        totalLevel,
        profBonus,
        profBonusStr: `+${profBonus}`,
        jackOfAllTrades,
        computedAttrs,
        computedSkills,
        passivePerception,
        initNum,
        initStr: initNum >= 0 ? `+${initNum}` : `${initNum}`,
        ac: calculatedAc,
        armorDesc,
        spellAtkStr: spellAtkNum >= 0 ? `+${spellAtkNum}` : `${spellAtkNum}`,
        spellSaveDC,
        genieDamage: `+${profBonus} daño de Trueno`,
        bardicUses,
        hitDiceList,
        hitDiceBreakdown: classes.map(c => `${c.level} ${c.name}`).join(' + '),
        classesSummary: classes.map(c => `${c.name}${c.subclass ? ` (${c.subclass})` : ''} ${c.level}`).join(' / '),
        computedWeapons
    };
}

// ================= PARSEO Y COMPENDIO DE CONJUROS =================
const SPELL_SYNONYMS = [
    ["eldritch blast", "descarga sobrenatural", "rayo sobrenatural"],
    ["chill touch", "toque gelido", "toque gélido"],
    ["vicious mockery", "burla hiriente", "burla dañina"],
    ["mage hand", "mano de mago"],
    ["prestidigitation", "prestidigitacion", "prestidigitación"],
    ["minor illusion", "ilusion menor", "ilusión menor"],
    ["dissonant whispers", "susurros discordantes"],
    ["thunderwave", "ola atronadora", "onda atronadora"],
    ["hex", "maleficio"],
    ["healing word", "palabra de sanacion", "palabra de sanación", "palabra de curacion"],
    ["faerie fire", "fuego feerico", "fuego feérico"],
    ["disguise self", "disfrazarse", "disfrazarme"],
    ["suggestion", "sugestion", "sugerencia"],
    ["hold person", "retener persona", "sujetar persona", "inmovilizar persona"],
    ["mirror image", "imagen multiple", "imagen múltiple", "imagen espejo"],
    ["detect thoughts", "detectar pensamientos"],
    ["invisibility", "invisibilidad"],
    ["hypnotic pattern", "patron hipnotico", "patrón hipnótico"],
    ["dispel magic", "disipar magia"],
    ["dimension door", "puerta dimensional"]
];

const ALIAS_LOOKUP = new Map();
SPELL_SYNONYMS.forEach(group => {
    const canonical = normalizeKey(group[0]);
    group.forEach(name => ALIAS_LOOKUP.set(normalizeKey(name), canonical));
});

const KNOWN_BONUS_SPELLS = new Set(["hex", "maleficio", "healingword", "palabradesanacion", "mistystep", "pasobrumoso"]);
const KNOWN_REACTION_SPELLS = new Set(["shield", "escudo", "counterspell", "contrahechizo", "hellishrebuke", "featherfall"]);
const KNOWN_CONC_SPELLS = new Set(["hex", "maleficio", "faeriefire", "fuegofeerico", "holdperson", "suggestion", "detectthoughts", "invisibility", "hypnoticpattern"]);

function clean5eToolsText(text) {
    if (!text) return '';
    if (Array.isArray(text)) return text.map(clean5eToolsText).join('\n\n');
    if (typeof text === 'object') {
        if (text.entries) return clean5eToolsText(text.entries);
        if (text.items) return text.items.map(clean5eToolsText).join('\n');
        return JSON.stringify(text);
    }
    return String(text).replace(/\{@([a-zA-Z]+) ([^}]+)\}/gi, (_, __, content) => content.split('|')[0]);
}

function parse5eToolsSpell(raw) {
    if (!raw || typeof raw !== 'object' || !raw.name) return null;
    try {
        let actionType = 'action';
        const at = String(raw.actionType || '').toLowerCase();
        if (at.includes('bonus') || at.includes('adicional')) actionType = 'bonus';
        else if (at.includes('react') || at.includes('reacc')) actionType = 'reaction';
        else {
            const timeList = Array.isArray(raw.time) ? raw.time : (raw.time ? [raw.time] : []);
            for (const t of timeList) {
                const unit = String(t.unit || t || '').toLowerCase();
                if (unit.includes('bonus')) actionType = 'bonus';
                if (unit.includes('react')) actionType = 'reaction';
            }
        }
        const norm = normalizeKey(raw.name);
        if (KNOWN_BONUS_SPELLS.has(norm)) actionType = 'bonus';
        if (KNOWN_REACTION_SPELLS.has(norm)) actionType = 'reaction';

        let conc = false;
        if (raw.conc === true || raw.concentration === true) conc = true;
        const durationList = Array.isArray(raw.duration) ? raw.duration : (raw.duration ? [raw.duration] : []);
        for (const d of durationList) {
            if (d.concentration === true || String(d.type || '').toLowerCase().includes('conc')) conc = true;
        }
        if (KNOWN_CONC_SPELLS.has(norm)) conc = true;

        let rangeStr = 'Personal';
        if (raw.range?.distance) {
            rangeStr = `${raw.range.distance.amount || ''} ${raw.range.distance.type === 'feet' ? 'pies' : (raw.range.distance.type || '')}`.trim();
        } else if (raw.range?.type) rangeStr = raw.range.type === 'touch' ? 'Toque' : (raw.range.type === 'self' ? 'Personal' : raw.range.type);

        let saveStat = '';
        let useSpellDc = false;
        if (Array.isArray(raw.savingThrow) && raw.savingThrow.length > 0) {
            useSpellDc = true;
            const sMap = { strength: 'FUE', dexterity: 'DES', constitution: 'CON', intelligence: 'INT', wisdom: 'SAB', charisma: 'CAR' };
            saveStat = sMap[String(raw.savingThrow[0]).toLowerCase()] || String(raw.savingThrow[0]).toUpperCase();
        }

        const descBody = clean5eToolsText(raw.entries || '');
        let damageStr = '—';
        const dmgMatch = descBody.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/i);
        if (dmgMatch) damageStr = dmgMatch[1];

        return {
            name: raw.name,
            sourceBook: raw.source || '5eTools',
            level: typeof raw.level === 'number' ? raw.level : (parseInt(raw.level, 10) || 0),
            actionType,
            range: rangeStr,
            duration: conc ? 'Concentración' : (raw.duration?.[0]?.type === 'instant' ? 'Instantáneo' : '1 min'),
            useSpellDc,
            saveStat: saveStat.trim(),
            conc,
            damage: damageStr,
            desc: descBody || 'Sin descripción disponible.'
        };
    } catch (err) {
        return null;
    }
}

let spellsCompendium = [];

function buildSpellsCompendium() {
    const rawSources = [];
    if (Array.isArray(SPELL_SOURCES)) rawSources.push(...SPELL_SOURCES);
    ['SPELLS_PHB', 'SPELLS_TCE', 'SPELLS_XGE'].forEach(v => {
        if (window[v] && !rawSources.includes(window[v])) rawSources.push(window[v]);
    });

    const flatSpells = rawSources.flatMap(source => {
        if (Array.isArray(source)) return source;
        if (source && Array.isArray(source.spell)) return source.spell;
        return [];
    });

    const map = new Map();
    flatSpells.forEach(raw => {
        const parsed = parse5eToolsSpell(raw);
        if (parsed && parsed.name && !map.has(normalizeKey(parsed.name))) {
            map.set(normalizeKey(parsed.name), parsed);
        }
    });

    spellsCompendium = Array.from(map.values());
    return spellsCompendium.length;
}

function findSpellInCompendium(name) {
    if (!name || spellsCompendium.length === 0) return null;
    const target = normalizeKey(name);
    const targetCanonical = ALIAS_LOOKUP.get(target) || target;

    let found = spellsCompendium.find(s => normalizeKey(s.name) === target);
    if (found) return found;

    found = spellsCompendium.find(s => (ALIAS_LOOKUP.get(normalizeKey(s.name)) || normalizeKey(s.name)) === targetCanonical);
    if (found) return found;

    return spellsCompendium.find(s => {
        const sKey = normalizeKey(s.name);
        return sKey && (target.includes(sKey) || sKey.includes(target));
    }) || null;
}

function resolveSpellData(charSpell) {
    const comp = findSpellInCompendium(charSpell.name) || {};
    const norm = normalizeKey(charSpell.name);

    let lvlNum = 1;
    const rawLvl = comp.level !== undefined ? comp.level : charSpell.level;
    if (rawLvl === 0 || rawLvl === "0" || rawLvl === "T") lvlNum = 0;
    else lvlNum = parseInt(rawLvl, 10) || 1;

    let actionType = comp.actionType || (KNOWN_BONUS_SPELLS.has(norm) ? 'bonus' : (KNOWN_REACTION_SPELLS.has(norm) ? 'reaction' : 'action'));
    let conc = comp.conc !== undefined ? comp.conc : KNOWN_CONC_SPELLS.has(norm);

    return {
        name: charSpell.name,
        source: charSpell.source || 'Conjuro',
        sourceType: charSpell.sourceType || 'other',
        sourceBook: comp.sourceBook || '',
        level: lvlNum,
        actionType,
        range: comp.range || 'Personal',
        duration: comp.duration || (conc ? 'Concentración' : 'Instantáneo'),
        useSpellDc: comp.useSpellDc !== undefined ? comp.useSpellDc : false,
        saveStat: comp.saveStat ? String(comp.saveStat).trim() : '',
        conc,
        damage: comp.damage || '—',
        desc: comp.desc || 'Descripción no disponible en los compendios cargados.'
    };
}

// ================= COMPONENTE ALPINE.JS =================
document.addEventListener('alpine:init', () => {
    Alpine.data('characterSheet', () => ({
        data: loadInitialData(),
        activeTab: 'perfil',
        currentSpellFilter: 'all',
        compendiumCount: 0,

        // Estado de Modales
        modalWeaponOpen: false,
        editingWeaponIndex: null,
        weaponForm: {
            name: '',
            attrMode: 'finesse',
            dice: '1d8',
            damageType: 'Perforante',
            propsRaw: ''
        },

        modalShortRestOpen: false,
        shortRestDiceSelected: 0,

        modalConcOverrideOpen: false,
        pendingConcentrationSpell: null,

        modalDialog: {
            open: false,
            title: '',
            message: '',
            icon: 'ℹ️',
            showCancel: false,
            confirmText: 'Aceptar',
            cancelText: 'Cancelar',
            confirmClass: 'bg-brand-600 hover:bg-brand-500',
            resolve: null
        },

        init() {
            this.compendiumCount = buildSpellsCompendium();
        },

        // Getters Reactivos
        get stats() {
            return computeStats(this.data);
        },

        get allResolvedSpells() {
            return (this.data.magic?.spells || []).map(resolveSpellData);
        },

        get offensiveSpells() {
            return this.allResolvedSpells.filter(sp => {
                const hasDamage = sp.damage && sp.damage !== '—';
                const isOffensive = sp.useSpellDc || sp.actionType === 'action' || sp.actionType === 'bonus';
                return hasDamage && isOffensive;
            });
        },

        get filteredSpells() {
            return this.allResolvedSpells.filter(sp => {
                const act = (sp.actionType || 'action').toLowerCase();
                const isBonus = act.includes('bonus') || act.includes('adicional');
                const isReaction = act.includes('react') || act.includes('reacc');
                const isAction = !isBonus && !isReaction;

                if (this.currentSpellFilter === 'action') return isAction;
                if (this.currentSpellFilter === 'bonus') return isBonus;
                if (this.currentSpellFilter === 'reaction') return isReaction;
                if (this.currentSpellFilter === 'conc') return sp.conc;
                return true;
            });
        },

        get bonusSpells() {
            return this.allResolvedSpells.filter(sp => {
                const act = (sp.actionType || '').toLowerCase();
                return act.includes('bonus') || act.includes('adicional');
            });
        },

        get reactionSpells() {
            return this.allResolvedSpells.filter(sp => {
                const act = (sp.actionType || '').toLowerCase();
                return act.includes('react') || act.includes('reacc');
            });
        },

        get primaryHitDie() {
            return this.data.identity?.classes?.[0]?.hitDie || 'd8';
        },

        get hasSongOfRest() {
            return (this.data.combat?.traits || []).some(t =>
                t.name.toLowerCase().includes('canción de descanso') ||
                t.name.toLowerCase().includes('song of rest')
            );
        },

        get availableHitDiceCount() {
            return (this.data.vitals?.hitDiceSpent || []).filter(s => !s).length;
        },

        get totalHitDiceCount() {
            return (this.data.identity?.classes || []).reduce((acc, c) => acc + (c.level || 0), 0);
        },

        get shortRestRecharges() {
            const list = [];
            (this.data.magic?.slots || []).forEach(s => {
                const r = (s.reset || '').toLowerCase();
                if (r.includes('short') || r.includes('corto')) list.push(s.level);
            });
            (this.data.combat?.resources || []).forEach(r => {
                const res = (r.reset || '').toLowerCase();
                if (res.includes('short') || res.includes('corto')) list.push(r.name);
            });
            return list;
        },

        get progressionTrees() {
            const activeClasses = this.data.identity?.classes || [];
            return activeClasses.map(cls => ({
                name: cls.name,
                subclass: cls.subclass,
                currentLevel: cls.level || 1,
                tree: generateProgressionTree(cls.name, cls.subclass)
            }));
        },

        // Persistencia
        saveState() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
            } catch (e) {
                console.error("[Storage] Error al escribir:", e);
            }
        },

        // Diálogos / Alertas
        uiAlert(message, title = "Aviso", icon = "ℹ️") {
            return new Promise(resolve => {
                this.modalDialog = {
                    open: true,
                    title,
                    message,
                    icon,
                    showCancel: false,
                    confirmText: "Entendido",
                    cancelText: "Cancelar",
                    confirmClass: "bg-brand-600 hover:bg-brand-500",
                    resolve
                };
            });
        },

        uiConfirm(message, title = "Confirmación", icon = "❓", confirmText = "Confirmar", confirmClass = "bg-brand-600 hover:bg-brand-500") {
            return new Promise(resolve => {
                this.modalDialog = {
                    open: true,
                    title,
                    message,
                    icon,
                    showCancel: true,
                    confirmText,
                    cancelText: "Cancelar",
                    confirmClass,
                    resolve
                };
            });
        },

        resolveDialog(result) {
            if (this.modalDialog.resolve) this.modalDialog.resolve(result);
            this.modalDialog.open = false;
        },

        // Concentración
        isConcentratingOn(name) {
            return this.data.concentration?.active &&
                this.data.concentration?.spellName?.toLowerCase() === name?.toLowerCase();
        },

        setConcentration(name) {
            this.data.concentration = name ? { active: true, spellName: name } : { active: false, spellName: "" };
            this.saveState();
        },

        breakConcentration() {
            this.setConcentration("");
        },

        requestCastConcentration(spellName) {
            if (this.data.concentration.active && this.data.concentration.spellName) {
                if (this.data.concentration.spellName.toLowerCase() === spellName.toLowerCase()) {
                    this.breakConcentration();
                    return;
                }
                this.pendingConcentrationSpell = spellName;
                this.modalConcOverrideOpen = true;
                return;
            }
            this.setConcentration(spellName);
        },

        closeConcentrationModal(proceed) {
            this.modalConcOverrideOpen = false;
            if (proceed && this.pendingConcentrationSpell) {
                this.setConcentration(this.pendingConcentrationSpell);
            }
            this.pendingConcentrationSpell = null;
        },

        // Armas
        openWeaponModal(index = null) {
            this.editingWeaponIndex = index;
            if (index !== null) {
                const w = this.data.inventory.weapons[index];
                this.weaponForm = {
                    name: w.name || '',
                    attrMode: w.attrMode || 'finesse',
                    dice: w.dice || '1d8',
                    damageType: w.damageType || 'Perforante',
                    propsRaw: (w.properties || []).join(', ')
                };
            } else {
                this.weaponForm = {
                    name: '',
                    attrMode: 'finesse',
                    dice: '1d8',
                    damageType: 'Perforante',
                    propsRaw: ''
                };
            }
            this.modalWeaponOpen = true;
        },

        handleSaveWeapon() {
            const name = this.weaponForm.name.trim();
            if (!name) return;

            const properties = this.weaponForm.propsRaw
                ? this.weaponForm.propsRaw.split(',').map(s => s.trim()).filter(Boolean)
                : [];

            const weaponObj = {
                name,
                attrMode: this.weaponForm.attrMode,
                dice: this.weaponForm.dice.trim(),
                damageType: this.weaponForm.damageType.trim(),
                proficient: true,
                properties
            };

            if (this.editingWeaponIndex !== null) {
                this.data.inventory.weapons[this.editingWeaponIndex] = weaponObj;
            } else {
                this.data.inventory.weapons.push(weaponObj);
            }

            this.saveState();
            this.modalWeaponOpen = false;
            this.editingWeaponIndex = null;
        },

        async removeWeapon(index) {
            const w = this.data.inventory.weapons[index];
            const ok = await this.uiConfirm(`¿Deseas eliminar el arma "${w.name}"?`, "Eliminar Arma", "🗑️", "Eliminar", "bg-red-600 hover:bg-red-500");
            if (!ok) return;

            this.data.inventory.weapons.splice(index, 1);
            this.saveState();
        },

        // Descansos
        openShortRestModal() {
            this.shortRestDiceSelected = 0;
            this.modalShortRestOpen = true;
        },

        async applyShortRest(diceCount) {
            const count = parseInt(diceCount, 10) || 0;
            let availableIndices = [];
            this.data.vitals.hitDiceSpent.forEach((spent, i) => { if (!spent) availableIndices.push(i); });

            if (count > availableIndices.length) {
                await this.uiAlert(`Solo tienes ${availableIndices.length} dados disponibles.`, "Aviso", "⚠️");
                return;
            }

            let totalHealed = 0;
            const conMod = Math.floor((this.data.attributes.CON.score - 10) / 2);
            const hitDieFaces = parseInt(this.primaryHitDie.replace('d', ''), 10) || 8;

            if (count > 0) {
                for (let i = 0; i < count; i++) {
                    const roll = Math.floor(Math.random() * hitDieFaces) + 1;
                    totalHealed += Math.max(1, roll + conMod);
                    this.data.vitals.hitDiceSpent[availableIndices[i]] = true;
                }
                if (this.hasSongOfRest) totalHealed += (Math.floor(Math.random() * 6) + 1);
                this.data.vitals.currentHp = Math.min(this.data.vitals.maxHp, this.data.vitals.currentHp + totalHealed);
            }

            this.data.deathSaves = { successes: [false, false, false], failures: [false, false, false] };

            (this.data.magic?.slots || []).forEach(slot => {
                const r = (slot.reset || '').toLowerCase();
                if (r.includes('short') || r.includes('corto')) slot.spent = slot.spent.map(() => false);
            });

            (this.data.combat?.resources || []).forEach(resource => {
                const r = (resource.reset || '').toLowerCase();
                if (r.includes('short') || r.includes('corto')) resource.spent = resource.spent.map(() => false);
            });

            this.saveState();
            this.modalShortRestOpen = false;

            await this.uiAlert(`Descanso Corto completado:\n• Salvaciones limpiadas.\n• Recursos de pacto e inspiración restaurados.\n• Salud: ${this.data.vitals.currentHp}/${this.data.vitals.maxHp} HP.`, "Descanso Corto", "⛺");
        },

        async executeLongRest() {
            const ok = await this.uiConfirm("Restaurará todos los Puntos de Golpe, los Dados de Golpe, los Espacios de Hechizo y recursos.", "¿Realizar Descanso Largo?", "🌙", "Descansar");
            if (!ok) return;

            this.data.vitals.currentHp = this.data.vitals.maxHp;
            this.data.vitals.tempHp = 0;
            this.data.vitals.hitDiceSpent = this.data.vitals.hitDiceSpent.map(() => false);
            this.data.deathSaves = { successes: [false, false, false], failures: [false, false, false] };
            this.data.concentration = { active: false, spellName: "" };

            (this.data.magic?.slots || []).forEach(s => s.spent = s.spent.map(() => false));
            (this.data.combat?.resources || []).forEach(r => r.spent = r.spent.map(() => false));

            this.saveState();
            await this.uiAlert("Descanso Largo completado. Salud y recursos al 100%.", "Descanso Largo", "✨");
        },

        // Exportación / Importación
        exportJSON() {
            const jsonStr = JSON.stringify(this.data, null, 2);
            const jsContent = `CHARACTER_DATA = ${jsonStr};`;
            const blob = new Blob([jsContent], { type: "application/javascript" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "character.js";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        importJSON(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new SafeFileReader();
            reader.onload = async (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    this.data = sanitizeTracking(parsed);
                    this.saveState();
                    await this.uiAlert("Ficha importada y sincronizada correctamente.", "Ficha Cargada", "👤");
                } catch (err) {
                    await this.uiAlert("Formato de archivo inválido.", "Error", "❌");
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        },

        async resetDefaults() {
            const ok = await this.uiConfirm("¿Restaurar la ficha a los datos originales? Se perderán los cambios.", "Restaurar", "⚠️", "Restaurar", "bg-red-600 hover:bg-red-500");
            if (!ok) return;
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) { }
            const source = (typeof CHARACTER_DATA !== 'undefined' && CHARACTER_DATA) ? CHARACTER_DATA : defaultCharacterData;
            this.data = sanitizeTracking(JSON.parse(JSON.stringify(source)));
            this.saveState();
            await this.uiAlert("Personaje restaurado.", "Restaurado", "🔄");
        }
    }));
});