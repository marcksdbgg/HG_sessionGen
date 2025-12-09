import React from 'react';
import { GeneratedImage, Resource } from '../../types';
import { MarkdownText, isExternalResource, ExternalResourceRenderer } from '../../utils/markdownParser';
import { fuzzyMatchImage } from '../../utils/normalization';
import ResourceButton, { ImageButton, PendingResourceButton } from '../ui/ResourceButton';

interface SmartTextRendererProps {
    text: string;
    images?: GeneratedImage[];
    resources?: Resource[];
    onOpenImage: (img: GeneratedImage) => void;
    onOpenResource?: (resource: Resource) => void;
}

/**
 * Parses text to find {{imagen:Title}} or {{recurso:Title}} tags and renders them as interactive buttons.
 * Supports both legacy {{imagen:}} format and new polymorphic {{recurso:}} format.
 */
const SmartTextRenderer: React.FC<SmartTextRendererProps> = ({
    text,
    images,
    resources,
    onOpenImage,
    onOpenResource
}) => {
    if (!text) return null;

    // Regex to find both {{imagen:Title}} and {{recurso:Title}}
    const parts = text.split(/(\{\{(?:imagen|recurso):.*?\}\})/g);

    return (
        <span className="text-slate-700 leading-relaxed">
            {parts.map((part, index) => {
                // Try matching {{imagen:Title}} first (legacy format)
                const imagenMatch = part.match(/\{\{imagen:(.*?)\}\}/);
                if (imagenMatch) {
                    const titleRef = imagenMatch[1].trim();
                    const imgMatch = fuzzyMatchImage(titleRef, images);
                    const img = imgMatch ? images?.find(i => i.id === imgMatch.id) : undefined;

                    if (img && (img.base64Data || img.isLoading)) {
                        return <ImageButton key={index} image={img} onClick={() => onOpenImage(img)} />;
                    } else {
                        return <span key={index} className="text-slate-500 italic mx-1">[{titleRef}]</span>;
                    }
                }

                // Try matching {{recurso:Title}} (new polymorphic format)
                const recursoMatch = part.match(/\{\{recurso:(.*?)\}\}/);
                if (recursoMatch) {
                    const titleRef = recursoMatch[1].trim();

                    // First try to find in polymorphic resources
                    const resource = resources?.find(r =>
                        r.title.toLowerCase().trim() === titleRef.toLowerCase().trim() ||
                        r.title.toLowerCase().includes(titleRef.toLowerCase()) ||
                        titleRef.toLowerCase().includes(r.title.toLowerCase())
                    );

                    if (resource) {
                        return (
                            <ResourceButton
                                key={index}
                                resource={resource}
                                onClick={() => onOpenResource?.(resource)}
                            />
                        );
                    }

                    // Fallback: Try to find in legacy images array
                    const imgMatch = fuzzyMatchImage(titleRef, images);
                    const img = imgMatch ? images?.find(i => i.id === imgMatch.id) : undefined;

                    if (img && (img.base64Data || img.isLoading)) {
                        return <ImageButton key={index} image={img} onClick={() => onOpenImage(img)} />;
                    }

                    // Resource not found yet - show as pending placeholder
                    return <PendingResourceButton key={index} title={titleRef} />;
                }
                return <MarkdownText key={index} text={part} />;
            })}
        </span>
    );
};

export default SmartTextRenderer;
