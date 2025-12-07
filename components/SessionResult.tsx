import React, { useState } from 'react';
import { SessionData, FichaContent } from '../types';
import { ExportManager } from '../core/ExportManager';
import { SessionGenerator } from '../core/SessionGenerator';
import { copyToClipboard } from '../services/exportService';
import { ArrowLeft, Printer, FileJson, BookOpen, GraduationCap, Clock, Home, PenSquare, RefreshCw, Save, X } from 'lucide-react';

interface SessionResultProps {
  data: SessionData;
  onBack: () => void;
}

const EditableList: React.FC<{ 
    items: string[]; 
    isEditing: boolean; 
    onChange: (newItems: string[]) => void 
}> = ({ items, isEditing, onChange }) => {
    if (isEditing) {
        return (
            <textarea 
                className="w-full p-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent min-h-[100px]"
                value={items.join('\n')}
                onChange={(e) => onChange(e.target.value.split('\n'))}
            />
        );
    }
    return (
        <ul className="text-slate-800 text-sm leading-relaxed space-y-1">
            {items.map((item, idx) => (
                <li key={idx} className="flex items-start">
                    <span className="mr-2 text-primary">•</span>
                    <span>{item}</span>
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
}> = ({ title, icon, colorClass, onRegenerate, isLoading }) => (
    <div className={`px-6 py-3 border-b flex items-center justify-between ${colorClass}`}>
        <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-bold">{title}</h3>
        </div>
        {onRegenerate && (
            <button 
                onClick={onRegenerate}
                disabled={isLoading}
                className="p-1.5 rounded-full hover:bg-black/5 text-slate-500 hover:text-primary transition-colors"
                title="Regenerar sección"
            >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
        )}
    </div>
);

const SessionResult: React.FC<SessionResultProps> = ({ data: initialData, onBack }) => {
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
        <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-5 h-5 mr-1" /> Back
        </button>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsEditing(!isEditing)} 
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isEditing ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
                {isEditing ? <><Save className="w-4 h-4" /> Guardar</> : <><PenSquare className="w-4 h-4" /> Editar</>}
            </button>
            <button onClick={handleCopyLatex} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full">
                <FileJson className={`w-5 h-5 ${copied ? 'text-green-600' : ''}`} />
            </button>
            
            <div className="relative group">
                <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-700">
                    <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Exportar PDF</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 p-1 hidden group-hover:block z-30">
                    <button onClick={() => handlePrint('session')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded">PDF Sesión</button>
                    <button onClick={() => handlePrint('ficha_aula')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded">PDF Ficha Aula</button>
                    <button onClick={() => handlePrint('ficha_casa')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded">PDF Ficha Casa</button>
                </div>
            </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 print:px-0 print:py-0 print:max-w-none">
        
        {/* SESSION VIEW */}
        <div className={showSession ? 'block' : 'hidden'}>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none print:border-none">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">{data.sessionTitle}</h1>
                <p className="text-slate-500">{data.area} • {data.cycleGrade}</p>
            </div>

            <div className="space-y-6">
                {/* INICIO */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                    <SectionHeader 
                        title="Inicio" 
                        icon={<Clock className="w-4 h-4" />} 
                        colorClass="bg-blue-50 text-blue-800 border-blue-100"
                        onRegenerate={isEditing ? () => handleRegenerate('inicio', 'Cambia la motivación por algo más participativo.') : undefined}
                        isLoading={regenerating === 'inicio'}
                    />
                    <div className="p-6 space-y-4">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase">Motivación</span>
                            <EditableList items={data.inicio.motivacion} isEditing={isEditing} onChange={(val) => updateSection('inicio', 'motivacion', val)} />
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase">Saberes Previos</span>
                            <EditableList items={data.inicio.saberesPrevios} isEditing={isEditing} onChange={(val) => updateSection('inicio', 'saberesPrevios', val)} />
                        </div>
                    </div>
                </div>

                {/* DESARROLLO */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                    <SectionHeader 
                        title="Desarrollo" 
                        icon={<BookOpen className="w-4 h-4" />} 
                        colorClass="bg-indigo-50 text-indigo-800 border-indigo-100"
                    />
                    <div className="p-6">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase">Estrategias</span>
                            <EditableList items={data.desarrollo.estrategias} isEditing={isEditing} onChange={(val) => updateSection('desarrollo', 'estrategias', val)} />
                        </div>
                    </div>
                </div>

                {/* CIERRE */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                    <SectionHeader 
                        title="Cierre" 
                        icon={<Clock className="w-4 h-4" />} 
                        colorClass="bg-slate-50 text-slate-800 border-slate-100"
                    />
                    <div className="p-6">
                        <EditableList items={data.cierre.estrategias} isEditing={isEditing} onChange={(val) => updateSection('cierre', 'estrategias', val)} />
                    </div>
                </div>
            </div>
        </div>

        {/* FICHA AULA */}
        <div className={`mt-8 ${showFichaAula ? 'block' : 'hidden'}`}>
            <div className="bg-white border border-slate-200 rounded-lg p-8 print:border-none print:p-0">
                <div className="border-b pb-4 mb-4">
                    <h2 className="text-xl font-bold">Ficha de Aplicación: Aula</h2>
                    <p className="text-sm text-slate-500">{data.fichas.aula.titulo}</p>
                </div>
                <div className="space-y-4">
                    {data.fichas.aula.items.map((item, i) => (
                        <div key={i} className="flex gap-4 p-4 border border-slate-100 rounded-lg bg-slate-50 print:bg-white print:border-slate-300">
                            <div className="font-bold text-slate-400">{i+1}.</div>
                            <div className="text-slate-800">{item}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* FICHA CASA */}
        <div className={`mt-8 ${showFichaCasa ? 'block' : 'hidden'}`}>
             <div className="bg-white border border-slate-200 rounded-lg p-8 print:border-none print:p-0">
                <div className="border-b pb-4 mb-4">
                    <h2 className="text-xl font-bold">Ficha de Extensión: Casa</h2>
                    <p className="text-sm text-slate-500">{data.fichas.casa.titulo}</p>
                </div>
                <div className="space-y-4">
                    {data.fichas.casa.items.map((item, i) => (
                        <div key={i} className="flex gap-4 p-4 border border-slate-100 rounded-lg bg-slate-50 print:bg-white print:border-slate-300">
                            <div className="font-bold text-slate-400">{i+1}.</div>
                            <div className="text-slate-800">{item}</div>
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