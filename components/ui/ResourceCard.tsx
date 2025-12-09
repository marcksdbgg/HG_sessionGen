import React, { useState } from 'react';
import {
    Resource,
    AIImageResource,
    DiagramResource,
    ExternalVideoResource,
    ExternalImageResource
} from '../../types';
import {
    Image as ImageIcon,
    Sparkles,
    MonitorPlay,
    ExternalLink,
    Loader2,
    AlertCircle,
    Maximize2,
    RefreshCw
} from 'lucide-react';

interface ResourceCardProps {
    resource: Resource;
    onClick?: () => void;
}

/**
 * Extract YouTube video ID from URL
 */
const getYouTubeVideoId = (url: string): string | null => {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    // For vertex redirect URLs, just return null (we'll show as link)
    return null;
};

/**
 * ResourceCard - Polymorphic card component for displaying different resource types
 */
const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onClick }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const isLoading = resource.status === 'loading' || resource.status === 'pending';
    const isError = resource.status === 'error';
    const isReady = resource.status === 'ready';

    // Get color scheme based on type
    const getTypeColor = () => {
        switch (resource.type) {
            case 'AI_IMAGE': return { bg: 'from-indigo-500 to-purple-600', badge: 'bg-indigo-500', icon: <ImageIcon className="w-4 h-4" /> };
            case 'DIAGRAM': return { bg: 'from-emerald-500 to-teal-600', badge: 'bg-emerald-500', icon: <Sparkles className="w-4 h-4" /> };
            case 'VIDEO_SEARCH': return { bg: 'from-red-500 to-rose-600', badge: 'bg-red-500', icon: <MonitorPlay className="w-4 h-4" /> };
            case 'IMAGE_SEARCH': return { bg: 'from-sky-500 to-blue-600', badge: 'bg-sky-500', icon: <ExternalLink className="w-4 h-4" /> };
        }
    };

    const typeColor = getTypeColor();

    // Render content based on resource type
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="aspect-video flex flex-col items-center justify-center bg-slate-800/50 animate-pulse">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-2" />
                    <span className="text-slate-500 text-sm">Cargando...</span>
                </div>
            );
        }

        if (isError) {
            return (
                <div className="aspect-video flex flex-col items-center justify-center bg-red-950/30 border border-red-500/20">
                    <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                    <span className="text-red-400 text-sm">Error al cargar</span>
                    <span className="text-red-400/60 text-xs mt-1">{resource.error || 'Recurso no disponible'}</span>
                </div>
            );
        }

        switch (resource.type) {
            case 'AI_IMAGE': {
                const img = resource as AIImageResource;
                if (img.base64Data) {
                    return (
                        <div className="aspect-video relative overflow-hidden bg-black">
                            <img
                                src={img.base64Data}
                                alt={img.title}
                                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                                onLoad={() => setImageLoaded(true)}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    );
                }
                break;
            }

            case 'VIDEO_SEARCH': {
                const video = resource as ExternalVideoResource;
                if (video.url) {
                    const videoId = getYouTubeVideoId(video.url);
                    // For YouTube videos, show thumbnail
                    if (videoId) {
                        return (
                            <div className="aspect-video relative overflow-hidden bg-black">
                                <img
                                    src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                                    alt={video.title}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    onError={() => setImageError(true)}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <MonitorPlay className="w-8 h-8 text-white ml-1" />
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    // For other video URLs, show link card
                    return (
                        <div className="aspect-video flex flex-col items-center justify-center bg-gradient-to-br from-red-900/30 to-rose-900/30">
                            <MonitorPlay className="w-12 h-12 text-red-400 mb-2" />
                            <span className="text-white text-sm">Ver Video</span>
                        </div>
                    );
                }
                break;
            }

            case 'IMAGE_SEARCH': {
                const img = resource as ExternalImageResource;
                if (img.url && !imageError) {
                    return (
                        <div className="aspect-video relative overflow-hidden bg-slate-900">
                            {!imageLoaded && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-800 animate-pulse">
                                    <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                                </div>
                            )}
                            <img
                                src={img.url}
                                alt={img.title}
                                className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                onLoad={() => setImageLoaded(true)}
                                onError={() => setImageError(true)}
                            />
                        </div>
                    );
                }
                // Fallback for error or no URL
                return (
                    <div className="aspect-video flex flex-col items-center justify-center bg-slate-800/50">
                        <ImageIcon className="w-8 h-8 text-slate-500 mb-2" />
                        <span className="text-slate-400 text-sm">Imagen externa</span>
                    </div>
                );
            }

            case 'DIAGRAM': {
                const diagram = resource as DiagramResource;
                if (diagram.mermaidCode) {
                    return (
                        <div className="aspect-video flex flex-col items-center justify-center bg-gradient-to-br from-emerald-900/30 to-teal-900/30">
                            <Sparkles className="w-12 h-12 text-emerald-400 mb-2" />
                            <span className="text-white text-sm">Diagrama</span>
                            <span className="text-slate-400 text-xs mt-1">{diagram.diagramType}</span>
                        </div>
                    );
                }
                break;
            }
        }

        // Fallback
        return (
            <div className="aspect-video flex items-center justify-center bg-slate-800/50">
                <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
            </div>
        );
    };

    return (
        <div
            onClick={onClick}
            className={`group relative bg-slate-900 rounded-2xl overflow-hidden border transition-all duration-300 shadow-xl cursor-pointer
                ${isError ? 'border-red-500/50 hover:border-red-400' : 'border-slate-700 hover:border-slate-500'}
                hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-1
                animate-in fade-in slide-in-from-bottom-4 duration-500
            `}
        >
            {/* Type Badge */}
            <div className={`absolute top-3 left-3 z-10 px-2 py-1 rounded-lg ${typeColor.badge} text-white text-xs font-bold flex items-center gap-1 shadow-lg`}>
                {typeColor.icon}
                <span className="hidden sm:inline">{resource.type.replace('_', ' ')}</span>
            </div>

            {/* Moment Badge */}
            <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
                {resource.moment}
            </div>

            {/* Content */}
            {renderContent()}

            {/* Footer */}
            <div className="p-4 bg-slate-900">
                <h3 className="font-bold text-white text-lg leading-tight mb-1 group-hover:text-sky-400 transition-colors line-clamp-2">
                    {resource.title}
                </h3>
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                        {isReady && <Maximize2 className="w-3 h-3" />}
                        {isReady ? 'Clic para ver' : isLoading ? 'Procesando...' : 'Error'}
                    </span>
                    {isError && (
                        <button className="flex items-center gap-1 text-red-400 hover:text-red-300">
                            <RefreshCw className="w-3 h-3" /> Reintentar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResourceCard;
