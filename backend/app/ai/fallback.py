"""
Vihara AI — Offline Fallback Engine
====================================
Works when NO API keys are configured.
Provides rich curated responses for 8+ monuments, 15 languages,
all chat topics, trip planning, and guide narrations.
"""

import re
import logging
from typing import AsyncGenerator, Dict, Optional

logger = logging.getLogger(__name__)

# ── MONUMENT KNOWLEDGE BASE ───────────────────────────────────────
MONUMENT_DB: Dict[str, dict] = {
    "taj mahal": {
        "name": "Taj Mahal",
        "location": "Agra, Uttar Pradesh",
        "type": "UNESCO World Heritage Site · Mughal Mausoleum",
        "confidence": 94,
        "story": (
            "In 1631, Mumtaz Mahal died giving birth to their fourteenth child. "
            "Shah Jahan was so devastated his hair turned white overnight.\n\n"
            "He commissioned a mausoleum so perfect the world would never forget her. "
            "Twenty-two years. Twenty thousand workers. Artisans from Persia, Turkey, and across India. "
            "White marble hauled from Makrana, Rajasthan on the backs of 1,000 elephants. "
            "Precious stones — carnelian, lapis lazuli, jade, crystal — inlaid by hand.\n\n"
            "What most visitors miss: the structure is perfectly symmetrical in every dimension except one. "
            "Mumtaz's cenotaph is exactly centred. Shah Jahan's — added after his death — sits slightly off-centre. "
            "Even in eternity, he deferred to her.\n\n"
            "The Taj changes colour through the day: pink at dawn, brilliant white at noon, "
            "golden at sunset, silver under the full moon. Mughal architects built this intentionally."
        ),
        "best_time": "Sunrise (6–8 AM) for golden light and fewer crowds. Full moon nights. October to March.",
        "local_food": [
            "Petha (crystallised pumpkin sweet) from Panchhi Petha",
            "Mughlai biryani at Pinch of Spice",
            "Bedai-sabzi breakfast at Deviram",
            "Agra ka dalmoth (lentil snack)",
        ],
        "hidden_facts": [
            "The four minarets lean slightly outward — if they fell, they would fall away from the tomb, not onto it",
            "The calligraphy uses optical illusion: letters get larger as they go higher, so they appear uniform from below",
            "A 'moat' of reflective channels surrounds the base — symbolising the rivers of paradise in Islamic cosmology",
            "The basement level, rarely open to public, contains the actual burial chamber",
        ],
        "nearby_places": [
            "Agra Fort (3 km)",
            "Fatehpur Sikri (40 km)",
            "Mehtab Bagh — best sunset view across the river (500 m)",
            "Itimad-ud-Daula 'Baby Taj' (6 km)",
        ],
        "architecture": "Mughal architecture at its apex. Central dome 73m tall. Iwan arches use muqarnas vaulting. Foundation uses interlocked stone and metal clamps — no mortar in the main structure.",
        "mythology": "Shah Jahan planned a black marble Taj across the river as his own tomb, connected by a silver bridge. The plan was never executed — his son Aurangzeb imprisoned him in Agra Fort, where he spent his last years gazing at the Taj from his window.",
        "photo_tips": "Stand at the far end of the reflection pool for the classic shot. East gate entry has the best morning light. The Lady Diana bench to the left is less crowded than the central bench.",
        "guide_tip": "Look at the calligraphy bands around the main arch — they were designed to read at the same size from ground level even though the letters near the top are physically much larger. Ancient optical engineering.",
    },
    "hampi": {
        "name": "Hampi",
        "location": "Ballari District, Karnataka",
        "type": "UNESCO World Heritage Site · Vijayanagara Empire Ruins",
        "confidence": 92,
        "story": (
            "In 1336, two brothers — Harihara and Bukka — founded a city on the banks of the Tungabhadra River. "
            "Within a century it had become the largest city in the world after Beijing — home to half a million people.\n\n"
            "Vijayanagara — City of Victory. Bazaars stretched for kilometres, selling diamonds and spices to merchants "
            "from Portugal, Persia, and China.\n\n"
            "Then, on January 26, 1565, the Deccan Sultanates united and attacked. The Battle of Talikota lasted one day. "
            "The city burned for six months. Two hundred years of civilization reduced to rubble in half a year.\n\n"
            "Today, Hampi is 41 square kilometres of temple towers, royal pavilions, elephant stables, and a stone chariot "
            "— all frozen in the moment of catastrophe. In Hindu mythology, this is Kishkindha — the realm of Hanuman."
        ),
        "best_time": "November to February. Sunrise at Matanga Hill (30-min climb). Sunset at Hemakuta Hill. Avoid May–June (45°C+).",
        "local_food": [
            "Mango lassi at Mango Tree restaurant (riverside)",
            "Thali at Laughing Buddha",
            "Fresh coconut water throughout the ruins",
            "Bisi bele bath (Karnataka rice dish)",
        ],
        "hidden_facts": [
            "The musical pillars of the Vittala Temple produce different notes when tapped — each pillar tuned to a specific pitch",
            "The Stone Chariot originally had rotating wheels — cemented in place by the British to prevent further damage",
            "Hampi's boulders are 2.5 billion years old — some of the oldest exposed rock on Earth",
            "The royal elephant stables had 11 bays, each with a different dome style representing different regional architecture",
        ],
        "nearby_places": [
            "Anegundi village — ancient capital across the river (5 km)",
            "Daroji Sloth Bear Sanctuary (15 km)",
            "Hospet (13 km) — nearest town with hotels",
        ],
        "architecture": "Vijayanagara style — fusion of Dravidian, Islamic, and Deccan. Note the kalyana mandapa (marriage halls), gopurams, and the unique boulder-integrated construction.",
        "mythology": "Hampi is identified as Kishkindha from the Ramayana — kingdom of Sugriva and Hanuman. The Anjaneya Hill is Hanuman's birthplace. The Tungabhadra is the ancient Pampa Sarovar.",
        "photo_tips": "Climb Matanga Hill before sunrise for 360° view of the ruins. The Vittala Temple at golden hour. The riverside ghats at dusk with locals doing puja.",
        "guide_tip": "Stand in front of the Vittala Temple's musical pillars and tap them gently with your knuckle — you will hear distinct musical notes. British engineers in 1890 cut one pillar open to find the source of the sound. Inside: hollow. They still don't fully understand how it works.",
    },
    "brihadisvara": {
        "name": "Brihadisvara Temple",
        "location": "Thanjavur, Tamil Nadu",
        "type": "UNESCO World Heritage Site · Chola Dravidian Temple",
        "confidence": 96,
        "story": (
            "It is 1010 CE. Raja Raja Chola I stands before his completed temple and donates 50,000 gold coins, "
            "250 kilograms of gemstones, and 400 servants to its maintenance in perpetuity.\n\n"
            "The Brihadisvara Temple had taken 11 years to build. The vimana rises 66 metres — "
            "the tallest temple tower in the world at that moment.\n\n"
            "The 80-tonne capstone at the apex was placed using a ramp that stretched 6 kilometres across the plains. "
            "No cranes. No machines. Only mathematics, elephants, and 20,000 workers.\n\n"
            "Inside, a Shivalinga 8.7 metres tall. The walls inscribed with names of every donor "
            "— from kings to common people — a 1,000-year-old record of devotion in stone."
        ),
        "best_time": "October to February. Early morning 6–8 AM when the vimana glows in sunrise light. Shivaratri is extraordinary.",
        "local_food": [
            "Filter coffee at Sree Krishna Vilas (open since 1953)",
            "Thanjavur Maratha thali at Hotel Parisutham",
            "Kozhukattai (rice dumplings) at local mess",
            "Pongal and sambar breakfast near the east gopuram",
        ],
        "hidden_facts": [
            "The vimana casts no shadow at noon on the equinox — a deliberate astronomical design",
            "The original Chola frescoes were discovered under layers of Nayaka-period paintings in 1930 — some sections still hidden",
            "A shadow calendar built into the courtyard marks Tamil festival dates with astronomical precision",
            "Temple records show salaries were paid to 57 classical musicians and 400 permanent staff",
        ],
        "nearby_places": [
            "Saraswathi Mahal Library (2 km) — rare manuscripts",
            "Thanjavur Royal Palace (1.5 km)",
            "Gangaikondacholapuram (70 km) — the forgotten twin temple",
            "Darasuram Airavatesvara (40 km)",
        ],
        "architecture": "Peak Chola Dravidian. The vimana is monolithic — no joints. 81 Bharatanatyam dance poses carved on the walls. The circumambulatory passage, nandi mandapam, and subshrine arrangement follow precise Agamic prescriptions.",
        "mythology": "Built as gratitude for military victories — dedicated to Shiva as Rajarajesvaram, Lord of the King of Kings. The lingam is one of the tallest in the world.",
        "photo_tips": "East gopuram at sunrise reflected in the temple tank. The Nandi bull from the front — the vimana frames perfectly behind it. Interior pillars at dusk when western light enters.",
        "guide_tip": "Walk to the far end of the inner courtyard and look back at the vimana. Notice the shadow it casts — or rather, doesn't cast. On equinox day at noon the shadow falls directly underneath and is invisible. The Chola architects calculated this precisely 1,000 years ago.",
    },
    "khajuraho": {
        "name": "Khajuraho Group of Monuments",
        "location": "Chhatarpur, Madhya Pradesh",
        "type": "UNESCO World Heritage Site · Chandela Temple Complex",
        "confidence": 93,
        "story": (
            "Between 950 and 1050 CE, the Chandela kings built 85 temples in a single century. Only 25 survive.\n\n"
            "What makes Khajuraho extraordinary is not what most tourists come to see — the erotic sculptures "
            "cover only 10% of the exterior. The other 90% is some of the finest devotional stone carving in history.\n\n"
            "The erotic panels are theology, not decoration. Hindu philosophy sees kama (desire) as one of the four "
            "purusharthas — goals of human life. By placing these images on the exterior, the builders placed desire "
            "in its proper context: outside the temple. When you cross the threshold, you leave desire behind.\n\n"
            "The temples were abandoned for 700 years. A British engineer named T.S. Burt rediscovered them in 1838, hidden under jungle."
        ),
        "best_time": "October to March. The Sound and Light Show at dusk. February hosts the Khajuraho Dance Festival.",
        "local_food": [
            "Dal bafla (Madhya Pradesh specialty) at Raja Cafe",
            "Bhutte ka kees (corn dish)",
            "Malpua (sweet pancake) at local sweet shops",
        ],
        "hidden_facts": [
            "Each temple is aligned to face east — to receive the first light of sunrise directly into the sanctum",
            "The carvings include everyday medieval life — women applying makeup, musicians, teachers — not just erotic content",
            "The proportions follow the Vastu Shastra system based on precise measurements of the human body",
            "Some carvings depict yogic positions that are medically accurate depictions of asanas",
        ],
        "nearby_places": [
            "Panna National Park (25 km) — tigers and Ken River",
            "Raneh Falls (20 km) — canyon of crystalline rock",
            "Orchha (170 km)",
        ],
        "architecture": "Nagara (North Indian) style. Curvilinear shikhara spire. Interlocking stone — no mortar. Mandapa, ardhamandapa, and sanctum in linear plan.",
        "mythology": "The Chandela kings claimed descent from the Moon god. The founder Chandravarman was born of a union between the Moon and a brahmin woman. The temples honour this divine lineage.",
        "photo_tips": "Lakshmana Temple at sunrise from the eastern gardens. Detail shots of the apsara (celestial dancer) carvings. The Western Group temples at the Sound and Light Show.",
        "guide_tip": "Most people photograph the erotic carvings and move on. Instead, look at the apsara figures — the celestial dancers. Each one is different: one removes a thorn from her foot, another applies kajal, one plays a flute. These are portraits of real women from Chandela court life, immortalised in stone.",
    },
    "ajanta": {
        "name": "Ajanta Caves",
        "location": "Aurangabad, Maharashtra",
        "type": "UNESCO World Heritage Site · Buddhist Rock-cut Cave Paintings",
        "confidence": 91,
        "story": (
            "For 600 years, Buddhist monks carved 30 caves into a horseshoe-shaped cliff above the Waghora River "
            "and painted those walls with the most extraordinary art India has ever produced.\n\n"
            "Then, around 650 CE, they left. The caves were sealed by encroaching jungle for 1,200 years.\n\n"
            "In 1819, a British officer named John Smith, hunting tigers, glimpsed the carved facade of Cave 10 "
            "through the undergrowth. He climbed down on a rope. Inside, in the darkness, he found paintings "
            "of almost supernatural beauty — perfectly preserved by the absence of light.\n\n"
            "The pigments were made from minerals: lapis lazuli from Afghanistan, malachite, red ochre, lamp black. "
            "No paint has survived 1,600 years anywhere else on Earth with this vividness."
        ),
        "best_time": "November to February. Arrive at 9 AM (opening). Cave 1 and Cave 17 have the finest paintings.",
        "local_food": [
            "Aurangabad thali at Hotel Panchavati",
            "Naurangi sweets",
            "Shikanji (lime drink) near the cave entrance",
        ],
        "hidden_facts": [
            "The paintings use fresco secco — applied to dried plaster — making their 1,600-year survival remarkable",
            "Cave 26 has a 7-metre reclining Buddha — the largest in India — carved from a single session",
            "The caves were dug using only iron chisels and wooden mallets",
            "Cave 10 has the oldest surviving painting in India — a procession scene from the 1st century BCE",
        ],
        "nearby_places": [
            "Ellora Caves (100 km) — must combine both on one trip",
            "Aurangabad city (100 km)",
            "Bibi Ka Maqbara 'Mini Taj' (Aurangabad)",
        ],
        "architecture": "Rock-cut: chaitya (prayer halls) with barrel-vaulted ceilings and viharas (monasteries). The facades imitate wooden construction in stone — a record of lost Buddhist wooden architecture.",
        "mythology": "Each painting depicts a Jataka tale — a story from the Buddha's previous lives. Cave 17 is called the 'Picture Gallery of Ancient India' for its documentary detail of Gupta-era life.",
        "photo_tips": "Cave 1 — the Bodhisattva Padmapani painting in dim light. Cave 19 facade at midday when light fills the arch. Panorama from across the river gorge at sunrise.",
        "guide_tip": "Bring a small torch or use your phone light at 45 degrees to the wall surface — the paintings reveal hidden depth and texture invisible to flat light. The artists used a technique that creates three-dimensional illusions only visible with raking light.",
    },
    "lepakshi": {
        "name": "Lepakshi Temple",
        "location": "Anantapur District, Andhra Pradesh",
        "type": "Vijayanagara Heritage Temple · Hanging Pillar Mystery",
        "confidence": 90,
        "story": (
            "There is a pillar in this 16th-century temple that does not touch the floor.\n\n"
            "Engineers have been trying to explain it for 500 years. The pillar hangs, suspended, "
            "with a visible gap beneath it. Local legend says a British engineer tried to move it — "
            "and disturbed the alignment of all 70 pillars slightly. They remain fractionally misaligned to this day.\n\n"
            "The temple — built in 1538 under the Vijayanagara Empire — contains one of the largest single-surface "
            "paintings in India: 24 feet by 14 feet, depicting Shiva and Parvati, painted in a single sitting.\n\n"
            "Outside, a 4.5-metre stone Nandi carved from a single granite boulder — faces away from the temple. Unexplained."
        ),
        "best_time": "October to February. Arrive early (7 AM) for empty corridors and soft morning light.",
        "local_food": [
            "Village meals on banana leaf near the entrance",
            "Andhra meals at Hindupur town (15 km)",
            "Fresh coconut and sugarcane juice at road stalls",
        ],
        "hidden_facts": [
            "The hanging pillar: a thin cloth can be passed completely under it — confirmed by thousands of visitors",
            "The murals use natural pigments from forest plants — none have faded in 500 years",
            "An unfinished kalyana mandapa nearby — construction stopped mid-carving when the empire fell",
            "The name 'Lepakshi' means 'Rise, O bird' — referring to Jatayu the eagle who fell here wounded by Ravana",
        ],
        "nearby_places": [
            "Hindupur town (15 km)",
            "Penukonda Fort (35 km)",
            "Bangalore (120 km)",
        ],
        "architecture": "Late Vijayanagara style. 70 ornate pillars, a painted natya mandapa, and the hanging pillar. The mandapa roof is a single flat stone slab — no arch support.",
        "mythology": "The Ramayana connection: Jatayu (the divine eagle) fought Ravana here as he abducted Sita, and fell wounded. Rama touched him and said 'Le Pakshi' (Rise, O bird). Sacred to both Shaivites and Vaishnavas.",
        "photo_tips": "The hanging pillar with a torch showing the gap beneath. The painted ceiling — bring a wide lens. The Nandi at sunrise with mist in the background.",
        "guide_tip": "Slip a piece of paper under the hanging pillar — it slides through cleanly. Then look up and trace the pillar to the ceiling. There is no visible support mechanism. The pillar distributes load through the surrounding structure in a way that engineers still model on computers without full consensus.",
    },
    "konark": {
        "name": "Konark Sun Temple",
        "location": "Puri District, Odisha",
        "type": "UNESCO World Heritage Site · Kalinga Chariot Temple",
        "confidence": 93,
        "story": (
            "Imagine a temple designed as a colossal chariot of the Sun God — 24 intricately carved wheels, "
            "each 3 metres in diameter, pulled by seven galloping horses, frozen in stone at the precise moment of dawn.\n\n"
            "Built in 1250 CE by King Narasimhadeva I, the Konark Sun Temple was so massive its tower — now collapsed — "
            "was visible from 50 kilometres at sea. Portuguese sailors called it the Black Pagoda as a navigation landmark.\n\n"
            "The 24 wheels are solar calendars. Each wheel has 8 major and 8 minor spokes, dividing the day into 16 parts. "
            "The shadows they cast tell the time — accurate to minutes — if you know which spoke to read."
        ),
        "best_time": "October to February. Sunrise is essential — the temple faces east and first light floods the natya mandapa. The Konark Dance Festival (December) is unmissable.",
        "local_food": [
            "Dahibara-aludum (Odisha street food) at Puri (35 km)",
            "Fresh seafood at Puri beach",
            "Chhena poda (burnt cheese cake) — Odisha's signature dessert",
        ],
        "hidden_facts": [
            "Two giant magnets inside the shikhara were said to cause ships to lose their compass",
            "The seven horses represent the seven days of the week; the 24 wheels represent 24 hours",
            "The main sanctum is filled with sand — deliberately — to prevent structural collapse",
            "An Aruna Stambha (dawn pillar) from here was moved to the Jagannath Temple in Puri by the Marathas",
        ],
        "nearby_places": [
            "Puri Jagannath Temple (35 km)",
            "Chilika Lake (50 km) — flamingos and Irrawaddy dolphins",
            "Raghurajpur Pattachitra village (50 km)",
        ],
        "architecture": "Kalinga style — trianga plan: pabhaga (platform), jangha (wall), mastaka (head). The main tower has collapsed; the jagamohana (porch) survives. Erotic friezes, military panels, celestial dancer carvings.",
        "mythology": "The Sun God Surya is depicted in three forms: Udita (rising), Madhyanna (noon), Astachala (setting). Legend: the 12-year-old son of the chief architect jumped from the temple on completion day — to ensure no one would ever build anything as perfect.",
        "photo_tips": "Stand inside the natya mandapa at 7 AM — sunlight streams through stone windows and hits the main wheel. Detail shots of the wheel spokes. The military elephant procession on the base.",
        "guide_tip": "Crouch down and look along the base of one of the 24 wheels at eye level. You will see that the carved spokes cast shadows at different angles as the sun moves. Pick any spoke, count 3 spokes clockwise — that spoke's shadow points to the current hour. The wheel is a working clock. It has been telling time for 773 years.",
    },
    "ellora": {
        "name": "Ellora Caves",
        "location": "Aurangabad, Maharashtra",
        "type": "UNESCO World Heritage Site · Multi-faith Rock-cut Complex",
        "confidence": 91,
        "story": (
            "At Ellora, for 600 years, Buddhist, Hindu, and Jain artisans worked side by side, "
            "carving 34 monasteries and temples into a 2-kilometre basalt cliff. They never fought. "
            "The caves exist in peaceful coexistence — a rare historical fact.\n\n"
            "The crown jewel is the Kailash Temple (Cave 16) — the largest monolithic rock-cut structure on Earth. "
            "Archaeologists estimate 200,000 tonnes of rock were excavated to create it. "
            "It took 150 years to complete, working top-down.\n\n"
            "To put its scale in perspective: this temple is larger than the Parthenon in Athens, "
            "and it was carved from a single mountain."
        ),
        "best_time": "November to February. Start at Cave 16 at opening time. The caves face west — afternoon light inside is extraordinary.",
        "local_food": [
            "Aurangabad thali at Bhoj restaurant",
            "Shahi tukda (Aurangabad specialty sweet)",
            "Keema samosa at old city markets",
        ],
        "hidden_facts": [
            "The Kailash Temple was built top-down — sculptors began at the cliff top and carved downward, unable to correct mistakes",
            "Cave 32 (Jain) has mirror-polished black basalt columns that still reflect like glass after 1,200 years",
            "Carved ventilation channels in the rock maintain a constant temperature inside — ancient air conditioning",
            "Aurangzeb attempted to destroy the Kailash Temple — his workers gave up after three years, making only a small dent",
        ],
        "nearby_places": [
            "Ajanta Caves (100 km) — combine both trips",
            "Daulatabad Fort (15 km) — impregnable medieval fortress",
            "Pitalkhora Caves (80 km) — rarely visited, extraordinary",
        ],
        "architecture": "Three traditions: Buddhist viharas (Caves 1–12), Hindu temples (13–29), Jain temples (30–34). The Kailash Temple uses Dravidian style — unusual for a Deccan location.",
        "mythology": "Cave 16 replicates Mount Kailash — Shiva's celestial home. The 'Ravana Shaking Kailash' panel shows the demon king attempting to uproot the mountain while Shiva pins it with his toe — a masterpiece of narrative carving.",
        "photo_tips": "Kailash Temple from the cliff-top walkway — the only place to see full scale. Interior of Cave 29 at midday — natural light shafts. Jain Cave 32 — the polished columns.",
        "guide_tip": "Walk the cliff-top path above the Kailash Temple. Looking down from above, you will see the full scale of what was removed — the courtyard around the temple shows the original cliff level. The temple itself was always inside the mountain. They did not build it; they revealed it.",
    },
}

