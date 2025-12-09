import React, { useState } from 'react';
import { VirtualResources, GeneratedImage, Organizer } from '../types';
import DiagramRenderer from './DiagramRenderer';
import { Maximize2, X, Download, Image as ImageIcon, Layout, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

interface ResourcesPresenterProps {
    resources: VirtualResources;
    onClose: () => void;
    initialImage?: GeneratedImage | null;
}

const ResourcesPresenter: React.FC<ResourcesPresenterProps> = ({ resources, onClose, initialImage }) => {
    const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(initialImage || null);
    
    // Support for multiple diagrams
    const allOrganizers = [resources.organizer, ...(resources.diagrams || [])];
    const [activeOrganizerIdx, setActiveOrganizerIdx] = useState(0);

    // Filter valid images
    const validImages = resources.images.filter(img => img.base64Data);

    const handleNextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedImage) return;
        const idx = validImages.findIndex(img => img.id === selectedImage.id);
        const nextIdx = (idx + 1) % validImages.length;
        setSelectedImage(validImages[nextIdx]);
    };

    const handlePrevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedImage) return;
        const idx = validImages.findIndex(img => img.id === selectedImage.id);
        const prevIdx = (idx - 1 + validImages.length) % validImages.length;
        setSelectedImage(validImages[prevIdx]);
    };
    
    const handleNextOrganizer = () => {
        setActiveOrganizerIdx(prev => (prev + 1) % allOrganizers.length);
    };

    const handlePrevOrganizer = () => {
        setActiveOrganizerIdx(prev => (prev - 1 + allOrganizers.length) % allOrganizers.length);
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedImage || !selectedImage.base64Data) return;
        
        const link = document.createElement('a');
        link.href = selectedImage.base64Data;
        link.download = `Recurso-${selectedImage.title.replace(/\s+/g, '-')}.png`;
        link.click();
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto animate-in fade-in duration-300 font-sans">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose}
                        className="p-2 bg-slate-900 text-slate-300 rounded-full hover:bg-slate-800 hover:text-white transition-colors border border-slate-800"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Sala de Proyección</h2>
                        <p className="text-sm text-slate-400">Recursos didácticos virtuales</p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-12">
                
                {/* Visual Organizer Section */}
                <section>
                    <div className="flex items-center justify-between mb-6 text-emerald-400 border-b border-slate-800 pb-2">
                         <div className="flex items-center gap-3">
                            <Layout className="w-6 h-6" />
                            <h3 className="font-bold text-xl uppercase tracking-wider">Organizadores Visuales</h3>
                        </div>
                        {allOrganizers.length > 1 && (
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <button onClick={handlePrevOrganizer} className="p-1 hover:text-white bg-slate-800 rounded-lg"><ChevronLeft className="w-5 h-5"/></button>
                                <span>{activeOrganizerIdx + 1} / {allOrganizers.length}</span>
                                <button onClick={handleNextOrganizer} className="p-1 hover:text-white bg-slate-800 rounded-lg"><ChevronRight className="w-5 h-5"/></button>
                            </div>
                        )}
                    </div>
                    <div className="bg-white rounded-xl overflow-hidden shadow-2xl shadow-black/50 border-4 border-slate-800 relative">
                         {/* Pass a key to force re-render when switching organizers */}
                        <DiagramRenderer 
                            key={allOrganizers[activeOrganizerIdx].id} 
                            organizer={allOrganizers[activeOrganizerIdx]} 
                            className="min-h-[500px]" 
                        />
                    </div>
                </section>

                {/* Images Grid Section */}
                {validImages.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-6 text-sky-400 border-b border-slate-800 pb-2">
                            <ImageIcon className="w-6 h-6" />
                            <h3 className="font-bold text-xl uppercase tracking-wider">Galería de Imágenes</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {validImages.map((img) => (
                                <div 
                                    key={img.id} 
                                    className="group relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-sky-500 transition-all duration-300 shadow-xl hover:shadow-sky-500/20 cursor-pointer flex flex-col"
                                    onClick={() => setSelectedImage(img)}
                                >
                                    <div className="aspect-[4/3] w-full overflow-hidden bg-black relative">
                                        <img 
                                            src={img.base64Data} 
                                            alt={img.title} 
                                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                                        
                                        <div className="absolute bottom-3 left-3">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${
                                                img.moment === 'Inicio' ? 'bg-blue-600/90 text-white' :
                                                img.moment === 'Desarrollo' ? 'bg-indigo-600/90 text-white' :
                                                'bg-amber-600/90 text-white'
                                            }`}>
                                                {img.moment}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col justify-between bg-slate-900">
                                        <h4 className="font-bold text-slate-100 text-lg leading-tight mb-2 group-hover:text-sky-400 transition-colors">{img.title}</h4>
                                        <div className="flex items-center text-xs text-slate-500 gap-1">
                                            <Maximize2 className="w-3 h-3" />
                                            <span>Clic para ampliar</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Lightbox / Presentation Mode */}
            {selectedImage && (
                <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-in fade-in duration-200">
                    
                    {/* Lightbox Header */}
                    <div className="absolute top-0 w-full z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
                        <h3 className="text-lg font-bold text-white/90 drop-shadow-md px-4">{selectedImage.title}</h3>
                        <div className="flex gap-3">
                             <button 
                                onClick={handleDownload}
                                className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all backdrop-blur-sm"
                                title="Descargar"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setSelectedImage(null)}
                                className="p-3 bg-white/10 text-white rounded-full hover:bg-red-500/80 transition-all backdrop-blur-sm"
                                title="Cerrar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Main Image Area */}
                    <div className="flex-1 flex items-center justify-center relative p-4 group">
                        
                        {/* Navigation Buttons (visible on hover) */}
                        {validImages.length > 1 && (
                            <>
                                <button 
                                    onClick={handlePrevImage}
                                    className="absolute left-4 p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm hover:scale-110"
                                >
                                    <ChevronLeft className="w-8 h-8" />
                                </button>
                                <button 
                                    onClick={handleNextImage}
                                    className="absolute right-4 p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm hover:scale-110"
                                >
                                    <ChevronRight className="w-8 h-8" />
                                </button>
                            </>
                        )}

                        <img 
                            src={selectedImage.base64Data} 
                            alt={selectedImage.title} 
                            className="max-h-full max-w-full object-contain shadow-2xl drop-shadow-2xl"
                        />
                    </div>

                    {/* Footer Info */}
                    <div className="p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
                        <div className="max-w-4xl mx-auto text-center">
                            <p className="text-slate-300 text-sm md:text-base font-medium bg-black/50 inline-block px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                                {selectedImage.prompt}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourcesPresenter;
