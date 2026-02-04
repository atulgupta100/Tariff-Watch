
import React, { useState } from 'react';

const TariffAudit: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const startAudit = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setShowResults(true);
    }, 3000);
  };

  const findings = [
    { item: 'Steel Enclosures', oldCode: '7326.90.86', newCode: '8538.10.00', savings: '$18,400.00', reason: 'Component of electrical machinery has lower specific duty rate.' },
    { item: 'Industrial Castors', oldCode: '8302.20.00', newCode: '8302.42.30', savings: '$12,150.00', reason: 'Specific exclusion applies for heavy industrial load units.' },
    { item: 'Control Cables', oldCode: '8544.49.30', newCode: '8544.42.20', savings: '$9,800.00', reason: 'Fitted with connectors qualifying for different subheading.' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      {/* Audit Hero */}
      <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden border border-slate-800 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 mb-4 border border-blue-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Phase 3: Automated Duty Recovery
          </div>
          <h2 className="text-3xl font-black mb-4">Reclaim Your Overpaid Duties</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Our AI scans your last 5 years of historical import data to find misclassifications. Large enterprises often overpay by 8-15% due to conservative or incorrect HTS coding. 
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={startAudit}
              disabled={isScanning}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isScanning ? <><i className="fa-solid fa-spinner animate-spin mr-2"></i> Analyzing ACE Reports...</> : 'Launch Free Audit Scan'}
            </button>
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
               <i className="fa-solid fa-shield-halved text-blue-400"></i>
               <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">SOC2 Compliant & Secure</span>
            </div>
          </div>
        </div>
        
        {/* Background Visual Decoration */}
        <div className="absolute right-[-10%] top-[-20%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <i className="fa-solid fa-magnifying-glass-chart absolute right-12 bottom-12 text-[180px] text-white/5 pointer-events-none"></i>
      </div>

      {showResults && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-top-4 duration-1000">
          {/* Main Results Table */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-sm">Potential Recovery Opportunities</h3>
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded uppercase">3 High-Confidence Matches</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-4 font-black text-slate-500 uppercase">Description</th>
                      <th className="p-4 font-black text-slate-500 uppercase">History (HTS)</th>
                      <th className="p-4 font-black text-slate-500 uppercase">Recommended</th>
                      <th className="p-4 font-black text-slate-500 uppercase text-right">Estimated Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {findings.map((f, i) => (
                      <tr key={i} className="hover:bg-blue-50/20 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{f.item}</div>
                          <div className="text-[9px] text-slate-400 leading-tight mt-1">{f.reason}</div>
                        </td>
                        <td className="p-4 font-mono text-slate-400">{f.oldCode}</td>
                        <td className="p-4 font-mono font-bold text-blue-600">{f.newCode}</td>
                        <td className="p-4 text-right font-black text-emerald-600">{f.savings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <div className="text-[10px] text-slate-500 font-medium">Potential recovery identified for fiscal years 2021-2024.</div>
                <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md">Generate Refund Claims</button>
              </div>
            </div>
          </div>

          {/* Savings Summary Dashboard */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total Recoverable Capital</span>
              <div className="text-4xl font-black text-slate-900 mb-1">$40,350.00</div>
              <p className="text-[10px] text-emerald-600 font-bold uppercase mb-6 flex items-center justify-center gap-1">
                <i className="fa-solid fa-arrow-trend-up"></i> Identified in 1,242 line items
              </p>
              
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Audit Confidence Score</span>
                  <span className="font-bold text-blue-600">92%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full w-[92%]"></div>
                </div>
                
                <div className="pt-4 space-y-2">
                  {[
                    { label: 'CBP Post-Summary Corrections', value: 'Enabled' },
                    { label: 'Protest Filing Support', value: 'Included' },
                    { label: 'AI Review Coverage', icon: 'check', color: 'text-blue-600' }
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 text-[10px]">
                      <span className="text-slate-400 font-bold uppercase">{item.label}</span>
                      <span className="font-black text-slate-900">{item.value || <i className={`fa-solid fa-${item.icon} ${item.color}`}></i>}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-lg transition-all active:scale-95">
                Speak to a Recovery Expert
              </button>
            </div>
          </div>
        </div>
      )}
      
      {!showResults && !isScanning && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Historical Scan', desc: 'Sync your customs portal (ACE/CDS) and let AI re-classify every historical entry.', icon: 'clock-rotate-left' },
            { title: 'Conflict Detection', desc: 'Find inconsistent codes used for the same product across different ports.', icon: 'triangle-exclamation' },
            { title: 'Legal Briefing', desc: 'Get the exact HTS ruling citations needed to win refund protests.', icon: 'gavel' },
          ].map((feature, i) => (
            <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors group">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <i className={`fa-solid fa-${feature.icon}`}></i>
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-2">{feature.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TariffAudit;