# ── Keyword → monument key mapping ───────────────────────────────
KEYWORD_MAP: Dict[str, str] = {
    "taj":            "taj mahal",  "mumtaz":         "taj mahal",
    "shah jahan":     "taj mahal",  "agra":           "taj mahal",
    "hampi":          "hampi",      "vijayanagara":   "hampi",
    "tungabhadra":    "hampi",      "vittala":        "hampi",
    "brihadeeswara":  "brihadisvara", "brihadisvara": "brihadisvara",
    "thanjavur":      "brihadisvara", "tanjore":      "brihadisvara",
    "chola":          "brihadisvara", "raja raja":    "brihadisvara",
    "khajuraho":      "khajuraho",  "chandela":       "khajuraho",
    "ajanta":         "ajanta",     "waghora":        "ajanta",
    "lepakshi":       "lepakshi",   "hanging pillar": "lepakshi",
    "anantapur":      "lepakshi",
    "konark":         "konark",     "sun temple":     "konark",
    "black pagoda":   "konark",
    "ellora":         "ellora",     "kailash temple": "ellora",
}

# ── Chat responses ─────────────────────────────────────────────────
CHAT_RESPONSES: Dict[str, str] = {
    "greet": (
        "Namaste! I'm Vihara — your personal AI guide for India's cultural heritage.\n\n"
        "I work best in **Guide Mode** — I'll walk alongside you, point out what to notice, "
        "share insider secrets locals rarely tell tourists, and tell you stories your guidebook never will.\n\n"
        "Ask me about any monument, temple, or hidden gem. Or just say where you are — "
        "I'll start guiding you right away."
    ),
    "guide_mode": (
        "In Guide Mode, I speak to you directly — as if I'm standing beside you.\n\n"
        "I'll say things like: 'Turn around and look at that corner pillar — see how it leans "
        "slightly outward? That's deliberate. The entire structure was engineered so that if the "
        "columns ever fell, they'd fall away from the building, not onto it.'\n\n"
        "That's the difference between facts and being guided. Ask me about wherever you are."
    ),
    "hidden gem": (
        "India's most extraordinary hidden gems:\n\n"
        "🌊 **Penchalakona** (Andhra Pradesh) — sacred waterfall flowing through a Shiva temple\n"
        "🪨 **Unakoti** (Tripura) — 10 million rock-cut Shiva faces in a remote jungle\n"
        "🦩 **Pulicat Lake** (Tamil Nadu) — flamingo sanctuary with 400-year-old Dutch ruins at the waterline\n"
        "🏛️ **Lepakshi** (Andhra Pradesh) — temple with a pillar that defies gravity\n"
        "👻 **Champaner-Pavagadh** (Gujarat) — abandoned 15th-century city, never fully excavated\n"
        "🌾 **Ziro Valley** (Arunachal) — Apatani tribal culture, 2,000 years unchanged\n"
        "🏔️ **Gandikota** (Andhra Pradesh) — India's Grand Canyon, with a 14th-century fort on the rim\n\n"
        "Which one would you like the full story of?"
    ),
    "trip plan": (
        "I can help you plan a cultural trip to any Indian destination.\n\n"
        "Some popular cultural circuits:\n"
        "• **3 days**: Thanjavur temple circuit · Hampi · Ajanta-Ellora · Old Delhi\n"
        "• **5 days**: Tamil Nadu temple trail · Karnataka heritage · Rajasthan forts\n"
        "• **Week+**: Northeast India tribal culture · Chhattisgarh cave art · Deccan fort circuit\n\n"
        "Tell me your destination, how many days, and what you love most — "
        "I'll build you a detailed itinerary with local food, hidden spots, and insider tips."
    ),
    "architecture": (
        "Indian temple architecture has five major traditions:\n\n"
        "🔺 **Nagara (North Indian)**: Curvilinear shikhara (spire). Khajuraho, Konark, Lingaraja (Bhubaneswar)\n"
        "🔶 **Dravidian (South Indian)**: Pyramidal gopuram tower. Brihadisvara, Meenakshi Amman, Brihadesvara\n"
        "🔷 **Vesara (Deccan)**: Hybrid of both. Hoysala temples — Belur and Halebidu are masterpieces\n"
        "🪨 **Rock-cut**: Carved from living rock. Ellora, Ajanta, Mahabalipuram, Udayagiri\n"
        "💧 **Stepwells**: Inverted underground temples. Rani ki Vav (Patan), Chand Baori (Rajasthan)\n\n"
        "Which style would you like to explore in depth?"
    ),
    "mythology": (
        "Every major Indian heritage site is woven into mythology:\n\n"
        "🏹 **Ramayana sites**: Hampi (Kishkindha), Lepakshi (Jatayu fell here), Chitrakoot (Rama's exile)\n"
        "⚔️ **Mahabharata**: Kurukshetra (the great battle), Hastinapur (capital), Dwarka (Krishna's city, now underwater)\n"
        "🔱 **Shiva**: Varanasi (eternal city), 12 Jyotirlingas across India, Kedarnath, Amarnath\n"
        "🦚 **Krishna**: Mathura (birthplace), Vrindavan, Dwarka, Udupi\n"
        "🌸 **Goddess**: Kamakhya (Assam), Vaishno Devi (Jammu), Meenakshi Amman (Madurai)\n\n"
        "Which deity or epic would you like to trace through India's monuments?"
    ),
    "food": (
        "Every Indian heritage region has its own culinary identity:\n\n"
        "🍛 **Tamil Nadu**: Chettinad cuisine, filter coffee, banana leaf thali, idli-sambar\n"
        "🏰 **Rajasthan**: Dal baati churma, ghewar, ker sangri, Rajasthani thali\n"
        "🌊 **Maharashtra**: Vada pav, sabudana khichdi, puran poli, Kolhapuri mutton\n"
        "🌿 **Karnataka**: Bisi bele bath, Mysore pak, Udupi vegetarian cuisine, akki roti\n"
        "🌶️ **Andhra Pradesh**: Gongura mutton, pesarattu, spicy Hyderabadi biryani\n"
        "🐟 **Kerala**: Karimeen pollichathu, appam-stew, sadya on banana leaf, seafood\n\n"
        "Tell me which region you're visiting — I'll give you a specific food guide with actual restaurants."
    ),
    "photography": (
        "Best photography locations in India by category:\n\n"
        "🌅 **Golden Hour Temples**: Konark (sunrise), Brihadisvara (sunrise), Hampi Vittala (dusk)\n"
        "💧 **Water Reflections**: Taj Mahal pool, Pulicat Lake at dawn, Bundi stepwell\n"
        "🪨 **Architectural Detail**: Khajuraho carvings, Ellora Kailash aerial view, Ajanta paintings\n"
        "🌿 **Landscapes**: Ziro Valley (Arunachal), Munnar tea estates, Coorg coffee hills\n"
        "🙏 **Living Rituals**: Varanasi ghats at dawn, Pushkar camel fair, Mysore Dasara\n\n"
        "What kind of photography are you focused on? I'll give you specific spots and timings."
    ),
    "default": (
        "That's a fascinating question about India's heritage. Let me share what I know.\n\n"
        "India has 3,691 ASI-protected monuments, 42 UNESCO World Heritage Sites, "
        "and thousands of unprotected heritage sites that are equally extraordinary.\n\n"
        "The best way to experience India's heritage is by slowing down — spending a full day at one site, "
        "talking to local priests and guides, eating where the pilgrims eat, arriving before the crowds.\n\n"
        "What specific monument, region, or cultural tradition would you like to explore? "
        "I can go deep on any place, period, or theme."
    ),
}

