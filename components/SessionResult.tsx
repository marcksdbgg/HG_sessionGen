import React, { useState } from 'react';
import { SessionData, GeneratedImage } from '../types';
import { ExportManager } from '../core/ExportManager';
import { SessionGenerator } from '../core/SessionGenerator';
import { copyToClipboard } from '../services/exportService';
import { ArrowLeft, Printer, FileJson, BookOpen, Clock, Edit3, Check, MonitorPlay, Image as ImageIcon, Sparkles, RefreshCw, X } from 'lucide-react';
import { MarkdownText, groupItemsByHeaders } from '../utils/markdownParser';
import ResourcesPresenter from './ResourcesPresenter';
import { fuzzyMatchImage } from '../utils/normalization';

interface SessionResultProps {
    data: SessionData;
    formatId: string;
    onBack: () => void;
}

// Tooltip component
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative group/tooltip">
        {children}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
        </div>
    </div>
);

/**
 * Parses text to find {{imagen:Title}} tags and renders them as interactive buttons.
 */
const SmartTextRenderer: React.FC<{ 
    text: string; 
    images: GeneratedImage[] | undefined;
    onOpenImage: (img: GeneratedImage) => void; 
}> = ({ text, images, onOpenImage }) => {
    if (!text) return null;

    // Regex to find {{imagen:Title}}
    const parts = text.split(/(\{\{imagen:.*?\}\})/g);

    return (
        <span className="text-slate-700 leading-relaxed">
            {parts.map((part, index) => {
                const match = part.match(/\{\{imagen:(.*?)\}\}/);
                if (match) {
                    const titleRef = match[1].trim();
                    // Refactor: Use fuzzy matching utility
                    const imgMatch = fuzzyMatchImage(titleRef, images);
                    
                    // Find actual image object if ID matches
                    const img = imgMatch ? images?.find(i => i.id === imgMatch.id) : undefined;
                    
                    if (img && img.base64Data) {
                        return (
                            <button 
                                key={index}
                                onClick={() => onOpenImage(img)}
                                className="inline-flex items-center gap-1.5 mx-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-sm font-semibold hover:bg-indigo-100 hover:scale-105 transition-all align-middle cursor-pointer"
                            >
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span className="underline decoration-indigo-300 underline-offset-2">{img.title}</span>
                            </button>
                        );
                    } else if (img && !img.base64Data) {
                         // Fallback: Image exists in metadata but not generated yet (rare in this flow)
                         return <span key={index} className="text-slate-400 italic mx-1 text-xs">[Generando: {titleRef}...]</span>;
                    } else {
                        // Fallback if image not found
                        return <span key={index} className="text-slate-500 italic mx-1">[{titleRef}]</span>;
                    }
                }
                return <MarkdownText key={index} text={part} />;
            })}
        </span>
    );
};

const EditableList: React.FC<{
    items: string[];
    isEditing: boolean;
    images?: GeneratedImage[];
    onChange: (newItems: string[]) => void;
    onOpenImage: (img: GeneratedImage) => void;
}> = ({ items, isEditing, images, onChange, onOpenImage }) => {
    if (isEditing) {
        return (
            <textarea
                className="w-full p-3 text-sm border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[120px] bg-emerald-50/30 transition-all duration-200"
                value={items.join('\n')}
                onChange={(e) => onChange(e.target.value.split('\n'))}
                placeholder="Escribe cada elemento en una línea separada..."
            />
        );
    }
    return (
        <ul className="space-y-2">
            {items.map((item, idx) => (
                <li key={idx} className="flex items-start">
                    <span className="mr-2 text-primary font-bold mt-1.5">•</span>
                    <div className="flex-1">
                        <SmartTextRenderer text={item} images={images} onOpenImage={onOpenImage} />
                    </div>
                </li>
            ))}
        </ul>
    );
};

