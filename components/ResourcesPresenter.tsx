import React, { useState, useMemo } from 'react';
import { SessionData, Resource, ResourceMoment, ResourceKind } from '../types';
import {
    ArrowLeft, Image, Video, FileText, Layout, BookOpen, Home as HomeIcon,
    Printer, Maximize2, Copy, ExternalLink, Sparkles, Filter, Play,
    Check, FileSpreadsheet
} from 'lucide-react';
import { MarkdownText, groupItemsByHeaders } from '../utils/markdownParser';

interface ResourcesPresenterProps {
    data: SessionData;
    onBack: () => void;
}

// Icon mapping for resource kinds
const KIND_ICONS: Record<ResourceKind, React.ReactNode> = {
    image: <Image className="w-5 h-5" />,
    video: <Video className="w-5 h-5" />,
    organizer: <Layout className="w-5 h-5" />,
    reading: <BookOpen className="w-5 h-5" />,
    worksheet: <FileSpreadsheet className="w-5 h-5" />,
    other: <FileText className="w-5 h-5" />
};

// Color mapping for moments
const MOMENT_COLORS: Record<ResourceMoment, { bg: string; text: string; border: string }> = {
    inicio: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    desarrollo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    cierre: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    tarea: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    general: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
};

// Labels for moments
const MOMENT_LABELS: Record<ResourceMoment, string> = {
    inicio: 'Inicio',
    desarrollo: 'Desarrollo',
    cierre: 'Cierre',
    tarea: 'Tarea',
    general: 'General'
};

// Labels for kinds
const KIND_LABELS: Record<ResourceKind, string> = {
    image: 'Imagen',
    video: 'Video',
    organizer: 'Organizador',
    reading: 'Lectura',
    worksheet: 'Ficha',
    other: 'Otro'
};

