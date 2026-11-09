import CLASS_COMPENDIUM from '../src/dnd-data/class-compendium.json' with { type: 'json' };
import RACE_COMPENDIUM from '../src/dnd-data/race-compendium.json' with { type: 'json' };
import BACKGROUND_COMPENDIUM from '../src/dnd-data/background-compendium.json' with { type: 'json' };
import SPELL_COMPENDIUM from '../src/dnd-data/spell-compendium.json' with { type: 'json' };

import { CompendiumStorageService } from '../src/services/compendium-storage.service.js';
import { ClassProgressionService } from '../src/domain/progression/class-progression.service.js';
import { ClassSyncService } from '../src/domain/progression/class-sync.service.js';
import { SpellService } from '../src/domain/spells/spell.service.js';

// Initialize domain caches for Node.js test environment
CompendiumStorageService._cache = {
    classes: CLASS_COMPENDIUM,
    races: RACE_COMPENDIUM,
    backgrounds: BACKGROUND_COMPENDIUM,
    spells: SPELL_COMPENDIUM
};
CompendiumStorageService.isLoaded = true;

ClassProgressionService.setCompendium(CLASS_COMPENDIUM);
ClassSyncService.setCompendium(CLASS_COMPENDIUM);
SpellService.buildSpellsCompendium([SPELL_COMPENDIUM]);
