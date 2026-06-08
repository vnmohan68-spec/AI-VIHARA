import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Utensils, Music, Palette, Shirt, BookOpen, ChevronDown, MessageSquare } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageHero from '../components/layout/PageHero';
import { GoldDivider } from '../components/ui/GoldDivider';

const GUIDES = [
  {
    icon: Heart, title: 'Temple Etiquette', color: '#C9A96E',
    summary: 'Footwear, dress codes, restricted areas, puja behaviour, and photography rules.',
    details: [
      'Remove footwear before entering any temple sanctum — always, without exception.',
      'Cover shoulders and knees. Avoid shorts and sleeveless tops at religious sites.',
      'Women may be restricted from certain sanctums during specific festivals.',
      'Refrain from touching idols or sacred objects unless explicitly invited to.',
      'Photography rules vary widely — always check signage at the entrance.',
      'Silence or hushed voices near the main sanctum. Mobile on silent mode.',
      'Walk clockwise (pradakshina) around the main shrine — it\'s both respectful and auspicious.',
      'Accept prasad with your right hand, even if you don\'t intend to eat it.',
    ],
  },
  {
    icon: Utensils, title: 'Food Culture', color: '#9BC38B',
    summary: 'Hand-eating traditions, banana leaf meals, fasting customs, and regional food etiquette.',
    details: [
      'Eat with your right hand — the left is considered impure across most of India.',
      'Banana leaf meals are served left to right: rice, vegetables, sambar, rasam, dessert.',
      'Accept prasad (temple food offering) graciously, even if you don\'t eat it.',
      'Fasting on Mondays (Shiva devotees) and Tuesdays/Fridays (Goddess devotees) is common.',
      'Vegetarianism is widespread near temples and in many Brahmin communities.',
      'Sharing your plate is a sign of deep trust — declining can cause unintended offence.',
      'Wasting food, especially at a meal hosted by someone, is considered deeply disrespectful.',
    ],
  },
  {
    icon: Music, title: 'Festivals & Timing', color: '#8B9DC3',
    summary: 'Major festivals by month, how to participate respectfully, and the best regions for each.',
    details: [
      'Pongal (Jan, Tamil Nadu): four-day harvest festival. Village kolam patterns and cattle races.',
      'Holi (Feb–Mar, North India): wear old white clothes. Non-participants appreciated at the edges.',
      'Navratri (Sep–Oct): nine nights of the Goddess. Garba in Gujarat is a highlight.',
      'Diwali (Oct–Nov): witness it on the ghats of Varanasi for a once-in-a-lifetime experience.',
      'Kumbh Mela (every 3 years): world\'s largest gathering. Spiritually profound; plan carefully.',
      'Always ask before photographing rituals — some moments are too sacred for a camera.',
    ],
  },
  {
    icon: Palette, title: 'Art & Craft Traditions', color: '#C3978B',
    summary: 'Regional crafts, identifying authentic works, and where to buy directly from artisans.',
    details: [
      'Tanjore painting (Tamil Nadu): gold-foil embedded devotional art. Originals take 3–4 months.',
      'Madhubani (Bihar): natural dye paintings of mythology. Buy from village cooperatives directly.',
      'Bidriware (Telangana): zinc-alloy with silver inlay. GI-tagged — beware of cheap imitations.',
      'Channapatna toys (Karnataka): lacquered wooden toys. UNESCO-recognised craft cluster.',
      'Kanjivaram silk (Tamil Nadu): real silk burns to ash without smell — the classic test.',
      'Ask for the artisan\'s name. A signed piece supports the maker and is usually more valuable.',
    ],
  },
  {
    icon: Shirt, title: 'Dress & Customs', color: '#C3BB8B',
    summary: 'Colour symbolism, appropriate dress for occasions, and reading traditional attire.',
    details: [
      'White is the colour of mourning across most of India — avoid all-white outfits at weddings.',
      'Red is auspicious for married women. Widows traditionally avoid red in many communities.',
      'Sindoor (vermillion) in a woman\'s hair parting indicates she is married.',
      'The bindi has deep religious and cultural significance — it is not merely decorative.',
      'Turbans in Punjab signal honour and community pride. Never mock or touch them.',
      'Remove hats or caps inside all places of worship as a sign of respect.',
      'Dressing modestly when visiting rural areas is noticed and genuinely appreciated.',
    ],
  },
  {
    icon: BookOpen, title: 'Language Essentials', color: '#A08BC3',
    summary: 'Key phrases across major Indian languages that locals will warmly appreciate.',
    details: [
      'Namaste (Hindi / universal): "I respect the divine in you." Hands folded, slight bow.',
      'Vanakkam (Tamil): use it in Tamil Nadu and watch faces genuinely light up.',
      'Namaskaara (Kannada / Telugu): respectful greeting across the Deccan region.',
      'Dhanyavaad (Hindi) / Nandri (Tamil) / Dhanyavadalu (Telugu): sincere thanks.',
      'Maafi kijiye (Hindi): "I\'m sorry / excuse me." Disarmingly effective in any situation.',
      'Kitna hai? (Hindi): "How much is it?" — essential for any market or auto negotiation.',
      'Shubh yatra (Hindi): "Safe travels." Say it when parting — it always lands well.',
    ],
  },
];

