import React, { useState, useEffect } from 'react';
import { ShieldAlert, FileText, Upload, AlertTriangle, CheckCircle, Lock, ArrowRight, Zap, Eye } from 'lucide-react';

const App = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    setPageReady(true);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    
    setTimeout(() => {
      setData({
        "document_name": file.name,
        "overall_risk": "Medium",
        "summary": "This contract manages software usage rights. While standard, it contains aggressive data-sharing clauses and a difficult termination process that favors the provider.",
        "top_red_flags": [
          "Automatic 12-month renewal without email notice",
          "Provider can change pricing with only 7 days notice",
          "Unlimited data harvesting for 'third-party marketing'"
        ],
        "clauses": [
          { 
            "clause_title": "Section 4.2: Auto-Renewal", 
            "plain_english": "The contract resets itself every year and charges you automatically.", 
            "risk_level": "High", 
            "why_risky": "Requires a 90-day written notice to cancel, otherwise you are locked in for another year.", 
            "who_it_favors": "Company" 
          },
          { 
            "clause_title": "Section 8.1: Liability", 
            "plain_english": "If they lose your data, you can't sue for more than $50.", 
            "risk_level": "High", 
            "why_risky": "The cap on damages is extremely low compared to potential data value.", 
            "who_it_favors": "Company" 
          },
          { 
            "clause_title": "Section 12: Data Privacy", 
            "plain_english": "They can use your usage stats to improve their own AI models.", 
            "risk_level": "Low", 
            "why_risky": "Standard industry practice, though worth noting for sensitive projects.", 
            "who_it_favors": "Both" 
          }
        ]
      });
      setLoading(false);
    }, 2800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-slate-100/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className={`flex items-center gap-3 transition-all duration-700 ${pageReady ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
              <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 rounded-xl shadow-lg">
                <ShieldAlert className="text-white" size={22} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight text-slate-900">LexiSafe</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">AI</span>
            </div>
          </div>

          <div className={`flex items-center gap-6 transition-all duration-700 delay-100 ${pageReady ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-sm">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              SECURE
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* UPLOAD VIEW */}
        {!data && !loading && (
          <div className="space-y-12">
            {/* Hero Section */}
            <div className={`text-center space-y-6 transition-all duration-1000 ${pageReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 border border-blue-200/50 rounded-full text-sm font-semibold text-blue-700">
                <Zap size={16} className="fill-blue-600" />
                Powered by OpenAI
              </div>
              
              <h1 className="text-6xl md:text-7xl font-black tracking-tight leading-tight text-slate-900">
                Read contracts{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent">smarter</span>
                  <span className="absolute inset-x-0 bottom-2 h-3 bg-blue-200/30 -z-10 blur-sm" />
                </span>
              </h1>
              
              <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-light">
                Uncover hidden risks in seconds. Our AI analyzes every clause so you can make confident decisions.
              </p>
            </div>

            {/* Upload Card - Premium Design */}
            <div className={`transition-all duration-1000 delay-200 ${pageReady ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              <div className="relative group">
                {/* Animated background glow */}
                <div className="absolute -inset-px bg-gradient-to-r from-blue-400/20 via-blue-300/20 to-blue-400/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative bg-white border border-slate-200/50 rounded-3xl p-12 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-200/30 transition-all duration-500 overflow-hidden">
                  {/* Premium gradient overlay */}
                  <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-100/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                  
                  <div className="relative space-y-8">
                    {/* Upload Icon */}
                    <div className="flex justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-300/40 to-blue-200/40 rounded-3xl blur-xl" />
                        <div className="relative w-28 h-28 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-3xl flex items-center justify-center border border-blue-200/50 group-hover:scale-110 transition-transform duration-500">
                          <Upload className="text-blue-600" size={48} strokeWidth={1.5} />
                        </div>
                      </div>
                    </div>

                    {/* Text Content */}
                    <div className="text-center space-y-3">
                      <h2 className="text-3xl font-bold text-slate-900">Upload your document</h2>
                      <p className="text-slate-600 font-medium">PDF, DOCX • Up to 50MB</p>
                    </div>

                    {/* Input */}
                    <input 
                      type="file" 
                      className="hidden" 
                      id="pdf-upload" 
                      onChange={(e) => setFile(e.target.files[0])}
                      accept=".pdf,.docx"
                    />
                    
                    {!file ? (
                      <label htmlFor="pdf-upload" className="block">
                        <div className="relative group/btn cursor-pointer">
                        {/* Animated Glow */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl blur opacity-70 group-hover/btn:opacity-100 transition duration-300" />
                        {/* Changed <button> to <div> */}
                        <div className="relative w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-2xl transition-all duration-300 active:scale-[0.98] flex justify-center items-center">
                          Choose Document
                          </div>
                          </div>
                          </label>
                          
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
                          <FileText className="text-blue-600 flex-shrink-0" size={24} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{file.name}</p>
                            <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button 
                          onClick={handleUpload}
                          className="w-full group/btn relative"
                        >
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl blur opacity-70 group-hover/btn:opacity-100 transition duration-300" />
                          <div className="relative bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-2xl transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2">
                            <Zap size={20} className="fill-white" />
                            Analyze Now
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Security Badge */}
                    <div className="flex justify-center gap-6 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <Lock size={16} />
                        256-bit Encrypted
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <CheckCircle size={16} />
                        GDPR Compliant
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Section */}
            <div className={`text-center space-y-3 transition-all duration-1000 delay-300 ${pageReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Trusted by industry leaders</p>
              <p className="text-slate-600 text-sm">Used by 5,000+ lawyers and professionals</p>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 space-y-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center">
                  <Eye className="text-blue-600 animate-pulse" size={40} />
                </div>
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-bold text-slate-900">Analyzing document...</h3>
              <p className="text-slate-600 font-medium">Mapping risk factors and clauses</p>
            </div>
          </div>
        )}

        {/* RESULTS VIEW */}
        {data && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="space-y-4 pb-8 border-b border-slate-200">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Analysis Complete</p>
                  <h2 className="text-4xl font-bold text-slate-900">{data.document_name}</h2>
                </div>
                <button 
                  onClick={() => { setData(null); setFile(null); }}
                  className="flex items-center gap-2 px-5 py-2.5 text-slate-600 hover:text-slate-900 font-semibold transition-colors text-sm"
                >
                  <Upload size={18} />
                  New Document
                </button>
              </div>
            </div>

            {/* Risk Overview Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Summary Card */}
              <div className="md:col-span-2 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Eye className="text-blue-600" size={20} />
                  </div>
                  <h3 className="text-sm font-bold tracking-wider text-slate-500 uppercase">Executive Summary</h3>
                </div>
                <p className="text-lg leading-relaxed text-slate-700 font-medium">{data.summary}</p>
              </div>

              {/* Risk Level Card */}
              <div className={`rounded-3xl p-8 border-2 shadow-lg flex flex-col items-center justify-center text-center transition-all duration-300 ${
                data.overall_risk === 'High' 
                  ? 'bg-gradient-to-br from-red-50 to-red-50/50 border-red-300' 
                  : 'bg-gradient-to-br from-amber-50 to-amber-50/50 border-amber-300'
              }`}>
                <p className="text-xs font-bold tracking-wider text-slate-600 uppercase mb-3">Overall Risk</p>
                <span className={`text-5xl font-black mb-2 ${
                  data.overall_risk === 'High' ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {data.overall_risk}
                </span>
                <p className={`text-xs font-semibold ${
                  data.overall_risk === 'High' ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {data.overall_risk === 'High' ? 'Review immediately' : 'Review recommended'}
                </p>
              </div>
            </div>

            {/* Red Flags Section */}
            <div className="bg-gradient-to-br from-white to-red-50/30 border border-red-200/50 rounded-3xl p-8 shadow-lg">
              <h3 className="font-black text-2xl mb-8 flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                Critical Red Flags
              </h3>
              <div className="space-y-4">
                {data.top_red_flags.map((flag, i) => (
                  <div 
                    key={i} 
                    className="bg-white border border-red-200/50 rounded-2xl p-6 flex gap-4 items-start hover:border-red-300 hover:shadow-md transition-all duration-300 group"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center font-black text-sm group-hover:bg-red-700 transition-colors">
                      !</div>
                    <p className="text-slate-800 font-semibold text-lg leading-relaxed pt-0.5">{flag}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Clause-by-Clause */}
            <div className="space-y-6">
              <div>
                <h3 className="text-3xl font-black mb-2 text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FileText className="text-blue-600" size={20} />
                  </div>
                  Detailed Clause Analysis
                </h3>
                <p className="text-slate-600 font-medium ml-13">Complete breakdown of concerning sections</p>
              </div>

              <div className="space-y-5">
                {data.clauses.map((clause, index) => (
                  <div 
                    key={index} 
                    className="group bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300"
                  >
                    <div className={`h-1.5 w-full ${
                      clause.risk_level === 'High' 
                        ? 'bg-gradient-to-r from-red-500 to-red-600' 
                        : 'bg-gradient-to-r from-green-500 to-emerald-600'
                    }`} />
                    
                    <div className="p-8">
                      <div className="flex justify-between items-start gap-6 mb-8">
                        <div className="flex-1">
                          <h4 className="text-xl font-black text-slate-900 mb-3">{clause.clause_title}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase bg-slate-100 px-3 py-1 rounded-lg">
                              {clause.who_it_favors}
                            </span>
                          </div>
                        </div>
                        <span className={`text-xs font-black px-4 py-2 rounded-lg uppercase tracking-wider flex-shrink-0 ${
                          clause.risk_level === 'High' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {clause.risk_level} Risk
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <p className="text-xs font-black tracking-widest text-slate-500 uppercase">Plain Language</p>
                          <p className="text-slate-700 font-semibold text-lg leading-relaxed italic">"{clause.plain_english}"</p>
                        </div>
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 p-6 rounded-2xl border border-slate-200">
                          <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-3">Why It Matters</p>
                          <p className="text-slate-700 leading-relaxed font-medium">{clause.why_risky}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-8 border-t border-slate-200 flex justify-center">
              <button 
                onClick={() => { setData(null); setFile(null); }}
                className="flex items-center gap-2 px-8 py-3.5 text-blue-600 hover:text-blue-700 font-bold transition-colors text-sm"
              >
                <ArrowRight size={18} className="rotate-180" />
                Upload Another Document
              </button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-20 py-12 border-t border-slate-200/50 bg-gradient-to-b from-transparent to-slate-50">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-2">
          <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Enterprise Security</p>
          <p className="text-sm text-slate-600">256-bit encryption • GDPR compliant • SOC 2 certified</p>
        </div>
      </footer>
    </div>
  );
};

export default App;