import React from 'react';
import { MarkdownText, groupItemsByHeaders } from '../../utils/markdownParser';

interface FichaCardProps {
    type: 'aula' | 'casa';
    titulo: string;
    items: string[];
}

/**
 * Reusable card component for Ficha Aula and Ficha Casa
 */
const FichaCard: React.FC<FichaCardProps> = ({ type, titulo, items }) => {
    const colorClass = type === 'aula' ? 'blue' : 'amber';
    const label = type === 'aula' ? 'Ficha de Aplicación: Aula' : 'Ficha de Extensión: Casa';

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-8 print:border-none print:p-0 shadow-sm">
            <div className={`border-b border-${colorClass}-100 pb-4 mb-6`}>
                <h2 className="text-xl font-bold text-slate-900">{label}</h2>
                <p className="text-sm text-slate-500">{titulo}</p>
            </div>
            <div className="space-y-3">
                {groupItemsByHeaders(items).map((group, groupIdx) => (
                    <div key={groupIdx} className="rounded-xl overflow-hidden bg-slate-50 p-4 border border-slate-100">
                        {group.header && (
                            <div className={`font-bold text-${colorClass}-600 mb-2`}>
                                {group.header}
                            </div>
                        )}
                        {group.items.map((item, i) => (
                            <div key={i} className="mb-2">
                                <MarkdownText text={item} />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FichaCard;
