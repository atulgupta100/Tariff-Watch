
import React, { useState, useEffect } from 'react';
import { getLocalDb, saveLocalDb, clearLocalDb, parseCsv } from '../services/localDbService';

interface AdminConsoleProps {
  onBack: () => void;
}

const AdminConsole: React.FC<AdminConsoleProps> = ({ onBack }) => {
  const [password, setPassword] = useState('');
  const [isAuth, setIsAuth] = useState(false);
  const [dbCount, setDbCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'database' | 'security'>('database');

  useEffect(() => {
    setDbCount(getLocalDb().length);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuth(true);
      setError(null);
    } else {
      setError('Invalid system password.');
    }
  };

  const serverCode = `
const express = require('express');
const { GoogleGenAI } = require("@google/genai");
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Proxy endpoint for Duty Classification
app.post('/api/duty-info', async (req, res) => {
  try {
    const { query, origin, destination } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: \`Provide HTS info for \${query} from \${origin} to \${destination}...\`,
      // ... include the rest of the config here
    });
    res.json(JSON.parse(response.text));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Secure Proxy running on port 3000'));
  `.trim();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = parseCsv(text);
        if (data.length === 0) throw new Error("File empty or malformed.");
        saveLocalDb(data);
        setDbCount(data.length);
        alert(`Success: ${data.length} records imported.`);
      } catch (err) {
        alert("Import failed. Ensure CSV headers are: htsCode, destination, dutyRate, description");
      }
    };
    reader.readAsText(file);
  };

  if (!isAuth) {
    return (
      <div className="flex items-center justify-center min-h-[400px] animate-in fade-in duration-500">
        <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200">
            <i className="fa-solid fa-lock text-xl"></i>
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Restricted Access</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">System Admin Authorization Required</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              placeholder="System Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3 border-2 border-slate-100 rounded-xl focus:border-blue-600 outline-none transition-all text-center font-bold tracking-[0.2em]" 
            />
            {error && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tighter">{error}</p>}
            <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all">Authorize Session</button>
          </form>
          <button onClick={onBack} className="mt-6 text-[10px] font-black text-slate-400 uppercase hover:text-slate-600">Return to Calculator</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-5xl mx-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 pt-8 pb-0 border-b border-slate-100 bg-slate-50">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-black uppercase tracking-widest text-sm text-slate-900 flex items-center gap-3">
                <i className="fa-solid fa-shield-halved text-blue-600"></i> Admin Console
              </h3>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setIsAuth(false); setPassword(''); }} className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 transition-colors text-[10px] font-black uppercase text-slate-600">Lock Session</button>
              <button onClick={onBack} className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest">Exit Portal</button>
            </div>
          </div>
          
          <div className="flex gap-6">
            <button 
              onClick={() => setActiveSubTab('database')}
              className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeSubTab === 'database' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
            >
              Master Database
            </button>
            <button 
              onClick={() => setActiveSubTab('security')}
              className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeSubTab === 'security' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
            >
              Production Deployment
            </button>
          </div>
        </div>

        {activeSubTab === 'database' ? (
          <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 text-center">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Indexed Master Records</span>
                <div className="text-5xl font-black text-blue-600 tracking-tighter">{dbCount.toLocaleString()}</div>
              </div>
              
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-4">Database Operations</h4>
                <div className="space-y-3">
                  <button 
                    onClick={() => { if(confirm('Wipe local database?')) { clearLocalDb(); setDbCount(0); } }}
                    className="w-full text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-rose-300 hover:bg-rose-50 transition-all flex justify-between items-center group"
                  >
                    <span className="text-[10px] font-black uppercase text-slate-600 group-hover:text-rose-600">Clear All Records</span>
                    <i className="fa-solid fa-trash-can text-slate-300 group-hover:text-rose-400"></i>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/30 text-center flex flex-col items-center justify-center min-h-[250px] group hover:border-blue-400 transition-all">
                <i className="fa-solid fa-file-csv text-5xl text-slate-200 mb-6 group-hover:text-blue-400 transition-colors"></i>
                <p className="text-sm text-slate-600 font-bold mb-2">Import System Overrides</p>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter mb-8 px-4">Required Headers: htsCode, destination, dutyRate, description, origin(opt)</p>
                
                <label className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer shadow-xl shadow-blue-200 transition-all active:scale-95">
                  Upload Master File
                  <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-10 space-y-8">
            <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-r-2xl">
              <div className="flex gap-4">
                <i className="fa-solid fa-triangle-exclamation text-amber-500 text-xl"></i>
                <div>
                  <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight mb-1">Production Security Warning</h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    While your key is secure in this environment, moving to a standard host (Vercel, AWS, etc.) requires a **Backend Proxy**. 
                    Never call the Gemini SDK directly from a public website with your own production billing active.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Recommended Backend Proxy (Node.js/Express)</h4>
              <div className="relative">
                <pre className="bg-slate-900 text-blue-300 p-6 rounded-2xl font-mono text-[11px] overflow-x-auto border-2 border-slate-800 shadow-inner">
                  {serverCode}
                </pre>
                <button 
                  onClick={() => { navigator.clipboard.writeText(serverCode); alert('Copied to clipboard!'); }}
                  className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all"
                >
                  <i className="fa-solid fa-copy mr-1"></i> Copy Code
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 border-2 border-slate-100 rounded-2xl bg-slate-50/50">
                <h5 className="text-[10px] font-black uppercase text-blue-600 mb-3">Step 1: Setup Server</h5>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Install dependencies: <br/>
                  <code className="bg-slate-200 px-1 rounded">npm install express @google/genai cors dotenv</code>
                  <br/><br/>
                  Set your API key in a <code className="bg-slate-200 px-1 rounded">.env</code> file on the server.
                </p>
              </div>
              <div className="p-6 border-2 border-slate-100 rounded-2xl bg-slate-50/50">
                <h5 className="text-[10px] font-black uppercase text-blue-600 mb-3">Step 2: Update Frontend</h5>
                <p className="text-xs text-slate-600 leading-relaxed">
                  In <code className="bg-slate-200 px-1 rounded">geminiService.ts</code>, replace the SDK calls with:
                  <br/>
                  <code className="bg-slate-200 px-1 rounded">fetch('https://your-api.com/api/duty-info')</code>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminConsole;
