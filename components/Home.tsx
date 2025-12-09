import React, { useState, useEffect, useRef } from 'react';
import { NIVELES, GRADOS_INICIAL, GRADOS_PRIMARIA, GRADOS_SECUNDARIA, AREAS } from '../constants';
import { SessionRequest, SessionRecord, SessionData, ResourceUpdateCallback } from '../types';
import { SessionGenerator } from '../core/SessionGenerator';
import { Mic, Loader2, Sparkles, History, ArrowRight, Camera, Image as ImageIcon, X, ChevronRight, BookOpen, GraduationCap } from 'lucide-react';

interface HomeProps {
    onSessionGenerated: (data: SessionData) => void;
    onResourceUpdate: ResourceUpdateCallback;
}

const Home: React.FC<HomeProps> = ({ onSessionGenerated, onResourceUpdate }) => {
    const [nivel, setNivel] = useState(NIVELES[1]);
    const [grado, setGrado] = useState(GRADOS_PRIMARIA[0]);
    const [area, setArea] = useState(AREAS[0]);
    const [prompt, setPrompt] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('Generando sesión...');
    const [history, setHistory] = useState<SessionRecord[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const recognitionRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Update grades when level changes
    useEffect(() => {
        if (nivel === 'Inicial') setGrado(GRADOS_INICIAL[0]);
        else if (nivel === 'Primaria') setGrado(GRADOS_PRIMARIA[0]);
        else if (nivel === 'Secundaria') setGrado(GRADOS_SECUNDARIA[0]);
    }, [nivel]);

    useEffect(() => {
        const saved = localStorage.getItem('aula_history');
        if (saved) {
            try {
                setHistory(JSON.parse(saved).slice(0, 3));
            } catch (e) {
                console.error("History load error", e);
            }
        }

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

    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const clearImage = () => {
        setSelectedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async () => {
        if (!prompt.trim() && !selectedImage) return;
        setLoading(true);
        setLoadingText("Analizando solicitud...");

        const messages = ["Estructurando momentos...", "Diseñando estrategias...", "Creando fichas...", "Preparando recursos..."];
        let msgIdx = 0;
        const interval = setInterval(() => {
            setLoadingText(messages[msgIdx % messages.length]);
            msgIdx++;
        }, 2500);

        try {
            const request: SessionRequest = { 
                nivel, 
                grado, 
                area, 
                prompt,
                image: selectedImage || undefined
            };

            const data = await SessionGenerator.generateWithCallback(request, onResourceUpdate);

            const newRecord: SessionRecord = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                data,
                preview: data.sessionTitle
            };

            // Update state with data
            const newHistory = [newRecord, ...history].slice(0, 3);
            setHistory(newHistory);

            const cleanHistory = newHistory.map(rec => ({
                ...rec,
                data: {
                    ...rec.data,
                    resources: {
                        ...rec.data.resources,
                        images: rec.data.resources?.images?.map(img => {
                            const { base64Data, ...rest } = img;
                            return rest;
                        }) || []
                    }
                }
            }));

            try {
                localStorage.setItem('aula_history', JSON.stringify(cleanHistory));
            } catch (e) {
                console.warn("LocalStorage quota", e);
            }

            clearInterval(interval);
            onSessionGenerated(data);

        } catch (error) {
            clearInterval(interval);
            alert("Hubo un error. Por favor intenta de nuevo.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadFromHistory = (record: SessionRecord) => {
        onSessionGenerated(record.data);
    };

    const getGrades = () => {
        if (nivel === 'Inicial') return GRADOS_INICIAL;
        if (nivel === 'Secundaria') return GRADOS_SECUNDARIA;
        return GRADOS_PRIMARIA;
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
            {/* Background Decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-100/50 rounded-full blur-3xl opacity-60 mix-blend-multiply" />
                <div className="absolute top-[20%] right-0 w-[800px] h-[600px] bg-indigo-100/40 rounded-full blur-3xl opacity-50 mix-blend-multiply" />
            </div>

            <div className="w-full max-w-4xl relative z-10 space-y-8">
                
                {/* Header */}
                <div className="text-center space-y-4 mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 border border-slate-200 text-slate-600 text-sm font-medium shadow-sm backdrop-blur-sm mb-4">
                        <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span>Asistente IA para Docentes</span>
                    </div>
                    <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900">
                        Aula <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Express</span>
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Diseña sesiones de aprendizaje completas en segundos. Sube una foto de tu libro o describe tu idea.
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/80">
                    <div className="p-1 sm:p-2 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2">
                        {/* Selectors Bar */}
                        <div className="flex-1 grid grid-cols-3 sm:flex sm:items-center gap-2 p-2">
                            <div className="relative group min-w-[120px]">
                                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                <select 
                                    value={nivel} 
                                    onChange={(e) => setNivel(e.target.value)} 
                                    className="w-full pl-9 pr-4 py-2.5 bg-white border-none rounded-xl text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:ring-blue-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                            
                            <div className="relative group min-w-[100px]">
                                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                <select 
                                    value={grado} 
                                    onChange={(e) => setGrado(e.target.value)} 
                                    className="w-full pl-9 pr-4 py-2.5 bg-white border-none rounded-xl text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:ring-blue-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    {getGrades().map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>

                            <div className="relative group flex-1 min-w-[150px]">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors pointer-events-none">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20" /></svg>
                                </div>
                                <select 
                                    value={area} 
                                    onChange={(e) => setArea(e.target.value)} 
                                    className="w-full pl-9 pr-4 py-2.5 bg-white border-none rounded-xl text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:ring-blue-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 sm:p-8 space-y-6">
                        <div className="relative">
                            <label className="block text-sm font-bold text-slate-700 mb-3 ml-1">
                                ¿Qué quieres enseñar hoy?
                            </label>
                            
                            <div className={`relative bg-slate-50 rounded-2xl border-2 transition-all duration-300 ${isListening ? 'border-red-400 ring-4 ring-red-100' : 'border-slate-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100'}`}>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Ej: 'La célula' para secundaria, o sube una foto de tu libro de texto..."
                                    className="w-full p-5 bg-transparent border-none focus:ring-0 text-slate-800 text-lg placeholder-slate-400 resize-none min-h-[160px]"
                                />

                                {/* Image Preview */}
                                {selectedImage && (
                                    <div className="absolute top-4 right-4 z-10">
                                        <div className="relative group">
                                            <img src={selectedImage} alt="Preview" className="w-20 h-20 object-cover rounded-xl shadow-md border-2 border-white transform group-hover:scale-105 transition-transform" />
                                            <button 
                                                onClick={clearImage}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Action Bar inside textarea */}
                                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                                    <div className="flex gap-2">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            capture="environment"
                                            className="hidden" 
                                            ref={fileInputRef}
                                            onChange={handleImageSelect}
                                        />
                                        <button 
                                            onClick={triggerFileInput}
                                            className="p-2.5 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-blue-600 transition-all flex items-center gap-2 group"
                                            title="Subir foto o tomar captura"
                                        >
                                            <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                            <span className="text-xs font-semibold hidden sm:inline">Foto</span>
                                        </button>
                                        <button 
                                            onClick={toggleMic}
                                            className={`p-2.5 rounded-xl hover:bg-white hover:shadow-sm transition-all flex items-center gap-2 group ${isListening ? 'text-red-500 bg-red-50 animate-pulse' : 'text-slate-400 hover:text-red-500'}`}
                                            title="Dictado por voz"
                                        >
                                            <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                            <span className="text-xs font-semibold hidden sm:inline">{isListening ? 'Escuchando...' : 'Voz'}</span>
                                        </button>
                                    </div>
                                    <div className="text-xs font-medium text-slate-400">
                                        {prompt.length} caracteres
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={loading || (!prompt.trim() && !selectedImage)}
                            className={`w-full group relative overflow-hidden rounded-2xl py-5 px-6 font-bold text-lg shadow-xl transition-all duration-300 transform active:scale-[0.98] ${
                                loading || (!prompt.trim() && !selectedImage)
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/30 hover:to-indigo-500'
                            }`}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin w-6 h-6" />
                                        {loadingText}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Generar Sesión de Aprendizaje
                                    </>
                                )}
                            </span>
                            {!loading && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
                        </button>
                    </div>
                </div>

                {/* History Section */}
                {history.length > 0 && (
                    <div className="pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <History className="w-4 h-4 text-slate-400" />
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Creado Recientemente</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {history.map(record => (
                                <button 
                                    key={record.id} 
                                    onClick={() => loadFromHistory(record)} 
                                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-1 transition-all text-left group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 -translate-x-2 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                    <h4 className="font-bold text-slate-800 line-clamp-2 text-sm mb-1">{record.preview}</h4>
                                    <p className="text-xs text-slate-500 font-medium">{record.data.area}</p>
                                    <p className="text-[10px] text-slate-400 mt-2">
                                        {new Date(record.timestamp).toLocaleDateString()}
                                    </p>
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