// Resource Card Component
const ResourceCard: React.FC<{
    resource: Resource;
    onFullscreen?: () => void;
}> = ({ resource, onFullscreen }) => {
    const colors = MOMENT_COLORS[resource.moment];
    const isExternal = resource.source.mode === 'external';
    const isGenerated = resource.source.mode === 'generated';

    return (
        <div className={`bg-white rounded-2xl border-2 ${colors.border} overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300`}>
            {/* Resource Preview */}
            <div className={`h-40 ${colors.bg} flex items-center justify-center relative`}>
                <div className="text-4xl opacity-30">
                    {KIND_ICONS[resource.kind]}
                </div>

                {/* Mode badge */}
                <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${isExternal
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                    {isExternal ? <ExternalLink className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                    {isExternal ? 'Externo' : 'Generado'}
                </div>

                {/* Kind badge */}
                <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} flex items-center gap-1`}>
                    {KIND_ICONS[resource.kind]}
                    {KIND_LABELS[resource.kind]}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                <div>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2">{resource.title}</h3>
                    <p className={`text-xs ${colors.text} mt-1`}>{MOMENT_LABELS[resource.moment]}</p>
                </div>

                {/* Source hints */}
                {isExternal && resource.source.providerHint && (
                    <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                        <span className="font-medium">Fuente sugerida:</span> {resource.source.providerHint}
                    </div>
                )}
                {isExternal && resource.source.queryHint && (
                    <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                        <span className="font-medium">Buscar:</span> "{resource.source.queryHint}"
                    </div>
                )}
                {isGenerated && resource.source.generationHint && (
                    <div className="text-xs text-purple-600 bg-purple-50 rounded-lg p-2">
                        <span className="font-medium">Prompt:</span> {resource.source.generationHint}
                    </div>
                )}

                {/* Notes */}
                {resource.notes && (
                    <p className="text-xs text-slate-600 italic">{resource.notes}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    <button
                        onClick={onFullscreen}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
                    >
                        <Maximize2 className="w-3 h-3" />
                        Ver
                    </button>
                    <button className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors">
                        <Copy className="w-3 h-3" />
                    </button>
                    <button className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors">
                        <Printer className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Ficha Card Component (for worksheets from fichas)
const FichaCard: React.FC<{
    type: 'aula' | 'casa';
    ficha: { titulo: string; instrucciones: string[]; items: string[] };
    onFullscreen?: () => void;
}> = ({ type, ficha, onFullscreen }) => {
    const isAula = type === 'aula';
    const colors = isAula
        ? { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', gradient: 'from-blue-500 to-indigo-600' }
        : { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', gradient: 'from-amber-500 to-orange-600' };

    const groupedItems = groupItemsByHeaders(ficha.items);

    return (
        <div className={`bg-white rounded-2xl border-2 ${colors.border} overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300`}>
            {/* Header */}
            <div className={`bg-gradient-to-r ${colors.gradient} text-white p-4`}>
                <div className="flex items-center gap-2 mb-1">
                    {isAula ? <BookOpen className="w-5 h-5" /> : <HomeIcon className="w-5 h-5" />}
                    <span className="text-xs font-medium opacity-80">
                        Ficha de {isAula ? 'Aplicación' : 'Extensión'}
                    </span>
                </div>
                <h3 className="font-bold text-lg">{isAula ? 'Aula' : 'Casa'}</h3>
                <p className="text-sm opacity-90 mt-1">{ficha.titulo}</p>
            </div>

            {/* Content preview */}
            <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
                {groupedItems.slice(0, 2).map((group, idx) => (
                    <div key={idx}>
                        {group.header && (
                            <p className="text-xs font-bold text-slate-700 mb-1">{group.header}</p>
                        )}
                        {group.items.slice(0, 2).map((item, i) => (
                            <p key={i} className="text-xs text-slate-600 line-clamp-1">• {item}</p>
                        ))}
                        {group.items.length > 2 && (
                            <p className="text-xs text-slate-400">+{group.items.length - 2} más...</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="p-4 pt-0 flex gap-2">
                <button
                    onClick={onFullscreen}
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r ${colors.gradient} text-white rounded-lg text-xs font-medium transition-all hover:opacity-90`}
                >
                    <Maximize2 className="w-3 h-3" />
                    Ver completa
                </button>
                <button className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors">
                    <Printer className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};

const ResourcesPresenter: React.FC<ResourcesPresenterProps> = ({ data, onBack }) => {
    const [activeFilter, setActiveFilter] = useState<ResourceMoment | 'all' | 'fichas'>('all');
    const [kindFilter, setKindFilter] = useState<ResourceKind | 'all'>('all');
    const [fullscreenResource, setFullscreenResource] = useState<Resource | null>(null);
    const [fullscreenFicha, setFullscreenFicha] = useState<'aula' | 'casa' | null>(null);

    // Get resources (with fallback to empty array for older sessions)
    const recursos = data.recursos || [];

    // Filter resources
    const filteredResources = useMemo(() => {
        return recursos.filter(r => {
            if (activeFilter !== 'all' && activeFilter !== 'fichas' && r.moment !== activeFilter) return false;
            if (kindFilter !== 'all' && r.kind !== kindFilter) return false;
            return true;
        });
    }, [recursos, activeFilter, kindFilter]);

    // Get unique moments and kinds for filter buttons
    const availableMoments = useMemo(() => {
        const moments = new Set(recursos.map(r => r.moment));
        return Array.from(moments) as ResourceMoment[];
    }, [recursos]);

    const availableKinds = useMemo(() => {
        const kinds = new Set(recursos.map(r => r.kind));
        return Array.from(kinds) as ResourceKind[];
    }, [recursos]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
            {/* Navbar */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-sm">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900 font-medium">
                        <ArrowLeft className="w-5 h-5 mr-1" /> Volver a Sesión
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">
                            {recursos.length} recursos • 2 fichas
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <Play className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Recursos para Proyectar</h1>
                            <p className="text-slate-500 text-sm">{data.sessionTitle}</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6 space-y-3">
                    {/* Moment filters */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeFilter === 'all'
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                        >
                            Todos
                        </button>
                        {availableMoments.map(moment => (
                            <button
                                key={moment}
                                onClick={() => setActiveFilter(moment)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${activeFilter === moment
                                        ? `${MOMENT_COLORS[moment].bg} ${MOMENT_COLORS[moment].text} ring-2 ring-offset-2 ring-current`
                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                    }`}
                            >
                                {MOMENT_LABELS[moment]}
                            </button>
                        ))}
                        <button
                            onClick={() => setActiveFilter('fichas')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${activeFilter === 'fichas'
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Fichas
                        </button>
                    </div>

                    {/* Kind filters */}
                    {activeFilter !== 'fichas' && availableKinds.length > 1 && (
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-slate-400 flex items-center gap-1 mr-2">
                                <Filter className="w-3 h-3" />
                                Tipo:
                            </span>
                            <button
                                onClick={() => setKindFilter('all')}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${kindFilter === 'all'
                                        ? 'bg-slate-200 text-slate-800'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                            >
                                Todos
                            </button>
                            {availableKinds.map(kind => (
                                <button
                                    key={kind}
                                    onClick={() => setKindFilter(kind)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${kindFilter === kind
                                            ? 'bg-slate-200 text-slate-800'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                >
                                    {KIND_ICONS[kind]}
                                    {KIND_LABELS[kind]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content Grid */}
                {activeFilter === 'fichas' ? (
                    /* Fichas View */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FichaCard
                            type="aula"
                            ficha={data.fichas.aula}
                            onFullscreen={() => setFullscreenFicha('aula')}
                        />
                        <FichaCard
                            type="casa"
                            ficha={data.fichas.casa}
                            onFullscreen={() => setFullscreenFicha('casa')}
                        />
                    </div>
                ) : (
                    /* Resources Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredResources.map((resource, idx) => (
                            <ResourceCard
                                key={resource.id || idx}
                                resource={resource}
                                onFullscreen={() => setFullscreenResource(resource)}
                            />
                        ))}
                        {filteredResources.length === 0 && (
                            <div className="col-span-full text-center py-12 text-slate-500">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No hay recursos para este filtro</p>
                                <p className="text-sm mt-1">Intenta con otro momento o tipo de recurso</p>
                            </div>
                        )}
                    </div>
                )}

                {/* No resources message */}
                {recursos.length === 0 && activeFilter !== 'fichas' && (
                    <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
                        <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Esta sesión no tiene recursos virtuales estructurados</p>
                        <p className="text-sm mt-1">Las sesiones nuevas incluirán recursos automáticamente</p>
                        <button
                            onClick={() => setActiveFilter('fichas')}
                            className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-medium"
                        >
                            Ver Fichas disponibles
                        </button>
                    </div>
                )}
            </div>

            {/* Fullscreen Modal for Resources */}
            {fullscreenResource && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                    onClick={() => setFullscreenResource(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className={`${MOMENT_COLORS[fullscreenResource.moment].bg} p-6`}>
                            <div className="flex items-center justify-between mb-4">
                                <span className={`${MOMENT_COLORS[fullscreenResource.moment].text} text-sm font-medium`}>
                                    {MOMENT_LABELS[fullscreenResource.moment]} • {KIND_LABELS[fullscreenResource.kind]}
                                </span>
                                <button
                                    onClick={() => setFullscreenResource(null)}
                                    className="p-2 hover:bg-black/10 rounded-full transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">{fullscreenResource.title}</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {fullscreenResource.source.mode === 'external' && (
                                <>
                                    {fullscreenResource.source.providerHint && (
                                        <div className="bg-blue-50 p-4 rounded-xl">
                                            <p className="text-sm font-medium text-blue-800">Fuente sugerida</p>
                                            <p className="text-blue-700">{fullscreenResource.source.providerHint}</p>
                                        </div>
                                    )}
                                    {fullscreenResource.source.queryHint && (
                                        <div className="bg-slate-50 p-4 rounded-xl">
                                            <p className="text-sm font-medium text-slate-700">Término de búsqueda</p>
                                            <p className="text-slate-600 font-mono">"{fullscreenResource.source.queryHint}"</p>
                                        </div>
                                    )}
                                </>
                            )}
                            {fullscreenResource.source.mode === 'generated' && fullscreenResource.source.generationHint && (
                                <div className="bg-purple-50 p-4 rounded-xl">
                                    <p className="text-sm font-medium text-purple-800">Prompt de generación</p>
                                    <p className="text-purple-700">{fullscreenResource.source.generationHint}</p>
                                </div>
                            )}
                            {fullscreenResource.notes && (
                                <div className="bg-amber-50 p-4 rounded-xl">
                                    <p className="text-sm font-medium text-amber-800">Uso pedagógico</p>
                                    <p className="text-amber-700">{fullscreenResource.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Modal for Fichas */}
            {fullscreenFicha && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                    onClick={() => setFullscreenFicha(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Ficha content */}
                        <div className={`bg-gradient-to-r ${fullscreenFicha === 'aula' ? 'from-blue-500 to-indigo-600' : 'from-amber-500 to-orange-600'} text-white p-6`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-80">
                                        Ficha de {fullscreenFicha === 'aula' ? 'Aplicación' : 'Extensión'}
                                    </p>
                                    <h2 className="text-2xl font-bold mt-1">
                                        {fullscreenFicha === 'aula' ? 'Aula' : 'Casa'}
                                    </h2>
                                    <p className="opacity-90 mt-2">
                                        {data.fichas[fullscreenFicha].titulo}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setFullscreenFicha(null)}
                                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {groupItemsByHeaders(data.fichas[fullscreenFicha].items).map((group, idx) => (
                                <div key={idx} className="rounded-xl overflow-hidden border border-slate-200">
                                    {group.header && (
                                        <div className={`px-4 py-2 font-bold text-sm ${fullscreenFicha === 'aula'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-amber-100 text-amber-800'
                                            }`}>
                                            {group.header}
                                        </div>
                                    )}
                                    <div className="p-4 space-y-2 bg-slate-50">
                                        {group.items.map((item, i) => (
                                            <div key={i} className="flex gap-2 text-sm">
                                                <span className={fullscreenFicha === 'aula' ? 'text-blue-500' : 'text-amber-500'}>›</span>
                                                <MarkdownText text={item} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-slate-200 flex gap-2 justify-end">
                            <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Printer className="w-4 h-4" />
                                Imprimir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourcesPresenter;
