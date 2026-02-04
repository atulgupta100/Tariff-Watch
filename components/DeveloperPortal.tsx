
import React, { useState } from 'react';

const DeveloperPortal: React.FC = () => {
  const [activeLang, setActiveLang] = useState<'python' | 'javascript' | 'curl'>('python');

  const snippets = {
    python: `import requests\n\nurl = "https://api.dutycalc.pro/v1/classify"\npayload = {"product": "Electric Bicycle", "origin": "CN"}\nheaders = {"Authorization": "Bearer YOUR_API_KEY"}\n\nresponse = requests.post(url, json=payload, headers=headers)\nprint(response.json())`,
    javascript: `const response = await fetch("https://api.dutycalc.pro/v1/classify", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer YOUR_API_KEY",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({ product: "Electric Bicycle", origin: "CN" })\n});\nconst data = await response.json();`,
    curl: `curl -X POST https://api.dutycalc.pro/v1/classify \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"product": "Electric Bicycle", "origin": "CN"}'`
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      {/* Header Stat Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'API Calls (24h)', value: '1.2M', trend: '+12%', icon: 'bolt' },
          { label: 'Avg Latency', value: '142ms', trend: '-8ms', icon: 'clock' },
          { label: 'Success Rate', value: '99.98%', trend: 'Stable', icon: 'check-double' },
          { label: 'Total Credits', value: '$4,250', trend: 'Refill needed', icon: 'wallet' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">{stat.label}</span>
              <i className={`fa-solid fa-${stat.icon} text-slate-700 text-xs`}></i>
            </div>
            <div className="text-xl font-black">{stat.value}</div>
            <div className={`text-[9px] font-bold ${stat.trend.startsWith('+') ? 'text-emerald-400' : 'text-slate-400'}`}>{stat.trend}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* API Docs & Snippets */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <i className="fa-solid fa-code text-blue-600"></i> API Implementation
              </h2>
              <div className="flex gap-1">
                {(['python', 'javascript', 'curl'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${
                      activeLang === lang ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-slate-950 p-6 font-mono text-xs text-blue-300 overflow-x-auto min-h-[220px]">
              <pre className="leading-relaxed">
                {snippets[activeLang]}
              </pre>
            </div>
            <div className="p-4 bg-slate-50 flex justify-between items-center">
              <p className="text-[10px] text-slate-500 font-medium">Use these endpoints to integrate HTS classification directly into your ERP or Checkout flow.</p>
              <button className="text-[10px] font-black text-blue-600 uppercase hover:underline">View Full Docs <i className="fa-solid fa-arrow-right ml-1"></i></button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Live Traffic Simulation</h3>
            <div className="space-y-2">
              {[
                { method: 'POST', endpoint: '/v1/classify', status: 200, latency: '124ms', payload: 'Electric Bicycle' },
                { method: 'POST', endpoint: '/v1/duty', status: 200, latency: '89ms', payload: '8711.60.00' },
                { method: 'POST', endpoint: '/v1/classify', status: 401, latency: '12ms', payload: 'Incomplete API Key' },
                { method: 'POST', endpoint: '/v1/audit', status: 200, latency: '412ms', payload: 'Bulk CSV (1,000 SKU)' },
              ].map((log, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] font-medium py-2 border-b border-slate-50 last:border-0 font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-500 font-bold">{log.method}</span>
                    <span className="text-slate-900">{log.endpoint}</span>
                    <span className="text-slate-400 text-[9px]">{log.payload}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400">{log.latency}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.status === 200 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{log.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Tools */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white shadow-lg">
            <h3 className="font-black uppercase tracking-widest text-[10px] mb-4 opacity-80">Sandbox Console</h3>
            <div className="bg-black/20 rounded-lg p-4 font-mono text-[11px] space-y-3">
              <div>
                <span className="text-blue-300">➜</span> <span className="text-white">classify</span> "iPhone 15 Case" --origin="CN"
              </div>
              <div className="text-slate-400 pl-4">
                Searching HTS schedule...<br/>
                Found: 3926.90.9980 (Plastic)<br/>
                Duty: 5.3% + Sec 301 (25%)
              </div>
              <div className="animate-pulse">
                <span className="text-blue-300">➜</span> <span className="inline-block w-2 h-4 bg-white align-middle"></span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Your API Keys</h3>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 group">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Production Key</span>
                  <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase font-black">Active</span>
                </div>
                <div className="flex justify-between items-center">
                  <code className="text-[11px] font-mono text-slate-900">pk_live_*******************67f</code>
                  <button className="text-slate-300 hover:text-slate-600"><i className="fa-solid fa-copy"></i></button>
                </div>
              </div>
              <button className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-[10px] font-bold text-slate-400 hover:border-blue-300 hover:text-blue-600 transition-all uppercase">
                <i className="fa-solid fa-plus mr-2"></i> Generate New Key
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperPortal;