export default function CulturePage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <PageWrapper>
      <PageHero
        label="Cultural Intelligence"
        title={<>Travel with <em className="not-italic gold-gradient">Awareness</em></>}
        sub="Deep cultural context that helps you connect authentically — not just observe. Tap any card to expand."
        video="/videos/temple.mp4"
        theme="gold"
      />
      <div className="min-h-screen px-4 md:px-10 pb-12 pt-6">
        <div className="max-w-5xl mx-auto">

          <div className="grid sm:grid-cols-2 gap-4">
            {GUIDES.map((g, i) => {
              const open = expanded === g.title;
              return (
                <motion.div key={g.title}
                  initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="glass overflow-hidden cursor-pointer"
                  style={open ? { borderColor: `${g.color}22` } : {}}
                  onClick={() => setExpanded(open ? null : g.title)}
                >
                  {/* Header */}
                  <div className="p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${g.color}12`, border: `1px solid ${g.color}25` }}>
                      <g.icon size={17} style={{ color: g.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 font-medium text-sm mb-1">{g.title}</p>
                      <p className="text-white/35 text-[12px] leading-relaxed">{g.summary}</p>
                    </div>
                    <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.22 }} className="shrink-0 mt-0.5">
                      <ChevronDown size={14} className="text-white/22" />
                    </motion.div>
                  </div>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="px-5 pb-5">
                          <div className="h-px mb-4" style={{ background: `linear-gradient(90deg, transparent, ${g.color}18, transparent)` }} />
                          <div className="space-y-2.5">
                            {g.details.map((d, di) => (
                              <motion.div key={di}
                                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: di * 0.04 }}
                                className="flex items-start gap-2.5"
                              >
                                <div className="w-1 h-1 rounded-full shrink-0 mt-1.5"
                                  style={{ background: g.color, opacity: 0.55 }} />
                                <p className="text-[12px] text-white/52 leading-relaxed">{d}</p>
                              </motion.div>
                            ))}
                          </div>
                          {/* Ask AI for deeper context */}
                          <div className="mt-4 pt-3 border-t border-white/6">
                            <Link
                              to="/chat"
                              state={{ initialMessage: `Tell me more about ${g.title} in India — give me practical advice and deeper cultural context for a traveler visiting India` }}
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl glass border border-white/10 hover:border-white/22 transition-all"
                              style={{ color: g.color + 'cc' }}
                            >
                              <MessageSquare size={11} /> Ask AI for deeper context
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Closing note */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.15 }}
            className="mt-8 glass-gold p-6 rounded-2xl"
          >
            <p className="label-text mb-2">A Note from Vihara</p>
            <p className="text-white/62 text-sm leading-relaxed italic font-light">
              "India is not a country you visit — it is one you experience. The more you understand its
              cultural codes, the richer every moment becomes. A simple 'Vanakkam' in Tamil Nadu or
              folded hands at a temple gate transforms you from a tourist into a guest."
            </p>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
}