# ── Multilingual greetings ─────────────────────────────────────────
MULTILINGUAL_GREETINGS: Dict[str, str] = {
    "Hindi": (
        "नमस्ते! मैं विहारा हूँ — भारत की सांस्कृतिक धरोहर का आपका AI गाइड।\n\n"
        "मैं **Guide Mode** में आपके साथ चलता हूँ — बताता हूँ क्या देखना है, "
        "वो राज़ शेयर करता हूँ जो आम tourists नहीं जानते।\n\n"
        "कोई भी मंदिर, किला, या छुपी हुई जगह के बारे में पूछें।"
    ),
    "Telugu": (
        "నమస్కారం! నేను విహార — భారత వారసత్వానికి మీ AI గైడ్.\n\n"
        "నేను **Guide Mode** లో మీతో నడుస్తాను — ఏమి చూడాలో చెప్తాను, "
        "స్థానికులు మాత్రమే తెలుసుకునే రహస్యాలు పంచుకుంటాను.\n\n"
        "ఏ ఆలయం, కోట లేదా దాచిన ప్రదేశం గురించైనా అడగండి."
    ),
    "Tamil": (
        "வணக்கம்! நான் விஹார — இந்திய கலாச்சார பாரம்பரியத்திற்கான உங்கள் AI வழிகாட்டி.\n\n"
        "**Guide Mode** இல் நான் உங்களுடன் நடப்பேன் — என்ன பார்க்கணும்னு சொல்வேன், "
        "உள்ளூர் ரகசியங்களை பகிர்வேன்.\n\n"
        "எந்த கோயில், கோட்டை அல்லது மறைந்திருக்கும் இடம் பற்றியும் கேளுங்கள்."
    ),
    "Bengali": (
        "নমস্কার! আমি বিহার — ভারতীয় সাংস্কৃতিক ঐতিহ্যের আপনার AI গাইড।\n\n"
        "আমি **Guide Mode** এ আপনার সাথে চলি — কী দেখতে হবে বলি, "
        "স্থানীয়রা যা জানে তা শেয়ার করি।\n\n"
        "যেকোনো মন্দির, দুর্গ বা লুকানো জায়গা সম্পর্কে জিজ্ঞেস করুন।"
    ),
    "Kannada": (
        "ನಮಸ್ಕಾರ! ನಾನು ವಿಹಾರ — ಭಾರತದ ಸಾಂಸ್ಕೃತಿಕ ಪರಂಪರೆಯ ನಿಮ್ಮ AI ಮಾರ್ಗದರ್ಶಿ.\n\n"
        "**Guide Mode** ನಲ್ಲಿ ನಾನು ನಿಮ್ಮೊಂದಿಗೆ ನಡೆಯುತ್ತೇನೆ — "
        "ಏನು ನೋಡಬೇಕು ಎಂದು ಹೇಳುತ್ತೇನೆ, ಸ್ಥಳೀಯರು ಮಾತ್ರ ತಿಳಿದ ರಹಸ್ಯಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳುತ್ತೇನೆ.\n\n"
        "ಯಾವುದೇ ದೇವಸ್ಥಾನ, ಕೋಟೆ ಅಥವಾ ಮರೆಯಾದ ಸ್ಥಳದ ಬಗ್ಗೆ ಕೇಳಿ."
    ),
    "French": (
        "Bonjour! Je suis Vihara — votre guide IA personnel pour le patrimoine indien.\n\n"
        "En **Mode Guide**, je marche avec vous — je vous montre quoi remarquer, "
        "je partage des secrets que seuls les locaux connaissent.\n\n"
        "Posez-moi des questions sur n'importe quel monument, temple ou lieu caché."
    ),
    "German": (
        "Guten Tag! Ich bin Vihara — Ihr persönlicher KI-Reiseführer für Indiens Kulturerbe.\n\n"
        "Im **Führermodus** gehe ich mit Ihnen — zeige, was Sie beachten sollen, "
        "teile Geheimnisse, die nur Einheimische kennen.\n\n"
        "Fragen Sie mich über beliebige Denkmäler, Tempel oder versteckte Orte."
    ),
    "Spanish": (
        "¡Hola! Soy Vihara — tu guía IA personal para el patrimonio cultural de India.\n\n"
        "En **Modo Guía**, camino contigo — te muestro qué notar, "
        "comparto secretos que solo los locales conocen.\n\n"
        "Pregúntame sobre cualquier monumento, templo o lugar escondido."
    ),
    "Japanese": (
        "こんにちは！私はViharaです — インドの文化遺産のあなた個人のAIガイドです。\n\n"
        "**ガイドモード**では、私はあなたと一緒に歩きます — 何を見るべきか教え、"
        "地元の人しか知らない秘密をお伝えします。\n\n"
        "どんな遺跡、寺院、隠れた場所についても聞いてください。"
    ),
    "Chinese": (
        "你好！我是Vihara — 您的印度文化遗产个人AI向导。\n\n"
        "在**向导模式**下，我与您同行 — 告诉您该看什么，"
        "分享只有当地人知道的秘密。\n\n"
        "随时问我任何纪念碑、寺庙或隐藏地点的问题。"
    ),
}

