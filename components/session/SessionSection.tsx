import React from 'react';
import { GeneratedImage, Resource } from '../../types';
import SectionHeader from './SectionHeader';
import EditableList from './EditableList';

interface SessionSectionProps {
    title: string;
    icon: React.ReactNode;
    colorClass: string;
    isEditing: boolean;
    isLoading?: boolean;
    subsections: {
        label: string;
        items: string[];
        fieldKey: string;
    }[];
    images?: GeneratedImage[];
    resources?: Resource[];
    onRegenerate?: () => void;
    onUpdateField: (fieldKey: string, value: string[]) => void;
    onOpenImage: (img: GeneratedImage) => void;
    onOpenResource?: (resource: Resource) => void;
}

/**
 * Generic session section component (Inicio, Desarrollo, Cierre)
 */
const SessionSection: React.FC<SessionSectionProps> = ({
    title,
    icon,
    colorClass,
    isEditing,
    isLoading,
    subsections,
    images,
    resources,
    onRegenerate,
    onUpdateField,
    onOpenImage,
    onOpenResource
}) => {
    return (
        <div className={`bg-white rounded-xl shadow-sm border overflow-hidden print:border-none print:shadow-none transition-all duration-300 ${isEditing ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
            <SectionHeader
                title={title}
                icon={icon}
                colorClass={colorClass}
                onRegenerate={onRegenerate}
                isLoading={isLoading}
                isEditing={isEditing}
            />
            <div className="p-6 space-y-4">
                {subsections.map((subsection, idx) => (
                    <div key={idx} className="space-y-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {subsection.label}
                        </span>
                        <EditableList
                            items={subsection.items}
                            isEditing={isEditing}
                            images={images}
                            resources={resources}
                            onChange={(val) => onUpdateField(subsection.fieldKey, val)}
                            onOpenImage={onOpenImage}
                            onOpenResource={onOpenResource}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SessionSection;
