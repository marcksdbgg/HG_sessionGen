import React, { useState, useEffect, useRef } from 'react';
import { NIVELES, GRADOS_PRIMARIA, AREAS } from '../constants';
import { SessionRequest, SessionRecord, SessionData } from '../types';
import { generateSession } from '../services/geminiService';
import { Mic, Loader2, Sparkles, History, ArrowRight } from 'lucide-react';

interface HomeProps {
  onSessionGenerated: (data: SessionData) => void;
}

const Home: React.FC<HomeProps> = ({ onSessionGenerated }) => {
  const [nivel, setNivel] = useState(NIVELES[1]); // Default Primaria
  const [grado, setGrado] = useState(GRADOS_PRIMARIA[0]);
  const [area, setArea] = useState(AREAS[0]);
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Generando sesión...');
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Load history
    const saved = localStorage.getItem('aula_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved).slice(0, 3));
      } catch (e) {
        console.error("History load error", e);
      }
    }

    // Init Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.lang = 'es-PE';
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setPrompt(prev => prev + (prev ? ' ' : '') + transcript);
            setIsListening(false);
        };

        recognitionRef.current.onerror = () => setIsListening(false);
        recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) {
        alert("Tu navegador no soporta dictado por voz.");
        return;
    }
    if (isListening) {
        recognitionRef.current.stop();
    } else {
        setIsListening(true);
        recognitionRef.current.start();
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setLoadingText("Interpretando pedido...");
    
    // Friendly Loading Messages cycle
    const messages = [
        "Estructurando momentos...",
        "Diseñando estrategias...",
        "Creando fichas...",
        "Finalizando detalles..."
    ];
    let msgIdx = 0;
    const interval = setInterval(() => {
        setLoadingText(messages[msgIdx % messages.length]);
        msgIdx++;
    }, 2500);

    try {
        const request: SessionRequest = { nivel, grado, area, prompt };
        const data = await generateSession(request);
        
        // Save to history
        const newRecord: SessionRecord = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            data,
            preview: data.sessionTitle
        };
        const newHistory = [newRecord, ...history].slice(0, 3);
        setHistory(newHistory);
        localStorage.setItem('aula_history', JSON.stringify(newHistory));
        
        clearInterval(interval);
        onSessionGenerated(data);
    } catch (error) {
        clearInterval(interval);
        alert("Hubo un error generando la sesión. Por favor intenta de nuevo.");
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  const loadFromHistory = (record: SessionRecord) => {
      onSessionGenerated(record.data);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
      <div className="w-full max-w-lg space-y-8 mt-4 sm:mt-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 mb-2">
                <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Aula CHAVOOO
            </h1>
            <p className="text-slate-500 font-medium">
                Tu sesión de aprendizaje en segundos.
            </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100">
            <div className="p-6 space-y-5">
                
                {/* Selectors */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Nivel</label>
                        <select 
                            value={nivel} 
                            onChange={(e) => setNivel(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 font-medium"
                        >
                            {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Grado</label>
                        <select 
                            value={grado} 
                            onChange={(e) => setGrado(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 font-medium"
                        >
                            {GRADOS_PRIMARIA.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Área Curricular</label>
                    <select 
                        value={area} 
                        onChange={(e) => setArea(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 font-medium"
                    >
                        {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>

                {/* Input Area */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">¿Qué quieres enseñar hoy?</label>
                    <div className="relative">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ej: La decena con juegos para niños, incluyendo una ficha de conteo..."
                            className="block w-full p-4 pb-12 text-sm text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent resize-none h-32 transition-all"
                        />
                        <button 
                            onClick={toggleMic}
                            className={`absolute right-3 bottom-3 p-2 rounded-full transition-all duration-200 ${
                                isListening 
                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110 animate-pulse' 
                                : 'bg-white text-slate-400 hover:text-primary shadow-sm border border-slate-200'
                            }`}
                        >
                            <Mic className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* CTA */}
                <button
                    onClick={handleSubmit}
                    disabled={loading || !prompt.trim()}
                    className={`w-full flex items-center justify-center py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform active:scale-[0.98] ${
                        loading || !prompt.trim()
                        ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                        : 'bg-primary hover:bg-blue-700 shadow-blue-500/30'
                    }`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                            {loadingText}
                        </>
                    ) : (
                        "Generar Sesión"
                    )}
                </button>
            </div>
        </div>

        {/* Recent History */}
        {history.length > 0 && (
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-400 px-1">
                    <History className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Recientes</span>
                </div>
                <div className="grid gap-3">
                    {history.map(record => (
                        <button
                            key={record.id}
                            onClick={() => loadFromHistory(record)}
                            className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all text-left w-full"
                        >
                            <div>
                                <h3 className="font-semibold text-slate-800 line-clamp-1">{record.preview}</h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    {record.data.area} • {record.data.cycleGrade}
                                </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </button>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default Home;