# ── Bilingual monument summaries ───────────────────────────────────
MONUMENT_SUMMARIES_MULTILINGUAL: Dict[str, Dict[str, str]] = {
    "taj mahal": {
        "Hindi": (
            "**ताज महल** — एक अमर प्रेम की कहानी\n\n"
            "1631 में, मुमताज महल की मृत्यु के बाद शाहजहाँ के बाल रातों-रात सफेद हो गए।\n\n"
            "22 साल, 20,000 कारीगर, और राजस्थान के मकराना से लाया गया सफेद संगमरमर। "
            "यह दुनिया का सबसे बड़ा प्रेम पत्र है।\n\n"
            "**गाइड की सलाह:** ताज महल दिन में तीन बार रंग बदलता है — सुबह गुलाबी, "
            "दोपहर सफेद, शाम सुनहरा। यह जानबूझकर बनाया गया था।"
        ),
        "Telugu": (
            "**తాజ్ మహల్** — శాశ్వత ప్రేమ కథ\n\n"
            "1631లో, ముంతాజ్ మహల్ మరణం తర్వాత షాజహాన్ జుట్టు రాత్రికి రాత్రే తెల్లబడింది.\n\n"
            "22 సంవత్సరాలు, 20,000 కళాకారులు, రాజస్థాన్ నుండి తెచ్చిన తెల్ల పాలరాయి. "
            "ఇది ప్రపంచంలోనే అతిపెద్ద ప్రేమ లేఖ.\n\n"
            "**గైడ్ చిట్కా:** తాజ్ మహల్ రోజులో మూడు సార్లు రంగు మారుతుంది — ఉదయం గులాబీ, "
            "మధ్యాహ్నం తెలుపు, సాయంత్రం బంగారం. ఇది ఉద్దేశపూర్వకంగా రూపొందించబడింది."
        ),
        "Tamil": (
            "**தாஜ் மஹால்** — நித்திய காதல் கதை\n\n"
            "1631ல், மும்தாஜ் மஹால் இறந்த பிறகு ஷாஜஹானின் தலைமுடி ஒரே இரவில் வெண்மையானது.\n\n"
            "22 ஆண்டுகள், 20,000 கலைஞர்கள், ராஜஸ்தானிலிருந்து வெண்மார்பிள். "
            "இது உலகின் மிகப்பெரிய காதல் கடிதம்.\n\n"
            "**வழிகாட்டி குறிப்பு:** தாஜ் மஹால் நாளில் மூன்று முறை நிறம் மாறுகிறது — "
            "காலை இளஞ்சிவப்பு, மதியம் வெண்மை, மாலை தங்கம். இது வேண்டுமே செய்யப்பட்டது."
        ),
    },
    "hampi": {
        "Hindi": (
            "**हम्पी** — एक खोई हुई सभ्यता की कहानी\n\n"
            "1336 में, तुंगभद्रा नदी के किनारे दो भाइयों ने एक शहर बसाया जो "
            "जल्द ही दुनिया का सबसे बड़ा शहर बन गया — पाँच लाख लोगों का घर।\n\n"
            "फिर 1565 में, एक ही दिन में सब कुछ नष्ट हो गया। छह महीने तक जलता रहा।\n\n"
            "**गाइड की सलाह:** विट्टला मंदिर के संगीत स्तंभों को धीरे से थपथपाएं — "
            "हर स्तंभ एक अलग संगीत नोट निकालता है। यह रहस्य आज भी अनसुलझा है।"
        ),
        "Telugu": (
            "**హంపి** — పోయిన నాగరికత కథ\n\n"
            "1336లో, తుంగభద్ర నది ఒడ్డున ఇద్దరు సోదరులు ఒక నగరం స్థాపించారు — "
            "అది త్వరలో ప్రపంచంలోనే అతిపెద్ద నగరమైంది, ఐదు లక్షల మంది నివాసం.\n\n"
            "1565లో, ఒకే రోజు అన్నీ ధ్వంసమయ్యాయి. ఆరు నెలలు మండింది.\n\n"
            "**గైడ్ చిట్కా:** విట్టల ఆలయం స్తంభాలను నెమ్మదిగా తట్టండి — "
            "ప్రతి స్తంభం వేరే సంగీత స్వరం వస్తుంది. ఇది ఇప్పటికీ అర్థం కాలేదు."
        ),
    },
}


def _key_from_text(text: str) -> Optional[str]:
    """Find best matching monument key from free text."""
    t = text.lower()
    for keyword, key in KEYWORD_MAP.items():
        if keyword in t:
            return key
    return None


def _get_chat_response(message: str) -> str:
    """Return best matching offline chat response."""
    msg = message.lower()
    if any(w in msg for w in ["hello", "hi ", "namaste", "hey", "vanakkam", "namaskar", "greet"]):
        return CHAT_RESPONSES["greet"]
    if any(w in msg for w in ["guide mode", "guide me", "walk with me", "walking guide"]):
        return CHAT_RESPONSES["guide_mode"]
    if any(w in msg for w in ["hidden", "gem", "unexplored", "offbeat", "secret", "unknown"]):
        return CHAT_RESPONSES["hidden gem"]
    if any(w in msg for w in ["plan", "trip", "itinerary", "travel", "days", "schedule", "route"]):
        return CHAT_RESPONSES["trip plan"]
    if any(w in msg for w in ["architect", "style", "design", "gopuram", "shikhara", "temple style"]):
        return CHAT_RESPONSES["architecture"]
    if any(w in msg for w in ["myth", "legend", "god", "goddess", "ramayana", "mahabharata", "shiva", "vishnu"]):
        return CHAT_RESPONSES["mythology"]
    if any(w in msg for w in ["food", "eat", "cuisine", "restaurant", "dish", "local food", "where to eat"]):
        return CHAT_RESPONSES["food"]
    if any(w in msg for w in ["photo", "camera", "shoot", "instagram", "picture", "photography"]):
        return CHAT_RESPONSES["photography"]
    # Try monument-specific
    key = _key_from_text(msg)
    if key and key in MONUMENT_DB:
        m = MONUMENT_DB[key]
        return (
            f"**{m['name']}** — {m['location']}\n"
            f"*{m['type']}*\n\n"
            f"{m['story']}\n\n"
            f"**Best time:** {m['best_time']}\n\n"
            f"**Things most tourists miss:**\n" +
            "\n".join(f"• {f}" for f in m["hidden_facts"][:3]) +
            f"\n\n🧭 **Guide tip:** {m['guide_tip']}\n\n"
            f"*Ask me about the mythology, architecture, food, or nearby places — I can go deeper.*"
        )
    return CHAT_RESPONSES["default"]


def _get_multilingual_greeting(language: str) -> str:
    return MULTILINGUAL_GREETINGS.get(language, CHAT_RESPONSES["greet"])


def _get_monument_summary_multilingual(monument_key: str, language: str) -> Optional[str]:
    summaries = MONUMENT_SUMMARIES_MULTILINGUAL.get(monument_key, {})
    return summaries.get(language)


def _get_multilingual_response(english_text: str, language: str) -> str:
    """Wrap English offline response with a language note."""
    notes: Dict[str, str] = {
        "Hindi":     "हिंदी में जवाब (API key के साथ पूर्णतः हिंदी में)",
        "Telugu":    "తెలుగులో సమాధానం (API key తో పూర్తి తెలుగులో)",
        "Tamil":     "தமிழில் பதில் (API key உடன் முழு தமிழில்)",
        "Bengali":   "বাংলায় উত্তর (API key সহ সম্পূর্ণ বাংলায়)",
        "Kannada":   "ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರ (API key ಜೊತೆ ಸಂಪೂರ್ಣ ಕನ್ನಡದಲ್ಲಿ)",
        "Gujarati":  "ગુજરાતીમાં જવાબ (API key સાથે સંપૂર્ણ ગુજરાતીમાં)",
        "Marathi":   "मराठीत उत्तर (API key सोबत संपूर्ण मराठीत)",
        "Malayalam": "മലയാളത്തിൽ ഉത്തരം (API key ഉപയോഗിച്ച് പൂർണ്ണ മലയാളം)",
        "French":    "Réponse en français (complet avec API key)",
        "German":    "Antwort auf Deutsch (vollständig mit API-Schlüssel)",
        "Spanish":   "Respuesta en español (completo con API key)",
        "Japanese":  "日本語での回答（API keyで完全な日本語）",
        "Chinese":   "中文回答（有API key时完整中文）",
        "Arabic":    "إجابة بالعربية (كاملة مع API key)",
    }
    note = notes.get(language, f"Response in {language}")
    return f"[{note}]\n\n{english_text}"


def _get_monument_from_image_context(filename: str = "") -> dict:
    """Return offline monument data for image recognition fallback."""
    key = _key_from_text(filename)
    if key and key in MONUMENT_DB:
        m = MONUMENT_DB[key]
        return {**m, "confidence": 72, "offline_mode": True}
    # Without a working vision model, do not guess a monument.
    return {
        "error": "vision_unavailable",
        "message": (
            "Could not identify this image. "
            "Please try a clearer photo of the monument or site facade."
        ),
    }



