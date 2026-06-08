import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Search, MapPin, Clock, Camera, X, Loader, AlertCircle,
  ChevronRight, Map, Star, Utensils, Info, ChevronDown, MessageSquare
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageHero from '../components/layout/PageHero';
import { apiService } from '../services/api';
import { GoldDivider } from '../components/ui/GoldDivider';
import type { Gem } from '../types';
import { CROWD_COLORS } from '../types';

const TYPE_FILTERS = [
  'All','Waterfall','Temple','Wildlife','Tribal','Architecture',
  'UNESCO','Sacred','Fort','Cave','Canyon','Village','Heritage','Beach','Monastery',
];

// ── State → districts map — must exactly match region names in backend seed data ──
const INDIA_STATES: Record<string, string[]> = {
  'Andhra Pradesh': [
    'All Districts',
    'Nellore District',
    'Anantapur District',
    'Kadapa District',
    'Kurnool District',
    'Guntur District',
    'Krishna District',
    'Visakhapatnam District',
    'East Godavari District',
    'West Godavari District',
    'Chittoor District',
    'Srikakulam District',
  ],
  'Telangana': [
    'All Districts',
    'Warangal District',
    'Nizamabad District',
    'Yadadri Bhuvanagiri District',
    'Karimnagar District',
    'Nalgonda District',
    'Khammam District',
    'Mahbubnagar District',
    'Hyderabad District',
  ],
  'Tamil Nadu': [
    'All Districts',
    'Sivaganga District',
    'Nagapattinam District',
    'Chennai District',
    'Madurai District',
    'Coimbatore District',
    'Kancheepuram District',
    'Thanjavur District',
    'Tiruvannamalai District',
    'Salem District',
    'Nilgiris District',
    'Pudukottai District',
  ],
  'Karnataka': [
    'All Districts',
    'Vijayanagara District',
    'Chamarajanagar District',
    'Mysuru District',
    'Hassan District',
    'Chikkamagaluru District',
    'Kodagu District',
    'Mangaluru District',
    'Bidar District',
    'Vijayapura District',
    'Kolar District',
  ],
  'Maharashtra': [
    'All Districts',
    'Buldhana District',
    'Mumbai District',
    'Pune District',
    'Nashik District',
    'Aurangabad District',
    'Nagpur District',
    'Kolhapur District',
    'Satara District',
    'Raigad District',
  ],
  'Rajasthan': [
    'All Districts',
    'Bundi District',
    'Jaipur District',
    'Jodhpur District',
    'Udaipur District',
    'Jaisalmer District',
    'Ajmer District',
    'Chittorgarh District',
    'Bikaner District',
  ],
  'Gujarat': [
    'All Districts',
    'Patan District',
    'Panchmahal District',
    'Rann of Kutch',
    'Ahmedabad District',
    'Surat District',
    'Junagadh District',
    'Somnath District',
  ],
  'Madhya Pradesh': [
    'All Districts',
    'Tikamgarh District',
    'Bhopal District',
    'Indore District',
    'Ujjain District',
    'Khajuraho District',
    'Jabalpur District',
    'Gwalior District',
  ],
  'Uttar Pradesh': [
    'All Districts',
    'Agra District',
    'Varanasi District',
    'Mathura District',
    'Lucknow District',
    'Prayagraj District',
    'Ayodhya District',
  ],
  'Odisha': [
    'All Districts',
    'Puri District',
    'Bhubaneswar District',
    'Konark District',
    'Cuttack District',
    'Sambalpur District',
    'Mayurbhanj District',
  ],
  'West Bengal': [
    'All Districts',
    'Bankura District',
    'Kolkata District',
    'Darjeeling District',
    'Murshidabad District',
    'Purulia District',
  ],
  'Assam': [
    'All Districts',
    'Majuli District',
    'Kamrup District',
    'Kaziranga District',
    'Haflong District',
    'Manas District',
  ],
  'Himachal Pradesh': [
    'All Districts',
    'Lahaul and Spiti District',
    'Shimla District',
    'Kullu District',
    'Kangra District',
    'Kinnaur District',
  ],
  'Arunachal Pradesh': [
    'All Districts',
    'Tawang District',
    'Lower Subansiri District',
    'East Siang District',
    'Bomdila District',
  ],
  'Tripura': [
    'All Districts',
    'North Tripura District',
    'South Tripura District',
    'Gomati District',
    'Sipahijala District',
  ],
  'Meghalaya': [
    'All Districts',
    'East Khasi Hills District',
    'West Khasi Hills District',
    'Jaintia Hills District',
    'Ri Bhoi District',
  ],
  'Uttarakhand': [
    'All Districts',
    'Dehradun District',
    'Rishikesh District',
    'Haridwar District',
    'Chamoli District',
    'Rudraprayag District',
  ],
  'Goa': [
    'All Districts',
    'North Goa District',
    'South Goa District',
  ],
  'Kerala': [
    'All Districts',
    'Thiruvananthapuram District',
    'Ernakulam District',
    'Kozhikode District',
    'Palakkad District',
    'Wayanad District',
    'Idukki District',
    'Alappuzha District',
  ],
  'Punjab': [
    'All Districts',
    'Amritsar District',
    'Ludhiana District',
    'Patiala District',
    'Bathinda District',
    'Rupnagar District',
  ],
};

