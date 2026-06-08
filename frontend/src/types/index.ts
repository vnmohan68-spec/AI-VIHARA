export type StoryMode =
  | 'Quick Facts' | 'Deep History' | 'Story Mode'
  | 'Mythology' | "Kid's Mode" | 'Guide Mode';

export type Language =
  | 'English' | 'Hindi' | 'Telugu' | 'Tamil' | 'Bengali'
  | 'Kannada' | 'Gujarati' | 'Marathi' | 'Malayalam'
  | 'French' | 'German' | 'Spanish' | 'Japanese' | 'Chinese' | 'Arabic';

export const STORY_MODES: StoryMode[] = [
  'Guide Mode','Quick Facts','Deep History','Story Mode','Mythology',"Kid's Mode",
];
export const INDIAN_LANGUAGES: Language[] = [
  'English','Hindi','Telugu','Tamil','Bengali','Kannada','Gujarati','Marathi','Malayalam',
];
export const INTERNATIONAL_LANGUAGES: Language[] = [
  'French','German','Spanish','Japanese','Chinese','Arabic',
];
export const ALL_LANGUAGES: Language[] = [...INDIAN_LANGUAGES, ...INTERNATIONAL_LANGUAGES];

export const WHISPER_LANG_CODES: Record<Language, string> = {
  English:'en', Hindi:'hi', Telugu:'te', Tamil:'ta', Bengali:'bn',
  Kannada:'kn', Gujarati:'gu', Marathi:'mr', Malayalam:'ml',
  French:'fr', German:'de', Spanish:'es', Japanese:'ja', Chinese:'zh', Arabic:'ar',
};

export const MODE_DESCRIPTIONS: Record<StoryMode, string> = {
  'Guide Mode':  'Personal guide walking with you',
  'Quick Facts': 'Key facts in 60 seconds',
  'Deep History':'Centuries of context',
  'Story Mode':  'Cinematic narration',
  'Mythology':   'Gods, legends & lore',
  "Kid's Mode":  'Magic for young explorers',
};

// ── Cultural Access Level ────────────────────────────────────────
export type AccessLevel =
  | 'open_to_all'
  | 'hindus_only'
  | 'no_foreigners'
  | 'hindus_and_buddhists'
  | 'dress_code_strict'
  | 'gender_restricted'
  | 'caste_restricted'
  | 'advance_permit'
  | 'time_restricted'
  | 'closed_for_repairs';

export interface CulturalRule {
  access_level:   AccessLevel;
  summary:        string;
  detail:         string;
  dress_code?:    string;
  entry_process?: string;
  exceptions?:    string;
  source_note?:   string;
}

export const ACCESS_CONFIG: Record<AccessLevel, {
  label: string; color: string; bg: string; border: string; icon: string;
}> = {
  open_to_all:          { label:'Open to All',          color:'#9BC38B', bg:'bg-green-500/10',  border:'border-green-500/25',  icon:'✓'  },
  hindus_only:          { label:'Hindus Only',           color:'#E8A87C', bg:'bg-orange-500/10', border:'border-orange-500/25', icon:'🕉' },
  no_foreigners:        { label:'No Foreign Nationals',  color:'#E87C8A', bg:'bg-red-500/10',    border:'border-red-500/25',    icon:'⊘'  },
  hindus_and_buddhists: { label:'Hindus & Buddhists',    color:'#C9A96E', bg:'bg-gold/10',       border:'border-gold/25',       icon:'☸'  },
  dress_code_strict:    { label:'Strict Dress Code',     color:'#8B9DC3', bg:'bg-blue-500/10',   border:'border-blue-500/25',   icon:'👗' },
  gender_restricted:    { label:'Gender Restricted',     color:'#C3978B', bg:'bg-purple-500/10', border:'border-purple-500/25', icon:'⚡' },
  caste_restricted:     { label:'Caste Restricted',      color:'#E87C8A', bg:'bg-red-500/10',    border:'border-red-500/25',    icon:'!'  },
  advance_permit:       { label:'Permit Required',       color:'#8BC3B5', bg:'bg-teal-500/10',   border:'border-teal-500/25',   icon:'📋' },
  time_restricted:      { label:'Time Restricted',       color:'#C9A96E', bg:'bg-gold/10',       border:'border-gold/25',       icon:'⏱' },
  closed_for_repairs:   { label:'Currently Closed',      color:'#888',    bg:'bg-white/5',       border:'border-white/15',      icon:'🚧' },
};

// ── Invoice ──────────────────────────────────────────────────────
export interface InvoiceItem {
  category: 'entry'|'transport'|'food'|'guide'|'accommodation'|'misc'|'deposit';
  label:    string;
  amount:   number;
  per:      'person'|'group'|'vehicle'|'day';
  note?:    string;
}

export interface TripInvoice {
  destination:  string;
  travelers:    number;
  days:         number;
  generated_at: string;
  items_by_day: { day: number; title: string; items: InvoiceItem[] }[];
  summary: {
    per_person_per_day: number;
    total_per_person:   number;
    total_group:        number;
    budget_category:    'budget'|'mid'|'premium';
    savings_tips:       string[];
  };
}

// ── Core models ──────────────────────────────────────────────────
export interface Recognition {
  name: string; location: string; type: string; confidence: number;
  story: string; best_time: string; local_food: string[];
  hidden_facts: string[]; nearby_places: string[];
  architecture: string; mythology: string; photo_tips: string;
  guide_tip?:    string;
  image_url?:    string;
  offline_mode?: boolean;
  cultural_rule?: CulturalRule;
  deep_hidden?:   string[];
}

export interface Gem {
  id: string; name: string; state: string; region: string;
  type: string; tags: string[]; story: string; best_time: string;
  crowd_level: 'Empty'|'Sparse'|'Moderate';
  photo_spot: string; local_food: string; hidden_score: number;
  lat?: number; lng?: number;
  cultural_rule?: CulturalRule;
}

export interface ChatMessage {
  id: string; role: 'user'|'ai'; content: string;
  mode?: StoryMode; timestamp: Date; isStreaming?: boolean; isError?: boolean;
}

export interface TripDay {
  day: number; title: string; weather?: string; temp?: string;
  places: {
    name: string; time: string; duration: string; type: string; tip: string;
    significance?: number;
    cultural_rule?: CulturalRule;
    entry_cost?: string;
  }[];
  food: string[]; travel_tip?: string;
}

export interface Itinerary {
  destination: string; duration: number; overview: string;
  best_season: string; budget_estimate: string;
  days: TripDay[];
  cultural_notes?: string; hidden_gems?: string[]; packing_tips?: string[];
  invoice?: TripInvoice;
}

export const CROWD_COLORS: Record<string,string> = {
  Empty:'#9BC38B', Sparse:'#C9A96E', Moderate:'#C3978B',
};
