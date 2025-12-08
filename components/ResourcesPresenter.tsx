import React, { useState, useMemo, useEffect } from 'react';
import { SessionData, Resource, ResolvedResource, ResourceMoment, ResourceKind, Organizer } from '../types';
import DiagramRenderer from './DiagramRenderer';
import { ResourceResolver } from '../services/ResourceResolver';
import {
    ArrowLeft, Image, Video, FileText, Layout, BookOpen, Home as HomeIcon,
    Printer, Maximize2, Copy, ExternalLink, Sparkles, Filter, Play,
    Check, FileSpreadsheet, Loader2, Search, Download, AlertCircle
} from 'lucide-react';
import { MarkdownText, groupItemsByHeaders } from '../utils/markdownParser';

interface ResourcesPresenterProps {
    data: SessionData;
    nivel?: string;
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
const MOMENT_COLORS: Record<ResourceMoment, { bg: string; text: string; border: string; gradient: string }> = {
    inicio: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', gradient: 'from-blue-500 to-blue-600' },
    desarrollo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', gradient: 'from-indigo-500 to-indigo-600' },
    cierre: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', gradient: 'from-amber-500 to-amber-600' },
    tarea: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', gradient: 'from-green-500 to-green-600' },
    general: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', gradient: 'from-slate-500 to-slate-600' }
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

// Resource Card Component with resolved content
const ResourceCard: React.FC<{
    resource: ResolvedResource;
    onFullscreen?: () => void;
}> = ({ resource, onFullscreen }) => {
    const colors = MOMENT_COLORS[resource.moment];
    const isExternal = resource.source.mode === 'external';
    const isResolved = resource.status === 'resolved';
    const hasError = resource.status === 'error';
    const isPending = resource.status === 'pending';

    const handleOpenUrl = () => {
        if (resource.url) {
            window.open(resource.url, '_blank');
        }
    };

    return (
        <div className={`bg-white rounded-2xl border-2 ${colors.border} overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300`}>
            {/* Resource Preview - Shows actual thumbnail */}
            <div className={`h-44 relative overflow-hidden ${!resource.thumbnail ? colors.bg : ''}`}>
                {resource.thumbnail ? (
                    <img
                        src={resource.thumbnail}
                        alt={resource.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            // Fallback to placeholder on error
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-5xl opacity-20">
                            {KIND_ICONS[resource.kind]}
                        </div>
                    </div>
                )}

                {/* Status indicators */}
                {isPending && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                )}
                {hasError && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Error
                    </div>
                )}

                {/* Mode badge */}
                <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 backdrop-blur-sm ${isExternal
                    ? 'bg-blue-500/90 text-white'
                    : 'bg-purple-500/90 text-white'
                    }`}>
                    {isExternal ? <ExternalLink className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                    {isExternal ? 'Web' : 'IA'}
                </div>

                {/* Kind badge */}
                <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium bg-white/90 ${colors.text} flex items-center gap-1 backdrop-blur-sm`}>
                    {KIND_ICONS[resource.kind]}
                    {KIND_LABELS[resource.kind]}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                <div>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2">{resource.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                            {MOMENT_LABELS[resource.moment]}
                        </span>
                        {resource.attribution && (
                            <span className="text-xs text-slate-400">{resource.attribution}</span>
                        )}
                    </div>
                </div>

                {/* Notes */}
                {resource.notes && (
                    <p className="text-xs text-slate-600 line-clamp-2">{resource.notes}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    {isExternal && resource.url && (
                        <button
                            onClick={handleOpenUrl}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r ${colors.gradient} text-white rounded-xl text-xs font-bold transition-all hover:opacity-90 shadow-sm`}
                        >
                            <Search className="w-4 h-4" />
                            Buscar en Web
                        </button>
                    )}
                    {!isExternal && resource.thumbnail && (
                        <button
                            onClick={onFullscreen}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl text-xs font-bold transition-all hover:opacity-90 shadow-sm"
                        >
                            <Maximize2 className="w-4 h-4" />
                            Ver Imagen
                        </button>
                    )}
                    <button
                        onClick={onFullscreen}
                        className="flex items-center justify-center gap-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-colors"
                    >
                        <FileText className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Ficha Card Component
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
            <div className={`bg-gradient-to-r ${colors.gradient} text-white p-5`}>
                <div className="flex items-center gap-2 mb-2">
                    {isAula ? <BookOpen className="w-5 h-5" /> : <HomeIcon className="w-5 h-5" />}
                    <span className="text-xs font-medium opacity-80">
                        Ficha de {isAula ? 'Aplicación' : 'Extensión'}
                    </span>
                </div>
                <h3 className="font-bold text-xl">{isAula ? 'Aula' : 'Casa'}</h3>
                <p className="text-sm opacity-90 mt-1">{ficha.titulo}</p>
            </div>

            <div className="p-4 space-y-3 max-h-48 overflow-y-auto">
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

            <div className="p-4 pt-0 flex gap-2">
                <button
                    onClick={onFullscreen}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r ${colors.gradient} text-white rounded-xl text-sm font-bold transition-all hover:opacity-90 shadow-sm`}
                >
                    <Maximize2 className="w-4 h-4" />
                    Ver completa
                </button>
                <button className="flex items-center justify-center gap-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors">
                    <Printer className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

const ResourcesPresenter: React.FC<ResourcesPresenterProps> = ({ data, nivel = 'Primaria', onBack }) => {
    const [activeFilter, setActiveFilter] = useState<ResourceMoment | 'all' | 'fichas'>('all');
    const [kindFilter, setKindFilter] = useState<ResourceKind | 'all'>('all');
    const [fullscreenResource, setFullscreenResource] = useState<ResolvedResource | null>(null);
    const [fullscreenFicha, setFullscreenFicha] = useState<'aula' | 'casa' | null>(null);

    // State for resolved resources
    const [resolvedResources, setResolvedResources] = useState<ResolvedResource[]>([]);
    const [isResolving, setIsResolving] = useState(false);
    const [resolveError, setResolveError] = useState<string | null>(null);

    // Get raw resources
    const recursos = data.recursos || [];

    // Resolve resources on mount
    useEffect(() => {
        if (recursos.length === 0) return;

        const resolveResources = async () => {
            setIsResolving(true);
            setResolveError(null);

            try {
                const resolved = await ResourceResolver.resolveAll(recursos, nivel);
                setResolvedResources(resolved);
            } catch (error) {
                console.error('Failed to resolve resources:', error);
                setResolveError('Error al procesar los recursos');
                // Fallback: mark all as pending
                setResolvedResources(recursos.map(r => ({ ...r, status: 'pending' as const })));
            } finally {
                setIsResolving(false);
            }
        };

        resolveResources();
    }, [recursos, nivel]);

    // Filter resolved resources
    const filteredResources = useMemo(() => {
        return resolvedResources.filter(r => {
            if (activeFilter !== 'all' && activeFilter !== 'fichas' && r.moment !== activeFilter) return false;
            if (kindFilter !== 'all' && r.kind !== kindFilter) return false;
            return true;
        });
    }, [resolvedResources, activeFilter, kindFilter]);

    // Get unique moments and kinds for filter buttons
    const availableMoments = useMemo(() => {
        const moments = new Set(resolvedResources.map(r => r.moment));
        return Array.from(moments) as ResourceMoment[];
    }, [resolvedResources]);

    const availableKinds = useMemo(() => {
        const kinds = new Set(resolvedResources.map(r => r.kind));
        return Array.from(kinds) as ResourceKind[];
    }, [resolvedResources]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
            {/* Navbar */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-sm">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <button onClick={onBack} className="flex items-center text-slate-600 hover:text-slate-900 font-medium">
                        <ArrowLeft className="w-5 h-5 mr-1" /> Volver a Sesión
                    </button>
                    <div className="flex items-center gap-3">
                        {isResolving && (
                            <div className="flex items-center gap-2 text-indigo-600 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Procesando recursos...</span>
                            </div>
                        )}
                        <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            {resolvedResources.length} recursos • {(data.organizadores || []).length} organizadores • 2 fichas
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <Play className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Recursos para Proyectar</h1>
                            <p className="text-slate-500 text-sm">{data.sessionTitle}</p>
                        </div>
                    </div>
                    {resolveError && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            {resolveError}
                        </div>
                    )}
                </div>

                {/* Filters */}
                <div className="mb-6 space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeFilter === 'all'
                                ? 'bg-slate-900 text-white shadow-md'
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
                                    ? `bg-gradient-to-r ${MOMENT_COLORS[moment].gradient} text-white shadow-md`
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                    }`}
                            >
                                {MOMENT_LABELS[moment]}
                            </button>
                        ))}
                        <button
                            onClick={() => setActiveFilter('fichas')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${activeFilter === 'fichas'
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Fichas
                        </button>
                        {(data.organizadores || []).length > 0 && (
                            <button
                                onClick={() => setActiveFilter('organizadores' as any)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${activeFilter === 'organizadores'
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                    }`}
                            >
                                <Layout className="w-4 h-4" />
                                Organizadores
                            </button>
                        )}
                    </div>

                    {activeFilter !== 'fichas' && availableKinds.length > 1 && (
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-slate-400 flex items-center gap-1 mr-2">
                                <Filter className="w-3 h-3" />
                                Tipo:
                            </span>
                            <button
                                onClick={() => setKindFilter('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${kindFilter === 'all'
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                            >
                                Todos
                            </button>
                            {availableKinds.map(kind => (
                                <button
                                    key={kind}
                                    onClick={() => setKindFilter(kind)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${kindFilter === kind
                                        ? 'bg-slate-800 text-white'
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
                ) : activeFilter === 'organizadores' ? (
                    <div className="space-y-6">
                        {(data.organizadores || []).map((organizer, idx) => (
                            <DiagramRenderer
                                key={organizer.id || idx}
                                organizer={organizer}
                                className=""
                            />
                        ))}
                        {(data.organizadores || []).length === 0 && (
                            <div className="text-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-200">
                                <Layout className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p className="font-medium text-lg">No hay organizadores visuales</p>
                                <p className="text-sm mt-2">Las sesiones nuevas incluirán organizadores con diagramas automáticamente</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredResources.map((resource, idx) => (
                            <ResourceCard
                                key={resource.id || idx}
                                resource={resource}
                                onFullscreen={() => setFullscreenResource(resource)}
                            />
                        ))}
                        {filteredResources.length === 0 && !isResolving && (
                            <div className="col-span-full text-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-200">
                                <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p className="font-medium text-lg">No hay recursos para este filtro</p>
                                <p className="text-sm mt-2">Intenta con otro momento o tipo de recurso</p>
                            </div>
                        )}
                    </div>
                )}

                {/* No resources message */}
                {recursos.length === 0 && activeFilter !== 'fichas' && (
                    <div className="text-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-200">
                        <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-medium text-lg">Esta sesión no tiene recursos virtuales</p>
                        <p className="text-sm mt-2">Las sesiones nuevas incluirán recursos automáticamente</p>
                        <button
                            onClick={() => setActiveFilter('fichas')}
                            className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all"
                        >
                            Ver Fichas disponibles
                        </button>
                    </div>
                )}
            </div>

            {/* Fullscreen Modal for Resources */}
            {fullscreenResource && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setFullscreenResource(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Image/Content area */}
                        {fullscreenResource.thumbnail && (
                            <div className="relative bg-slate-900">
                                <img
                                    src={fullscreenResource.thumbnail}
                                    alt={fullscreenResource.title}
                                    className="w-full max-h-[60vh] object-contain mx-auto"
                                />
                            </div>
                        )}

                        <div className={`${MOMENT_COLORS[fullscreenResource.moment].bg} p-6`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${MOMENT_COLORS[fullscreenResource.moment].bg} ${MOMENT_COLORS[fullscreenResource.moment].text} border ${MOMENT_COLORS[fullscreenResource.moment].border}`}>
                                        {MOMENT_LABELS[fullscreenResource.moment]}
                                    </span>
                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-white text-slate-600">
                                        {KIND_LABELS[fullscreenResource.kind]}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setFullscreenResource(null)}
                                    className="p-2 hover:bg-black/10 rounded-full transition-colors text-slate-600"
                                >
                                    ✕
                                </button>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">{fullscreenResource.title}</h2>
                            {fullscreenResource.attribution && (
                                <p className="text-sm text-slate-500 mt-1">{fullscreenResource.attribution}</p>
                            )}
                        </div>

                        <div className="p-6 space-y-4">
                            {fullscreenResource.notes && (
                                <div className="bg-amber-50 p-4 rounded-xl">
                                    <p className="text-sm font-medium text-amber-800">Uso pedagógico</p>
                                    <p className="text-amber-700 text-sm mt-1">{fullscreenResource.notes}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                {fullscreenResource.url && (
                                    <a
                                        href={fullscreenResource.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:opacity-90 transition-all"
                                    >
                                        {fullscreenResource.source.mode === 'external' ? (
                                            <>
                                                <Search className="w-5 h-5" />
                                                Buscar en Web
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-5 h-5" />
                                                Descargar
                                            </>
                                        )}
                                    </a>
                                )}
                                <button className="px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700 flex items-center gap-2 transition-colors">
                                    <Printer className="w-5 h-5" />
                                    Imprimir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Modal for Fichas */}
            {fullscreenFicha && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setFullscreenFicha(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
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
                                        <div className={`px-4 py-3 font-bold text-sm ${fullscreenFicha === 'aula'
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
                        <div className="p-4 border-t border-slate-200 flex gap-3 justify-end">
                            <button className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 flex items-center gap-2 transition-colors">
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
