# AGENTS.md - Dorian D&D Architecture & Development Guidelines

This document serves as the persistent system prompt and architectural contract for AI agents and human developers working on this codebase. Adhere strictly to these rules.

---

## 0. Universal rule: ask before implementing
- Give a detailed explanation of the changes you want to apply, and only proceed if human confirmation is given.

## 1. Universal Software Engineering & Clean Code Principles

1. **KISS (Keep It Simple, Stupid)**: Favor simple, readable, and direct implementations over clever, over-engineered, or deeply nested abstractions.
2. **DRY (Don't Repeat Yourself)**: Eliminate duplicated logic and parallel implementations. A rule, calculation, or constant must have a single authoritative definition.
3. **YAGNI (You Aren't Gonna Need It)**: Implement only what is required now. Do not add speculative abstractions, unused parameters, or dead branches.
4. **Single Source of Truth (SSOT)**: Every piece of state and domain rule must have an unambiguous, canonical source. Computed views must be pure projections of that source.
5. **Pure Functions for Calculations**: Core calculation logic (modifiers, AC, spell slots, saving throws) must be pure functions without hidden side effects or direct DOM/storage mutations.
6. **Defensive Programming & Fail-Safe Defaults**: Always validate inputs, handle empty arrays/objects gracefully (`?.`, fallback defaults), and avoid unhandled `null`/`undefined` exceptions.
7. **Explicit Over Implicit**: Write descriptive variable and function names. Avoid cryptic abbreviations, magic numbers, and arbitrary hardcoded string checks.
8. **Documentation Integrity**: Preserve existing comments and docstrings unless explicitly refactoring that functionality. All comments, identifiers, and commit messages must be in English.

---

## 2. Project Context & Constraints

* **Role**: Solo developer codebase. Clean, robust, maintainable, and self-documenting code is required.
* **Domain**: D&D 5e Character Companion & Sheet (PWA).
* **Tech Stack**:
  - Vanilla JavaScript (ES modules, ES2022+).
  - **Alpine.js** for reactive UI binding.
  - **Tailwind CSS** for UI styling.
  - **esbuild** for client bundling (`npm run build` -> `src/bundle.js`).
  - **PWA Service Worker** (`src/sw.js`) with cache busting.
* **Development Phase**: **Active Development**.
  - **Zero backward compatibility shims**. Do not write migration layers or fallback code for deprecated data structures.
  - If a schema or contract changes, update the source data files (`src/character.json`, `db/schema.sql`) directly.

---

## 3. Strict Domain & Language Conventions

1. **Code & Comments Language**: **100% English**.
   - Identifiers, comments, logs, and error messages must be in English.
   - Domain terms must match official D&D 5e SRD terminology.
2. **Canonical Identifiers (Zero Duplication)**:
   - **Proficiency Bonus**: Always `pb` in code and `{{PB}}` in text template interpolations. Never use `profBonus` or `proficiency`.
   - **Spell Save DC**: Always `spellDC` in code and `{{DC}}` in template interpolations. Never use `spellSaveDC` or `dc`.
   - **Spell Attack Bonus**: Always `spellAtk` or `spellAtkStr` in code and `{{spellAtk}}` in template interpolations.
   - **Attributes**: Always uppercase 3-letter keys: `STR`, `DEX`, `CON`, `INT`, `WIS`, `CHA`.
3. **Template Placeholders**:
   - Use strictly standardized mustache tokens: `{{PB}}`, `{{DC}}`, `{{spellAtk}}`, `{{bardicDie}}`, `{{songOfRestDie}}`, `{{vesselHours}}`.

---

## 4. Architecture & Data-Driven Rules

1. **No Hardcoded Item/Entity Checks**:
   - Never write code like `if (item.name === 'Cloak of the Mountebank')` or `if (feat.name.includes(...))`.
   - All mechanics must be driven by explicit schema properties on the object:
     ```json
     {
       "name": "Cloak of the Mountebank",
       "type": "accessory",
       "equipped": true,
       "grantedSpells": ["Dimension Door"],
       "resistances": [],
       "statBonuses": {},
       "advantageSkills": [],
       "advantageSaves": []
     }
     ```
2. **Dynamic UI Selections**:
   - Spells granted by items or feats must come dynamically from the spell compendium (`src/dnd-data/spell-compendium.json`) via UI dropdowns/selects, never manual free-text inputs.
   - Resistances and advantage targets must be chosen from canonical lists (`src/dnd-data/dnd-rules.json` -> `damageTypes`, `DND_5E_SKILLS`, attributes list).
3. **Source Tagging & Tooltips**:
   - Every computed bonus, resistance, or advantage must preserve its origin (`source`: item, class, race, feat, condition) so the UI can display clean, informative hover tooltips.
4. **Hierarchical Subclass & Feature Schema**:
   - Subclass mappings in `src/dnd-data/class-compendium.json` (`classKey -> subclassAliases`) must follow:
     `subclassKey -> { name, specializations: { specKey: { displayName, ... } } }`
   - Class feature synchronization in `src/dnd-data/class-compendium.json` (`classKey -> featuresSync`) must follow:
     `base: { traits, resources }` and `subclasses -> subclassKey: { traits, resources }`.
5. **Complete Spell Slots Progression**:
   - Spell slots must be resolved using official 5e tables in `src/dnd-data/dnd-rules.json` (`spellSlotsTables`):
     - Single casters: `fullCaster`, `halfCaster`, `artificer`, `thirdCaster`.
     - Multiclass casters: `multiclassSpellSlots`.
     - Warlock: `warlockPactSlots` (independent short-rest recovery).
6. **No Phantom Default Lists**:
   - If an array is empty (e.g. Favorite Spells with star toggles), render an empty state or show none; never inject hardcoded fallback entries.

---

## 5. UI, Alpine.js & State Management Rules

1. **Reactive State Integrity**:
   - Keep character state inside `this.data` in the Alpine component.
   - Persist state changes through the designated save pipeline (`saveState()`).
2. **Read-Only vs Interactive Elements**:
   - Background details and static identity entries must be informational.
   - Class and level progression buttons must be placed exclusively in their dedicated "Classes" section.
3. **Text Presentation**:
   - All class names, headers, and badge titles must have consistent title casing (`capitalizeWord()`).
   - Clean icons and badges must be coupled with accessible `title` or tooltip descriptions.

---

## 6. Build, Verification & Definition of Done

Before considering any task complete:
1. **Bundle Compilation**: Run `npm run build` using `esbuild` and verify zero compilation errors.
2. **Service Worker Versioning**: When asset lists or cache behaviors change, bump the cache version in `src/sw.js` (e.g. `dorian-dnd-cache-vXX`).
3. **Schema Parity**: Ensure `src/character.json` and `DorianDndApp.db` (`npm run db:build`) adhere to updated schema changes.
4. **Verification**: Verify that runtime imports, JSON structures, and computations execute without exceptions.
5. **Git Commit & Push**: Whenever project files are modified, stage all changes (`git add -A`), create a commit with a descriptive message in English (`git commit -m "..."`), and push to the remote GitHub repository (`git push origin main`).