const STATE_LIST = ['All States', ...Object.keys(INDIA_STATES).sort()];

// ── Gem detail modal ─────────────────────────────────────────────
function CulturalCard({ gem, onClose }: { gem: Gem; onClose: () => void }) {
  const gmUrl = gem.lat && gem.lng
    ? `https://maps.google.com/?q=${gem.lat},${gem.lng}&z=14`
    : `https://maps.google.com/?q=${encodeURIComponent(gem.name + ' ' + gem.state + ' India')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.97 }}
      className="fixed inset-x-4 bottom-4 top-16 z-50 overflow-y-auto glass rounded-3xl border border-white/12 shadow-2xl"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                style={{
                  color: CROWD_COLORS[gem.crowd_level] || '#C9A96E',
                  borderColor: `${CROWD_COLORS[gem.crowd_level]}40`,
                  background: `${CROWD_COLORS[gem.crowd_level]}15`,
                }}>
                {gem.crowd_level}
              </span>
              <span className="text-white/30 text-[10px]">Hidden {gem.hidden_score}/100</span>
            </div>
            <h2 className="font-display text-xl text-white leading-tight">{gem.name}</h2>
            <p className="text-white/40 text-xs mt-0.5 flex items-center gap-1">
              <MapPin size={10} /> {gem.region}, {gem.state}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {gem.tags.map(t => (
            <span key={t} className="text-[10px] px-2.5 py-1 bg-gold/10 border border-gold/20 text-gold/80 rounded-full">
              {t}
            </span>
          ))}
        </div>

        <GoldDivider />

        <div className="mt-4 mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Info size={12} className="text-gold" />
            <p className="text-white/40 text-xs uppercase tracking-widest">The Story</p>
          </div>
          <p className="text-white/72 text-sm leading-relaxed">{gem.story}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="glass p-3 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock size={11} className="text-gold" />
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Best Time</p>
            </div>
            <p className="text-white/68 text-xs leading-relaxed">{gem.best_time}</p>
          </div>
          <div className="glass p-3 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Utensils size={11} className="text-gold" />
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Local Food</p>
            </div>
            <p className="text-white/68 text-xs leading-relaxed">{gem.local_food}</p>
          </div>
        </div>

        <div className="glass p-3 rounded-xl mb-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Camera size={11} className="text-gold" />
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Best Photo Spot</p>
          </div>
          <p className="text-white/68 text-xs leading-relaxed">{gem.photo_spot}</p>
        </div>

        {/* Crowd + hidden score context */}
        <div className="glass p-3 rounded-xl mb-4 space-y-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Star size={11} className="text-gold" />
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Visit Intelligence</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1 h-1 rounded-full bg-gold/50 shrink-0 mt-1.5" />
            <p className="text-white/55 text-xs leading-relaxed">
              Crowd level: <strong className="text-white/70">{gem.crowd_level}</strong> — {
                gem.crowd_level === 'Empty'    ? 'You may be the only visitor. Carry water and snacks.' :
                gem.crowd_level === 'Sparse'   ? 'Quiet even on weekends. Excellent for photography.' :
                'Moderate footfall. Weekday mornings are significantly quieter.'
              }
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1 h-1 rounded-full bg-gold/50 shrink-0 mt-1.5" />
            <p className="text-white/55 text-xs leading-relaxed">
              Hidden score <strong className="text-white/70">{gem.hidden_score}/100</strong> — {
                gem.hidden_score >= 95 ? 'Virtually unknown. Very few people will ever visit this.' :
                gem.hidden_score >= 88 ? 'Off the main tourist circuit. Mostly local visitors.' :
                'Known to travelers but never crowded. A genuine discovery.'
              }
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-0">
          <a href={gmUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
              bg-gold/10 border border-gold/25 text-gold text-sm hover:bg-gold/20 transition-all">
            <MapPin size={14} /> Google Maps
          </a>
          <Link
            to="/chat"
            state={{ initialMessage: `Tell me about ${gem.name} in ${gem.region}, ${gem.state}. What makes it special, how to reach it, and what most visitors miss.` }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
              glass border border-white/12 text-white/60 text-sm hover:bg-white/8 hover:text-white/80 transition-all"
          >
            <MessageSquare size={14} /> Ask AI Guide
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function GemsPage() {
  const [gems,        setGems]        = useState<Gem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('All');
  const [selected,    setSelected]    = useState<Gem | null>(null);
  const [selState,    setSelState]    = useState('All States');
  const [selDistrict, setSelDistrict] = useState('All Districts');
  const [showStateDD, setShowStateDD] = useState(false);
  const [showDistDD,  setShowDistDD]  = useState(false);
  const [showMap,     setShowMap]     = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Fetch gems — sends exact params backend expects ──────────
  const fetchGems = useCallback(async (
    q: string, type: string, state: string, district: string
  ) => {
    setLoading(true); setError('');
    try {
      const params: Record<string, string> = {};
      if (q.trim())                              params.search = q.trim();
      if (type !== 'All')                        params.type   = type;
      // Only send state if a real state is selected
      if (state !== 'All States')                params.state  = state;
      // Only send region if a real district is selected — NOT "All Districts"
      if (district && district !== 'All Districts') params.region = district;

      const data = await apiService.getHiddenGems(params);
      setGems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message?.includes('fetch')
        ? 'Cannot reach server. Make sure the backend is running.'
        : 'Failed to load hidden gems.'
      );
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGems('', 'All', 'All States', 'All Districts'); }, []);

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => fetchGems(v, typeFilter, selState, selDistrict), 480
    );
  };

  const handleType = (t: string) => {
    setTypeFilter(t);
    fetchGems(search, t, selState, selDistrict);
  };

  const handleState = (s: string) => {
    setSelState(s);
    setSelDistrict('All Districts'); // reset district when state changes
    setShowStateDD(false);
    fetchGems(search, typeFilter, s, 'All Districts');
  };

  const handleDistrict = (d: string) => {
    setSelDistrict(d);
    setShowDistDD(false);
    fetchGems(search, typeFilter, selState, d);
  };

  const clearFilters = () => {
    setSelState('All States'); setSelDistrict('All Districts');
    setTypeFilter('All'); setSearch('');
    fetchGems('', 'All', 'All States', 'All Districts');
  };

  const districts = selState !== 'All States' ? (INDIA_STATES[selState] || []) : [];
  const hasActiveFilters = selState !== 'All States' || selDistrict !== 'All Districts' || typeFilter !== 'All' || search;

  return (
    <PageWrapper>
      <PageHero
        label="Beyond the Tourist Trail"
        title={<>Hidden <em className="not-italic gold-gradient">Gems</em></>}
        sub="State-wise, district-wise. Verified places most tourists — and most Indians — have never heard of."
        video="/videos/forest.mp4"
        theme="forest"
      />
      <div className="min-h-screen px-4 md:px-10 pb-12 pt-6">
        <div className="max-w-7xl mx-auto">

          {/* Search bar */}
          <div className="flex items-center gap-3 glass rounded-2xl px-4 py-3 max-w-lg mb-4">
            <Search size={15} className="text-white/28 shrink-0" />
            <input value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Search by place, state, district, or type…"
              className="bg-transparent text-white/68 text-sm outline-none flex-1 placeholder-white/18" />
            {search && (
              <button onClick={() => handleSearch('')} className="text-white/22 hover:text-white/48">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex gap-2 mb-4 flex-wrap items-center">

            {/* State dropdown */}
            <div className="relative">
              <button
                onClick={() => { setShowStateDD(v => !v); setShowDistDD(false); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-all ${
                  selState !== 'All States'
                    ? 'bg-gold/10 border-gold/30 text-gold'
                    : 'glass text-white/50 border-white/10 hover:border-white/20'
                }`}
              >
                <MapPin size={11} />
                {selState === 'All States' ? 'All States' : selState}
                <ChevronDown size={11} className={`transition-transform ${showStateDD ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showStateDD && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full mt-1 left-0 z-30 glass rounded-xl border border-white/10
                      w-56 max-h-72 overflow-y-auto shadow-2xl"
                  >
                    {STATE_LIST.map(s => (
                      <button key={s} onClick={() => handleState(s)}
                        className={`w-full text-left px-3 py-2.5 text-xs hover:bg-white/8 transition-all ${
                          selState === s ? 'text-gold' : 'text-white/60'
                        }`}>{s}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* District dropdown — only shown when state is selected */}
            {districts.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => { setShowDistDD(v => !v); setShowStateDD(false); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-all ${
                    selDistrict !== 'All Districts'
                      ? 'bg-gold/10 border-gold/30 text-gold'
                      : 'glass text-white/50 border-white/10 hover:border-white/20'
                  }`}
                >
                  {selDistrict === 'All Districts' ? 'All Districts' : selDistrict}
                  <ChevronDown size={11} className={`transition-transform ${showDistDD ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showDistDD && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute top-full mt-1 left-0 z-30 glass rounded-xl border border-white/10
                        w-56 max-h-72 overflow-y-auto shadow-2xl"
                    >
                      {districts.map(d => (
                        <button key={d} onClick={() => handleDistrict(d)}
                          className={`w-full text-left px-3 py-2.5 text-xs hover:bg-white/8 transition-all ${
                            selDistrict === d ? 'text-gold' : 'text-white/60'
                          }`}>{d}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Map toggle */}
            <button onClick={() => setShowMap(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-all ${
                showMap ? 'bg-gold/10 border-gold/30 text-gold' : 'glass text-white/50 border-white/10'
              }`}>
              <Map size={11} /> Map
            </button>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button onClick={clearFilters}
                className="text-[10px] text-white/30 hover:text-white/60 underline transition-colors">
                Clear all
              </button>
            )}
          </div>

          {/* Active filters summary */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-white/25 text-xs">Showing:</span>
              {selState !== 'All States' && (
                <span className="text-xs px-2 py-0.5 bg-gold/10 text-gold rounded-full border border-gold/20">
                  {selState}
                </span>
              )}
              {selDistrict !== 'All Districts' && (
                <span className="text-xs px-2 py-0.5 bg-gold/10 text-gold rounded-full border border-gold/20">
                  {selDistrict}
                </span>
              )}
              {typeFilter !== 'All' && (
                <span className="text-xs px-2 py-0.5 bg-gold/10 text-gold rounded-full border border-gold/20">
                  {typeFilter}
                </span>
              )}
              {search && (
                <span className="text-xs px-2 py-0.5 bg-white/8 text-white/50 rounded-full border border-white/12">
                  "{search}"
                </span>
              )}
              {!loading && (
                <span className="text-xs text-white/25">{gems.length} result{gems.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          )}

          {/* Type filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
            {TYPE_FILTERS.map(f => (
              <button key={f} onClick={() => handleType(f)}
                className={`mode-pill shrink-0 ${typeFilter === f ? 'active' : ''}`}>{f}</button>
            ))}
          </div>

          {/* Map preview */}
          <AnimatePresence>
            {showMap && !loading && gems.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
                <div className="glass p-4 rounded-2xl">
                  <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Map size={11} className="text-gold" /> {gems.length} locations
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {gems.slice(0, 9).map(g => (
                      <a key={g.id}
                        href={g.lat && g.lng
                          ? `https://maps.google.com/?q=${g.lat},${g.lng}&z=14`
                          : `https://maps.google.com/?q=${encodeURIComponent(g.name + ' ' + g.state)}`
                        }
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2.5 glass rounded-xl hover:bg-white/10 transition-all"
                      >
                        <MapPin size={11} className="text-gold shrink-0" />
                        <div className="min-w-0">
                          <p className="text-white/65 text-xs truncate">{g.name}</p>
                          <p className="text-white/30 text-[10px] truncate">{g.region}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* States */}
          {loading && (
            <div className="flex items-center justify-center py-24 gap-2.5">
              <Loader size={20} className="text-gold/45 animate-spin" />
              <span className="text-white/28 text-sm">Loading hidden gems…</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center justify-center py-16">
              <div className="glass p-6 text-center max-w-sm">
                <AlertCircle size={26} className="text-red-400/45 mx-auto mb-3" />
                <p className="text-white/38 text-sm leading-relaxed">{error}</p>
                <button
                  onClick={() => fetchGems(search, typeFilter, selState, selDistrict)}
                  className="mt-4 px-4 py-2 glass rounded-xl text-xs text-white/50 hover:text-white/80">
                  Retry
                </button>
              </div>
            </div>
          )}

          {!loading && !error && gems.length === 0 && (
            <div className="text-center py-20">
              <p className="text-white/22 text-sm">
                No gems found
                {selDistrict !== 'All Districts' ? ` in ${selDistrict}` :
                 selState !== 'All States' ? ` in ${selState}` :
                 search ? ` for "${search}"` : ''}.
              </p>
              <p className="text-white/12 text-xs mt-2">
                {selDistrict !== 'All Districts'
                  ? `No data yet for ${selDistrict}. Try "${selState}" or explore other districts.`
                  : 'Try a different state, district, or filter.'}
              </p>
              {hasActiveFilters && (
                <button onClick={clearFilters}
                  className="mt-4 text-xs text-gold/50 hover:text-gold underline transition-colors">
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {!loading && !error && gems.length > 0 && (
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {gems.map((gem, i) => (
                  <motion.div key={gem.id} layout
                    initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.38, delay: Math.min(i * 0.05, 0.3) }}
                    onClick={() => setSelected(gem)}
                    className="glass p-5 cursor-pointer group hover:border-gold/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 pr-2">
                        <p className="text-[10px] text-white/30 mb-1 flex items-center gap-1">
                          <MapPin size={9} /> {gem.region}, {gem.state}
                        </p>
                        <h3 className="text-white/85 text-sm font-semibold leading-tight group-hover:text-white transition-colors">
                          {gem.name}
                        </h3>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full border font-medium"
                          style={{
                            color: CROWD_COLORS[gem.crowd_level] || '#C9A96E',
                            borderColor: `${CROWD_COLORS[gem.crowd_level]}50`,
                            background: `${CROWD_COLORS[gem.crowd_level]}12`,
                          }}>
                          {gem.crowd_level}
                        </span>
                        <span className="text-[9px] text-gold/60">{gem.hidden_score}/100</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {gem.tags.slice(0, 3).map(t => (
                        <span key={t}
                          className="text-[9px] px-2 py-0.5 bg-white/5 text-white/40 rounded-full border border-white/8">
                          {t}
                        </span>
                      ))}
                    </div>

                    <p className="text-white/42 text-[11.5px] leading-relaxed line-clamp-3 mb-3">
                      {gem.story}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-white/6">
                      <div className="flex items-center gap-1">
                        <Clock size={10} className="text-white/22" />
                        <p className="text-[10px] text-white/28">
                          {gem.best_time?.split('(')[0].trim()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-gold/55 group-hover:text-gold transition-colors">
                        <span className="text-[10px]">Explore</span>
                        <ChevronRight size={11} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Gem detail overlay */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />
            <CulturalCard gem={selected} onClose={() => setSelected(null)} />
          </>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
