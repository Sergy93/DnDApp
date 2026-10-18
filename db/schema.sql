-- ============================================================================
-- DorianDndApp - Cloudflare D1 / SQLite Schema
-- Engine: SQLite 3.37+ (STRICT tables, JSON validation, Foreign Keys)
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- 1. Characters Table (Hybrid Relational + Validated JSON Documents)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    race TEXT NOT NULL,
    total_level INTEGER NOT NULL CHECK (total_level BETWEEN 1 AND 20),
    classes_summary TEXT NOT NULL,

    -- Validated JSON sub-documents matching character.json schema 1:1
    identity_json TEXT NOT NULL CHECK (json_valid(identity_json)),
    vitals_json TEXT NOT NULL CHECK (json_valid(vitals_json)),
    attributes_json TEXT NOT NULL CHECK (json_valid(attributes_json)),
    skills_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(skills_json)),
    inventory_json TEXT NOT NULL CHECK (json_valid(inventory_json)),
    magic_json TEXT NOT NULL CHECK (json_valid(magic_json)),
    combat_json TEXT NOT NULL CHECK (json_valid(combat_json)),
    progression_json TEXT NOT NULL CHECK (json_valid(progression_json)),
    conditions_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(conditions_json)),
    concentration_json TEXT NOT NULL DEFAULT '{"active":false,"spellName":""}' CHECK (json_valid(concentration_json)),
    death_saves_json TEXT NOT NULL DEFAULT '{"successes":[false,false,false],"failures":[false,false,false]}' CHECK (json_valid(death_saves_json)),
    status_notes TEXT NOT NULL DEFAULT '',

    -- Optimistic Concurrency Control & Schema Evolution
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version >= 1),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;

CREATE INDEX IF NOT EXISTS idx_characters_user_updated
    ON characters(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_characters_name
    ON characters(name);

-- ----------------------------------------------------------------------------
-- 2. Session Logs Table (Normalized per-entry log with Cascade Delete)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_logs (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL,
    entry_text TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS idx_session_logs_character_time
    ON session_logs(character_id, timestamp DESC);

-- ----------------------------------------------------------------------------
-- 3. Compendium: Spells
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compendium_spells (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    source_book TEXT NOT NULL DEFAULT 'PHB',
    level INTEGER NOT NULL CHECK (level BETWEEN 0 AND 9),
    school TEXT NOT NULL,
    casting_time TEXT NOT NULL,
    range TEXT NOT NULL,
    duration TEXT NOT NULL,
    concentration INTEGER NOT NULL DEFAULT 0 CHECK (concentration IN (0, 1)),
    ritual INTEGER NOT NULL DEFAULT 0 CHECK (ritual IN (0, 1)),
    classes_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(classes_json)),
    data_json TEXT NOT NULL CHECK (json_valid(data_json))
) STRICT;

CREATE INDEX IF NOT EXISTS idx_spells_level_school
    ON compendium_spells(level, school);

CREATE INDEX IF NOT EXISTS idx_spells_name
    ON compendium_spells(name);

-- ----------------------------------------------------------------------------
-- 4. Compendium: Classes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compendium_classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    hit_die TEXT NOT NULL,
    spellcasting_ability TEXT NOT NULL DEFAULT '',
    caster_progression TEXT NOT NULL DEFAULT 'none',
    data_json TEXT NOT NULL CHECK (json_valid(data_json))
) STRICT;

-- ----------------------------------------------------------------------------
-- 5. Compendium: Backgrounds
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compendium_backgrounds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    source_book TEXT NOT NULL DEFAULT 'PHB',
    skills_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(skills_json)),
    data_json TEXT NOT NULL CHECK (json_valid(data_json))
) STRICT;
