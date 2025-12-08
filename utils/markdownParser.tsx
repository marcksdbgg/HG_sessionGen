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