const SectionHeader: React.FC<{
    title: string;
    icon: React.ReactNode;
    colorClass: string;
    onRegenerate?: () => void;
    isLoading?: boolean;
    isEditing?: boolean;
}> = ({ title, icon, colorClass, onRegenerate, isLoading, isEditing }) => (
    <div className={`px-6 py-4 border-b flex items-center justify-between ${colorClass} ${isEditing ? 'ring-2 ring-emerald-400 ring-inset' : ''}`}>
        <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-bold text-lg">{title}</h3>
        </div>
        {onRegenerate && (
            <Tooltip text={isEditing ? "Regenerar con IA" : "Activa el modo edición para regenerar"}>
                <button
                    onClick={isEditing ? onRegenerate : undefined}
                    disabled={isLoading || !isEditing}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${isEditing
                        ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-md hover:shadow-lg transform hover:scale-105'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                >
                    <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-pulse' : ''}`} />
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{isLoading ? 'Regenerando...' : 'Regenerar'}</span>
                </button>
            </Tooltip>
        )}
    </div>
);

const SessionResult: React.FC<SessionResultProps> = ({ data: initialData, formatId, onBack }) => {
    const [data, setData] = useState(initialData);
    const [isEditing, setIsEditing] = useState(false);
    const [printSection, setPrintSection] = useState<'none' | 'session' | 'ficha_aula' | 'ficha_casa'>('none');
    const [regenerating, setRegenerating] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    
    // Presentation State
    const [showPresentation, setShowPresentation] = useState(false);
    const [presentationInitialImage, setPresentationInitialImage] = useState<GeneratedImage | null>(null);

    const handleCopyLatex = () => {
        const latex = ExportManager.generateLatex(data);
        copyToClipboard(latex);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrint = (section: 'session' | 'ficha_aula' | 'ficha_casa') => {
        setPrintSection(section);
        setTimeout(() => {
            window.print();
            setPrintSection('none');
        }, 100);
    };

    const handleRegenerate = async (section: keyof SessionData, instructions: string) => {
        if (!confirm("¿Deseas regenerar esta sección? Se perderán los cambios manuales.")) return;
        setRegenerating(section as string);
        try {
            const newData = await SessionGenerator.regenerateSection(data, section, instructions);
            setData(prev => ({ ...prev, [section]: newData }));
        } catch (e) {
            alert("Error regenerando sección.");
        } finally {
            setRegenerating(null);
        }
    };
    
    const handleRecoverImages = async () => {
        setRegenerating('images');
        try {
            const newData = await SessionGenerator.recoverImages(data);
            setData(newData);
        } catch (e) {
            alert("Error recuperando imágenes.");
        } finally {
            setRegenerating(null);
        }
    };

    const updateSection = (section: keyof SessionData, field: string, value: any) => {
        setData(prev => ({
            ...prev,
            [section]: {
                ...prev[section] as any,
                [field]: value
            }
        }));
    };

    const handleOpenImage = (img: GeneratedImage) => {
        setPresentationInitialImage(img);
        setShowPresentation(true);
    };

    const isPrinting = printSection !== 'none';
    const showSession = !isPrinting || printSection === 'session';
    const showFichaAula = !isPrinting || printSection === 'ficha_aula';
    const showFichaCasa = !isPrinting || printSection === 'ficha_casa';
    
    // Check if images need recovery (have prompt but missing data)
    const hasMissingImages = data.resources?.images?.some(img => !img.base64Data && img.prompt);

    return (
        <>
            {showPresentation && data.resources && (
                <ResourcesPresenter 
                    resources={data.resources} 
                    initialImage={presentationInitialImage}
                    onClose={() => {
                        setShowPresentation(false);
                        setPresentationInitialImage(null);
                    }} 
                />
            )}
        
            <div className={`min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0 ${isPrinting ? 'print-mode' : ''} ${showPresentation ? 'hidden' : ''}`}>

                {/* Navbar */}
                <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm no-print">
                    <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900 font-medium">
                        <ArrowLeft className="w-5 h-5 mr-1" /> Volver
                    </button>
                    <div className="flex items-center gap-3">
                        {hasMissingImages && (
                            <Tooltip text="Las imágenes no se guardaron en el historial para ahorrar espacio. Click para regenerarlas.">
                                <button
                                    onClick={handleRecoverImages}
                                    disabled={!!regenerating}
                                    className="hidden sm:flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all"
                                >
                                    <RefreshCw className={`w-4 h-4 ${regenerating === 'images' ? 'animate-spin' : ''}`} />
                                    <span>Restaurar Imágenes</span>
                                </button>
                            </Tooltip>
                        )}
                    
                        {data.resources && !hasMissingImages && (
                            <Tooltip text="Ver todos los recursos (Organizador + Imágenes)">
                                <button
                                    onClick={() => setShowPresentation(true)}
                                    className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-black transition-all shadow-md"
                                >
                                    <MonitorPlay className="w-4 h-4" />
                                    <span>Presentación</span>
                                </button>
                            </Tooltip>
                        )}
                        <Tooltip text={isEditing ? "Guardar cambios" : "Editar contenido de la sesión"}>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 shadow-md ${isEditing
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 ring-2 ring-emerald-300 ring-offset-2'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                {isEditing ? <Check className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                                <span className="hidden sm:inline">{isEditing ? 'Guardar' : 'Editar'}</span>
                            </button>
                        </Tooltip>
                        <div className="relative group">
                            <button className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-md transition-all">
                                <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Exportar</span>
                            </button>
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 p-2 hidden group-hover:block z-30">
                                <button onClick={() => handlePrint('session')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">📄 PDF Sesión</button>
                                <button onClick={() => handlePrint('ficha_aula')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">📝 PDF Ficha Aula</button>
                                <button onClick={() => handlePrint('ficha_casa')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">🏠 PDF Ficha Casa</button>
                                <button onClick={handleCopyLatex} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between">
                                    <span>LaTeX</span>
                                    <FileJson className="w-3 h-3 text-slate-400" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {isEditing && (
                    <div className="sticky top-[60px] z-10 mx-4 mt-4 no-print">
                        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center justify-between animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                                <span className="font-bold">✏️ Modo Edición Activo</span>
                            </div>
                            <button onClick={() => setIsEditing(false)} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"><X className="w-4 h-4" /> Salir</button>
                        </div>
                    </div>
                )}

                {/* Mobile Presentation Button */}
                {!showPresentation && data.resources && !hasMissingImages && (
                    <div className="sm:hidden mx-4 mt-4">
                        <button onClick={() => setShowPresentation(true)} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-slate-900 text-white shadow-lg">
                            <MonitorPlay className="w-5 h-5" />
                            <span>Ver Recursos Virtuales</span>
                        </button>
                    </div>
                )}
                
                {/* Mobile Recovery Button */}
                {hasMissingImages && (
                    <div className="sm:hidden mx-4 mt-4">
                         <button 
                            onClick={handleRecoverImages}
                            disabled={!!regenerating}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-amber-100 text-amber-800 border border-amber-200"
                        >
                            <RefreshCw className={`w-5 h-5 ${regenerating === 'images' ? 'animate-spin' : ''}`} />
                            <span>Restaurar Imágenes</span>
                        </button>
                    </div>
                )}

                <div className="max-w-3xl mx-auto px-4 py-6 print:px-0 print:py-0 print:max-w-none">
                    <div className={showSession ? 'block' : 'hidden'}>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none print:border-none">
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">{data.sessionTitle}</h1>
                            <p className="text-slate-500">{data.area} • {data.cycleGrade}</p>
                        </div>

                        <div className="space-y-6">
                            {/* INICIO */}
                            <div className={`bg-white rounded-xl shadow-sm border overflow-hidden print:border-none print:shadow-none transition-all duration-300 ${isEditing ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
                                <SectionHeader
                                    title="Inicio"
                                    icon={<Clock className="w-5 h-5" />}
                                    colorClass="bg-blue-50 text-blue-800 border-blue-100"
                                    onRegenerate={() => handleRegenerate('inicio', 'Cambia la motivación.')}
                                    isLoading={regenerating === 'inicio'}
                                    isEditing={isEditing}
                                />
                                <div className="p-6 space-y-4">
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motivación</span>
                                        <EditableList 
                                            items={data.inicio.motivacion} 
                                            isEditing={isEditing} 
                                            images={data.resources?.images}
                                            onOpenImage={handleOpenImage}
                                            onChange={(val) => updateSection('inicio', 'motivacion', val)} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saberes Previos</span>
                                        <EditableList 
                                            items={data.inicio.saberesPrevios} 
                                            isEditing={isEditing} 
                                            images={data.resources?.images}
                                            onOpenImage={handleOpenImage}
                                            onChange={(val) => updateSection('inicio', 'saberesPrevios', val)} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* DESARROLLO */}
                            <div className={`bg-white rounded-xl shadow-sm border overflow-hidden print:border-none print:shadow-none transition-all duration-300 ${isEditing ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
                                <SectionHeader
                                    title="Desarrollo"
                                    icon={<BookOpen className="w-5 h-5" />}
                                    colorClass="bg-indigo-50 text-indigo-800 border-indigo-100"
                                    onRegenerate={() => handleRegenerate('desarrollo', 'Genera estrategias más interactivas.')}
                                    isLoading={regenerating === 'desarrollo'}
                                    isEditing={isEditing}
                                />
                                <div className="p-6">
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estrategias</span>
                                        <EditableList 
                                            items={data.desarrollo.estrategias} 
                                            isEditing={isEditing} 
                                            images={data.resources?.images}
                                            onOpenImage={handleOpenImage}
                                            onChange={(val) => updateSection('desarrollo', 'estrategias', val)} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* CIERRE */}
                            <div className={`bg-white rounded-xl shadow-sm border overflow-hidden print:border-none print:shadow-none transition-all duration-300 ${isEditing ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
                                <SectionHeader
                                    title="Cierre"
                                    icon={<Clock className="w-5 h-5" />}
                                    colorClass="bg-amber-50 text-amber-800 border-amber-100"
                                    onRegenerate={() => handleRegenerate('cierre', 'Mejora las estrategias.')}
                                    isLoading={regenerating === 'cierre'}
                                    isEditing={isEditing}
                                />
                                <div className="p-6">
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estrategias de Cierre</span>
                                        <EditableList 
                                            items={data.cierre.estrategias} 
                                            isEditing={isEditing} 
                                            images={data.resources?.images}
                                            onOpenImage={handleOpenImage}
                                            onChange={(val) => updateSection('cierre', 'estrategias', val)} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fichas logic remains same... */}
                    <div className={`mt-8 ${showFichaAula ? 'block' : 'hidden'}`}>
                        <div className="bg-white border border-slate-200 rounded-xl p-8 print:border-none print:p-0 shadow-sm">
                            <div className="border-b border-blue-100 pb-4 mb-6">
                                <h2 className="text-xl font-bold text-slate-900">Ficha de Aplicación: Aula</h2>
                                <p className="text-sm text-slate-500">{data.fichas.aula.titulo}</p>
                            </div>
                            <div className="space-y-3">
                                {groupItemsByHeaders(data.fichas.aula.items).map((group, groupIdx) => (
                                    <div key={groupIdx} className="rounded-xl overflow-hidden bg-slate-50 p-4 border border-slate-100">
                                        {group.header && <div className="font-bold text-blue-600 mb-2">{group.header}</div>}
                                        {group.items.map((item, i) => <div key={i} className="mb-2"><MarkdownText text={item} /></div>)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className={`mt-8 ${showFichaCasa ? 'block' : 'hidden'}`}>
                        <div className="bg-white border border-slate-200 rounded-xl p-8 print:border-none print:p-0 shadow-sm">
                            <div className="border-b border-amber-100 pb-4 mb-6">
                                <h2 className="text-xl font-bold text-slate-900">Ficha de Extensión: Casa</h2>
                                <p className="text-sm text-slate-500">{data.fichas.casa.titulo}</p>
                            </div>
                            <div className="space-y-3">
                                {groupItemsByHeaders(data.fichas.casa.items).map((group, groupIdx) => (
                                    <div key={groupIdx} className="rounded-xl overflow-hidden bg-slate-50 p-4 border border-slate-100">
                                        {group.header && <div className="font-bold text-amber-600 mb-2">{group.header}</div>}
                                        {group.items.map((item, i) => <div key={i} className="mb-2"><MarkdownText text={item} /></div>)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <style>{`
            @media print {
                body { background: white; }
                .no-print { display: none !important; }
                .print-mode .hidden { display: none !important; }
                .print-mode .block { display: block !important; }
            }
        `}</style>
            </div>
        </>
    );
};

export default SessionResult;
