import React from 'react';
import { Resource, GeneratedImage } from '../../types';
import { Image as ImageIcon, Sparkles, MonitorPlay, Loader2, X, AlertCircle } from 'lucide-react';

interface ResourceButtonProps {
    resource: Resource;
    onClick?: () => void;
}

/**
 * Returns icon and color class based on resource type
 */
const getResourceStyle = (type: Resource['type'], status: Resource['status']) => {
    let icon = <ImageIcon className="w-3.5 h-3.5" />;
    let colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100';

    switch (type) {
        case 'AI_IMAGE':
            icon = <ImageIcon className="w-3.5 h-3.5" />;
            colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100';
            break;
        case 'DIAGRAM':
            icon = <Sparkles className="w-3.5 h-3.5" />;
            colorClass = 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
            break;
        case 'VIDEO_SEARCH':
            icon = <MonitorPlay className="w-3.5 h-3.5" />;
            colorClass = 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
            break;
        case 'IMAGE_SEARCH':
            icon = <ImageIcon className="w-3.5 h-3.5" />;
            colorClass = 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
            break;
    }

    // Override for loading/error states
    if (status === 'error') {
        colorClass = 'bg-red-50 text-red-500 border-red-200';
    } else if (status === 'loading' || status === 'pending') {
        colorClass = 'bg-slate-50 text-slate-500 border-slate-200 cursor-wait';
    }

    return { icon, colorClass };
};

/**
 * Interactive button for displaying resource references inline
 */
const ResourceButton: React.FC<ResourceButtonProps> = ({ resource, onClick }) => {
    const isLoading = resource.status === 'loading' || resource.status === 'pending';
    const isError = resource.status === 'error';
    const { icon, colorClass } = getResourceStyle(resource.type, resource.status);

    return (
        <button
            onClick={onClick}
            disabled={isLoading}
            className={`inline-flex items-center gap-1.5 mx-1 px-2 py-0.5 border rounded-md text-sm font-semibold transition-all align-middle cursor-pointer hover:scale-105 ${colorClass}`}
        >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
            <span className="underline decoration-current/30 underline-offset-2">
                {resource.title}
                {isLoading && '...'}
            </span>
            {isError && <X className="w-3 h-3 text-red-400" />}
        </button>
    );
};

/**
 * Button for legacy GeneratedImage type
 */
export const ImageButton: React.FC<{
    image: GeneratedImage;
    onClick?: () => void;
}> = ({ image, onClick }) => {
    const isLoading = image.isLoading;

    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 mx-1 px-2 py-0.5 border rounded-md text-sm font-semibold transition-all align-middle cursor-pointer ${isLoading
                    ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-wait'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:scale-105'
                }`}
        >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
            <span className="underline decoration-indigo-300 underline-offset-2">
                {image.title}
                {isLoading && '...'}
            </span>
        </button>
    );
};

/**
 * Placeholder button for resources not yet found
 */
export const PendingResourceButton: React.FC<{ title: string }> = ({ title }) => (
    <span className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-md text-sm font-medium">
        <Loader2 className="w-3 h-3 animate-spin" />
        {title}...
    </span>
);

export default ResourceButton;
