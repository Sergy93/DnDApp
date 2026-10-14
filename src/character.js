export var CHARACTER_DATA = {
    "identity": {
        "name": "Dorian",
        "race": "Tiefling (Glasya)",
        "alignment": "Caótico Neutral",
        "background": "Criminal / Fugitivo",
        "classes": [
            {
                "name": "bard",
                "subclass": "eloquence",
                "level": 5,
                "hitDie": "d8"
            },
            {
                "name": "warlock",
                "subclass": "Djinni",
                "level": 1,
                "hitDie": "d8"
            }
        ],
        "senses": "Visión en Oscuridad (60 pies)",
        "languages": [
            "Común",
            "Infernal",
            "Jerga de Ladrones"
        ]
    },
    "vitals": {
        "speed": "30 pies",
        "maxHp": 48,
        "currentHp": 48,
        "tempHp": 0,
        "hitDiceSpent": [
            false,
            false,
            false,
            false,
            false,
            false
        ]
    },
    "concentration": {
        "active": false,
        "spellName": ""
    },
    "deathSaves": {
        "successes": [
            false,
            false,
            false
        ],
        "failures": [
            false,
            false,
            false
        ]
    },
    "statusNotes": "",
    "attributes": {
        "FUE": {
            "score": 8,
            "profSave": false
        },
        "DES": {
            "score": 14,
            "profSave": true
        },
        "CON": {
            "score": 14,
            "profSave": false
        },
        "INT": {
            "score": 10,
            "profSave": false
        },
        "SAB": {
            "score": 12,
            "profSave": false
        },
        "CAR": {
            "score": 18,
            "profSave": true
        }
    },
    "skills": [
        {
            "id": "acrobacias",
            "name": "Acrobacias",
            "attr": "DES",
            "profType": "C"
        },
        {
            "id": "arcanos",
            "name": "Arcanos",
            "attr": "INT",
            "profType": "·"
        },
        {
            "id": "atletismo",
            "name": "Atletismo",
            "attr": "FUE",
            "profType": "·"
        },
        {
            "id": "engano",
            "name": "Engaño",
            "attr": "CAR",
            "profType": "P",
            "note": "Ventaja",
            "minTen": true
        },
        {
            "id": "historia",
            "name": "Historia",
            "attr": "INT",
            "profType": "·"
        },
        {
            "id": "intimidacion",
            "name": "Intimidación",
            "attr": "CAR",
            "profType": "C"
        },
        {
            "id": "interpretacion",
            "name": "Interpretación",
            "attr": "CAR",
            "profType": "C"
        },
        {
            "id": "investigacion",
            "name": "Investigación",
            "attr": "INT",
            "profType": "C"
        },
        {
            "id": "juego_manos",
            "name": "Juego de Manos",
            "attr": "DES",
            "profType": "C"
        },
        {
            "id": "medicina",
            "name": "Medicina",
            "attr": "SAB",
            "profType": "·"
        },
        {
            "id": "naturaleza",
            "name": "Naturaleza",
            "attr": "INT",
            "profType": "·"
        },
        {
            "id": "percepcion",
            "name": "Percepción",
            "attr": "SAB",
            "profType": "·"
        },
        {
            "id": "perspicacia",
            "name": "Perspicacia",
            "attr": "SAB",
            "profType": "·"
        },
        {
            "id": "persuasion",
            "name": "Persuasión",
            "attr": "CAR",
            "profType": "P",
            "note": "Ventaja",
            "minTen": true
        },
        {
            "id": "religion",
            "name": "Religión",
            "attr": "INT",
            "profType": "·"
        },
        {
            "id": "sigilo",
            "name": "Sigilo",
            "attr": "DES",
            "profType": "C"
        },
        {
            "id": "supervivencia",
            "name": "Supervivencia",
            "attr": "SAB",
            "profType": "·"
        },
        {
            "id": "trato_animales",
            "name": "Trato c. Animales",
            "attr": "SAB",
            "profType": "·"
        }
    ],
    "combat": {
        "resources": [
            {
                "id": "insp_bard",
                "name": "Inspiración Bárdica (1d8)",
                "usesKey": "CAR",
                "actionCost": "Acción Adicional",
                "reset": "Corto/Largo",
                "color": "text-brand-300",
                "spent": [
                    false,
                    false,
                    false,
                    false
                ]
            },
            {
                "id": "genie_vessel",
                "name": "Vaso del Genio (6h)",
                "uses": 1,
                "actionCost": "Acción",
                "reset": "Largo",
                "color": "text-blue-300",
                "spent": [
                    false
                ]
            },
            {
                "id": "detect_thoughts_feat",
                "name": "Detectar Pensamientos (Dote)",
                "uses": 1,
                "actionCost": "Acción",
                "reset": "Largo",
                "color": "text-teal-300",
                "spent": [
                    false
                ]
            },
            {
                "id": "glasya_minor_illusion",
                "name": "Glasya: Ilusión Menor",
                "uses": 1,
                "actionCost": "Acción",
                "reset": "Truco",
                "color": "text-purple-300",
                "spent": [
                    false
                ]
            },
            {
                "id": "glasya_disguise",
                "name": "Glasya: Disfrazarme",
                "uses": 1,
                "actionCost": "Acción",
                "reset": "Largo",
                "color": "text-red-300",
                "spent": [
                    false
                ]
            },
            {
                "id": "glasya_invis",
                "name": "Glasya: Invisibilidad",
                "uses": 1,
                "actionCost": "Acción",
                "reset": "Largo",
                "color": "text-rose-300",
                "spent": [
                    false
                ]
            },
            {
                "id": "cloak_dim_door",
                "name": "Capa Charlatán: Puerta Dim.",
                "uses": 1,
                "actionCost": "Acción",
                "reset": "Largo",
                "color": "text-amber-300",
                "spent": [
                    false
                ]
            }
        ],
        "traits": [
            {
                "name": "Lengua de Plata (eloquence 3)",
                "desc": "En Persuasión o Engaño, cualquier 1 a 9 en el d20 se convierte automáticamente en 10."
            },
            {
                "name": "Palabras Inquietantes (eloquence 3)",
                "desc": "Acción Adicional: gasta 1 Inspiración Bárdica para restar 1d8 a la próxima salvación del enemigo."
            },
            {
                "name": "Fuente de Inspiración (bard 5)",
                "desc": "Recuperas todos los usos de Inspiración Bárdica en Descanso Corto o Largo."
            },
            {
                "name": "Canción de Descanso (bard 2)",
                "desc": "Aliados y tú curan +1d6 extra al gastar dados de golpe en descanso corto."
            },
            {
                "name": "Vaso del Genio (warlock 1)",
                "desc": "Entras a tu vasija durante 6 horas (2x Competencia). CA 15, HP 3."
            },
            {
                "name": "Ira del Genio (warlock 1)",
                "desc": "Primer impacto de tu turno suma +3 de daño por Trueno."
            },
            {
                "name": "Dote Telepático",
                "desc": "Telepatía a 60 pies. Detectar Pensamientos gratis 1/día sin componentes."
            },
            {
                "name": "Resistencia Infernal (Tiefling)",
                "desc": "Resistencia al fuego. Visión en la oscuridad a 60 pies."
            }
        ]
    },
    "progression": {
        "bard": [
            {
                "level": 1,
                "title": "Nivel 1",
                "feats": [
                    "Lanzamiento de Conjuros de bard",
                    "Inspiración Bárdica (d6, usos = CAR)",
                    "Competencias: Armaduras ligeras, simples, estoque, ballesta de mano"
                ]
            },
            {
                "level": 2,
                "title": "Nivel 2",
                "feats": [
                    "Polifacético (+1/2 competencia a tiradas sin competencia)",
                    "Canción de Descanso (+1d6 HP en descanso corto)"
                ]
            },
            {
                "level": 3,
                "title": "Nivel 3",
                "feats": [
                    "Colegio de la eloquence",
                    "Lengua de Plata (mínimo 10 en la tirada del dado en Persuasión y Engaño)",
                    "Palabras Inquietantes (Gasta 1 Inspiración Bárdica para restar 1d8 a la próxima salvación del enemigo)",
                    "Pericia (doble competencia)"
                ]
            },
            {
                "level": 4,
                "title": "Nivel 4",
                "feats": [
                    "Dote Telepático (+1 CAR, telepatía 60', Detectar Pensamientos 1/día)"
                ]
            },
            {
                "level": 5,
                "title": "Nivel 5",
                "feats": [
                    "Inspiración Bárdica mejorada a d8",
                    "Fuente de Inspiración (recarga Inspiración Bárdica en Descanso Corto o Largo)",
                    "Conjuros de Nivel 3"
                ]
            }
        ],
        "warlock": [
            {
                "level": 1,
                "title": "Nivel 1",
                "feats": [
                    "Patrón Sobrenatural: El Genio (Djinni)",
                    "Vaso del Genio (refugio planar y catalizador)",
                    "Ira del Genio (+3 Trueno en el primer impacto del turno)",
                    "Magia de Pacto (1 slot nivel 1 recarga en descanso corto)"
                ]
            }
        ]
    },
    "magic": {
        "slots": [
            {
                "id": "pact",
                "level": "Pacto (warlock 1)",
                "max": 1,
                "reset": "short",
                "spent": [
                    false
                ]
            },
            {
                "id": "lvl1",
                "level": "Nivel 1 (bard)",
                "max": 4,
                "reset": "long",
                "spent": [
                    false,
                    false,
                    false,
                    false
                ]
            },
            {
                "id": "lvl2",
                "level": "Nivel 2 (bard)",
                "max": 3,
                "reset": "long",
                "spent": [
                    false,
                    false,
                    false
                ]
            },
            {
                "id": "lvl3",
                "level": "Nivel 3 (bard)",
                "max": 2,
                "reset": "long",
                "spent": [
                    false,
                    false
                ]
            }
        ],
        "spells": [
            {
                "name": "Eldritch Blast",
                "source": "warlock (Djinni)",
                "sourceType": "warlock"
            },
            {
                "name": "Chill Touch",
                "source": "warlock (Djinni)",
                "sourceType": "warlock"
            },
            {
                "name": "Vicious Mockery",
                "source": "bard",
                "sourceType": "bard"
            },
            {
                "name": "Mage Hand",
                "source": "bard",
                "sourceType": "bard"
            },
            {
                "name": "Prestidigitation",
                "source": "bard",
                "sourceType": "bard"
            },
            {
                "name": "Minor Illusion",
                "source": "Tiefling (Glasya)",
                "sourceType": "glasya"
            },
            {
                "name": "Dissonant Whispers",
                "source": "bard",
                "sourceType": "bard"
            },
            {
                "name": "Thunderwave",
                "source": "bard",
                "sourceType": "bard"
            },
            {
                "name": "Hex",
                "source": "warlock (Djinni)",
                "sourceType": "warlock"
            },
            {
                "name": "Healing Word",
                "source": "bard",
                "sourceType": "bard"
            },
            {
                "name": "Faerie Fire",
                "source": "bard",
                "sourceType": "bard"
            },
            {
                "name": "Disguise Self",
                "source": "Tiefling (Glasya)",
                "sourceType": "glasya"
            },
            {
                "name": "Suggestion",
                "source": "bard",
                "sourceType": "bard"
            },
            {
                "name": "Hold Person",
                "source": "bard",
                "sourceType": "bard"
            },
            {
                "name": "Mirror Image",
                "source": "bard",
                "sourceType": "bard"
            },
            {
                "name": "Detect Thoughts",
                "source": "Dote Telepático",
                "sourceType": "telepathic"
            },
            {
                "name": "Invisibility",
                "source": "Tiefling (Glasya)",
                "sourceType": "glasya"
            },
            {
                "name": "Hypnotic Pattern",
                "source": "bard",
                "sourceType": "bard"
            },
            {
                "name": "Dispel Magic",
                "source": "bard",
                "sourceType": "bard"
            },
            {
                "name": "Dimension Door",
                "source": "Capa del Charlatán",
                "sourceType": "item"
            }
        ]
    },
    "inventory": {
        "wealth": {
            "cp": 270,
            "sp": 350,
            "ep": 282,
            "gp": 430
        },
        "armors": [
            {
                "name": "Cuero Tachonado",
                "type": "light",
                "baseAc": 12,
                "stealthDisadv": false,
                "equipped": true,
                "special": "Armadura ligera. Suma toda tu Destreza."
            }
        ],
        "weapons": [
            {
                "name": "Estoque",
                "attrMode": "finesse",
                "dice": "1d8",
                "damageType": "Perforante",
                "proficient": true,
                "properties": [
                    "Sutil"
                ],
                "special": "Usa Destreza o Fuerza (la más alta)."
            },
            {
                "name": "Ballesta Ligera",
                "attrMode": "dex",
                "dice": "1d8",
                "damageType": "Perforante",
                "proficient": true,
                "properties": [
                    "80/320'",
                    "Dos Manos",
                    "Recarga"
                ],
                "special": "Ataque a distancia con DES."
            },
            {
                "name": "Daga",
                "attrMode": "finesse",
                "dice": "1d4",
                "damageType": "Perforante",
                "proficient": true,
                "properties": [
                    "Sutil",
                    "Ligera",
                    "20/60'"
                ],
                "special": "Apta para dos armas o arrojar."
            },
            {
                "name": "Lanza de Plata",
                "attrMode": "str",
                "dice": "1d6",
                "versatileDice": "1d8",
                "damageType": "Perforante",
                "proficient": true,
                "properties": [
                    "Versátil (1d8)",
                    "20/60'",
                    "Plateada"
                ],
                "special": "Daño mágico vs vulnerables a plata."
            },
            {
                "name": "Fuego Alquímico",
                "attrMode": "dex",
                "dice": "1d4 continuo",
                "damageType": "Fuego",
                "proficient": false,
                "properties": [
                    "Arrojadizo 20'"
                ],
                "special": "1d4 fuego por turno hasta superar CD 10 DES."
            }
        ],
        "consumables": [
            {
                "name": "Fuego de alquimista",
                "qty": "3 botellas"
            },
            {
                "name": "Vial de agua bendita",
                "qty": "1"
            },
            {
                "name": "Bolsa de rodamientos",
                "qty": "1"
            },
            {
                "name": "Púas de suelo (Caltrops)",
                "qty": "10"
            },
            {
                "name": "Pociones de Curación (2d4+2)",
                "qty": "2"
            },
            {
                "name": "Poción Restauración",
                "qty": "1"
            },
            {
                "name": "Pergamino: Guardia Cuchillas",
                "qty": "1"
            },
            {
                "name": "Raciones de viaje",
                "qty": "12"
            },
            {
                "name": "Vino Red Dragon Smash",
                "qty": "1"
            },
            {
                "name": "Virotes de ballesta",
                "qty": "70"
            },
            {
                "name": "Virotes de plata",
                "qty": "35"
            }
        ],
        "tools": [
            {
                "name": "Laúd",
                "icon": "🎸",
                "isInstrument": true
            },
            {
                "name": "Bodhran",
                "icon": "🥁",
                "isInstrument": true
            },
            {
                "name": "Ocarina (kraken)",
                "icon": "🎶",
                "isInstrument": true
            },
            {
                "name": "Kit de disfraz",
                "icon": "🎭",
                "isInstrument": false
            },
            {
                "name": "Kit de falsificación",
                "icon": "📜",
                "isInstrument": false
            },
            {
                "name": "Capa de gala",
                "icon": "🧥",
                "isInstrument": false
            },
            {
                "name": "Ropas finas",
                "icon": "👔",
                "isInstrument": false
            },
            {
                "name": "Mochila de artista",
                "icon": "🎒",
                "isInstrument": false
            },
            {
                "name": "Esposas de hierro",
                "icon": "🔗",
                "isInstrument": false
            },
            {
                "name": "Garfio",
                "icon": "🪝",
                "isInstrument": false
            }
        ],
        "story": [
            {
                "name": "Moneda de Rostro y Cuervo",
                "desc": "Moneda misteriosa de trama.",
                "isSpecial": true,
                "isMagic": true
            },
            {
                "name": "Capa del Charlatán",
                "desc": "Puerta dimensional 1 vez al día.",
                "isSpecial": false,
                "isMagic": true
            },
            {
                "name": "Dado de Hueso",
                "desc": "+1d6 a Salvación. Se rompe con 1 natural.",
                "isSpecial": false,
                "isMagic": true
            },
            {
                "name": "Anillo Consilium Dubium",
                "desc": "Ventaja permanente en Persuasión y Engaño.",
                "isSpecial": false,
                "isMagic": true
            },
            {
                "name": "Botella del Genio",
                "desc": "Vaso Djinni (CA 15, HP 3, refugio 6h).",
                "isSpecial": false,
                "isMagic": true
            },
            {
                "name": "Anillo de sello",
                "desc": "Robado al General Garrard.",
                "isSpecial": true,
                "isMagic": false
            },
            {
                "name": "Reliquia de San Andral",
                "desc": "Profanada.",
                "isSpecial": true,
                "isMagic": false
            },
            {
                "name": "Gema plateada",
                "desc": "Procedente de Glede.",
                "isSpecial": true,
                "isMagic": false
            },
            {
                "name": "Medallón",
                "desc": "Forma de Dragón.",
                "isSpecial": true,
                "isMagic": false
            },
            {
                "name": "Amuleto Lágrima",
                "desc": "Ajada.",
                "isSpecial": false,
                "isMagic": false
            },
            {
                "name": "Llave sospechosa",
                "desc": "Antigua.",
                "isSpecial": false,
                "isMagic": false
            }
        ]
    }
}