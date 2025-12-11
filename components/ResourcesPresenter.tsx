import React, { useState } from 'react';
import {
    VirtualResources,
    Resource,
    AIImageResource,
    DiagramResource,
    ExternalVideoResource,
    ExternalImageResource,
    ResourceMoment
} from '../types';
import DiagramRenderer from './DiagramRenderer';
import ResourceCard from './ui/ResourceCard';
import {
    ArrowLeft,
    X,
    Layout,
    Image as ImageIcon,
    MonitorPlay,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Download,
    ExternalLink,
    Search
} from 'lucide-react';

interface ResourcesPresenterProps {
    resources: VirtualResources;
    onClose: () => void;
    initialResourceId?: string | null;
}

const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    if (url.includes('results?search_query')) return null;
    const cleanUrl = url.trim();
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
        /youtube\.com\/.*[?&]v=([^&\n?#]+)/
    ];
    for (const pattern of patterns) {
        const match = cleanUrl.match(pattern);
        if (match && match[1]) return match[1];
    }
    return null;
};

const isSearchUrl = (url: string): boolean => {
    return url.includes('google.com/search') || url.includes('youtube.com/results');
};

const ResourcesPresenter: React.FC<ResourcesPresenterProps> = ({ resources, onClose, initialResourceId }) => {
    let allResources = resources.resources || [];

    // Legacy support
    if (resources.images && resources.images.length > 0) {
        const legacyImages: AIImageResource[] = resources.images
            .filter(img => !allResources.some(r => r.id === img.id))
            .map(img => ({
                id: img.id,
                type: 'AI_IMAGE',
                title: img.title,
                moment: img.moment as ResourceMoment,
                status: img.error ? 'error' : (img.isLoading ? 'loading' : (img.base64Data ? 'ready' : 'pending')),
                error: img.error,
                generationPrompt: img.prompt,
                base64Data: img.base64Data
            }));
        allResources = [...allResources, ...legacyImages];
    }

    const aiImages = allResources.filter((r): r is AIImageResource => r.type === 'AI_IMAGE' && r.status === 'ready');
    const diagrams = allResources.filter((r): r is DiagramResource => r.type === 'DIAGRAM' && r.status === 'ready');
    const videos = allResources.filter((r): r is ExternalVideoResource => r.type === 'VIDEO_SEARCH' && r.status === 'ready');
    const externalImages = allResources.filter((r): r is ExternalImageResource => r.type === 'IMAGE_SEARCH' && r.status === 'ready');

    const displayResources = allResources;

    const [selectedResource, setSelectedResource] = useState<Resource | null>(
        initialResourceId ? allResources.find(r => r.id === initialResourceId) || null : null
    );

    const [activeDiagramIdx, setActiveDiagramIdx] = useState(0);

    const handleResourceClick = (resource: Resource) => {
        if (resource.status === 'ready') {
            setSelectedResource(resource);
        }
    };

    const handleCloseFullscreen = () => {
        setSelectedResource(null);
    };

    const handleNavigate = (direction: 'prev' | 'next') => {
        if (!selectedResource) return;
        const currentIdx = displayResources.findIndex(r => r.id === selectedResource.id);
        const readyResources = displayResources.filter(r => r.status === 'ready');
        const currentReadyIdx = readyResources.findIndex(r => r.id === selectedResource.id);

        if (direction === 'next') {
            const nextIdx = (currentReadyIdx + 1) % readyResources.length;
            setSelectedResource(readyResources[nextIdx]);
        } else {
            const prevIdx = (currentReadyIdx - 1 + readyResources.length) % readyResources.length;
            setSelectedResource(readyResources[prevIdx]);
        }
    };

    const handleDownload = () => {
        if (!selectedResource) return;
        if (selectedResource.type === 'AI_IMAGE' && (selectedResource as AIImageResource).base64Data) {
            const link = document.createElement('a');
            link.href = (selectedResource as AIImageResource).base64Data!;
            link.download = `${selectedResource.title.replace(/\s+/g, '-')}.png`;
            link.click();
        } else if (selectedResource.type === 'IMAGE_SEARCH' && (selectedResource as ExternalImageResource).url) {
            window.open((selectedResource as ExternalImageResource).url, '_blank');
        } else if (selectedResource.type === 'VIDEO_SEARCH' && (selectedResource as ExternalVideoResource).url) {
            window.open((selectedResource as ExternalVideoResource).url, '_blank');
        }
    };

    const readyCount = allResources.filter(r => r.status === 'ready').length;
    const loadingCount = allResources.filter(r => r.status === 'loading' || r.status === 'pending').length;
    const errorCount = allResources.filter(r => r.status === 'error').length;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto animate-in fade-in duration-300">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800 px-4 md:px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-2 bg-slate-800 text-slate-300 rounded-full hover:bg-slate-700 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-white">Sala de Proyección</h2>
                            <p className="text-sm text-slate-400">
                                {readyCount} recursos listos
                                {loadingCount > 0 && ` • ${loadingCount} cargando`}
                                {errorCount > 0 && ` • ${errorCount} errores`}
                            </p>
                        </div>
                    </div>
                    {/* Filter icons... */}
                    <div className="hidden md:flex items-center gap-2 text-sm">
                        {aiImages.length > 0 && (
                            <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" /> {aiImages.length}
                            </span>
                        )}
                        {diagrams.length > 0 && (
                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> {diagrams.length}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Grid Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                {displayResources.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-800 flex items-center justify-center">
                            <Layout className="w-10 h-10 text-slate-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-400 mb-2">Sin recursos</h3>
                        <p className="text-slate-500">Los recursos se mostrarán aquí cuando estén listos.</p>
                    </div>
                ) : (
                    <>
                        {/* Diagrams Section */}
                        {diagrams.length > 0 && (
                            <section className="mb-12">
                                <div className="flex items-center gap-3 mb-6 text-emerald-400">
                                    <Sparkles className="w-6 h-6" />
                                    <h3 className="font-bold text-xl">Organizadores Visuales</h3>
                                    {diagrams.length > 1 && (
                                        <div className="ml-auto flex items-center gap-2 text-sm text-slate-400">
                                            <button onClick={() => setActiveDiagramIdx((activeDiagramIdx - 1 + diagrams.length) % diagrams.length)} className="p-1 bg-slate-800 rounded hover:bg-slate-700">
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <span>{activeDiagramIdx + 1} / {diagrams.length}</span>
                                            <button onClick={() => setActiveDiagramIdx((activeDiagramIdx + 1) % diagrams.length)} className="p-1 bg-slate-800 rounded hover:bg-slate-700">
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-white rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800">
                                    <DiagramRenderer
                                        key={diagrams[activeDiagramIdx]?.id}
                                        organizer={{
                                            id: diagrams[activeDiagramIdx]?.id || '',
                                            title: diagrams[activeDiagramIdx]?.title || '',
                                            type: diagrams[activeDiagramIdx]?.diagramType || 'mapa-conceptual',
                                            mermaidCode: diagrams[activeDiagramIdx]?.mermaidCode || '',
                                            description: diagrams[activeDiagramIdx]?.generationPrompt || '',
                                            textFallback: diagrams[activeDiagramIdx]?.textFallback
                                        }}
                                        className="min-h-[400px]"
                                        hideDescription={false}
                                        enableZoom={true} // Enable zoom for preview too
                                    />
                                </div>
                            </section>
                        )}

                        {/* Grid */}
                        <section>
                            <div className="flex items-center gap-3 mb-6 text-sky-400">
                                <ImageIcon className="w-6 h-6" />
                                <h3 className="font-bold text-xl">Recursos Multimedia</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {displayResources
                                    .filter(r => r.type !== 'DIAGRAM')
                                    .map((resource, idx) => (
                                        <div key={resource.id} style={{ animationDelay: `${idx * 100}ms` }}>
                                            <ResourceCard resource={resource} onClick={() => handleResourceClick(resource)} />
                                        </div>
                                    ))}
                            </div>
                        </section>
                    </>
                )}
            </div>

            {/* FULLSCREEN VIEWER MODAL */}
            {selectedResource && (
                <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col animate-in fade-in duration-200">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black to-transparent z-10">
                        <h3 className="text-lg font-bold text-white truncate">{selectedResource.title}</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={handleDownload} className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition">
                                <Download className="w-5 h-5" />
                            </button>
                            <button onClick={handleCloseFullscreen} className="p-3 bg-white/10 text-white rounded-full hover:bg-red-500/80 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content Container - Use flex-1 with min-h-0 to force constraints */}
                    <div className="flex-1 w-full min-h-0 flex items-center justify-center p-4 relative overflow-hidden">
                        
                        {/* Navigation Arrows */}
                        {allResources.filter(r => r.status === 'ready').length > 1 && (
                            <>
                                <button onClick={() => handleNavigate('prev')} className="absolute left-4 z-20 p-3 bg-white/10 rounded-full hover:bg-white/20 text-white transition backdrop-blur-sm">
                                    <ChevronLeft className="w-8 h-8" />
                                </button>
                                <button onClick={() => handleNavigate('next')} className="absolute right-4 z-20 p-3 bg-white/10 rounded-full hover:bg-white/20 text-white transition backdrop-blur-sm">
                                    <ChevronRight className="w-8 h-8" />
                                </button>
                            </>
                        )}

                        {/* Resource Content */}
                        {selectedResource.type === 'AI_IMAGE' && (selectedResource as AIImageResource).base64Data && (
                            <img
                                src={(selectedResource as AIImageResource).base64Data}
                                alt={selectedResource.title}
                                className="max-h-full max-w-full object-contain shadow-2xl"
                            />
                        )}

                        {selectedResource.type === 'IMAGE_SEARCH' && (selectedResource as ExternalImageResource).url && (
                            isSearchUrl((selectedResource as ExternalImageResource).url!) ? (
                                <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-900 rounded-xl border border-slate-700 max-w-md">
                                    <Search className="w-16 h-16 text-sky-400 mb-4" />
                                    <h4 className="text-xl font-bold text-white mb-2">Búsqueda Externa</h4>
                                    <p className="text-slate-400 mb-6">Explora imágenes relacionadas con este tema.</p>
                                    <a href={(selectedResource as ExternalImageResource).url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-500 transition font-bold">
                                        Ver resultados en Google
                                    </a>
                                </div>
                            ) : (
                                <img
                                    src={(selectedResource as ExternalImageResource).url}
                                    alt={selectedResource.title}
                                    className="max-h-full max-w-full object-contain shadow-2xl"
                                />
                            )
                        )}

                        {selectedResource.type === 'VIDEO_SEARCH' && (selectedResource as ExternalVideoResource).url && (
                            <div className="w-full h-full max-w-5xl flex items-center justify-center">
                                {getYouTubeVideoId((selectedResource as ExternalVideoResource).url!) ? (
                                    <div className="aspect-video w-full max-h-full">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${getYouTubeVideoId((selectedResource as ExternalVideoResource).url!)}`}
                                            className="w-full h-full rounded-lg shadow-2xl"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center bg-slate-800 rounded-lg p-8">
                                        <MonitorPlay className="w-16 h-16 text-red-400 mb-4" />
                                        <h4 className="text-xl font-bold text-white mb-2">Video Educativo</h4>
                                        <a href={(selectedResource as ExternalVideoResource).url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 transition flex items-center gap-2">
                                            <ExternalLink className="w-5 h-5" /> Abrir Video
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedResource.type === 'DIAGRAM' && (selectedResource as DiagramResource).mermaidCode && (
                            <div className="w-full h-full max-w-6xl bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
                                {/* Use DiagramRenderer with zoom enabled and description hidden */}
                                <DiagramRenderer
                                    organizer={{
                                        id: selectedResource.id,
                                        title: selectedResource.title,
                                        type: (selectedResource as DiagramResource).diagramType,
                                        mermaidCode: (selectedResource as DiagramResource).mermaidCode!,
                                        description: (selectedResource as DiagramResource).generationPrompt,
                                        textFallback: (selectedResource as DiagramResource).textFallback
                                    }}
                                    className="w-full h-full"
                                    hideDescription={true}
                                    enableZoom={true}
                                />
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-gradient-to-t from-black to-transparent text-center z-10">
                        <span className="text-slate-400 text-sm px-4 py-2 bg-black/50 rounded-full">
                            {selectedResource.moment} • {selectedResource.type.replace('_', ' ')}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourcesPresenter;