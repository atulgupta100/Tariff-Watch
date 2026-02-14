
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  getProductDutyInfo, 
  getHtsClassificationOptions, 
  HtsClassificationOption, 
  getTradeIntelligence, 
  TradeIntelligence, 
  DutyBreakdownItem, 
  getDutyBreakdownOnly, 
  ReasoningStep,
  getLatestTradeNews,
  TradeNewsItem
} from './services/geminiService';
import { lookupDuty, getLocalDb } from './services/localDbService';
import { ProductInfo, CalculationInputs, CalculationResult, AdditionalCost } from './types';
import CalculatorForm from './components/CalculatorForm';
import SummaryCard from './components/SummaryCard';
import DeveloperPortal from './components/DeveloperPortal';
import TariffAudit from './components/TariffAudit';
import AdminConsole from './components/AdminConsole';

const countryToIso: Record<string, string> = {
  'China': 'cn', 'Vietnam': 'vn', 'India': 'in', 'Mexico': 'mx', 'Germany': 'de', 'Japan': 'jp', 
  'Canada': 'ca', 'South Korea': 'kr', 'Taiwan': 'tw', 'Brazil': 'br', 'Italy': 'it', 
  'France': 'fr', 'United Kingdom': 'gb', 'Turkey': 'tr', 'Thailand': 'th', 'Indonesia': 'id', 
  'Malaysia': 'my', 'Bangladesh': 'bd', 'United States': 'us', 'European Union': 'eu',
  'Australia': 'au', 'United Arab Emirates': 'ae', 'Singapore': 'sg', 'South Africa': 'za',
  'New Zealand': 'nz', 'Norway': 'no', 'Switzerland': 'ch'
};

