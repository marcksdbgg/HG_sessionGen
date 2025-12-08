import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Organizer, OrganizerType } from '../types';
import { AlertCircle, Download, Maximize2, Minimize2, RefreshCw, Copy, Check } from 'lucide-react';

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

const DiagramRenderer: React.FC<DiagramRendererProps> = ({ organizer, className = '', onError }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [rendered, setRendered] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const style = TYPE_STYLES[organizer.type] || TYPE_STYLES['otro'];

    // Initialize Mermaid
    const initMermaid = useCallback(() => {
        if (typeof mermaid !== 'undefined') {
            mermaid.initialize({
                startOnLoad: false,
                theme: 'default',
                securityLevel: 'loose',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                fontSize: 14,
                flowchart: {
                    useMaxWidth: true,
                    htmlLabels: true,
                    curve: 'basis',
                    padding: 20,
                    nodeSpacing: 50,
                    rankSpacing: 50
                },
                mindmap: {
                    useMaxWidth: true,
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

            // Check if mermaid is loaded
            if (typeof mermaid === 'undefined') {
                throw new Error('Mermaid library not loaded');
            }

            initMermaid();

            // Clean and validate mermaid code
            let cleanCode = organizer.mermaidCode
                .replace(/```mermaid/g, '') // Remove markdown code blocks if present
                .replace(/```/g, '')
                .trim();
                
            // Fix common issue: quoted newlines literal "\n" which some parsers output
            cleanCode = cleanCode.replace(/\\n/g, '\n');

            // Fix: Ensure graph declaration is on its own line
            // e.g., "graph TD A[...]" -> "graph TD\nA[...]"
            cleanCode = cleanCode.replace(/^(graph|flowchart)\s+([A-Za-z0-9]+)\s+([^\n])/, '$1 $2\n$3');
            // e.g., "mindmap root((...))" -> "mindmap\nroot((...))"
            cleanCode = cleanCode.replace(/^mindmap\s+([^\n])/, 'mindmap\n$1');

            // Clear previous content
            containerRef.current.innerHTML = '';

            // Create unique ID for this diagram
            const diagramId = `diagram-${organizer.id}-${Date.now()}`;

            // Render the diagram
            const { svg } = await mermaid.render(diagramId, cleanCode);

            // Insert SVG with responsive sizing
            containerRef.current.innerHTML = svg;

            // Style the SVG for high resolution
            const svgElement = containerRef.current.querySelector('svg');
            if (svgElement) {
                svgElement.style.maxWidth = '100%';
                svgElement.style.height = 'auto';
                svgElement.style.minHeight = '200px';
                svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            }

            setRendered(true);
        } catch (err: any) {
            console.error('Mermaid render error:', err);
            const errorMsg = err.message || 'Error rendering diagram';
            setError(errorMsg);
            onError?.(errorMsg);

            // Show fallback text
            if (containerRef.current && organizer.textFallback) {
                containerRef.current.innerHTML = `
          <div class="p-4 bg-slate-100 rounded-lg text-sm text-slate-700 whitespace-pre-wrap font-mono">
            ${organizer.textFallback}
          </div>
        `;
            }
        }
    }, [organizer, initMermaid, onError]);

    // Effect to load Mermaid and render
    useEffect(() => {
        // Check if mermaid is already loaded
        if (typeof mermaid !== 'undefined') {
            renderDiagram();
            return;
        }

        // Load Mermaid from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
        script.async = true;
        script.onload = () => {
            renderDiagram();
        };
        script.onerror = () => {
            setError('Failed to load Mermaid library');
        };
        document.head.appendChild(script);

        return () => {
            // Cleanup if needed
        };
    }, [renderDiagram, retryCount]);

    // Download as SVG
    const handleDownloadSVG = () => {
        const svgElement = containerRef.current?.querySelector('svg');
        if (!svgElement) return;

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${organizer.title.replace(/\s+/g, '_')}.svg`;
        link.click();

        URL.revokeObjectURL(url);
    };

    // Download as PNG (high resolution)
    const handleDownloadPNG = () => {
        const svgElement = containerRef.current?.querySelector('svg');
        if (!svgElement) return;

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        // High resolution: 2x scale
        const scale = 2;
        const svgRect = svgElement.getBoundingClientRect();
        canvas.width = svgRect.width * scale;
        canvas.height = svgRect.height * scale;

        img.onload = () => {
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${organizer.title.replace(/\s+/g, '_')}.png`;
                        link.click();
                        URL.revokeObjectURL(url);
                    }
                }, 'image/png', 1.0);
            }
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    // Copy Mermaid code
    const handleCopyCode = () => {
        navigator.clipboard.writeText(organizer.mermaidCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Retry render
    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        setError(null);
        setRendered(false);
    };

    // Toggle fullscreen
    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    return (
        <div className={`${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-6 overflow-auto' : ''}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 ${style.bgColor} border-b ${style.borderColor} rounded-t-xl`}>
                <div className="flex items-center gap-2">
                    <span className="text-xl">{style.icon}</span>
                    <div>
                        <h4 className="font-bold text-slate-800">{organizer.title}</h4>
                        <span className="text-xs text-slate-500 capitalize">{organizer.type.replace('-', ' ')}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleCopyCode}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors"
                        title="Copiar código Mermaid"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={handleDownloadPNG}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors"
                        title="Descargar PNG"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors"
                        title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Diagram container */}
            <div className={`p-6 bg-white border-x border-b ${style.borderColor} rounded-b-xl min-h-[300px] flex items-center justify-center`}>
                {error ? (
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center gap-2 text-amber-600">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">Error en el diagrama</span>
                        </div>
                        <p className="text-sm text-slate-500">{error}</p>
                        <button
                            onClick={handleRetry}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mx-auto"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Reintentar
                        </button>
                        {organizer.textFallback && (
                            <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap font-mono text-left max-w-full overflow-auto">
                                {organizer.textFallback}
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        ref={containerRef}
                        className="w-full overflow-auto diagram-container"
                        style={{ minHeight: '250px' }}
                    />
                )}
            </div>

            {/* Description/Notes */}
            {(organizer.description || organizer.notes) && rendered && (
                <div className="mt-3 p-4 bg-slate-50 rounded-xl text-sm">
                    {organizer.description && (
                        <p className="text-slate-700">{organizer.description}</p>
                    )}
                    {organizer.notes && (
                        <p className="text-slate-500 mt-2 italic">📝 {organizer.notes}</p>
                    )}
                </div>
            )}

            {/* Fullscreen close button */}
            {isFullscreen && (
                <button
                    onClick={toggleFullscreen}
                    className="fixed top-4 right-4 p-3 bg-slate-800 text-white rounded-full shadow-xl hover:bg-slate-700 transition-colors z-50"
                >
                    <Minimize2 className="w-6 h-6" />
                </button>
            )}
        </div>
    );
};

export default DiagramRenderer;