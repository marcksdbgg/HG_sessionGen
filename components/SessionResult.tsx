import React, { useState } from 'react';
import { SessionData, FichaContent } from '../types';
import { generateLatex, copyToClipboard, printSession } from '../services/exportService';
import { ArrowLeft, Printer, FileJson, Download, BookOpen, GraduationCap, Clock, Home, CheckCircle2 } from 'lucide-react';

interface SessionResultProps {
  data: SessionData;
  onBack: () => void;
}

const DetailGroup: React.FC<{ label: string; items: string[] }> = ({ label, items }) => (
  <div className="mb-4 last:mb-0">
    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
    <ul className="text-slate-800 text-sm leading-relaxed space-y-1">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start">
          <span className="mr-2 text-primary">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const MaterialsSection: React.FC<{ items: string[] }> = ({ items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/50 -mx-6 px-6 pb-2">
      <div className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
        <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        Materiales y Recursos
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((m, i) => (
          <span key={i} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-700 shadow-sm">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
};

const FichaCard: React.FC<{ title: string; type: 'Aula' | 'Casa'; content: FichaContent }> = ({ title, type, content }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 print:break-inside-avoid print:border-2 print:border-slate-300">
    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div>
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${type === 'Aula' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                Ficha de {type}
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-2">{content.titulo}</h3>
        </div>
    </div>
    
    <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Instrucciones:</h4>
        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            {content.instrucciones.map((inst, i) => <li key={i}>{inst}</li>)}
        </ul>
    </div>

    <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Actividades:</h4>
        <div className="space-y-3">
            {content.items.map((item, i) => (
                <div key={i} className="flex items-start p-3 bg-slate-50 rounded border border-slate-100 print:bg-white print:border-slate-300">
                    <span className="font-bold text-slate-400 mr-3">{i + 1}.</span>
                    <span className="text-sm text-slate-800">{item}</span>
                </div>
            ))}
        </div>
    </div>
  </div>
);

const SessionResult: React.FC<SessionResultProps> = ({ data, onBack }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLatex = () => {
    const latex = generateLatex(data);
    copyToClipboard(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0">
      {/* Header - Hidden on Print */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm no-print">
        <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-1" />
          <span className="font-medium">Volver</span>
        </button>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopyLatex}
            className="p-2 text-slate-600 hover:text-primary hover:bg-blue-50 rounded-full transition-colors relative"
            title="Copiar LaTeX"
          >
            {copied ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <FileJson className="w-5 h-5" />}
          </button>
          <button 
            onClick={printSession}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 print:px-0 print:py-0 print:max-w-none">
        
        {/* Session Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none print:border-none print:mb-4">
          <div className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider mb-3">
            Sesión de Aprendizaje
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-6 leading-tight">
            {data.sessionTitle}
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-slate-500 text-xs font-semibold uppercase">Área</span>
              <span className="font-medium text-slate-800">{data.area}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-xs font-semibold uppercase">Ciclo/Grado</span>
              <span className="font-medium text-slate-800">{data.cycleGrade}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-xs font-semibold uppercase">Docente</span>
              <span className="font-medium text-slate-800">{data.teacherName}</span>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-800 mb-4 px-1 flex items-center gap-2 print:mb-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Secuencia Didáctica
        </h2>

        {/* Timeline */}
        <div className="relative space-y-8 pl-4 print:space-y-4 print:pl-0">
          {/* Vertical Line */}
          <div className="absolute top-4 left-[1.65rem] bottom-4 w-0.5 bg-slate-200 print:hidden"></div>

          {/* Inicio */}
          <div className="relative pl-10 print:pl-0 print:break-inside-avoid">
            <div className="absolute left-4 top-4 w-5 h-5 rounded-full bg-white border-4 border-primary shadow-sm z-10 print:hidden"></div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-2 print:border-slate-300">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between print:bg-slate-100">
                <h3 className="font-bold text-primary">Inicio</h3>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="p-6">
                <DetailGroup label="Motivación" items={data.inicio.motivacion} />
                <DetailGroup label="Saberes Previos" items={data.inicio.saberesPrevios} />
                <DetailGroup label="Conflicto Cognitivo" items={data.inicio.conflictoCognitivo} />
                <DetailGroup label="Propósito Didáctico" items={data.inicio.propositoDidactico} />
                <MaterialsSection items={data.inicio.materiales} />
              </div>
            </div>
          </div>

          {/* Desarrollo */}
          <div className="relative pl-10 print:pl-0 print:break-inside-avoid">
            <div className="absolute left-4 top-4 w-5 h-5 rounded-full bg-white border-4 border-secondary shadow-sm z-10 print:hidden"></div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-2 print:border-slate-300">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between print:bg-slate-100">
                <h3 className="font-bold text-secondary">Desarrollo</h3>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="p-6">
                <DetailGroup label="Estrategias" items={data.desarrollo.estrategias} />
                <MaterialsSection items={data.desarrollo.materiales} />
              </div>
            </div>
          </div>

          {/* Cierre */}
          <div className="relative pl-10 print:pl-0 print:break-inside-avoid">
            <div className="absolute left-4 top-4 w-5 h-5 rounded-full bg-white border-4 border-slate-600 shadow-sm z-10 print:hidden"></div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-2 print:border-slate-300">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between print:bg-slate-100">
                <h3 className="font-bold text-slate-700">Cierre</h3>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="p-6">
                <DetailGroup label="Estrategias" items={data.cierre.estrategias} />
                <MaterialsSection items={data.cierre.materiales} />
              </div>
            </div>
          </div>

          {/* Tarea */}
          <div className="relative pl-10 print:pl-0 print:break-inside-avoid">
            <div className="absolute left-4 top-4 w-5 h-5 rounded-full bg-white border-4 border-green-500 shadow-sm z-10 print:hidden"></div>
            <div className="bg-white rounded-xl shadow-sm border border-green-200 overflow-hidden print:shadow-none print:border-2 print:border-green-300">
              <div className="bg-green-50 px-6 py-3 border-b border-green-100 flex items-center justify-between print:bg-green-100">
                <h3 className="font-bold text-green-700">Tarea en Casa</h3>
                <Home className="w-4 h-4 text-green-600" />
              </div>
              <div className="p-6">
                <DetailGroup label="Actividades de Extensión" items={data.tareaCasa.actividades} />
                <MaterialsSection items={data.tareaCasa.materiales} />
              </div>
            </div>
          </div>
        </div>

        <div className="page-break"></div>

        <h2 className="text-lg font-bold text-slate-800 mt-12 mb-4 px-1 flex items-center gap-2 print:mt-8">
            <GraduationCap className="w-5 h-5 text-primary" />
            Fichas de Aplicación
        </h2>

        <FichaCard title={data.fichas.aula.titulo} type="Aula" content={data.fichas.aula} />
        
        <div className="print:mt-8"></div>
        
        <FichaCard title={data.fichas.casa.titulo} type="Casa" content={data.fichas.casa} />
        
        {/* Footer info for print */}
        <div className="hidden print:block mt-8 text-center text-xs text-slate-400">
            Generado con Aula Express • {new Date().toLocaleDateString()}
        </div>

      </div>
    </div>
  );
};

export default SessionResult;