def _get_offline_itinerary(destination: str, days: int) -> dict:
    """Generate offline itinerary with rich data for 20+ destinations."""

    # ── Rich templates for popular destinations ──────────────────────
    RICH_TEMPLATES = {
        "thanjavur": {
            "overview": "Thanjavur is the cultural capital of Tamil Nadu — home to the greatest Chola monuments, a living tradition of classical music, and some of the finest temple sculpture in the world. The Brihadisvara Temple, built over 1,000 years ago, still dominates the skyline with an 80-tonne capstone placed without cranes or machines.",
            "best_season": "October to February — cool mornings, golden light, active temple calendar",
            "budget_estimate": "₹3,500–8,000 per person per day",
            "hidden_gems": [
                "Gangaikondacholapuram (70 km) — Brihadisvara's forgotten twin, equally magnificent, virtually zero tourists",
                "Swamimalai bronzecasting village (40 km) — watch 1,000-year-old lost-wax casting still practiced by the same families",
                "Poompuhar Shore Temple (50 km) — Chola port city ruins, partially underwater at high tide",
                "Papanasam Beach (80 km) — traditional fishing boats, no tourists, incredible sunrise",
                "Darasuram Airavatesvara Temple (40 km) — UNESCO site, musical steps on the chariot porch",
            ],
            "packing_tips": [
                "Cotton clothes only — temple dress codes strictly enforced (shoulders + knees covered)",
                "Flat shoes you can remove quickly — you walk on smooth hot stone for hours",
                "Small torch for temple interiors — finest murals are in low-light sections",
            ],
            "days": [
                {
                    "day": 1, "title": "Chola Grandeur at Dawn",
                    "weather": "Sunny", "temp": "28–32°C",
                    "travel_tip": "Start by 6:30 AM — the vimana glows in early light and priests begin the morning puja at 8 AM. Attend it if you can.",
                    "places": [
                        {"name": "Brihadisvara Temple (Peruvudaiyar Kovil)", "time": "6:30 AM", "duration": "3 hours", "type": "UNESCO Heritage",
                         "tip": "Stand at the far end of the inner courtyard at equinox noon — the 66-metre vimana casts no shadow. The Chola architects calculated this 1,000 years ago."},
                        {"name": "Saraswathi Mahal Library", "time": "10:00 AM", "duration": "1.5 hours", "type": "Museum",
                         "tip": "Ask the curator about the palm leaf manuscripts — some are 1,200 years old. The collection has Chola-era medical texts that predate European medicine."},
                        {"name": "Thanjavur Royal Palace & Art Gallery", "time": "12:00 PM", "duration": "1.5 hours", "type": "Palace",
                         "tip": "The Durbar Hall murals are the finest Maratha paintings in south India. Most visitors walk past them staring at their phones."},
                        {"name": "Brihadamba Temple complex evening puja", "time": "6:00 PM", "duration": "1 hour", "type": "Living Heritage",
                         "tip": "The evening puja includes Nadaswaram music performed in the outer mandapam — a 1,000-year-old sound you cannot hear anywhere else."},
                    ],
                    "food": [
                        "6:00 AM Breakfast: Filter coffee at Sree Krishna Vilas on South Main Street — open since 1953, the real Thanjavur morning ritual",
                        "9:30 AM: Pongal with sambar and idli at the small mess near the east gopuram entrance — order before 9:45 AM",
                        "1:30 PM Lunch: Thanjavur Maratha thali at Hotel Parisutham — brass vessels, 18 dishes, banana leaf",
                        "Evening: Kozhukattai (steamed rice dumplings with coconut) at the street stall near the palace gates",
                    ],
                },
                {
                    "day": 2, "title": "The Forgotten Twin & Musical Temples",
                    "weather": "Sunny", "temp": "27–31°C",
                    "travel_tip": "Hire a local auto-rickshaw for ₹500–700 for the full day — the driver will know backroads no app knows",
                    "places": [
                        {"name": "Gangaikondacholapuram", "time": "7:00 AM", "duration": "3 hours", "type": "UNESCO Heritage (Forgotten)",
                         "tip": "This is Brihadisvara's forgotten twin — equally magnificent, virtually no tourists. You may have the entire site to yourself. The lion sculptures here are considered finer than Thanjavur's."},
                        {"name": "Darasuram Airavatesvara Temple", "time": "11:30 AM", "duration": "2 hours", "type": "UNESCO Heritage",
                         "tip": "The steps of the chariot porch are musical — tap them with a stone. Each step produces a different musical note. The British couldn't explain it either."},
                        {"name": "Kumbakonam Mahamaham Tank", "time": "3:00 PM", "duration": "1 hour", "type": "Sacred Heritage",
                         "tip": "The largest temple tank in Tamil Nadu. Once every 12 years, millions bathe here. The surrounding ghats at sunset are photography gold."},
                        {"name": "Sarangapani Temple, Kumbakonam", "time": "4:30 PM", "duration": "1.5 hours", "type": "Living Temple",
                         "tip": "The 11-tiered gopuram is the tallest in Kumbakonam. The inner sanctum's gold-plated ceiling is rarely photographed."},
                    ],
                    "food": [
                        "7:00 AM Breakfast: Puttu and kadala curry at the village dhaba in Gangaikondacholapuram village — no sign, just follow the smoke",
                        "1:00 PM Lunch: Kumbakonam Degree Coffee — this style of coffee (filtered through a brass device) became famous across India from here",
                        "Evening: Banana leaf meal at Murali Vilas on TSR Big Street, Kumbakonam — order the special thali",
                    ],
                },
            ],
            "cultural_notes": "Thanjavur temples are living places of worship — attend with reverence. Cover shoulders and knees strictly. No leather items inside the sanctum sanctorum. Puja at 8 AM, 12 PM, and 6 PM — witnessing one adds immense depth. Photography restricted inside sanctum but allowed in outer courtyard. The priests at Brihadisvara speak Tamil only — a temple guide (₹200) is worthwhile.",
        },

        "hampi": {
            "overview": "Hampi is 41 square kilometres of the world's most extraordinary ruins — the shattered remains of Vijayanagara, once the largest city in the world after Beijing. In 1565, it burned for six months. Today, 2.5-billion-year-old boulders and 600-year-old temple towers exist in a landscape that feels like time stopped mid-catastrophe.",
            "best_season": "November to February — cool, golden light, manageable heat",
            "budget_estimate": "₹2,500–6,000 per person per day",
            "hidden_gems": [
                "Anegundi village (5 km across river) — original Vijayanagara capital, ancient cave paintings, Kishkindha from the Ramayana",
                "Daroji Sloth Bear Sanctuary (15 km) — wild sloth bears, rarely visited even by local tourists",
                "Navabrindavana Island (20 km) — island with tombs of 8 Madhvacharya pontiffs, accessible only by coracle boat",
                "Tungabhadra sunset from Hemakuta Hill — ruins and boulders turn gold at 6 PM",
                "Malyavanta Raghunatha Temple — tucked behind massive boulders, where Rama and Lakshmana waited out the monsoon",
            ],
            "packing_tips": [
                "Sturdy shoes for boulder-hopping — the best spots require climbing",
                "Sunrise at Matanga Hill (30-min climb) — non-negotiable, most spectacular view in all of Karnataka",
                "Cash only — most restaurants and shops in Hampi are cash-only",
            ],
            "days": [
                {
                    "day": 1, "title": "Sacred Centre — Virupaksha to Vittala",
                    "weather": "Sunny", "temp": "28–34°C",
                    "travel_tip": "Climb Matanga Hill before 6:30 AM for the sunrise — 360-degree view of the entire ruins. Bring a torch for the path up.",
                    "places": [
                        {"name": "Matanga Hill", "time": "6:00 AM", "duration": "1.5 hours", "type": "Viewpoint",
                         "tip": "This is where Sugriva hid from Vali in the Ramayana. At sunrise, the entire plain of ruins turns gold. Arguably the most beautiful sunrise in India."},
                        {"name": "Virupaksha Temple", "time": "8:00 AM", "duration": "2 hours", "type": "Living Temple (650 years)",
                         "tip": "The camera obscura in the dark corridor — an inverted image of the gopuram is projected on the wall by light through a tiny hole. The priests will show you."},
                        {"name": "Vittala Temple & Stone Chariot", "time": "11:00 AM", "duration": "3 hours", "type": "UNESCO Heritage",
                         "tip": "Tap the musical pillars of the main mandapam — each produces a different note. In 1890, British engineers cut one open to find the source. It was hollow. Still unexplained."},
                        {"name": "Hampi Bazaar (Krishnapura Bazaar ruins)", "time": "3:00 PM", "duration": "1 hour", "type": "Historic Ruins",
                         "tip": "Walk the full length — 750 metres. Merchants from Portugal, Persia, and China walked this same road selling diamonds and spices 500 years ago."},
                    ],
                    "food": [
                        "Before sunrise: Tea from the chai stall at the Matanga Hill base — the owner has been there 30 years",
                        "9:30 AM Breakfast: Mango lassi and banana pancake at Mango Tree restaurant (riverside) — arrive early for a river-view seat",
                        "1:00 PM Lunch: Thali at Laughing Buddha near Virupaksha — ₹120, the best value meal in Hampi",
                        "Evening: Fresh coconut water from the cart near Vittala, then sunset at Hemakuta Hill",
                    ],
                },
                {
                    "day": 2, "title": "Royal Quarter & Hidden Boulders",
                    "weather": "Sunny", "temp": "27–33°C",
                    "travel_tip": "Rent a bicycle (₹100/day) for the Royal Centre — flat ground, roads between sites, no traffic",
                    "places": [
                        {"name": "Elephant Stables (Zenana Enclosure)", "time": "8:00 AM", "duration": "1.5 hours", "type": "Royal Heritage",
                         "tip": "11 bays, each with a different dome — Indo-Islamic, Deccan, Dravidian. The architects were showing off. Each style represents a conquered kingdom."},
                        {"name": "Lotus Mahal & Queen's Bath", "time": "10:00 AM", "duration": "1.5 hours", "type": "Royal Heritage",
                         "tip": "The Queen's Bath had a natural air-conditioning system — scented water flowed through the arched corridors. The perfume channels are still visible."},
                        {"name": "Hazara Rama Temple", "time": "12:00 PM", "duration": "1.5 hours", "type": "Royal Chapel",
                         "tip": "The outer walls have a complete pictorial Ramayana carved in bas-relief — 1,000 panels telling the entire story. Start at the north wall."},
                        {"name": "Anegundi village & Kishkindha", "time": "3:30 PM", "duration": "2.5 hours", "type": "Hidden Heritage",
                         "tip": "Cross the river by coracle (₹30). This is Kishkindha from the Ramayana. Anjaneya Hill here is said to be Hanuman's birthplace. Ancient cave paintings in the hills."},
                    ],
                    "food": [
                        "8:00 AM Breakfast: Idli sambar at the stall inside the ruins complex near the Elephant Stables",
                        "1:30 PM Lunch: Bisi bele bath at Gopi Rooftop Restaurant — Karnataka's signature comfort food",
                        "Evening: Riverside dinner at New Shanthi, Virupapur Gadde — banana pancake and local coconut curry",
                    ],
                },
            ],
            "cultural_notes": "Hampi is a UNESCO site and also a living pilgrimage place — the Virupaksha Temple has been in continuous worship for 1,500 years. Remove footwear at all temples. The sunset at Hemakuta Hill is sacred — maintain silence. Hiring a local guide (₹500–800) is worthwhile; they know the hidden routes and mythological context.",
        },

        "jaipur": {
            "overview": "Jaipur — the Pink City — is India's most theatrical heritage destination: a planned Mughal-Rajput city built in 1727 that still functions as its architect intended, with palaces, observatories, bazaars, and forts woven into daily life. Beyond the famous landmarks, Jaipur hides some of the most extraordinary stepwells, villages, and forgotten temples in Rajasthan.",
            "best_season": "October to March — cool days, warm evenings, festival season",
            "budget_estimate": "₹3,000–10,000 per person per day",
            "hidden_gems": [
                "Galta Ji (Monkey Temple, 10 km east) — ancient stepwells with troops of monkeys, almost no foreign tourists",
                "Abhaneri Chand Baori (95 km) — the most perfect stepwell in India, 3,500 steps, 13 stories deep",
                "Sisodia Rani Garden — Mughal garden with painted pavilions, virtually unvisited",
                "Nahargarh Fort sunset — better views than Amer, far fewer crowds",
                "Old city blue pottery workshops — Kripal Kumbh on Shiv Marg, working studio open to visitors",
            ],
            "packing_tips": [
                "Bargain at bazaars — starting price is usually 3x the fair price",
                "Book Amer Fort entry online — saves 2-hour queue",
                "Hire a cycle rickshaw for the old city — auto-rickshaws cannot enter the narrower streets",
            ],
            "days": [
                {
                    "day": 1, "title": "The Walled City & Jantar Mantar",
                    "weather": "Sunny, dry", "temp": "22–30°C",
                    "travel_tip": "Start at the City Palace at 9:30 AM sharp (opening) — the Diwan-e-Khas has the world's largest sterling silver urns, Guinness World Record holders.",
                    "places": [
                        {"name": "Jantar Mantar Observatory", "time": "9:30 AM", "duration": "2 hours", "type": "UNESCO Heritage — World's Largest Stone Observatory",
                         "tip": "The Samrat Yantra sundial is 27 metres tall and accurate to 2 seconds. Stand at the base and watch the shadow move in real time — it moves fast enough to see."},
                        {"name": "City Palace Museum", "time": "11:30 AM", "duration": "2 hours", "type": "Royal Heritage",
                         "tip": "The royal family still occupies the private quarters — if the flag is flying, the Maharaja is in residence. Ask a guard which courtyard connects to the old zenana."},
                        {"name": "Hawa Mahal (Palace of Winds)", "time": "2:00 PM", "duration": "1.5 hours", "type": "Iconic Architecture",
                         "tip": "Don't just photograph the front — go inside and look OUT through the 953 jharokha windows. This was designed so royal women could watch street life without being seen."},
                        {"name": "Old City Bazaars — Johari & Bapu", "time": "4:00 PM", "duration": "2 hours", "type": "Living Heritage Market",
                         "tip": "Johari Bazaar for gemstones — Jaipur cuts 80% of the world's colored stones. Watch a cutter work for free at any shop."},
                    ],
                    "food": [
                        "9:00 AM Breakfast: Pyaaz kachori with chai at Rawat Misthan Bhandar, Station Road — the queue tells you everything",
                        "1:30 PM Lunch: Dal baati churma at Chokhi Dhani (Old City branch) — eat on the floor on a straw mat",
                        "Evening Snacks: Mirchi bada (chilli fritter) from the street stalls in Bapu Bazaar",
                        "8:00 PM Dinner: Laal maas (fiery red mutton curry) at Handi Restaurant, MI Road — the city's most-loved meat dish",
                    ],
                },
                {
                    "day": 2, "title": "Amer Fort & Hidden Stepwells",
                    "weather": "Sunny", "temp": "21–29°C",
                    "travel_tip": "Take a jeep up to Amer Fort (₹200 shared) — skip the elephant rides, which are controversial and slow",
                    "places": [
                        {"name": "Amer Fort", "time": "8:00 AM", "duration": "3 hours", "type": "UNESCO Rajput Fort",
                         "tip": "Walk to the Sheesh Mahal (Hall of Mirrors) at 9 AM when morning light enters — a single candle used to illuminate the entire room via reflections. One lighter works today."},
                        {"name": "Panna Meena Ka Kund (Hidden Stepwell)", "time": "12:00 PM", "duration": "1 hour", "type": "Hidden Heritage",
                         "tip": "A 16th-century stepwell a 10-minute walk from Amer Fort — almost no tourists. The geometric step pattern is mathematically perfect from above."},
                        {"name": "Nahargarh Fort", "time": "3:30 PM", "duration": "2 hours", "type": "Fort + Viewpoint",
                         "tip": "Better sunset view than Amer. The wax museum inside is forgettable but the parapets — and the straight drop into the city — is not."},
                        {"name": "Galta Ji (Monkey Temple)", "time": "5:30 PM", "duration": "1.5 hours", "type": "Hidden Pilgrimage",
                         "tip": "Follow the main road past the monkeys to the ancient kunds (sacred pools) — they have been here since the 10th century. Almost nobody sees them."},
                    ],
                    "food": [
                        "8:00 AM Breakfast: Aam papad and rabri at Laxmi Misthan Bhandar near Amer — open since 1727",
                        "1:00 PM Lunch: Gatte ki sabzi (gram flour dumplings in yoghurt curry) at Anokhi Café, near MI Road",
                        "Evening: Masala chai at any dhaba overlooking Nahargarh — the city lights at dusk are extraordinary",
                        "8:30 PM Dinner: Dil Pasand Hotel for authentic old-city Rajasthani thali — no menu, just food that arrives",
                    ],
                },
            ],
            "cultural_notes": "Jaipur's old city still functions as a living Rajput settlement — haggling is expected and part of the culture, not disrespectful. Temples require head coverings (women especially) — carry a scarf. The Friday mosque near Hawa Mahal is active — non-Muslims welcome but dress modestly. Most forts close at 5:30 PM sharp.",
        },

        "agra": {
            "overview": "Agra contains arguably the three greatest monuments of the Mughal Empire within 10 kilometres of each other: the Taj Mahal, Agra Fort, and the lost city of Fatehpur Sikri. Yet most visitors see only the Taj and leave — missing the fort where Shah Jahan spent his final years staring at his creation, and an entire city frozen in 1585.",
            "best_season": "October to March. Full moon nights at Taj Mahal (book separately). Avoid May-June (45°C+).",
            "budget_estimate": "₹3,000–8,000 per person per day",
            "hidden_gems": [
                "Mehtab Bagh (500m across river) — Mughal garden with the best sunset view of the Taj, almost no crowds",
                "Itimad-ud-Daula 'Baby Taj' (6 km) — arguably more beautiful than the Taj, entirely inlaid with pietra dura, you can get inches from the carving",
                "Chini Ka Rauza (6 km) — Persian blue-tile mausoleum of Shah Jahan's finance minister, hidden in a lane, extraordinary",
                "Keetham Lake (20 km) — migratory birds sanctuary, popular with birders but unknown to heritage tourists",
                "Ram Bagh (6 km) — India's oldest Mughal garden, completely unvisited, requires a guide to find",
            ],
            "packing_tips": [
                "Taj Mahal: book online, carry printed ticket — entry queues are brutal for walk-ins",
                "Sunrise entry at Taj opens 30 minutes before sunrise — arrive before the gates open",
                "Agra food speciality: Petha sweet — Panchhi Petha near Kinari Bazaar has 27 varieties",
            ],
            "days": [
                {
                    "day": 1, "title": "The Taj at First Light",
                    "weather": "Dry, clear", "temp": "18–28°C (winter) / 25–36°C (spring)",
                    "travel_tip": "Enter via the East Gate for the best morning light on the Taj. The West Gate has shorter queues after 11 AM.",
                    "places": [
                        {"name": "Taj Mahal — Sunrise Entry", "time": "5:45 AM", "duration": "3 hours", "type": "UNESCO — Wonder of the World",
                         "tip": "Shah Jahan's cenotaph is slightly off-centre. Mumtaz's is perfectly central. Even in death, he deferred to her. Find this — it changes the entire story."},
                        {"name": "Mehtab Bagh (Moonlight Garden)", "time": "5:30 PM", "duration": "1.5 hours", "type": "Hidden Mughal Garden",
                         "tip": "Directly across the Yamuna from the Taj. Shah Jahan planned to build a black marble Taj here as his own mausoleum. You are standing in his unbuilt tomb."},
                    ],
                    "food": [
                        "Pre-dawn: Tea at the dhaba outside the East Gate — the only food available before 6 AM",
                        "9:00 AM Breakfast: Bedai (fried bread) with sabzi at Deviram in the old city — breakfast of Agra since 1836",
                        "1:30 PM Lunch: Mughlai biryani at Pinch of Spice, Fatehabad Road — slow-cooked in sealed deg",
                        "Evening: Petha tasting at Panchhi Petha — buy the angoori (grape) variety, it doesn't exist elsewhere",
                    ],
                },
                {
                    "day": 2, "title": "The Fort & the Forgotten City",
                    "weather": "Sunny, dry", "temp": "18–29°C",
                    "travel_tip": "Agra Fort's Musamman Burj tower — this is where Shah Jahan was imprisoned by Aurangzeb for 8 years, staring at the Taj he couldn't visit.",
                    "places": [
                        {"name": "Agra Fort", "time": "8:30 AM", "duration": "3 hours", "type": "UNESCO Mughal Fort",
                         "tip": "In the Musamman Burj, look through the marble screen toward the Taj. This was Shah Jahan's prison window for 8 years. He died here in 1666, still looking at her tomb."},
                        {"name": "Itimad-ud-Daula ('Baby Taj')", "time": "12:30 PM", "duration": "2 hours", "type": "Hidden Gem Mausoleum",
                         "tip": "This is the first Mughal monument to use pietra dura inlay (semi-precious stones in white marble) — the technique later perfected at the Taj. You can get inches from the carving here."},
                        {"name": "Fatehpur Sikri", "time": "3:30 PM", "duration": "3 hours", "type": "UNESCO Abandoned Imperial City",
                         "tip": "Walk to the back of the complex, past the crowds, to find the empty private quarters of Akbar's wives. Three palaces for three wives — Hindu, Muslim, Christian — all built in their own architectural style."},
                    ],
                    "food": [
                        "8:00 AM Breakfast: Jalebi with rabri at Mama Chicken's side stall (they serve breakfast too) near the fort",
                        "1:30 PM Lunch: Dalmoth (famous Agra lentil snack) with chai at any market stall near Agra Fort",
                        "Evening at Fatehpur: Coconut and lime water at the stalls outside Buland Darwaza gate",
                        "8:00 PM Dinner: Only Restaurant, Taj Ganj — the oldest established restaurant near the Taj, try the Akbari gosht",
                    ],
                },
            ],
            "cultural_notes": "The Taj Mahal is a mausoleum — maintain quiet dignity inside the inner chamber. No food inside the complex. Photography inside the burial chamber is prohibited. Agra Fort's Jahangiri Mahal is often closed — ask the guide at the entrance. Fatehpur Sikri's Dargah has the most powerful atmosphere — cover your head and sit for 15 minutes.",
        },

        "varanasi": {
            "overview": "Varanasi is the oldest continuously inhabited city in the world — 3,500 years of unbroken life on the banks of the Ganga. It is simultaneously the holiest city in Hinduism, a centre of classical music and silk weaving, and a place where life and death happen in public in ways that exist nowhere else on Earth.",
            "best_season": "November to March. Dev Deepawali (November) — the entire city lit with a million lamps on the ghats.",
            "budget_estimate": "₹2,500–7,000 per person per day",
            "hidden_gems": [
                "Scindia Ghat — the partially submerged Shiva temple, leaning at 45 degrees into the river",
                "Nepali Mandir (Lalita Ghat) — built by Nepal's king in 1800, erotic carvings rival Khajuraho, almost no visitors",
                "Banaras Hindu University (BHU) Art Museum — extraordinary collection of Rajput and Mughal miniatures, free entry",
                "Ramnagar Fort (across river, 14 km) — Maharaja's palace, working museum of vintage cars, palanquins, and astronomical instruments",
                "Chunar Fort (45 km) — Mughal-era hilltop fortress above the Ganga, virtually unvisited",
            ],
            "packing_tips": [
                "Book a boat for pre-dawn sunrise on the river — start at 5 AM before the morning Ganga Arti",
                "The lanes behind the ghats are a labyrinth — hire a ghat guide (₹200–300) for your first morning",
                "Silk saree shopping: Badshah Silk at Vishwanath Gali — fixed price, no pressure, genuine handloom",
            ],
            "days": [
                {
                    "day": 1, "title": "Dawn on the Ganga",
                    "weather": "Misty in winter, clear in spring", "temp": "15–22°C (winter) / 25–32°C (spring)",
                    "travel_tip": "The sunrise boat ride is not optional — it is Varanasi. Book a private rowboat (not motor) for ₹400–600 for 2 hours.",
                    "places": [
                        {"name": "Assi Ghat — Sunrise Boat Ride", "time": "5:30 AM", "duration": "2 hours", "type": "Sacred River Heritage",
                         "tip": "Row north slowly past all 84 ghats. The burning ghat (Manikarnika) is in the middle — you will see cremations in full view from the river. This has happened every hour for 3,500 years."},
                        {"name": "Kashi Vishwanath Temple Lane", "time": "8:00 AM", "duration": "2 hours", "type": "Holiest Hindu Temple",
                         "tip": "The temple itself has security queues. But the lane leading to it — Vishwanath Gali — is where 400 years of silk merchants, sweet shops, and temple flower sellers exist unchanged."},
                        {"name": "Manikarnika Ghat (Burning Ghat)", "time": "4:00 PM", "duration": "1 hour", "type": "Living Sacred Ritual",
                         "tip": "Sit at the edges quietly. Do not photograph. The Dom community has managed cremations here for 3,000 years. The fire never goes out — lit from a flame kept burning since the time of Shiva."},
                        {"name": "Dashashwamedh Ghat — Evening Ganga Arti", "time": "6:30 PM", "duration": "1.5 hours", "type": "Living Ritual",
                         "tip": "Arrive 45 minutes early for a front-row seat on the ghat steps. Six priests perform a synchronized fire ritual — one of the most extraordinary spectacles in India, every single evening."},
                    ],
                    "food": [
                        "Pre-sunrise: Chai from any chai stall at Assi Ghat — the boatmen get their morning tea here",
                        "9:30 AM Breakfast: Kachori-sabzi at Deena Chat Bhandar, Godaulia — oldest breakfast stall in Varanasi",
                        "1:30 PM Lunch: Thandai (milk drink with bhang — legal here) and baati chokha at the stall on Panchganga Ghat",
                        "Post-Arti Dinner: Malaiyo (winter only — a milk foam dessert that exists only in Varanasi, October-February)",
                    ],
                },
                {
                    "day": 2, "title": "The Hidden City Behind the Ghats",
                    "weather": "Sunny", "temp": "16–24°C",
                    "travel_tip": "The ghats are only half the story — the dense city behind them, the 'antarvasini' (inner city), is 1,000 years of continuous street life uninterrupted by time.",
                    "places": [
                        {"name": "Nepali Mandir (Lalita Ghat)", "time": "8:00 AM", "duration": "1 hour", "type": "Hidden Heritage Temple",
                         "tip": "Built by Nepal's King Rana Bahadur Shah in 1800 with Newari craftsmen. The erotic carvings on the exterior rival Khajuraho. Almost no tourists visit."},
                        {"name": "Weaving Workshop, Banarasi Silk", "time": "10:00 AM", "duration": "2 hours", "type": "Living Craft Heritage",
                         "tip": "The old weavers' quarter in Madanpura — families have been weaving brocade silk here for 500 years. Watch the Jacquard loom produce 2 inches per hour."},
                        {"name": "Sarnath (10 km)", "time": "1:30 PM", "duration": "3 hours", "type": "UNESCO Buddhist Heritage",
                         "tip": "The Dhamek Stupa marks where the Buddha gave his first sermon in 528 BCE. The Sarnath Museum has the original Ashoka Lion Capital — the one now on India's flag."},
                        {"name": "Ramnagar Fort (sunset)", "time": "5:30 PM", "duration": "2 hours", "type": "Hidden Royal Heritage",
                         "tip": "The royal family still lives here. The museum's vintage cars include a 1924 Rolls-Royce. The Maharaja's astronomical instruments from the 18th century are fully functional."},
                    ],
                    "food": [
                        "8:00 AM: Jalebi soaked in malai (fresh cream) at Ram Bhandar, near Godaulia crossing",
                        "12:30 PM Lunch: Tamatar chaat (tomato street food) at Kashi Chat Bhandar — a Varanasi exclusive",
                        "At Sarnath: Simple dal-rice at the Buddhist monastery guesthouse near the stupa",
                        "Evening: Lassi at Blue Lassi shop near Vishwanath Gali — open since 1925, 70 varieties",
                    ],
                },
            ],
            "cultural_notes": "Varanasi operates on Hindu sacred time, not tourist time — morning rituals begin at 4 AM, cremations at Manikarnika never stop. Dress modestly everywhere — shorts and sleeveless are offensive in the ghat area. No photography of cremations, ever, under any circumstances. The city respects genuine seekers; behave with reverence and you will be welcomed everywhere.",
        },

        "delhi": {
            "overview": "Delhi is not one city — it is eight cities layered on top of each other, each built by a different empire on the ruins of the last. The Lodi Dynasty, the Mughals, the Sultanates, and the British all built here, and all of it still exists: Mughal tombs in the middle of parks, Sultanate mosques in car parks, a 2,000-year-old iron pillar that has never rusted.",
            "best_season": "October to March. Diwali in October/November transforms the city.",
            "budget_estimate": "₹3,000–12,000 per person per day",
            "hidden_gems": [
                "Hauz Khas Village complex — 13th-century madrasa and tomb, now surrounded by art galleries and cafés",
                "Mehrauli Archaeological Park (2 km from Qutb Minar) — 100+ medieval monuments in a jungle park, almost no visitors",
                "Agrasen ki Baoli stepwell (Connaught Place) — perfectly preserved 14th-century stepwell in the middle of modern Delhi",
                "Jamali-Kamali Mosque (Mehrauli) — psychedelically painted Mughal mosque, completely unknown",
                "Nizamuddin Dargah qawwali — Thursday evening Sufi music, free, extraordinary, 700 years old",
            ],
            "packing_tips": [
                "Metro is your best friend — saves hours in traffic. Get a tourist card at the airport",
                "Old Delhi requires walking — no rickshaw can navigate Chandni Chowk's narrowest lanes",
                "Nizamuddin Thursday qawwali: arrive at 9 PM, cover your head, expect to stay 2+ hours",
            ],
            "days": [
                {
                    "day": 1, "title": "Mughal Delhi — Red Fort to Qutb",
                    "weather": "Clear, dry in winter", "temp": "12–22°C (winter) / 28–38°C (summer)",
                    "travel_tip": "Start at Red Fort at 9 AM — by 11 AM the tour groups arrive and the experience changes.",
                    "places": [
                        {"name": "Red Fort (Lal Qila)", "time": "9:00 AM", "duration": "2.5 hours", "type": "UNESCO Mughal Fort",
                         "tip": "The sound and light show is an afterthought. What isn't: the Diwan-i-Am (public audience hall) and the Rang Mahal's central stream — Shah Jahan diverted a canal through the palace to create the Stream of Paradise."},
                        {"name": "Chandni Chowk Old City Walk", "time": "12:00 PM", "duration": "2 hours", "type": "Living Mughal Heritage",
                         "tip": "Turn left off the main road into Kinari Bazaar — one lane, 400 years old, unchanged. Every shop sells only wedding accessories. It has always done so."},
                        {"name": "Qutb Minar Complex", "time": "3:30 PM", "duration": "2 hours", "type": "UNESCO — Delhi's Oldest Monument",
                         "tip": "The Iron Pillar in the courtyard was made in 375 CE and has never rusted — metallurgists still cannot fully explain why. Touch it if you can reach."},
                        {"name": "Mehrauli Archaeological Park (adjacent)", "time": "5:30 PM", "duration": "1 hour", "type": "Hidden Heritage Jungle",
                         "tip": "Walk 500m from Qutb's back exit into a jungle park with 100+ medieval monuments. You will be completely alone among 13th-century tombs."},
                    ],
                    "food": [
                        "9:00 AM Breakfast: Paranthe Wali Gali (Parathe Lane) off Chandni Chowk — 12 varieties of stuffed bread since 1875",
                        "1:30 PM Lunch: Mutton korma at Karim's Hotel, behind Jama Masjid — open since 1913, Mughal royal recipe",
                        "Evening: Dahi bhalla and chaat at Natraj Dahi Bhalle Wala, Chandni Chowk — been here since 1940",
                        "Dinner: Nihari (overnight-slow-cooked mutton) at Al-Jawahar near Jama Masjid — the most Mughal food in Delhi",
                    ],
                },
                {
                    "day": 2, "title": "Sultanate Delhi & Sufi Night",
                    "weather": "Sunny, dry", "temp": "13–23°C",
                    "travel_tip": "Plan Thursday evening at Nizamuddin Dargah — the weekly qawwali starts at 9 PM and is one of the most extraordinary experiences in India.",
                    "places": [
                        {"name": "Humayun's Tomb", "time": "9:00 AM", "duration": "2 hours", "type": "UNESCO — Precursor to the Taj Mahal",
                         "tip": "This is the first garden tomb in India — it directly inspired the Taj Mahal. Stand at the main entrance gate and look at the framing — exactly the same composition as the Taj, 100 years earlier."},
                        {"name": "Agrasen ki Baoli (Stepwell)", "time": "12:00 PM", "duration": "1 hour", "type": "Hidden Heritage Stepwell",
                         "tip": "A 108-step stepwell in the middle of Connaught Place's business district. 14th century. Completely free. Almost never crowded. Extraordinary architecture."},
                        {"name": "Lodi Garden Tombs", "time": "2:00 PM", "duration": "1.5 hours", "type": "Sultanate Heritage Park",
                         "tip": "Five 15th-century Sultanate tombs in a public park — people jog past them daily. The Bara Gumbad mosque has plaster work as fine as anything in Persia."},
                        {"name": "Nizamuddin Dargah — Thursday Qawwali", "time": "8:30 PM", "duration": "2+ hours", "type": "Living Sufi Heritage",
                         "tip": "The qawwali singers are hereditary performers — their families have sung here for 700 years. Arrive at 9 PM, cover your head, sit on the floor. You may not want to leave."},
                    ],
                    "food": [
                        "9:00 AM Breakfast: Kulcha with chole at Sita Ram Diwan Chand, Paharganj — Delhi's most famous breakfast stall",
                        "1:30 PM Lunch: Butter chicken at Moti Mahal, Daryaganj — this is where butter chicken was invented in 1947",
                        "Pre-dargah: Biryani at Al Kausar Restaurant near Nizamuddin dargah — 100m from the entrance",
                    ],
                },
            ],
            "cultural_notes": "Delhi's monuments span 1,000 years and four religious traditions — dress modestly at all mosques and dargahs (cover head, remove shoes). Chandni Chowk is best explored on foot and early — by 11 AM it becomes impassable. The Qutb Minar complex closes at sunset. Nizamuddin dargah: no photography during qawwali — it is a sacred ceremony, not a performance.",
        },

        "mysore": {
            "overview": "Mysore — the City of Palaces — is one of India's most liveable and most beautiful heritage cities. The Wadiyar royal dynasty left behind palaces, gardens, and a tradition of classical music and art that continues today. The Mysore Dasara festival (October) is India's most spectacular royal pageant.",
            "best_season": "October for Dasara festival. November to February for pleasant weather.",
            "budget_estimate": "₹2,500–7,000 per person per day",
            "hidden_gems": [
                "Srirangapatna (16 km) — Tipu Sultan's island fortress capital, extraordinary fortifications, almost no tour groups",
                "Chamundi Hills (13 km) — 1,000-step climb past a 5-metre Nandi bull to the hilltop goddess temple",
                "Lalitha Mahal Palace Hotel — Viceroy's guest house turned luxury hotel, afternoon tea in the original dining room",
                "Brindavan Gardens, Krishnarajasagara (19 km) — Mughal-style terraced gardens lit at sunset with musical fountains",
                "Government Silk Weaving Factory (Mananthody Road) — watch Mysore silk being woven on 50-year-old looms, free tour",
            ],
            "packing_tips": [
                "Mysore Dasara: book accommodation 3 months in advance — city fills completely",
                "Mysore Palace illumination: every Sunday and public holiday, 10,000 bulbs switched on 7-8 PM",
                "Mysore sandal soap and incense: buy directly from Karnataka Soaps & Detergents near the palace",
            ],
            "days": [
                {
                    "day": 1, "title": "The Palace City",
                    "weather": "Sunny, mild", "temp": "22–30°C",
                    "travel_tip": "The Mysore Palace is best at 10 AM on a weekday — after noon the tour groups arrive in force.",
                    "places": [
                        {"name": "Mysore Palace (Amba Vilas)", "time": "10:00 AM", "duration": "2.5 hours", "type": "Royal Heritage Palace",
                         "tip": "The Kalyana Mantapa (marriage hall) ceiling — a stained-glass dome of extraordinary beauty. And the golden howdah (elephant throne) — 84 kg of pure gold, only used during Dasara."},
                        {"name": "Devaraja Market", "time": "1:00 PM", "duration": "1.5 hours", "type": "Living Heritage Market",
                         "tip": "The oldest market in Mysore, 200 years unchanged. The flower section sells jasmines in garlands measured by the metre — Mysore jasmine is sold across India."},
                        {"name": "Chamundi Hills & Nandi Bull", "time": "4:00 PM", "duration": "2 hours", "type": "Sacred Heritage",
                         "tip": "The Nandi (Shiva's bull) at the 700th step is carved from a single granite boulder — 4.9 metres tall, 7.5 metres long. It has been here since 1659 and is magnificent."},
                    ],
                    "food": [
                        "9:30 AM Breakfast: Mysore masala dosa at Hotel Dasaprakash — the restaurant that made it famous",
                        "1:30 PM Lunch: Thali at Hotel RRR, Gandhi Square — Karnataka meals with 15 dishes on banana leaf",
                        "Evening: Mysore pak (invented here in 1935) at Guru Sweet Mart near Devaraja Market — the original recipe",
                        "8:00 PM Dinner: Mutton sukka at Mylari Hotel, Nazarbad — the most famous non-veg restaurant in Mysore",
                    ],
                },
            ],
            "cultural_notes": "Mysore remains a royal city in spirit — the Wadiyar family is deeply respected. The palace is a place of worship (the private Chamundeshwari shrine inside is active) — dress modestly. Dasara festival has strict processional route rules — obey security instructions. Photography of the golden howdah is strictly regulated.",
        },

        "khajuraho": {
            "overview": "Between 950 and 1050 CE, the Chandela kings built 85 temples in a single century. Only 25 survive. What makes Khajuraho extraordinary is not what most tourists come for — the erotic sculptures cover only 10% of the exterior. The remaining 90% is some of the finest devotional stone carving in history, and a profound statement about the wholeness of human experience.",
            "best_season": "October to March. February: Khajuraho Dance Festival — classical dancers perform in the ancient temple complex.",
            "budget_estimate": "₹2,000–5,000 per person per day",
            "hidden_gems": [
                "Panna National Park (25 km) — tigers, wild dogs, and the Ken River gorge — less crowded than Ranthambore",
                "Raneh Falls (20 km) — canyon of crystalline rock formations in multiple colors, virtually unknown outside MP",
                "Eastern Group temples (free entry, 2 km from main complex) — Jain temples of equal quality, almost no tourists",
                "Duladeo Temple (south group) — finest late-Chandela carving, smaller, usually empty, better photography",
                "Vindhyachal village (200 km) — ancient Vindhyavasini temple on the Ganga, one of the most powerful Shakti sites",
            ],
            "packing_tips": [
                "Western Group: buy a combined ticket (₹600 foreigners) for all three groups",
                "Hire an ASI-approved guide for the Western Group — they explain the theological programme, not just the carvings",
                "Sound and Light Show at dusk (₹250) — the ruins become extraordinary in floodlight",
            ],
            "days": [
                {
                    "day": 1, "title": "Chandela Masterworks at Sunrise",
                    "weather": "Clear, dry", "temp": "18–28°C (winter)",
                    "travel_tip": "The Western Group temples open at sunrise — the carved apsara figures in morning light are extraordinary. You may be alone for the first hour.",
                    "places": [
                        {"name": "Lakshmana Temple (Western Group)", "time": "6:30 AM", "duration": "2 hours", "type": "UNESCO Heritage",
                         "tip": "Look at the apsara carvings — each is different: one removes a thorn from her foot, another applies kajal, one plays a flute. These are portraits of real Chandela court women, immortalised in stone."},
                        {"name": "Kandariya Mahadeva Temple", "time": "9:00 AM", "duration": "2 hours", "type": "UNESCO — Tallest Khajuraho Temple",
                         "tip": "The erotic panels cover only the banda (waistband) of the temple exterior. Below and above: devotional, military, celestial imagery. The theology of kama (desire) placed precisely in its cosmic context."},
                        {"name": "Eastern Group — Jain Temples", "time": "2:00 PM", "duration": "2 hours", "type": "Free Heritage Site",
                         "tip": "The Parsvanath Temple has the finest carvings in Khajuraho — many argue finer than the Western Group. You will be almost completely alone. Free entry."},
                        {"name": "Sound & Light Show", "time": "7:00 PM", "duration": "1 hour", "type": "Heritage Experience",
                         "tip": "The English show has better narration. Arrive 20 minutes early for a centre-row seat. The floodlit ruins against the night sky are unlike anywhere else.",},
                    ],
                    "food": [
                        "Breakfast: Continental or Indian at Hotel Harmony — the rooftop has a view of the Western Group",
                        "1:30 PM Lunch: Dal bafla at Raja Café — a Madhya Pradesh specialty (baked wheat balls in dal) that exists nowhere else",
                        "Evening: Bhutte ka kees (corn street food) at the market stalls — MP's favourite evening snack",
                    ],
                },
            ],
            "cultural_notes": "The erotic carvings are theology, not pornography — they represent kama as one of the four purusharthas (goals of human life), placed on the exterior so you leave desire behind when entering the sacred space. Guide the conversation with curiosity rather than embarrassment. The temples are active places of worship — remove footwear, dress modestly, and treat the carved figures with the reverence they were intended to receive.",
        },

        "rajasthan": {
            "overview": "Rajasthan is India's desert soul — a land of sandstone forts, blue cities, painted havelis, and camel traders that exists on a scale unlike any other Indian state. The Great Thar Desert, the Aravalli mountain forts, and the living culture of the Rajput and Marwari communities make this India's most visually dramatic travel destination.",
            "best_season": "October to March. Pushkar Camel Fair (November) and Jaisalmer Desert Festival (February).",
            "budget_estimate": "₹3,500–12,000 per person per day",
            "hidden_gems": [
                "Bundi (200 km from Jaipur) — a forgotten blue city with step wells, palace murals, and almost no tourists",
                "Osian (65 km from Jodhpur) — 15th-century Jain temples in the desert, camel trek from here to dunes",
                "Luni riverbed villages (40 km from Jodhpur) — traditional Bishnoi communities, wildlife-rich desert landscape",
                "Chand Baori, Abhaneri — the world's most perfect stepwell, 13 stories deep",
                "Kumbhalgarh Fort (84 km from Udaipur) — the world's second-longest wall after the Great Wall of China, almost unvisited",
            ],
            "packing_tips": [
                "Cotton only in summer (April-June can reach 48°C in Jaisalmer)",
                "For fort climbs: early morning only, before 10 AM in winter, before 8 AM in summer",
                "Carry cash — ATMs are unreliable in smaller Rajasthani towns",
            ],
            "days": [
                {
                    "day": 1, "title": "Jodhpur — The Blue City",
                    "weather": "Dry, sunny", "temp": "20–32°C",
                    "travel_tip": "Climb to the rooftop of any blue house in the old city before sunrise — the entire city turns gold as dawn breaks over Mehrangarh Fort.",
                    "places": [
                        {"name": "Mehrangarh Fort", "time": "9:00 AM", "duration": "3 hours", "type": "Royal Rajput Fort",
                         "tip": "Find the handprints near the main gate — queens who committed sati (self-immolation) when the Maharaja died. The last one is from 1843. The handprints are at child height."},
                        {"name": "Old City Lanes (Navchokia area)", "time": "1:00 PM", "duration": "2 hours", "type": "Living Heritage",
                         "tip": "The indigo-blue paint is not decorative — it was originally used by Brahmin families to mark their houses. Today, the entire old city is blue. The colour is actually cooling."},
                        {"name": "Jaswant Thada", "time": "4:00 PM", "duration": "1 hour", "type": "Heritage Cenotaph",
                         "tip": "White marble cenotaph of Maharaja Jaswant Singh II, built 1899. The marble is so thin it is translucent — glows orange-pink at sunset."},
                    ],
                    "food": [
                        "Breakfast: Mirchi bada (massive chilli fritter) at Janta Sweet Home, opposite the clock tower — Jodhpur's most famous breakfast",
                        "Lunch: Panchkuta (five-desert-vegetable dish) at Gypsy Restaurant, old city",
                        "Dinner: Laal maas (fiery red mutton) at Kalinga Restaurant — order it properly spiced",
                    ],
                },
            ],
            "cultural_notes": "Rajasthan is deeply religious — most forts have active temples inside. Dress modestly at all times. The Bishnoi villages near Jodhpur are sacred communities who protect wildlife with their lives — visit with deep respect. Photography of local women requires explicit permission — Rajasthani women are deeply private.",
        },
    }

    # ── Match destination to template ────────────────────────────────
    dest_lower = destination.lower()

    matched_template = None
    for key, tmpl in RICH_TEMPLATES.items():
        if key in dest_lower or dest_lower in key:
            matched_template = tmpl
            break

    # Secondary keyword matching
    if not matched_template:
        secondary_keywords = {
            "agra": "agra", "taj": "agra",
            "jaipur": "jaipur", "pink city": "jaipur", "amer": "jaipur",
            "varanasi": "varanasi", "benares": "varanasi", "kashi": "varanasi",
            "delhi": "delhi", "new delhi": "delhi", "old delhi": "delhi",
            "hampi": "hampi", "vijayanagara": "hampi", "hospet": "hampi",
            "thanjavur": "thanjavur", "tanjore": "thanjavur",
            "mysore": "mysore", "mysuru": "mysore",
            "khajuraho": "khajuraho",
            "rajasthan": "rajasthan", "jodhpur": "rajasthan", "jaisalmer": "rajasthan",
            "udaipur": "rajasthan", "pushkar": "rajasthan",
        }
        for keyword, template_key in secondary_keywords.items():
            if keyword in dest_lower:
                matched_template = RICH_TEMPLATES.get(template_key)
                break

    if matched_template:
        plan = {"destination": destination, "duration": days, **matched_template}
        # Extend days if more requested
        base_days = len(plan["days"])
        while len(plan["days"]) < days:
            d = len(plan["days"]) + 1
            plan["days"].append({
                "day": d, "title": f"Day {d} — Extended Cultural Exploration",
                "weather": plan["days"][0].get("weather", "Sunny"),
                "temp": plan["days"][0].get("temp", "25–32°C"),
                "travel_tip": "Slow down today — revisit a favourite place at a different time of day, or explore on foot without a plan",
                "places": [
                    {"name": f"Hidden lanes and local life, {destination}", "time": "7:00 AM", "duration": "3 hours",
                     "type": "Hidden Heritage", "tip": "Ask your guesthouse host for their personal recommendation — locals always know something not in any guidebook."},
                    {"name": "Local market or weekly haat", "time": "11:00 AM", "duration": "2 hours",
                     "type": "Living Culture", "tip": "The weekly market (haat) is where the real local life happens — find out which day and go."},
                ],
                "food": ["Local breakfast at the nearest busy stall", "Thali lunch wherever locals eat", "Street food at the evening market"],
            })
        return {"success": True, "itinerary": plan}

    # ── Generic plan for any unrecognised city ────────────────────────
    return {
        "success": True,
        "itinerary": {
            "destination":     destination,
            "duration":        days,
            "overview": (
                f"{destination} holds centuries of living heritage — temples, forts, bazaars, and local craft traditions "
                f"that most travelers walk past without noticing. This {days}-day plan focuses on depth over speed: "
                f"fewer places, more time, genuine encounters. "
                f"For a fully AI-personalised itinerary with real insider knowledge, add GROQ_API_KEY to backend/.env — free at console.groq.com."
            ),
            "best_season":     "October to March (pleasant weather, festival season across India)",
            "budget_estimate": "₹2,500–6,000 per person per day",
            "days": [
                {
                    "day": i + 1,
                    "title": f"Day {i+1} — {['Heritage & History', 'Hidden Corners', 'Local Life & Food', 'Day Trips', 'Slow Exploration', 'Cultural Depth', 'Living Traditions'][i % 7]}",
                    "weather": "Pleasant", "temp": "25–32°C",
                    "travel_tip": [
                        "Arrive at any heritage site before 9 AM — the first hour belongs to you, not the tour groups",
                        "Ask your auto-rickshaw driver where he eats lunch — that restaurant will be the best value in the city",
                        "Walk rather than take transport in the old city — every lane reveals something",
                        "Hire a local guide for one day only — their knowledge pays for itself immediately",
                        "Visit the main site in the evening — different light, fewer crowds, more life",
                        "Find the nearest weekly market (haat) and spend a morning there",
                        "End the day at a ghat, hilltop, or rooftop — watch the city at dusk",
                    ][i % 7],
                    "places": [
                        {"name": f"Main heritage monument, {destination}", "time": "7:00 AM",
                         "duration": "3 hours", "type": "Heritage",
                         "tip": "Talk to the oldest person working at the site — the watchmen and priests hold oral histories that no guidebook has."},
                        {"name": "Local museum or archaeological collection", "time": "11:00 AM",
                         "duration": "1.5 hours", "type": "Museum",
                         "tip": "The objects here explain the context that the monuments themselves cannot. The sculpture gallery usually has pieces finer than what's in situ."},
                        {"name": "Old city bazaar and lanes", "time": "4:00 PM",
                         "duration": "2 hours", "type": "Living Heritage",
                         "tip": "The lane behind the main market is always older and more interesting than the market itself. Ask a shopkeeper which way the old town is."},
                    ],
                    "food": [
                        f"Breakfast: Any busy roadside stall — the queue indicates quality, always",
                        f"Lunch: Ask a local — never eat at a restaurant with photographs of food outside",
                        f"Evening: Street food at the main bazaar area after 6 PM — when the locals arrive",
                    ],
                }
                for i in range(days)
            ],
            "cultural_notes": (
                "India's heritage sites are living places — temples are places of worship, not museums. "
                "Dress modestly (covered shoulders and knees everywhere), remove footwear when entering temples, "
                "and observe the behaviour of local devotees as your guide. "
                "Photography rules vary site by site — always ask before pointing a camera inside a sanctum."
            ),
            "hidden_gems": [
                f"Ask your accommodation host about lesser-known sites near {destination} — they always know something extraordinary",
                "Find the nearest stepwell (baoli) — most Indian cities have one and almost nobody visits them",
                "Attend the nearest Sufi dargah on a Thursday evening — qawwali music is a living 700-year-old tradition",
                "Explore the city at 5 AM — the street life before tourists wake up is the real city",
                "Find the nearest village haat (weekly market) — a window into rural India that hasn't changed in centuries",
            ],
            "packing_tips": [
                "Carry cotton clothes for temple visits — most sites require shoulders and knees covered",
                "Cash is essential — many small heritage sites, local restaurants, and craft workshops are cash-only",
                "Download Google Maps offline before you go — rural heritage sites may have no mobile signal",
            ],
        },
    }
