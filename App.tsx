import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { UserProfile, Message, AstrologyTopic, MoonData, FullAnalysisData } from './types';
import { initializeGemini, startChatSession, sendMessageToGemini, getMoonAnalysis, getFullAnalysis, searchLocations } from './services/geminiService';
import StarBackground from './components/StarBackground';
import MoonWidget from './components/MoonWidget';
import IntroAnimation from './components/IntroAnimation';
import Dashboard from './components/Dashboard';
import { SparklesIcon, SendIcon, UserIcon, SettingsIcon, MoonIcon, MenuIcon, XIcon } from './components/Icons';

const hasApiKey = !!process.env.API_KEY;

function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Data States
  const [moonData, setMoonData] = useState<MoonData | null>(null);
  const [fullAnalysis, setFullAnalysis] = useState<FullAnalysisData | null>(null);
  const [analysisError, setAnalysisError] = useState(false);
  
  // Loading States
  const [showIntro, setShowIntro] = useState(false);
  const [introFadeOut, setIntroFadeOut] = useState(false);

  // Location States
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    initializeGemini();
  }, []);

  useEffect(() => {
      if (showSettings && profile) {
          setLocationQuery(profile.birthLocation);
      } else if (showSettings && !profile) {
          setLocationQuery('');
      }
      setLocationSuggestions([]);
      setShowSuggestions(false);
  }, [showSettings, profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]); // Added isLoading to scroll when thinking starts

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocationQuery(val);
      
      if (debounceRef.current) clearTimeout(debounceRef.current);
      
      if (val.length >= 3) {
          setIsSearchingLocation(true);
          setShowSuggestions(true);
          debounceRef.current = setTimeout(async () => {
              const results = await searchLocations(val);
              setLocationSuggestions(results);
              setIsSearchingLocation(false);
              if(results.length > 0) setShowSuggestions(true);
          }, 400); 
      } else {
          setLocationSuggestions([]);
          setIsSearchingLocation(false);
          setShowSuggestions(false);
      }
  };

  const selectLocation = (loc: string) => {
      setLocationQuery(loc);
      setLocationSuggestions([]);
      setShowSuggestions(false);
  };

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newProfile: UserProfile = {
      name: formData.get('name') as string,
      birthDate: formData.get('birthDate') as string,
      birthTime: formData.get('birthTime') as string,
      birthLocation: locationQuery,
    };
    
    setProfile(newProfile);
    setShowSettings(false);
    setAnalysisError(false);
    setFullAnalysis(null);
    setMoonData(null);
    
    if (hasApiKey) {
        setShowIntro(true); 
        setIntroFadeOut(false);
        
        try {
            setMessages([]);
            startChatSession(newProfile);

            getMoonAnalysis(newProfile).then(setMoonData);

            const analysis = await getFullAnalysis(newProfile);
            
            if (analysis) {
                setFullAnalysis(analysis);
                setMessages([{
                    id: 'init-1',
                    role: 'model',
                    text: `Olá, ${newProfile.name.split(' ')[0]}. Seu dossiê completo foi compilado. Analisei cada aspecto, casa e planeta com profundidade. Role o painel para ler sua análise detalhada.`,
                    timestamp: Date.now()
                }]);
            } else {
                setAnalysisError(true);
                setMessages([{
                    id: 'error-1',
                    role: 'model',
                    text: `AstroNova Prime: Detectada instabilidade na rede de efemérides. Os dados profundos falharam, mas estou disponível para consulta via chat.`,
                    timestamp: Date.now()
                }]);
            }

        } catch (error) {
            console.error("Initialization error", error);
            setAnalysisError(true);
        } finally {
             setIntroFadeOut(true);
             setTimeout(() => {
                 setShowIntro(false);
             }, 1000); 
        }
    } else {
        startChatSession(newProfile);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!hasApiKey) {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "ERRO CRÍTICO: Chave de API ausente.",
            timestamp: Date.now()
        }]);
        return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendMessageToGemini(input, messages);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
      setInput(prompt);
  };

  return (
    <div className="relative min-h-screen font-sans text-slate-200 overflow-hidden flex flex-col md:flex-row bg-[#050508]">
      <StarBackground />
      
      {showIntro && (
        <div className={`fixed inset-0 z-[100] transition-opacity duration-1000 ease-in-out ${introFadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
           <IntroAnimation />
        </div>
      )}

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-[#050508]/80 backdrop-blur-xl border-b border-white/5 z-30 sticky top-0">
        <div className="flex items-center gap-3">
            <SparklesIcon className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-display font-bold text-white tracking-[0.2em]">ASTRONOVA</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white">
            {isSidebarOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-20 w-80 bg-[#08090E]/80 border-r border-white/5 backdrop-blur-xl transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col shadow-2xl`}>
          <div className="p-10 hidden md:flex items-center gap-4 border-b border-white/5 bg-transparent">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                 <SparklesIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-xl font-display font-bold text-white tracking-[0.2em]">ASTRONOVA</h1>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
             {profile ? (
                 <div className="space-y-6 animate-slide-up">
                     <div className="relative p-6 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 overflow-hidden group hover:border-indigo-500/30 transition-colors">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full group-hover:bg-indigo-500/20 transition-colors"></div>
                         <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-[9px] text-indigo-300 uppercase tracking-widest font-bold">Nativo</div>
                                <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wide">Conectado</span>
                                </div>
                            </div>
                            <div className="text-xl font-display font-bold text-white truncate">{profile.name}</div>
                            <div className="text-xs text-slate-500 mt-1 font-mono">{profile.birthLocation}</div>
                         </div>
                     </div>

                     {moonData && <MoonWidget data={moonData} />}

                     <button 
                        onClick={() => setShowSettings(true)}
                        className="w-full py-4 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2 border border-white/5 hover:border-indigo-500/30 group"
                     >
                         <SettingsIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" /> Recalcular Rota
                     </button>
                 </div>
             ) : (
                 <div className="text-center p-8 text-slate-600 mt-12 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                     <p className="text-[10px] uppercase tracking-widest font-bold">Aguardando Input de Dados</p>
                 </div>
             )}
          </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 h-[calc(100vh-64px)] md:h-screen">
        <div className="flex-1 overflow-y-auto p-4 md:p-12 space-y-8 scrollbar-thin">
            
            {/* Landing State */}
            {messages.length === 0 && !profile && (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 animate-slide-up">
                    <div className="relative mb-12 group cursor-pointer" onClick={() => setShowSettings(true)}>
                        <div className="absolute inset-0 bg-indigo-600 blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity duration-1000 rounded-full"></div>
                        <div className="relative w-48 h-48 rounded-full bg-[#08090E] border border-white/10 flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform duration-500 group-hover:border-indigo-500/30">
                             <div className="absolute inset-4 border border-white/5 rounded-full animate-[spin_15s_linear_infinite]"></div>
                             <div className="absolute inset-0 border-t border-indigo-500/20 rounded-full animate-[spin_4s_linear_infinite]"></div>
                             <MoonIcon className="w-20 h-20 text-indigo-200 drop-shadow-[0_0_25px_rgba(165,180,252,0.4)]" />
                        </div>
                    </div>
                    
                    <h2 className="text-6xl md:text-7xl font-display font-bold mb-8 text-white tracking-tight drop-shadow-xl">
                        ASTRO<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">NOVA</span>
                    </h2>
                    
                    <p className="text-slate-400 max-w-xl mb-16 text-xl font-light leading-relaxed">
                        Inteligência Astrológica de Classe Mestre. <br/>
                        <span className="text-sm text-slate-500 uppercase tracking-widest mt-2 block">Mapa Estelar • Numerologia • Karma</span>
                    </p>
                    
                    <button 
                        onClick={() => setShowSettings(true)}
                        className="group relative px-14 py-6 bg-white text-black rounded-full font-bold tracking-[0.2em] text-sm transition-all transform hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.1)] overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-indigo-100 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <span className="relative z-10 flex items-center gap-3">INICIAR ANÁLISE <span className="text-lg">→</span></span>
                    </button>
                </div>
            )}

            {/* Error Display */}
            {analysisError && !fullAnalysis && (
                <div className="p-8 rounded-3xl bg-red-950/20 border border-red-500/20 text-center backdrop-blur-md animate-slide-up">
                    <h3 className="text-red-400 font-bold mb-3 uppercase tracking-wider text-sm">Falha de Sincronização Estelar</h3>
                    <p className="text-slate-300 text-sm mb-6">Não foi possível recuperar os dados completos das efemérides.</p>
                    <button 
                        onClick={() => setShowSettings(true)}
                        className="px-8 py-3 bg-red-500/10 text-red-200 rounded-xl text-xs font-bold uppercase hover:bg-red-500/20 transition-colors border border-red-500/20"
                    >
                        Reiniciar Protocolo
                    </button>
                </div>
            )}

            {/* Dashboard Component */}
            {fullAnalysis && (
                <div className="mb-16 max-w-[1400px] mx-auto">
                    <Dashboard data={fullAnalysis} onQuestionSelect={handleQuickPrompt} profileName={profile?.name} />
                </div>
            )}

            {/* Chat Messages */}
            <div className="max-w-5xl mx-auto space-y-10">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                        <div 
                            className={`max-w-[90%] md:max-w-[80%] rounded-3xl p-8 md:p-10 ${
                                msg.role === 'user' 
                                ? 'bg-[#151720] border border-white/10 text-white rounded-tr-none shadow-2xl' 
                                : 'bg-gradient-to-br from-[#0A0B12] to-[#050508] border border-indigo-500/20 text-slate-200 rounded-tl-none shadow-2xl relative overflow-hidden group'
                            }`}
                        >
                            {msg.role === 'model' && (
                                <>
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] rounded-full pointer-events-none"></div>
                                </>
                            )}
                            <div className="whitespace-pre-wrap leading-8 text-base font-light font-sans tracking-wide">
                                {msg.text.split('\n').map((line, i) => {
                                    if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
                                         return <h4 key={i} className="font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-white mt-8 mb-4 text-xl tracking-wide">{line.replace(/\*\*/g, '')}</h4>;
                                    }
                                    if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
                                         return <li key={i} className="ml-4 mb-3 text-slate-300 list-disc marker:text-indigo-500 pl-2">{line.replace(/^[\*\-]\s*/, '')}</li>
                                    }
                                    return <p key={i} className="mb-4">{line}</p>;
                                })}
                            </div>
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="bg-[#0A0B12]/80 backdrop-blur-sm border border-indigo-500/20 rounded-3xl rounded-tl-none p-6 flex items-center gap-4 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                            <div className="flex items-center gap-1.5 h-6">
                                <span className="w-1.5 h-3 bg-cyan-500 rounded-full animate-[music_1s_ease-in-out_infinite]"></span>
                                <span className="w-1.5 h-5 bg-indigo-500 rounded-full animate-[music_1s_ease-in-out_infinite_0.1s]"></span>
                                <span className="w-1.5 h-4 bg-purple-500 rounded-full animate-[music_1s_ease-in-out_infinite_0.2s]"></span>
                                <span className="w-1.5 h-3 bg-pink-500 rounded-full animate-[music_1s_ease-in-out_infinite_0.3s]"></span>
                            </div>
                            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Interpretando Sinais...</span>
                        </div>
                        {/* Define music keyframe in style just for this component if not in global css */}
                        <style>{`
                            @keyframes music {
                                0%, 100% { height: 8px; opacity: 0.5; }
                                50% { height: 20px; opacity: 1; }
                            }
                        `}</style>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>

        {/* Professional Input Area */}
        <div className="relative z-20 p-8 pt-0 bg-gradient-to-t from-[#050508] via-[#050508] to-transparent">
            <div className="max-w-5xl mx-auto">
                 <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 rounded-2xl opacity-0 group-hover:opacity-30 transition duration-1000 blur-lg"></div>
                    <div className="relative flex items-center gap-4 bg-[#0A0B10]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl transition-all duration-300 focus-within:border-indigo-500/50 focus-within:bg-[#0F1016]">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={profile ? "Pergunte ao oráculo estelar..." : "Configure seu perfil..."}
                            disabled={!profile || isLoading}
                            className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-600 px-6 py-4 text-lg font-light tracking-wide"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!profile || !input.trim() || isLoading}
                            className="p-4 bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-white/5 disabled:text-slate-700 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/40 hover:scale-105 active:scale-95"
                        >
                            <SendIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </main>

      {/* High-End Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
            <div className="bg-[#08090E] border border-white/10 rounded-[2rem] w-full max-w-xl shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-slide-up">
                <div className="p-10 border-b border-white/5 flex justify-between items-center bg-[#0C0D12]">
                    <div>
                        <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3 tracking-wide">
                            <UserIcon className="w-6 h-6 text-indigo-400" />
                            DADOS DO NATIVO
                        </h2>
                        <p className="text-xs text-slate-500 uppercase tracking-widest mt-2 font-bold">Protocolo de Análise Mestre</p>
                    </div>
                    <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleProfileSubmit} className="p-10 space-y-8">
                    <div className="group">
                        <label className="block text-[10px] uppercase tracking-widest text-indigo-300/70 mb-3 font-bold group-focus-within:text-indigo-400 transition-colors">Nome Completo</label>
                        <input name="name" required defaultValue={profile?.name} className="w-full bg-white/5 border border-white/10 rounded-xl p-5 text-white focus:border-indigo-500/50 outline-none transition-all placeholder-slate-700 text-lg font-light focus:bg-white/10" placeholder="Ex: Maria da Silva Souza" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-indigo-300/70 mb-3 font-bold">Nascimento</label>
                            <input type="date" name="birthDate" required defaultValue={profile?.birthDate} className="w-full bg-white/5 border border-white/10 rounded-xl p-5 text-white focus:border-indigo-500/50 outline-none transition-all appearance-none text-base" />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-indigo-300/70 mb-3 font-bold">Horário</label>
                            <input type="time" name="birthTime" required defaultValue={profile?.birthTime} className="w-full bg-white/5 border border-white/10 rounded-xl p-5 text-white focus:border-indigo-500/50 outline-none transition-all text-base" />
                        </div>
                    </div>

                    <div className="relative group" onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}>
                        <label className="block text-[10px] uppercase tracking-widest text-indigo-300/70 mb-3 font-bold group-focus-within:text-indigo-400 transition-colors">Localidade</label>
                        <input 
                            name="birthLocation" 
                            required 
                            value={locationQuery}
                            onChange={handleLocationChange}
                            onFocus={() => { if(locationSuggestions.length > 0) setShowSuggestions(true); }}
                            autoComplete="off"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-5 text-white focus:border-indigo-500/50 outline-none transition-all text-lg font-light focus:bg-white/10" 
                            placeholder="Ex: São Paulo, SP" 
                        />
                        
                        {showSuggestions && (locationSuggestions.length > 0 || isSearchingLocation) && (
                            <div className="absolute top-full left-0 right-0 mt-3 bg-[#0C0D12] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.9)] z-50 max-h-56 overflow-y-auto custom-scrollbar backdrop-blur-xl">
                                {isSearchingLocation && (
                                    <div className="p-6 text-sm text-slate-400 flex items-center gap-4">
                                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="uppercase tracking-wider text-xs font-bold">Localizando...</span>
                                    </div>
                                )}
                                {!isSearchingLocation && locationSuggestions.map((loc, idx) => (
                                    <div 
                                        key={idx}
                                        onMouseDown={(e) => { e.preventDefault(); selectLocation(loc); }}
                                        className="p-5 text-sm text-slate-300 hover:bg-indigo-600/20 hover:text-white cursor-pointer transition-colors border-b border-white/5 last:border-none font-medium flex items-center gap-3 group/item"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 group-hover/item:bg-indigo-400 transition-colors"></span>
                                        {loc}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button type="submit" className="w-full mt-6 bg-white text-black hover:bg-indigo-50 font-bold py-5 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] transform transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-200/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <SparklesIcon className="w-4 h-4" /> Inicializar Mapa Mestre
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}

export default App;