import React from 'react';
import { ArrowLeft, Printer, FileJson, Edit3, Check, MonitorPlay, RefreshCw, X } from 'lucide-react';
import Tooltip from '../ui/Tooltip';

interface SessionNavbarProps {
    isEditing: boolean;
    hasResources: boolean;
    hasMissingImages: boolean;
    regenerating: string | null;
    onBack: () => void;
    onToggleEditing: () => void;
    onShowPresentation: () => void;
    onRecoverImages: () => void;
    onPrint: (section: 'session' | 'ficha_aula' | 'ficha_casa') => void;
    onCopyLatex: () => void;
}

/**
 * Navigation bar for session result view
 */
const SessionNavbar: React.FC<SessionNavbarProps> = ({
    isEditing,
    hasResources,
    hasMissingImages,
    regenerating,
    onBack,
    onToggleEditing,
    onShowPresentation,
    onRecoverImages,
    onPrint,
    onCopyLatex
}) => {
    return (
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm no-print">
            <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900 font-medium">
                <ArrowLeft className="w-5 h-5 mr-1" /> Volver
            </button>
            <div className="flex items-center gap-3">
                {hasMissingImages && (
                    <Tooltip text="Las imágenes no se guardaron en el historial para ahorrar espacio. Click para regenerarlas.">
                        <button
                            onClick={onRecoverImages}
                            disabled={!!regenerating}
                            className="hidden sm:flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all"
                        >
                            <RefreshCw className={`w-4 h-4 ${regenerating === 'images' ? 'animate-spin' : ''}`} />
                            <span>Restaurar Imágenes</span>
                        </button>
                    </Tooltip>
                )}

                {hasResources && !hasMissingImages && (
                    <Tooltip text="Ver todos los recursos (Organizador + Imágenes)">
                        <button
                            onClick={onShowPresentation}
                            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-black transition-all shadow-md"
                        >
                            <MonitorPlay className="w-4 h-4" />
                            <span>Presentación</span>
                        </button>
                    </Tooltip>
                )}

                <Tooltip text={isEditing ? "Guardar cambios" : "Editar contenido de la sesión"}>
                    <button
                        onClick={onToggleEditing}
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
                        <button onClick={() => onPrint('session')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">📄 PDF Sesión</button>
                        <button onClick={() => onPrint('ficha_aula')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">📝 PDF Ficha Aula</button>
                        <button onClick={() => onPrint('ficha_casa')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">🏠 PDF Ficha Casa</button>
                        <button onClick={onCopyLatex} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between">
                            <span>LaTeX</span>
                            <FileJson className="w-3 h-3 text-slate-400" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Editing mode banner
 */
export const EditingBanner: React.FC<{ onExit: () => void }> = ({ onExit }) => (
    <div className="sticky top-[60px] z-10 mx-4 mt-4 no-print">
        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                <span className="font-bold">✏️ Modo Edición Activo</span>
            </div>
            <button onClick={onExit} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                <X className="w-4 h-4" /> Salir
            </button>
        </div>
    </div>
);

/**
 * Mobile action buttons
 */
export const MobileActionButtons: React.FC<{
    showPresentation: boolean;
    hasResources: boolean;
    hasMissingImages: boolean;
    regenerating: string | null;
    onShowPresentation: () => void;
    onRecoverImages: () => void;
}> = ({ showPresentation, hasResources, hasMissingImages, regenerating, onShowPresentation, onRecoverImages }) => (
    <>
        {!showPresentation && hasResources && !hasMissingImages && (
            <div className="sm:hidden mx-4 mt-4">
                <button onClick={onShowPresentation} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-slate-900 text-white shadow-lg">
                    <MonitorPlay className="w-5 h-5" />
                    <span>Ver Recursos Virtuales</span>
                </button>
            </div>
        )}

        {hasMissingImages && (
            <div className="sm:hidden mx-4 mt-4">
                <button
                    onClick={onRecoverImages}
                    disabled={!!regenerating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-amber-100 text-amber-800 border border-amber-200"
                >
                    <RefreshCw className={`w-5 h-5 ${regenerating === 'images' ? 'animate-spin' : ''}`} />
                    <span>Restaurar Imágenes</span>
                </button>
            </div>
        )}
    </>
);

export default SessionNavbar;
