export async function onRequestGet(context) {
    const { env } = context;

    try {
        if (!env?.DB) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Database binding (DB) is not configured.'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const [dbClasses, dbRaces, dbBackgrounds, dbSpells] = await Promise.all([
            env.DB.prepare('SELECT id, data_json FROM compendium_classes ORDER BY name ASC').all(),
            env.DB.prepare('SELECT id, data_json FROM compendium_races ORDER BY name ASC').all(),
            env.DB.prepare('SELECT id, data_json FROM compendium_backgrounds ORDER BY name ASC').all(),
            env.DB.prepare('SELECT id, data_json FROM compendium_spells ORDER BY name ASC').all()
        ]);

        const parseRow = (r) => {
            try {
                const item = JSON.parse(r.data_json);
                if (r.id && !item.id) item.id = r.id;
                return item;
            } catch {
                return r;
            }
        };

        const classes = (dbClasses?.results || []).map(parseRow);
        const races = (dbRaces?.results || []).map(parseRow);
        const backgrounds = (dbBackgrounds?.results || []).map(parseRow);
        const spells = (dbSpells?.results || []).map(parseRow);

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
