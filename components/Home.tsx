import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NIVELES, GRADOS_INICIAL, GRADOS_PRIMARIA, GRADOS_SECUNDARIA, AREAS } from '../constants';
import { SessionRequest, SessionRecord, SessionData } from '../types';
import { SessionGenerator } from '../core/SessionGenerator';
import { Mic, MicOff, Loader2, Sparkles, History, ArrowRight, Camera, X, Image as ImageIcon, Upload } from 'lucide-react';

interface HomeProps {
    onSessionGenerated: (data: SessionData) => void;
}

const Home: React.FC<HomeProps> = ({ onSessionGenerated }) => {
    const [nivel, setNivel] = useState(NIVELES[1]);
    const [grado, setGrado] = useState(GRADOS_PRIMARIA[0]);
    const [area, setArea] = useState(AREAS[0]);
    const [prompt, setPrompt] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('Generando sesión...');
    const [history, setHistory] = useState<SessionRecord[]>([]);

    // Image state
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [imageMimeType, setImageMimeType] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [showImageOptions, setShowImageOptions] = useState(false);

    const recognitionRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

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

        // Initialize speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.lang = 'es-PE';
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                if (finalTranscript) {
                    setPrompt(prev => prev + (prev ? ' ' : '') + finalTranscript);
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                if (isListening) {
                    // Auto-restart if still supposed to be listening
                    try {
                        recognitionRef.current.start();
                    } catch (e) {
                        setIsListening(false);
                    }
                }
            };
        }
    }, []);

    const toggleMic = () => {
        if (!recognitionRef.current) {
            alert("Tu navegador no soporta dictado por voz. Prueba con Chrome o Edge.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            setIsListening(true);
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error('Failed to start recognition:', e);
                setIsListening(false);
            }
        }
    };

    // Image handling
    const handleImageSelect = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida.');
            return;
        }

        // Limit file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen es muy grande. Máximo 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1]; // Remove data:image/xxx;base64, prefix
            setImageBase64(base64Data);
            setImageMimeType(file.type);
            setImagePreview(base64);
            setShowImageOptions(false);

            // Add descriptive prompt if empty
            if (!prompt.trim()) {
                setPrompt('Crea una sesión basada en esta imagen del libro/material didáctico');
            }
        };
        reader.readAsDataURL(file);
    }, [prompt]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleImageSelect(file);
        e.target.value = ''; // Reset input
    };

    const removeImage = () => {
        setImageBase64(null);
        setImageMimeType(null);
        setImagePreview(null);
    };

    const handleSubmit = async () => {
        if (!prompt.trim() && !imageBase64) return;

        // Stop listening if active
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }

        setLoading(true);
        setLoadingText(imageBase64 ? "Analizando imagen..." : "Interpretando pedido...");

        const messages = imageBase64
            ? ["Procesando contenido visual...", "Extrayendo información...", "Estructurando momentos...", "Diseñando estrategias...", "Creando fichas..."]
            : ["Estructurando momentos...", "Diseñando estrategias...", "Creando fichas...", "Aplicando formato..."];

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
                prompt: prompt || 'Crea una sesión basada en la imagen proporcionada',
                imageBase64: imageBase64 || undefined,
                imageMimeType: imageMimeType || undefined
            };

            const data = await SessionGenerator.generate(request);

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

    const canSubmit = (prompt.trim() || imageBase64) && !loading;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/30 flex flex-col items-center p-4 pb-8">
            <div className="w-full max-w-lg space-y-6 mt-4 sm:mt-8">

                {/* Header - Mobile optimized */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 mb-2">
                        <Sparkles className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Aula Express</h1>
                    <p className="text-slate-500 font-medium text-sm sm:text-base">Genera sesiones de aprendizaje en segundos</p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100">
                    <div className="p-5 sm:p-6 space-y-5">

                        {/* Selectors - 2 column grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Nivel</label>
                                <select
                                    value={nivel}
                                    onChange={(e) => setNivel(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Grado</label>
                                <select
                                    value={grado}
                                    onChange={(e) => setGrado(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    {getGrades().map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Area - Full width */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Área Curricular</label>
                            <select
                                value={area}
                                onChange={(e) => setArea(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            >
                                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>

                        {/* Image Preview */}
                        {imagePreview && (
                            <div className="relative rounded-2xl overflow-hidden border-2 border-blue-200 bg-blue-50">
                                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                                <button
                                    onClick={removeImage}
                                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" />
                                    Imagen adjunta
                                </div>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                                {imagePreview ? '¿Qué quieres hacer con esta imagen?' : '¿Qué quieres enseñar hoy?'}
                            </label>
                            <div className="relative">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={imagePreview
                                        ? "Ej: Crea una sesión basada en esta teoría del libro..."
                                        : "Ej: La decena con juegos para niños de 6 años..."}
                                    className={`block w-full p-4 pb-16 text-base text-slate-900 bg-slate-50 rounded-2xl border-2 focus:ring-0 focus:border-blue-500 resize-none h-36 transition-all ${isListening ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                                        }`}
                                />

                                {/* Input action buttons */}
                                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                                    {/* Left side - Image options */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowImageOptions(!showImageOptions)}
                                            className={`p-2.5 rounded-xl transition-all duration-200 ${imageBase64
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white text-slate-400 hover:text-blue-500 shadow-sm border border-slate-200 hover:border-blue-300'
                                                }`}
                                        >
                                            <Camera className="w-5 h-5" />
                                        </button>

                                        {/* Image options dropdown */}
                                        {showImageOptions && (
                                            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-slate-100 p-2 min-w-[180px] z-10">
                                                <button
                                                    onClick={() => cameraInputRef.current?.click()}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                                                >
                                                    <Camera className="w-5 h-5 text-blue-500" />
                                                    <span>Tomar foto</span>
                                                </button>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                                                >
                                                    <Upload className="w-5 h-5 text-indigo-500" />
                                                    <span>Subir imagen</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right side - Voice button */}
                                    <button
                                        onClick={toggleMic}
                                        className={`p-3 rounded-xl transition-all duration-200 ${isListening
                                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110 animate-pulse'
                                                : 'bg-white text-slate-400 hover:text-blue-500 shadow-sm border border-slate-200 hover:border-blue-300'
                                            }`}
                                    >
                                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Voice indicator */}
                            {isListening && (
                                <div className="flex items-center gap-2 text-red-500 text-sm font-medium animate-pulse">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    Escuchando... Habla ahora
                                </div>
                            )}
                        </div>

                        {/* Hidden file inputs */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className={`w-full flex items-center justify-center py-4 px-6 rounded-2xl text-white font-bold text-lg shadow-lg transition-all transform active:scale-[0.98] ${canSubmit
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/30'
                                    : 'bg-slate-300 cursor-not-allowed shadow-none'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-3 h-6 w-6" />
                                    {loadingText}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Generar Sesión
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* History Section */}
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
                                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 hover:shadow-md transition-all text-left w-full"
                                >
                                    <div>
                                        <h3 className="font-semibold text-slate-800 line-clamp-1">{record.preview}</h3>
                                        <p className="text-xs text-slate-400 mt-1">{record.data.area} • {record.data.cycleGrade}</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Feature hints - Mobile friendly */}
                <div className="text-center text-xs text-slate-400 space-y-1 pb-4">
                    <p>💡 <strong>Dicta</strong> tu pedido o <strong>sube una foto</strong> del libro</p>
                    <p>La IA analizará el contenido y creará la sesión</p>
                </div>
            </div>

            {/* Click outside to close image options */}
            {showImageOptions && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowImageOptions(false)}
                />
            )}
        </div>
    );
};

export default Home;