import React from 'react';

/**
 * Parse basic markdown syntax and return React elements
 * Supports: **bold**, *italic*, `code`, and combinations
 */
export function parseMarkdown(text: string): React.ReactNode {
    if (!text) return null;

    // Split by markdown patterns and create React elements
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Regex to match **bold**, *italic*, `code`
    const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let match;
    let key = 0;

    while ((match = pattern.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        const fullMatch = match[1];

        if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
            // Bold text
            const content = match[2];
            parts.push(<strong key={key++} className="font-bold text-slate-900">{content}</strong>);
        } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*') && !fullMatch.startsWith('**')) {
            // Italic text
            const content = match[3];
            parts.push(<em key={key++} className="italic">{content}</em>);
        } else if (fullMatch.startsWith('`') && fullMatch.endsWith('`')) {
            // Code text
            const content = match[4];
            parts.push(<code key={key++} className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-700">{content}</code>);
        }

        lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
}

/**
 * Component to render markdown text
 */
export const MarkdownText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
    return <span className={className}>{parseMarkdown(text)}</span>;
};

/**
 * Check if an item looks like a section header (starts with ** or is all caps)
 */
export function isHeaderItem(item: string): boolean {
    return item.startsWith('**') && item.endsWith('**') ||
        item === item.toUpperCase() && item.length > 3;
}

/**
 * Group items by headers for better display
 * Returns grouped structure with headers and their sub-items
 */
export interface GroupedItems {
    header: string | null;
    items: string[];
}

export function groupItemsByHeaders(items: string[]): GroupedItems[] {
    const groups: GroupedItems[] = [];
    let currentGroup: GroupedItems = { header: null, items: [] };

    for (const item of items) {
        // Check if this item is a header (wrapped in ** or looks like a group header)
        const isHeader = (item.startsWith('**') && item.endsWith('**')) ||
            (item.includes(':') && item.split(':')[0].startsWith('**'));

        if (isHeader) {
            // Save previous group if it has items
            if (currentGroup.items.length > 0 || currentGroup.header) {
                groups.push(currentGroup);
            }
            // Start new group with this header
            currentGroup = {
                header: item.replace(/\*\*/g, ''), // Remove ** from header
                items: []
            };
        } else if (item.trim()) {
            // Add non-empty item to current group
            currentGroup.items.push(item);
        }
    }

    // Don't forget the last group
    if (currentGroup.items.length > 0 || currentGroup.header) {
        groups.push(currentGroup);
    }

    return groups;
}

// ============================================================
// EXTERNAL RESOURCE RENDERING (VID_YT, IMG_URL, IMG_GEN, DIAG_PROMPT)
// ============================================================

interface ParsedResource {
    type: 'VID_YT' | 'IMG_URL' | 'IMG_GEN' | 'DIAG_PROMPT' | 'TEXT';
    title: string;
    url?: string;
    instruction?: string;
}

/**
 * Parse a material item to detect resource prefixes
 */
export function parseResourceItem(item: string): ParsedResource {
    // VID_YT: Título :: URL
    const vidMatch = item.match(/^VID_YT:\s*(.+?)\s*::\s*(.+)$/i);
    if (vidMatch) {
        return { type: 'VID_YT', title: vidMatch[1].trim(), url: vidMatch[2].trim() };
    }

    // IMG_URL: Título :: URL
    const imgUrlMatch = item.match(/^IMG_URL:\s*(.+?)\s*::\s*(.+)$/i);
    if (imgUrlMatch) {
        return { type: 'IMG_URL', title: imgUrlMatch[1].trim(), url: imgUrlMatch[2].trim() };
    }

    // IMG_GEN: Título
    const imgGenMatch = item.match(/^IMG_GEN:\s*(.+)$/i);
    if (imgGenMatch) {
        return { type: 'IMG_GEN', title: imgGenMatch[1].trim() };
    }

    // DIAG_PROMPT: Título :: Instrucción
    const diagMatch = item.match(/^DIAG_PROMPT:\s*(.+?)\s*::\s*(.+)$/i);
    if (diagMatch) {
        return { type: 'DIAG_PROMPT', title: diagMatch[1].trim(), instruction: diagMatch[2].trim() };
    }

    // Default: plain text
    return { type: 'TEXT', title: item };
}

/**
 * Extract YouTube video ID from various URL formats
 */
function getYouTubeVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

/**
 * Component to render external resources (YouTube videos, images, etc.)
 */
export const ExternalResourceRenderer: React.FC<{ item: string }> = ({ item }) => {
    const resource = parseResourceItem(item);

    switch (resource.type) {
        case 'VID_YT': {
            const videoId = resource.url ? getYouTubeVideoId(resource.url) : null;
            if (videoId) {
                return (
                    <div className="my-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                        <div className="aspect-video w-full">
                            <iframe
                                src={`https://www.youtube.com/embed/${videoId}`}
                                title={resource.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full"
                            />
                        </div>
                        <div className="px-3 py-2 bg-red-50 border-t border-red-100">
                            <span className="text-xs font-bold text-red-600 mr-2">▶ YouTube</span>
                            <span className="text-sm text-slate-700">{resource.title}</span>
                        </div>
                    </div>
                );
            }
            // Fallback: show link if can't extract video ID
            return (
                <div className="my-2 p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="text-xs font-bold text-red-600 mr-2">▶ Video:</span>
                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                        {resource.title}
                    </a>
                </div>
            );
        }

        case 'IMG_URL': {
            return (
                <div className="my-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img
                        src={resource.url}
                        alt={resource.title}
                        className="w-full max-h-80 object-contain bg-white"
                        onError={(e) => {
                            // Fallback if image fails to load
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                    <div className="px-3 py-2 bg-blue-50 border-t border-blue-100">
                        <span className="text-xs font-bold text-blue-600 mr-2">🖼️ Imagen</span>
                        <span className="text-sm text-slate-700">{resource.title}</span>
                    </div>
                </div>
            );
        }

        case 'IMG_GEN': {
            return (
                <div className="my-2 p-3 bg-purple-50 rounded-lg border border-purple-200 flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-600">✨ Imagen IA:</span>
                    <span className="text-sm text-slate-700">{resource.title}</span>
                    <span className="text-xs text-slate-400">(ver en Presentación)</span>
                </div>
            );
        }

        case 'DIAG_PROMPT': {
            return (
                <div className="my-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-xs font-bold text-emerald-600 mr-2">📊 Diagrama:</span>
                    <span className="text-sm text-slate-700">{resource.title}</span>
                    <p className="text-xs text-slate-500 mt-1">{resource.instruction}</p>
                </div>
            );
        }

        default:
            // Regular text - use markdown parser
            return <MarkdownText text={item} />;
    }
};

/**
 * Check if a material item is an external resource
 */
export function isExternalResource(item: string): boolean {
    return /^(VID_YT|IMG_URL|IMG_GEN|DIAG_PROMPT):/i.test(item);
}
