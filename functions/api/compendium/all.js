import CLASS_COMPENDIUM from '../../../src/dnd-data/class-compendium.json' with { type: 'json' };
import RACE_COMPENDIUM from '../../../src/dnd-data/race-compendium.json' with { type: 'json' };
import BACKGROUND_COMPENDIUM from '../../../src/dnd-data/background-compendium.json' with { type: 'json' };
import SPELL_COMPENDIUM from '../../../src/dnd-data/spell-compendium.json' with { type: 'json' };

export async function onRequestGet(context) {
    const { env } = context;

    try {
        let classes = null;
        let races = null;
        let backgrounds = null;
        let spells = null;

        // Try reading from Cloudflare D1 if available
        if (env?.DB) {
            try {
                const [dbClasses, dbRaces, dbBackgrounds, dbSpells] = await Promise.all([
                    env.DB.prepare('SELECT id, name, hit_die, spellcasting_ability, caster_progression, data_json FROM compendium_classes').all(),
                    env.DB.prepare('SELECT id, name, source_book, speed, data_json FROM compendium_races').all(),
                    env.DB.prepare('SELECT id, name, source_book, skills_json, data_json FROM compendium_backgrounds').all(),
                    env.DB.prepare('SELECT id, name, source_book, level, school, casting_time, range, duration, concentration, ritual, classes_json, data_json FROM compendium_spells').all()
                ]);

                if (dbClasses?.results?.length > 0) {
                    classes = dbClasses.results.map(r => {
                        try { return JSON.parse(r.data_json); } catch { return r; }
                    });
                }
                if (dbRaces?.results?.length > 0) {
                    races = dbRaces.results.map(r => {
                        try { return JSON.parse(r.data_json); } catch { return r; }
                    });
                }
                if (dbBackgrounds?.results?.length > 0) {
                    backgrounds = dbBackgrounds.results.map(r => {
                        try { return JSON.parse(r.data_json); } catch { return r; }
                    });
                }
                if (dbSpells?.results?.length > 0) {
                    spells = dbSpells.results.map(r => {
                        try { return JSON.parse(r.data_json); } catch { return r; }
                    });
                }
            } catch (dbErr) {
                console.warn('[api/compendium/all] D1 query fallback to bundled data:', dbErr.message);
            }
        }

        // Fallback to static bundled datasets if D1 tables are empty or uninitialized
        if (!classes) classes = CLASS_COMPENDIUM;
        if (!races) races = RACE_COMPENDIUM;
        if (!backgrounds) backgrounds = BACKGROUND_COMPENDIUM;
        if (!spells) spells = SPELL_COMPENDIUM;

        return new Response(JSON.stringify({
            success: true,
            version: 1,
            compendium: {
                classes,
                races,
                backgrounds,
                spells
            }
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({
            success: false,
            error: err.message || 'Failed to retrieve compendium'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
