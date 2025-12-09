import React from 'react';
import { GeneratedImage, Resource } from '../../types';
import { isExternalResource, ExternalResourceRenderer } from '../../utils/markdownParser';
import SmartTextRenderer from './SmartTextRenderer';

interface EditableListProps {
    items: string[];
    isEditing: boolean;
    images?: GeneratedImage[];
    resources?: Resource[];
    onChange: (newItems: string[]) => void;
    onOpenImage: (img: GeneratedImage) => void;
    onOpenResource?: (resource: Resource) => void;
}

/**
 * Editable list component with support for resource markers
 */
const EditableList: React.FC<EditableListProps> = ({
    items,
    isEditing,
    images,
    resources,
    onChange,
    onOpenImage,
    onOpenResource
}) => {
    if (isEditing) {
        return (
            <textarea
                className="w-full p-3 text-sm border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[120px] bg-emerald-50/30 transition-all duration-200"
                value={items.join('\n')}
                onChange={(e) => onChange(e.target.value.split('\n'))}
                placeholder="Escribe cada elemento en una línea separada..."
            />
        );
    }

    return (
        <ul className="space-y-2">
            {items.map((item, idx) => {
                // Check if this is an external resource (VID_YT, IMG_URL, etc.)
                if (isExternalResource(item)) {
                    return (
                        <li key={idx} className="list-none ml-0">
                            <ExternalResourceRenderer item={item} />
                        </li>
                    );
                }
                // Regular item with potential {{imagen:}} or {{recurso:}} tags
                return (
                    <li key={idx} className="flex items-start">
                        <span className="mr-2 text-primary font-bold mt-1.5">•</span>
                        <div className="flex-1">
                            <SmartTextRenderer
                                text={item}
                                images={images}
                                resources={resources}
                                onOpenImage={onOpenImage}
                                onOpenResource={onOpenResource}
                            />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
};

export default EditableList;
