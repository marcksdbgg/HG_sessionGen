import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Organizer, OrganizerType } from '../types';
import { AlertCircle, Download, Maximize2, Minimize2, RefreshCw, Copy, Check, ZoomIn, ZoomOut, Move } from 'lucide-react';

// Mermaid configuration
declare const mermaid: any;

/**
 * DiagramRenderer - Renders Mermaid diagrams with high resolution support
 * Supports: concept maps, fishbone diagrams, flowcharts, mind maps, etc.
 */

interface DiagramRendererProps {
    organizer: Organizer;
    className?: string;
    onError?: (error: string) => void;
    hideDescription?: boolean;
    enableZoom?: boolean;
}

// Type-specific styling configurations
const TYPE_STYLES: Record<OrganizerType, { bgColor: string; borderColor: string; icon: string }> = {
    'mapa-conceptual': { bgColor: 'bg-blue-50', borderColor: 'border-blue-200', icon: '🗺️' },
    'espina-pescado': { bgColor: 'bg-amber-50', borderColor: 'border-amber-200', icon: '🐟' },
    'cruz-esquematica': { bgColor: 'bg-purple-50', borderColor: 'border-purple-200', icon: '✝️' },
    'diagrama-flujo': { bgColor: 'bg-green-50', borderColor: 'border-green-200', icon: '📊' },
    'cuadro-sinoptico': { bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', icon: '📋' },
    'mapa-mental': { bgColor: 'bg-pink-50', borderColor: 'border-pink-200', icon: '🧠' },
    'linea-tiempo': { bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200', icon: '📅' },
    'cuadro-comparativo': { bgColor: 'bg-orange-50', borderColor: 'border-orange-200', icon: '⚖️' },
    'arbol-ideas': { bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', icon: '🌳' },
    'diagrama-venn': { bgColor: 'bg-violet-50', borderColor: 'border-violet-200', icon: '⭕' },
    'otro': { bgColor: 'bg-slate-50', borderColor: 'border-slate-200', icon: '📐' }
};

const DiagramRenderer: React.FC<DiagramRendererProps> = ({ 
    organizer, 
    className = '', 
    onError,
    hideDescription = false,
    enableZoom = false
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [rendered, setRendered] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    // Zoom & Pan State
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    const style = TYPE_STYLES[organizer.type] || TYPE_STYLES['otro'];

    // Initialize Mermaid
    const initMermaid = useCallback(() => {
        if (typeof mermaid !== 'undefined') {
            mermaid.initialize({
                startOnLoad: false,
                theme: 'default',
                securityLevel: 'loose',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                fontSize: 16, // Slightly larger font for readability
                flowchart: {
                    useMaxWidth: false, // Important for zoom
                    htmlLabels: true,
                    curve: 'basis',
                    padding: 20
                },
                mindmap: {
                    useMaxWidth: false,
                    padding: 20
                },
                themeVariables: {
                    primaryColor: '#3b82f6',
                    primaryTextColor: '#1e293b',
                    primaryBorderColor: '#60a5fa',
                    lineColor: '#64748b',
                    secondaryColor: '#f1f5f9',
                    tertiaryColor: '#e2e8f0'
                }
            });
            return true;
        }
        return false;
    }, []);

    // Render diagram
    const renderDiagram = useCallback(async () => {
        if (!containerRef.current || !organizer.mermaidCode) return;

        try {
            setError(null);
            // Reset zoom on re-render
            setScale(1);
            setPosition({ x: 0, y: 0 });

            if (typeof mermaid === 'undefined') {
                throw new Error('Mermaid library not loaded');
            }

            initMermaid();

            let cleanCode = organizer.mermaidCode
                .replace(/```mermaid/g, '')
                .replace(/```/g, '')
                .trim();
                
            cleanCode = cleanCode.replace(/\\n/g, '\n');
            cleanCode = cleanCode.replace(/^(graph|flowchart)\s+([A-Za-z0-9]+)\s+([^\n])/, '$1 $2\n$3');
            cleanCode = cleanCode.replace(/^mindmap\s+([^\n])/, 'mindmap\n$1');

            const lines = cleanCode.split('\n');
            cleanCode = lines.filter(line => {
                const trimmed = line.trim();
                if (!trimmed) return true;
                if (/^(graph|flowchart|mindmap|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie)/.test(trimmed)) return true;
                if (/[\[\(\{\>\|]/.test(trimmed)) return true;
                if (line.startsWith('  ') || line.startsWith('\t')) return true;
                if (trimmed.includes(':') && !/[\[\(\{\>\|]/.test(trimmed)) return false;
                if (!trimmed.includes('-->') && !trimmed.includes('---') && trimmed.includes(',') && !/[\[\(\{\>\|]/.test(trimmed)) return false;
                return true;
            }).join('\n');

            containerRef.current.innerHTML = '';
            const diagramId = `diagram-${organizer.id}-${Date.now()}`;
            const { svg } = await mermaid.render(diagramId, cleanCode);
            containerRef.current.innerHTML = svg;

            // Remove hardcoded dimensions from SVG to allow scaling
            const svgElement = containerRef.current.querySelector('svg');
            if (svgElement) {
                svgElement.removeAttribute('height');
                // We keep width 100% relative to the transformer container
                svgElement.style.width = '100%'; 
                svgElement.style.height = 'auto';
                svgElement.style.minHeight = '200px';
            }

            setRendered(true);
        } catch (err: any) {
            console.error('Mermaid render error:', err);
            setError(err.message || 'Error rendering diagram');
            onError?.(err.message);
        }
    }, [organizer, initMermaid, onError]);

    useEffect(() => {
        if (typeof mermaid !== 'undefined') {
            renderDiagram();
        } else {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
            script.async = true;
            script.onload = () => renderDiagram();
            script.onerror = () => setError('Failed to load Mermaid library');
            document.head.appendChild(script);
        }
    }, [renderDiagram, retryCount]);

    // --- ZOOM & PAN HANDLERS ---

    const handleWheel = (e: React.WheelEvent) => {
        if (!enableZoom) return;
        // e.preventDefault(); // Note: React synthetic events can't preventDefault on wheel easily if passive
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(Math.max(0.5, scale * delta), 5);
        setScale(newScale);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!enableZoom) return;
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !enableZoom) return;
        setPosition({
            x: e.clientX - dragStartRef.current.x,
            y: e.clientY - dragStartRef.current.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const zoomIn = () => setScale(s => Math.min(s * 1.2, 5));
    const zoomOut = () => setScale(s => Math.max(s * 0.8, 0.5));
    const resetZoom = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

    // --- OTHER HANDLERS ---

    const handleDownloadPNG = () => {
        const svgElement = containerRef.current?.querySelector('svg');
        if (!svgElement) return;

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        const scale = 2;
        const svgRect = svgElement.getBoundingClientRect();
        // Use natural size if possible, else rect
        canvas.width = (svgRect.width || 800) * scale;
        canvas.height = (svgRect.height || 600) * scale;

        img.onload = () => {
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0, canvas.width / scale, canvas.height / scale);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${organizer.title.replace(/\s+/g, '_')}.png`;
                        link.click();
                        URL.revokeObjectURL(url);
                    }
                }, 'image/png');
            }
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(organizer.mermaidCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    return (
        <div className={`${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-6 overflow-hidden flex flex-col' : ''}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 ${style.bgColor} border-b ${style.borderColor} rounded-t-xl shrink-0`}>
                <div className="flex items-center gap-2">
                    <span className="text-xl">{style.icon}</span>
                    <div>
                        <h4 className="font-bold text-slate-800">{organizer.title}</h4>
                        <span className="text-xs text-slate-500 capitalize">{organizer.type.replace('-', ' ')}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <button onClick={handleCopyCode} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors">
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button onClick={handleDownloadPNG} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors">
                        <Download className="w-4 h-4" />
                    </button>
                    <button onClick={toggleFullscreen} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors">
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Diagram container */}
            <div 
                className={`relative bg-white border-x border-b ${style.borderColor} rounded-b-xl flex-1 overflow-hidden select-none`}
                style={{ minHeight: isFullscreen ? '0' : '300px' }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Zoom Controls Overlay */}
                {enableZoom && rendered && !error && (
                    <div className="absolute bottom-4 right-4 z-10 flex gap-2 bg-white/90 backdrop-blur shadow-lg border border-slate-200 p-1.5 rounded-xl">
                        <button onClick={zoomOut} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="Alejar"><ZoomOut className="w-4 h-4"/></button>
                        <button onClick={resetZoom} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 font-mono text-xs w-12">{Math.round(scale * 100)}%</button>
                        <button onClick={zoomIn} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="Acercar"><ZoomIn className="w-4 h-4"/></button>
                        <div className="w-px bg-slate-200 mx-1"></div>
                        <div className="flex items-center px-2 text-xs text-slate-400 gap-1">
                            <Move className="w-3 h-3"/> <span className="hidden sm:inline">Arrastrar</span>
                        </div>
                    </div>
                )}

                {error ? (
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                        <div className="text-center space-y-4 max-w-md">
                            <div className="flex items-center justify-center gap-2 text-amber-600">
                                <AlertCircle className="w-5 h-5" />
                                <span className="font-medium">Error en el diagrama</span>
                            </div>
                            <p className="text-sm text-slate-500">{error}</p>
                            <button onClick={() => setRetryCount(c => c + 1)} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mx-auto">
                                <RefreshCw className="w-4 h-4" /> Reintentar
                            </button>
                            {organizer.textFallback && (
                                <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm text-slate-700 font-mono text-left overflow-auto max-h-40">
                                    {organizer.textFallback}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        <div 
                            ref={containerRef}
                            className={`origin-center transition-transform duration-75 ease-out ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                            style={{ 
                                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                                width: '100%', // Ensure the inner div takes full width to allow centering
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Description/Notes (Conditional) */}
            {!hideDescription && (organizer.description || organizer.notes) && rendered && !isFullscreen && (
                <div className="mt-3 p-4 bg-slate-50 rounded-xl text-sm">
                    {organizer.description && <p className="text-slate-700">{organizer.description}</p>}
                    {organizer.notes && <p className="text-slate-500 mt-2 italic">📝 {organizer.notes}</p>}
                </div>
            )}

            {/* Fullscreen Close */}
            {isFullscreen && (
                <button onClick={toggleFullscreen} className="fixed top-4 right-4 p-3 bg-slate-800 text-white rounded-full shadow-xl hover:bg-slate-700 transition-colors z-50">
                    <Minimize2 className="w-6 h-6" />
                </button>
            )}
        </div>
    );
};

export default DiagramRenderer;