const PercentInput = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => {
  const [local, setLocal] = useState(value.toFixed(2));
  useEffect(() => { setLocal(value.toFixed(2)); }, [value]);
  return (
    <input
      type="number"
      step="0.01"
      value={local}
      onChange={(e) => {
        setLocal(e.target.value);
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) onChange(val);
      }}
      className="w-full text-right bg-transparent border-none p-0 focus:ring-0 text-xl font-black text-blue-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none leading-none"
    />
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calculator' | 'audit' | 'developer' | 'admin'>('calculator');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [htsCode, setHtsCode] = useState('');
  const [includeAlternates, setIncludeAlternates] = useState(false);
  const [htsOptions, setHtsOptions] = useState<HtsClassificationOption[]>([]);
  const [destination, setDestination] = useState('United States');
  const [loading, setLoading] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productInfo, setProductInfo] = useState<(ProductInfo & { reasoningPathway?: ReasoningStep[], breakdown?: DutyBreakdownItem[] }) | null>(null);
  const [tradeIntel, setTradeIntel] = useState<TradeIntelligence | null>(null);
  const [manualDutyRate, setManualDutyRate] = useState<number>(0);
  
  const [suggestions, setSuggestions] = useState<HtsClassificationOption[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [tradeNews, setTradeNews] = useState<TradeNewsItem[]>([]);
  
  const suggestionRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<number | null>(null);
  const lastSearchState = useRef({ query: '', hts: '', origin: '', destination: '' });

  const [inputs, setInputs] = useState<CalculationInputs>({
    unitPrice: 0,
    quantity: 1,
    freight: 0,
    includeFreight: true,
    insurance: 0,
    includeInsurance: true,
    originCountry: 'China',
    customDuties: [],
    additionalCosts: [],
    inlandLogistics: []
  });

  // Fetch News on Mount
  useEffect(() => {
    getLatestTradeNews().then(setTradeNews).catch(console.error);
  }, []);

  // Handle click outside suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, []);

  const originCountries = ['China', 'Vietnam', 'India', 'Mexico', 'Germany', 'Japan', 'Canada', 'South Korea', 'Taiwan', 'Brazil', 'Italy', 'France', 'United Kingdom', 'Turkey', 'Thailand', 'Indonesia', 'Malaysia', 'Bangladesh'].sort();
  const destinationCountries = ['United States', 'Canada', 'United Kingdom', 'European Union', 'Australia', 'Japan', 'Brazil', 'Mexico', 'United Arab Emirates', 'Singapore', 'South Africa', 'India', 'New Zealand', 'Norway', 'Switzerland'].sort();

  const getCalculation = useCallback((dutyRate: number) => {
    const fob = inputs.unitPrice * inputs.quantity;
    const activeFreight = inputs.includeFreight ? inputs.freight : 0;
    const activeInsurance = inputs.includeInsurance ? inputs.insurance : 0;
    const cif = fob + activeFreight + activeInsurance;
    
    const fobCountries = ['United States', 'Canada', 'Australia'];
    const isFobBasis = fobCountries.includes(destination);
    const dutyBase = isFobBasis ? fob : cif;
    
    const baseDutyAmount = dutyBase * (dutyRate / 100);
    
    let customDutyAmount = 0;
    let customRateSum = 0;
    inputs.customDuties.forEach(d => {
      customRateSum += d.rate;
      customDutyAmount += dutyBase * (d.rate / 100);
    });
    
    const otherFeesTotal = inputs.inlandLogistics.filter(c => c.included).reduce((acc, curr) => acc + curr.value, 0);
    
    return {
      fobValue: fob,
      cifValue: cif,
      dutyAmount: baseDutyAmount + customDutyAmount,
      additionalCostsTotal: 0,
      inlandLogisticsTotal: otherFeesTotal,
      totalLandedCost: cif + baseDutyAmount + customDutyAmount + otherFeesTotal,
      totalDutyRate: dutyRate + customRateSum
    };
  }, [inputs, destination]);

  const result = useMemo(() => getCalculation(manualDutyRate), [getCalculation, manualDutyRate]);
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const selectHtsOption = async (option: HtsClassificationOption) => {
    setHtsCode(option.code);
    setManualDutyRate(option.dutyRate);
    setSuggestions([]);
    setShowSuggestions(false);
    setBreakdownLoading(true);

    const dbMatch = lookupDuty(option.code, destination, inputs.originCountry);

    setProductInfo(prev => prev ? {
      ...prev,
      hsCode: option.code,
      description: dbMatch ? dbMatch.description : option.label,
      dutyRate: dbMatch ? dbMatch.dutyRate : option.dutyRate,
      isFromLocalDb: !!dbMatch,
      breakdown: [{ label: dbMatch ? 'Verified Database Rate' : 'Refreshing breakdown...', rate: dbMatch ? dbMatch.dutyRate : option.dutyRate }]
    } : null);

    if (dbMatch) {
      setManualDutyRate(dbMatch.dutyRate);
      setBreakdownLoading(false);
      return;
    }

    try {
      const data = await getDutyBreakdownOnly(option.code, inputs.originCountry, destination);
      const apiTotalRate = data.breakdown.reduce((acc, b) => acc + b.rate, 0);
      setManualDutyRate(apiTotalRate);
      setProductInfo(prev => prev ? { 
        ...prev, 
        hsCode: option.code,
        description: option.label,
        breakdown: data.breakdown, 
        dutyRate: apiTotalRate 
      } : null);
    } catch (e) { console.error(e); } finally { setBreakdownLoading(false); }
  };

  const handleSearch = async (e?: React.FormEvent, force: boolean = false) => {
    if (e) e.preventDefault();
    if (!query.trim() && !htsCode.trim()) return;

    const currentState = { query, hts: htsCode, origin: inputs.originCountry, destination };
    if (!force && productInfo && JSON.stringify(currentState) === JSON.stringify(lastSearchState.current)) {
      return;
    }

    setLoading(true); setError(null); setTradeIntel(null); setHtsOptions([]);
    setShowSuggestions(false);

    if (htsCode) {
      const dbMatch = lookupDuty(htsCode, destination, inputs.originCountry);
      if (dbMatch) {
        setProductInfo({
          hsCode: dbMatch.htsCode,
          description: dbMatch.description,
          dutyRate: dbMatch.dutyRate,
          countryOfOrigin: inputs.originCountry,
          destinationCountry: destination,
          isFromLocalDb: true,
          breakdown: [{ label: 'Verified Database Rate', rate: dbMatch.dutyRate, sourceUrl: 'Internal Database' }],
          reasoningPathway: [{ title: 'Internal Policy', detail: 'This rate has been retrieved from your verified internal tariff database.' }]
        });
        setManualDutyRate(dbMatch.dutyRate);
        setHtsCode(dbMatch.htsCode);
        setLoading(false);
        lastSearchState.current = currentState;
        return;
      }
    }

    try {
      const data = await getProductDutyInfo(htsCode ? `${query} (HTS: ${htsCode})` : query, inputs.originCountry, destination);
      setProductInfo(data);
      setManualDutyRate(data.dutyRate);
      setHtsCode(data.hsCode);
      lastSearchState.current = currentState;

      if (includeAlternates) {
        const options = await getHtsClassificationOptions(query || data.description, inputs.originCountry, destination);
        setHtsOptions(options);
      }
    } catch (err: any) { setError(err.message || "Failed to fetch data"); } 
    finally { setLoading(false); }
  };

  const handleHtsInputChange = (val: string) => {
    setHtsCode(val);
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    
    if (val.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestionsLoading(false);
      return;
    }

    setSuggestionsLoading(true);
    setShowSuggestions(true);

    debounceTimer.current = window.setTimeout(async () => {
      try {
        const combinedQuery = query ? `${query} (partial HTS: ${val})` : val;
        const results = await getHtsClassificationOptions(combinedQuery, inputs.originCountry, destination);
        setSuggestions(results.slice(0, 5));
      } catch (err) { 
        console.error("Suggestion error:", err); 
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 450);
  };

  const handleInputChange = (name: keyof CalculationInputs, value: any) => setInputs(prev => ({ ...prev, [name]: value }));

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Dynamic News Ticker */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-7 bg-slate-900 text-white flex items-center overflow-hidden border-b border-white/5">
        <div className="bg-blue-600 h-full flex items-center px-4 shrink-0 relative z-10 shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
          <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-tower-broadcast animate-pulse"></i> Trade News
          </span>
        </div>
        <div className="flex whitespace-nowrap animate-marquee hover:[animation-play-state:paused] items-center">
          {tradeNews.length > 0 ? (
            [...tradeNews, ...tradeNews].map((news, i) => (
              <a 
                key={i} 
                href={news.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-2 mx-8 text-[10px] font-bold text-slate-300 hover:text-blue-400 transition-colors"
              >
                <span className="text-blue-600 font-black">[{news.source}]</span>
                {news.title}
                <i className="fa-solid fa-arrow-up-right-from-square text-[8px] opacity-40"></i>
              </a>
            ))
          ) : (
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mx-8 animate-pulse">Syncing global trade intelligence...</span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>

      <aside className={`bg-slate-900 text-white transition-all duration-300 flex flex-col z-[60] shrink-0 mt-7 ${isSidebarOpen ? 'w-44' : 'w-20'}`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-900/20">
              <i className="fa-solid fa-ship text-sm"></i>
            </div>
            {isSidebarOpen && <span className="font-black text-lg tracking-tight whitespace-nowrap">Tariff Watch</span>}
          </div>
        </div>

        <div className="flex-grow py-6 px-3 space-y-2 overflow-y-auto">
          {[
            { id: 'calculator', label: 'DutyCalc', icon: 'bolt' },
            { id: 'audit', label: 'Tariff Audit', icon: 'magnifying-glass-chart', badge: 'New' },
            { id: 'developer', label: 'Developer Hub', icon: 'code' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full group flex items-center gap-3 p-3 rounded-xl transition-all relative ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <div className="w-6 h-6 flex items-center justify-center shrink-0"><i className={`fa-solid fa-${item.icon} text-sm`}></i></div>
              {isSidebarOpen && <div className="flex flex-col items-start overflow-hidden"><span className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">{item.label}{item.badge && <span className="text-[7px] bg-amber-400 text-slate-900 px-1 py-0.5 rounded leading-none">{item.badge}</span>}</span></div>}
              {activeTab === item.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full"></div>}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
            <div className="w-6 h-6 flex items-center justify-center"><i className={`fa-solid fa-${isSidebarOpen ? 'chevron-left' : 'chevron-right'} text-sm`}></i></div>
            {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">Collapse Menu</span>}
          </button>
        </div>
      </aside>

      <div className="flex-grow flex flex-col h-screen overflow-y-auto relative pt-7">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 h-16 flex items-center px-6 justify-between">
          <div className="flex items-center gap-4">
             <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                {activeTab === 'calculator' && 'Duty Calculator'}
                {activeTab === 'audit' && 'Tariff Audit'}
                {activeTab === 'developer' && 'Developer Platform & API'}
                {activeTab === 'admin' && 'System Administration'}
             </h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-slate-100 text-[10px] font-black uppercase text-slate-500 hover:border-slate-300 transition-colors">
              <i className="fa-solid fa-circle-user text-xs"></i>
              Enterprise Account
            </button>
          </div>
        </header>

        <main className="flex-grow w-full max-w-6xl mx-auto p-4 md:p-8">
          {activeTab === 'calculator' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-6">
                  <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px]">1</span> Route & Classify
                    </h2>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-1 block">Product Name</label>
                          <input type="text" placeholder="E.g. Electric Bicycle..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full px-4 py-2.5 text-sm border-2 border-slate-200 rounded-xl bg-slate-50 focus:border-blue-600 outline-none transition-all" />
                        </div>
                        <div className="relative" ref={suggestionRef}>
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-1 block">HTS Code (Optional)</label>
                          <input type="text" placeholder="8711.60.00" value={htsCode} onChange={(e) => handleHtsInputChange(e.target.value)} onFocus={() => (suggestions.length > 0 || suggestionsLoading) && setShowSuggestions(true)} className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl bg-slate-50 focus:border-blue-600 outline-none transition-all font-mono" />
                          {showSuggestions && (
                            <div className="absolute z-[60] left-0 right-0 mt-2 bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                              {suggestionsLoading ? (
                                <div className="px-4 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest flex flex-col items-center gap-2">
                                  <i className="fa-solid fa-compass-drafting text-blue-500 animate-pulse text-lg"></i>
                                  Identifying relevant codes...
                                </div>
                              ) : suggestions.length > 0 ? (
                                suggestions.map((s, i) => (
                                  <button key={i} type="button" onClick={() => selectHtsOption(s)} className="w-full px-4 py-3 text-left hover:bg-blue-50 flex flex-col gap-0.5 border-b border-slate-50 last:border-0 transition-colors group">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[11px] font-mono font-bold text-blue-600">{s.code}</span>
                                      <span className="text-[8px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                                    </div>
                                    <span className="text-[10px] text-slate-600 line-clamp-1">{s.label}</span>
                                  </button>
                                ))
                              ) : (
                                <div className="px-4 py-4 text-center text-[10px] font-black text-rose-400 uppercase">No matches found for "{htsCode}"</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none z-10">
                            <span className={`fi fi-${countryToIso[inputs.originCountry]} text-xs rounded-sm`}></span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">From</span>
                          </div>
                          <select value={inputs.originCountry} onChange={(e) => handleInputChange('originCountry', e.target.value)} className="w-full pl-16 pr-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl bg-slate-50 font-bold focus:border-blue-600 transition-all appearance-none outline-none">
                            {originCountries.map(c => <option key={c}>{c}</option>)}
                          </select>
                          <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                        </div>
                        <div className="text-slate-300 px-1"><i className="fa-solid fa-arrow-right"></i></div>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none z-10">
                            <span className={`fi fi-${countryToIso[destination]} text-xs rounded-sm`}></span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">To</span>
                          </div>
                          <select value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full pl-12 pr-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl bg-slate-50 font-bold focus:border-blue-600 transition-all appearance-none outline-none">
                            {destinationCountries.map(c => <option key={c}>{c}</option>)}
                          </select>
                          <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <label className="flex items-center gap-2 cursor-pointer select-none px-1 py-1">
                            <input type="checkbox" checked={includeAlternates} onChange={(e) => setIncludeAlternates(e.target.checked)} className="w-4 h-4 accent-blue-600 rounded-md border-2 border-blue-300 transition-all" />
                            <span className="text-[9px] font-black text-blue-700 uppercase leading-none tracking-tight">Include Related HTS Strategies</span>
                        </label>
                      </div>
                      <div className="pt-2">
                        <button type="button" onClick={(e) => handleSearch(e, true)} disabled={loading} className="w-full bg-slate-900 text-white py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
                          {loading && activeTab === 'calculator' ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-magnifying-glass text-[10px]"></i>}
                          Find Duty
                        </button>
                      </div>
                    </div>
                  </section>
                  <CalculatorForm inputs={inputs} onInputChange={handleInputChange} loading={loading} />
                  <button type="button" onClick={(e) => handleSearch(e)} disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-black disabled:opacity-50 text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-200 active:scale-[0.99] uppercase tracking-widest">
                    {loading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-bolt"></i>} Calculate Landed Cost
                  </button>

                  {htsOptions.length > 0 && (
                    <div className="bg-white border border-blue-100 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500">
                      <div className="w-full px-5 py-3 flex justify-between items-center border-b border-blue-100 bg-blue-50/50">
                        <div className="flex items-center gap-2 text-blue-700"><i className="fa-solid fa-table-list text-xs"></i><span className="text-[10px] font-black uppercase tracking-widest">Alternate HTS Strategies</span></div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] min-w-[600px]">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr><th className="p-4 font-black text-slate-500 uppercase">HTS Code</th><th className="p-4 font-black text-slate-500 uppercase">Description</th><th className="p-4 font-black text-slate-500 uppercase text-right">Duty Rate</th><th className="p-4 font-black text-slate-500 uppercase text-right">Total Landed</th><th className="p-4 font-black text-slate-500 uppercase text-center w-24">Action</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {htsOptions.map((opt, idx) => {
                              const optResult = getCalculation(opt.dutyRate);
                              const isActive = htsCode === opt.code;
                              return (
                                <tr key={idx} className={`${isActive ? 'bg-blue-50/30' : 'hover:bg-slate-50/30'} transition-colors`}>
                                  <td className="p-4 font-mono font-bold text-blue-600">{opt.code}</td>
                                  <td className="p-4 text-slate-700 font-medium leading-snug">{opt.label}</td>
                                  <td className="p-4 text-right font-black text-slate-900">{opt.dutyRate.toFixed(2)}%</td>
                                  <td className="p-4 text-right font-bold text-slate-900">{formatCurrency(optResult.totalLandedCost)}</td>
                                  <td className="p-4 text-center">{isActive ? <div className="text-emerald-600 flex justify-center items-center gap-1.5"><i className="fa-solid fa-circle-check"></i><span className="text-[8px] font-black uppercase">Active</span></div> : <button onClick={() => selectHtsOption(opt)} disabled={breakdownLoading} className="text-[9px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-all uppercase shadow-sm">Apply</button>}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
                <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-6">
                  {productInfo && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className={`p-5 rounded-2xl border relative overflow-hidden shadow-sm ${productInfo.isFromLocalDb ? 'bg-emerald-50 border-emerald-100 border-l-emerald-600' : 'bg-blue-50 border-blue-100 border-l-blue-600'}`}>
                        {breakdownLoading && <div className="absolute inset-0 bg-blue-50/20 flex items-center justify-center z-10 backdrop-blur-[1px]"><i className="fa-solid fa-sync animate-spin text-blue-600 text-lg"></i></div>}
                        <div className="flex flex-col gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`${productInfo.isFromLocalDb ? 'bg-emerald-600' : 'bg-blue-600'} text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest`}>
                                {productInfo.isFromLocalDb ? 'Verified DB Match' : 'AI Analysis Details'}
                              </span>
                              <p className={`${productInfo.isFromLocalDb ? 'text-emerald-700' : 'text-blue-700'} font-mono text-[11px] font-bold tracking-tight`}>HTS: {productInfo.hsCode}</p>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 mb-4 leading-snug">{productInfo.description}</h3>
                            <div className="bg-white/80 rounded-xl p-4 border border-slate-100 shadow-inner">
                              <p className={`text-[10px] font-black uppercase mb-3 flex items-center gap-1.5 ${productInfo.isFromLocalDb ? 'text-emerald-800' : 'text-blue-800'}`}>
                                <i className="fa-solid fa-list-check"></i> Applied Duty Breakdown:
                              </p>
                              <div className="space-y-2">
                                {productInfo.breakdown?.map((b, i) => (
                                  <div key={i} className={`flex justify-between items-center text-[11px] bg-white/50 px-3 py-2.5 rounded-lg border font-medium group transition-all hover:bg-white ${productInfo.isFromLocalDb ? 'text-emerald-700 border-emerald-50' : 'text-blue-700 border-blue-50'}`}>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-bold">{b.label}</span>
                                      {b.sourceUrl && (
                                        <a 
                                          href={b.sourceUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="text-[8px] text-blue-500 hover:text-blue-700 flex items-center gap-1 font-black uppercase tracking-tighter transition-colors group/link"
                                        >
                                          <i className="fa-solid fa-link text-[7px] opacity-60"></i>
                                          Official Source 
                                          <i className="fa-solid fa-arrow-up-right-from-square text-[6px] group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform"></i>
                                        </a>
                                      )}
                                    </div>
                                    <span className="font-black text-sm tabular-nums">+{b.rate.toFixed(2)}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-3">
                            <div className={`bg-white px-5 py-4 rounded-2xl border-2 shadow-sm flex flex-col items-center justify-center text-center ${productInfo.isFromLocalDb ? 'border-emerald-100' : 'border-blue-100'}`}>
                              <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter mb-1">Effective Duty Rate</span>
                              <div className="flex items-center justify-center w-full mb-1">
                                <PercentInput value={manualDutyRate} onChange={setManualDutyRate} />
                                <span className="ml-0.5 text-lg font-black text-blue-600 leading-none">%</span>
                              </div>
                              <span className="text-[8px] text-slate-300 font-bold uppercase leading-none mt-auto">Manual Override</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <SummaryCard result={result} productInfo={productInfo} manualDutyRate={manualDutyRate} inlandLogistics={inputs.inlandLogistics} quantity={inputs.quantity} tradeIntel={tradeIntel} destination={destination} />
                </div>
              </div>
            </div>
          )}
          {activeTab === 'audit' && <TariffAudit />}
          {activeTab === 'developer' && <DeveloperPortal />}
          {activeTab === 'admin' && <AdminConsole onBack={() => setActiveTab('calculator')} />}
        </main>

        <footer className="bg-white/50 backdrop-blur-sm border-t border-slate-200 py-6 px-8 mt-auto">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Classification tool for estimation only</p>
              <div className="flex items-center gap-3">
                <p className="text-[9px] text-slate-400 font-bold">Final duties determined by local customs authorities.</p>
                <span className="text-slate-200">|</span>
                <button onClick={() => setActiveTab('admin')} className="text-[9px] text-slate-300 font-black uppercase hover:text-blue-500 transition-colors">Admin Portal</button>
              </div>
            </div>
            <p className="text-[10px] text-slate-900 font-black tracking-tight">© 2025 TARIFF WATCH INTELLIGENCE PLATFORM</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
