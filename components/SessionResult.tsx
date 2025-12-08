import React, { useState } from 'react';
import { SessionData, FichaContent } from '../types';
import { ExportManager } from '../core/ExportManager';
import { SessionGenerator } from '../core/SessionGenerator';
import { copyToClipboard } from '../services/exportService';
import { ArrowLeft, Printer, FileJson, BookOpen, GraduationCap, Clock, Home, PenSquare, RefreshCw, Save, X, Sparkles, Edit3, Check, Play, Layout } from 'lucide-react';
import { MarkdownText, groupItemsByHeaders } from '../utils/markdownParser';

interface SessionResultProps {
    data: SessionData;
    onBack: () => void;
    onViewResources?: () => void;
}

// Tooltip component for better UX
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative group/tooltip">
        {children}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
        </div>
    </div>
);

const EditableList: React.FC<{
    items: string[];
    isEditing: boolean;
    onChange: (newItems: string[]) => void
}> = ({ items, isEditing, onChange }) => {
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
        <ul className="text-slate-800 text-sm leading-relaxed space-y-1.5">
            {items.map((item, idx) => (
                <li key={idx} className="flex items-start">
                    <span className="mr-2 text-primary font-bold">•</span>
                    <MarkdownText text={item} />
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

const SessionResult: React.FC<SessionResultProps> = ({ data: initialData, onBack, onViewResources }) => {
    const [data, setData] = useState(initialData);
    const [isEditing, setIsEditing] = useState(false);
    const [printSection, setPrintSection] = useState<'none' | 'session' | 'ficha_aula' | 'ficha_casa'>('none');
    const [regenerating, setRegenerating] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

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
        setRegenerating(section);
        try {
            const newData = await SessionGenerator.regenerateSection(data, section, instructions);
            setData(prev => ({ ...prev, [section]: newData }));
        } catch (e) {
            alert("Error regenerando sección.");
        } finally {
            setRegenerating(null);
        }
    };

    // Helper to update deeply nested state
    const updateSection = (section: keyof SessionData, field: string, value: any) => {
        setData(prev => ({
            ...prev,
            [section]: {
                ...prev[section] as any,
                [field]: value
            }
        }));
    };

    const isPrinting = printSection !== 'none';
    const showSession = !isPrinting || printSection === 'session';
    const showFichaAula = !isPrinting || printSection === 'ficha_aula';
    const showFichaCasa = !isPrinting || printSection === 'ficha_casa';

    return (
        <div className={`min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0 ${isPrinting ? 'print-mode' : ''}`}>


            {/* Navbar */}
            <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm no-print">
                <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900 font-medium">
                    <ArrowLeft className="w-5 h-5 mr-1" /> Volver
                </button>
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* VIEW RESOURCES - Primary CTA */}
                    {onViewResources && (
                        <button
                            onClick={onViewResources}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        >
                            <Play className="w-4 h-4" />
                            <span className="hidden sm:inline">Ver Recursos</span>
                        </button>
                    )}

                    {/* EDIT BUTTON - Larger and more prominent */}
                    <Tooltip text={isEditing ? "Guardar cambios" : "Editar contenido de la sesión"}>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 shadow-md ${isEditing
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 ring-2 ring-emerald-300 ring-offset-2'
                                : 'bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:from-slate-800 hover:to-slate-900'
                                }`}
                        >
                            {isEditing ? (
                                <>
                                    <Check className="w-5 h-5" />
                                    <span>Guardar</span>
                                </>
                            ) : (
                                <>
                                    <Edit3 className="w-5 h-5" />
                                    <span>Editar Sesión</span>
                                </>
                            )}
                        </button>
                    </Tooltip>

                    <Tooltip text={copied ? "¡Copiado!" : "Copiar como LaTeX"}>
                        <button
                            onClick={handleCopyLatex}
                            className={`p-2.5 rounded-xl transition-all duration-200 ${copied ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            <FileJson className="w-5 h-5" />
                        </button>
                    </Tooltip>

                    <div className="relative group">
                        <button className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-md transition-all">
                            <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Exportar PDF</span>
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 p-2 hidden group-hover:block z-30">
                            <button onClick={() => handlePrint('session')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">📄 PDF Sesión</button>
                            <button onClick={() => handlePrint('ficha_aula')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">📝 PDF Ficha Aula</button>
                            <button onClick={() => handlePrint('ficha_casa')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">🏠 PDF Ficha Casa</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Mode Banner - Floating indicator */}
            {isEditing && (
                <div className="sticky top-[60px] z-10 mx-4 mt-4 no-print">
                    <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                            <span className="font-bold">✏️ Modo Edición Activo</span>
                            <span className="text-emerald-100 text-sm hidden sm:inline">— Haz clic en los textos para editarlos o usa los botones "Regenerar" para crear nuevo contenido con IA</span>
                        </div>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        >
                            <X className="w-4 h-4" />
                            Salir
                        </button>
                    </div>
                </div>
            )}


            <div className="max-w-3xl mx-auto px-4 py-6 print:px-0 print:py-0 print:max-w-none">

                {/* SESSION VIEW */}
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
                                onRegenerate={() => handleRegenerate('inicio', 'Cambia la motivación por algo más participativo y lúdico.')}
                                isLoading={regenerating === 'inicio'}
                                isEditing={isEditing}
                            />
                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motivación</span>
                                    <EditableList items={data.inicio.motivacion} isEditing={isEditing} onChange={(val) => updateSection('inicio', 'motivacion', val)} />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saberes Previos</span>
                                    <EditableList items={data.inicio.saberesPrevios} isEditing={isEditing} onChange={(val) => updateSection('inicio', 'saberesPrevios', val)} />
                                </div>
                            </div>
                        </div>

                        {/* DESARROLLO */}
                        <div className={`bg-white rounded-xl shadow-sm border overflow-hidden print:border-none print:shadow-none transition-all duration-300 ${isEditing ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
                            <SectionHeader
                                title="Desarrollo"
                                icon={<BookOpen className="w-5 h-5" />}
                                colorClass="bg-indigo-50 text-indigo-800 border-indigo-100"
                                onRegenerate={() => handleRegenerate('desarrollo', 'Genera estrategias más interactivas y dinámicas.')}
                                isLoading={regenerating === 'desarrollo'}
                                isEditing={isEditing}
                            />
                            <div className="p-6">
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estrategias</span>
                                    <EditableList items={data.desarrollo.estrategias} isEditing={isEditing} onChange={(val) => updateSection('desarrollo', 'estrategias', val)} />
                                </div>
                            </div>
                        </div>

                        {/* CIERRE */}
                        <div className={`bg-white rounded-xl shadow-sm border overflow-hidden print:border-none print:shadow-none transition-all duration-300 ${isEditing ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
                            <SectionHeader
                                title="Cierre"
                                icon={<Clock className="w-5 h-5" />}
                                colorClass="bg-amber-50 text-amber-800 border-amber-100"
                                onRegenerate={() => handleRegenerate('cierre', 'Mejora las estrategias de cierre con más reflexión.')}
                                isLoading={regenerating === 'cierre'}
                                isEditing={isEditing}
                            />
                            <div className="p-6">
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estrategias de Cierre</span>
                                    <EditableList items={data.cierre.estrategias} isEditing={isEditing} onChange={(val) => updateSection('cierre', 'estrategias', val)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FICHA AULA */}
                <div className={`mt-8 ${showFichaAula ? 'block' : 'hidden'}`}>
                    <div className="bg-white border border-slate-200 rounded-xl p-8 print:border-none print:p-0 shadow-sm">
                        <div className="border-b border-blue-100 pb-4 mb-6">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <BookOpen className="w-4 h-4 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Ficha de Aplicación: Aula</h2>
                            </div>
                            <p className="text-sm text-slate-500 ml-10">{data.fichas.aula.titulo}</p>
                        </div>
                        <div className="space-y-3">
                            {groupItemsByHeaders(data.fichas.aula.items).map((group, groupIdx) => (
                                <div key={groupIdx} className="rounded-xl overflow-hidden">
                                    {group.header && (
                                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-3 font-bold text-sm">
                                            {group.header}
                                        </div>
                                    )}
                                    <div className={`${group.header ? 'bg-blue-50/50 border border-blue-100 border-t-0' : 'bg-slate-50 border border-slate-100'} p-4 space-y-2`}>
                                        {group.items.map((item, i) => (
                                            <div key={i} className="flex gap-3 items-start text-sm">
                                                <span className="text-blue-500 font-bold mt-0.5">›</span>
                                                <MarkdownText text={item} className="text-slate-700 leading-relaxed" />
                                            </div>
                                        ))}
                                        {group.items.length === 0 && !group.header && (
                                            <p className="text-slate-400 italic text-sm">Sin contenido</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* FICHA CASA */}
                <div className={`mt-8 ${showFichaCasa ? 'block' : 'hidden'}`}>
                    <div className="bg-white border border-slate-200 rounded-xl p-8 print:border-none print:p-0 shadow-sm">
                        <div className="border-b border-amber-100 pb-4 mb-6">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <Home className="w-4 h-4 text-amber-600" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Ficha de Extensión: Casa</h2>
                            </div>
                            <p className="text-sm text-slate-500 ml-10">{data.fichas.casa.titulo}</p>
                        </div>
                        <div className="space-y-3">
                            {groupItemsByHeaders(data.fichas.casa.items).map((group, groupIdx) => (
                                <div key={groupIdx} className="rounded-xl overflow-hidden">
                                    {group.header && (
                                        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-3 font-bold text-sm">
                                            {group.header}
                                        </div>
                                    )}
                                    <div className={`${group.header ? 'bg-amber-50/50 border border-amber-100 border-t-0' : 'bg-slate-50 border border-slate-100'} p-4 space-y-2`}>
                                        {group.items.map((item, i) => (
                                            <div key={i} className="flex gap-3 items-start text-sm">
                                                <span className="text-amber-500 font-bold mt-0.5">›</span>
                                                <MarkdownText text={item} className="text-slate-700 leading-relaxed" />
                                            </div>
                                        ))}
                                        {group.items.length === 0 && !group.header && (
                                            <p className="text-slate-400 italic text-sm">Sin contenido</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {/* Hidden style for printing specific sections logic */}
            <style>{`
        @media print {
            body { background: white; }
            .no-print { display: none !important; }
            .print-mode .hidden { display: none !important; }
            .print-mode .block { display: block !important; }
        }
      `}</style>
        </div>
    );
};

export default SessionResult;