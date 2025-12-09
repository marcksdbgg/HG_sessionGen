import React, { useState, useEffect } from 'react';
import { SessionData, GeneratedImage, ResourceUpdateCallback, Resource } from '../types';
import { ExportManager } from '../core/ExportManager';
import { SessionGenerator } from '../core/SessionGenerator';
import { copyToClipboard } from '../services/exportService';
import { Clock, BookOpen } from 'lucide-react';
import ResourcesPresenter from './ResourcesPresenter';
import { SessionNavbar, EditingBanner, MobileActionButtons, SessionSection, FichaCard } from './session';

interface SessionResultProps {
    data: SessionData;
    formatId: string;
    onBack: () => void;
    onResourceUpdate?: ResourceUpdateCallback;
}

/**
 * SessionResult - Main component for displaying generated session content
 * Refactored to use modular components
 */
const SessionResult: React.FC<SessionResultProps> = ({ data: initialData, formatId, onBack, onResourceUpdate }) => {
    const [data, setData] = useState(initialData);
    const [isEditing, setIsEditing] = useState(false);
    const [printSection, setPrintSection] = useState<'none' | 'session' | 'ficha_aula' | 'ficha_casa'>('none');
    const [regenerating, setRegenerating] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Presentation State
    const [showPresentation, setShowPresentation] = useState(false);
    const [presentationInitialId, setPresentationInitialId] = useState<string | null>(null);

    // Sync local state with parent data prop (for progressive resource updates)
    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    // === HANDLERS ===
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

    const updateSection = (section: keyof SessionData, field: string, value: string[]) => {
        setData(prev => ({
            ...prev,
            [section]: {
                ...(prev[section] as object),
                [field]: value
            }
        }));
    };

    const handleOpenImage = (img: GeneratedImage) => {
        setPresentationInitialId(img.id);
        setShowPresentation(true);
    };

    const handleOpenResource = (resource: Resource) => {
        setPresentationInitialId(resource.id);
        setShowPresentation(true);
    };

    // === COMPUTED VALUES ===
    const isPrinting = printSection !== 'none';
    const showSession = !isPrinting || printSection === 'session';
    const showFichaAula = !isPrinting || printSection === 'ficha_aula';
    const showFichaCasa = !isPrinting || printSection === 'ficha_casa';

    const hasMissingImages = data.resources?.images?.some(img => !img.base64Data && img.prompt && !img.isLoading);
    const hasResources = data.resources && (
        (data.resources.images && data.resources.images.length > 0) ||
        (data.resources.resources && data.resources.resources.length > 0)
    );

    // === SECTION CONFIGURATIONS ===
    const sections = [
        {
            key: 'inicio',
            title: 'Inicio',
            icon: <Clock className="w-5 h-5" />,
            colorClass: 'bg-blue-50 text-blue-800 border-blue-100',
            regenerateInstructions: 'Cambia la motivación.',
            subsections: [
                { label: 'Motivación', items: data.inicio.motivacion, fieldKey: 'motivacion' },
                { label: 'Saberes Previos', items: data.inicio.saberesPrevios, fieldKey: 'saberesPrevios' }
            ]
        },
        {
            key: 'desarrollo',
            title: 'Desarrollo',
            icon: <BookOpen className="w-5 h-5" />,
            colorClass: 'bg-indigo-50 text-indigo-800 border-indigo-100',
            regenerateInstructions: 'Genera estrategias más interactivas.',
            subsections: [
                { label: 'Estrategias', items: data.desarrollo.estrategias, fieldKey: 'estrategias' }
            ]
        },
        {
            key: 'cierre',
            title: 'Cierre',
            icon: <Clock className="w-5 h-5" />,
            colorClass: 'bg-amber-50 text-amber-800 border-amber-100',
            regenerateInstructions: 'Mejora las estrategias.',
            subsections: [
                { label: 'Estrategias de Cierre', items: data.cierre.estrategias, fieldKey: 'estrategias' }
            ]
        }
    ];

    return (
        <>
            {/* Presentation Modal */}
            {showPresentation && data.resources && (
                <ResourcesPresenter
                    resources={data.resources}
                    initialResourceId={presentationInitialId}
                    onClose={() => {
                        setShowPresentation(false);
                        setPresentationInitialId(null);
                    }}
                />
            )}

            <div className={`min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0 ${isPrinting ? 'print-mode' : ''} ${showPresentation ? 'hidden' : ''}`}>

                {/* Navbar */}
                <SessionNavbar
                    isEditing={isEditing}
                    hasResources={!!hasResources}
                    hasMissingImages={!!hasMissingImages}
                    regenerating={regenerating}
                    onBack={onBack}
                    onToggleEditing={() => setIsEditing(!isEditing)}
                    onShowPresentation={() => setShowPresentation(true)}
                    onRecoverImages={handleRecoverImages}
                    onPrint={handlePrint}
                    onCopyLatex={handleCopyLatex}
                />

                {/* Editing Banner */}
                {isEditing && <EditingBanner onExit={() => setIsEditing(false)} />}

                {/* Mobile Action Buttons */}
                <MobileActionButtons
                    showPresentation={showPresentation}
                    hasResources={!!hasResources}
                    hasMissingImages={!!hasMissingImages}
                    regenerating={regenerating}
                    onShowPresentation={() => setShowPresentation(true)}
                    onRecoverImages={handleRecoverImages}
                />

                <div className="max-w-3xl mx-auto px-4 py-6 print:px-0 print:py-0 print:max-w-none">
                    {/* Session Content */}
                    <div className={showSession ? 'block' : 'hidden'}>
                        {/* Session Header */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none print:border-none">
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">{data.sessionTitle}</h1>
                            <p className="text-slate-500">{data.area} • {data.cycleGrade}</p>
                        </div>

                        {/* Session Sections */}
                        <div className="space-y-6">
                            {sections.map(section => (
                                <SessionSection
                                    key={section.key}
                                    title={section.title}
                                    icon={section.icon}
                                    colorClass={section.colorClass}
                                    isEditing={isEditing}
                                    isLoading={regenerating === section.key}
                                    subsections={section.subsections}
                                    images={data.resources?.images}
                                    resources={data.resources?.resources}
                                    onRegenerate={() => handleRegenerate(section.key as keyof SessionData, section.regenerateInstructions)}
                                    onUpdateField={(fieldKey, value) => updateSection(section.key as keyof SessionData, fieldKey, value)}
                                    onOpenImage={handleOpenImage}
                                    onOpenResource={handleOpenResource}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Fichas */}
                    <div className={`mt-8 ${showFichaAula ? 'block' : 'hidden'}`}>
                        <FichaCard
                            type="aula"
                            titulo={data.fichas.aula.titulo}
                            items={data.fichas.aula.items}
                        />
                    </div>

                    <div className={`mt-8 ${showFichaCasa ? 'block' : 'hidden'}`}>
                        <FichaCard
                            type="casa"
                            titulo={data.fichas.casa.titulo}
                            items={data.fichas.casa.items}
                        />
                    </div>
                </div>

                {/* Print Styles */}
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