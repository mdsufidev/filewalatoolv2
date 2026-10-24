import React from 'react';
import { ToolItem } from '../../core/toolsData';
import { ToolCard } from './ToolCard';

interface ToolGridProps {
  tools: ToolItem[];
  onLaunch: (
    section: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools',
    subToolId: string
  ) => void;
  tToolName: (id: string, def: string) => string;
  tToolDesc: (id: string, def: string) => string;
  className?: string;
}

/**
 * Responsive CSS Grid for Tool Cards
 * - Desktop: 5-6 columns with consistent 16px gaps
 * - Tablet: 3-4 columns
 * - Mobile: 1-2 columns
 * - Neat row alignment with identical minimum card heights
 */
export const ToolGrid: React.FC<ToolGridProps> = ({
  tools,
  onLaunch,
  tToolName,
  tToolDesc,
  className = '',
}) => {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-4.5 ${className}`}
    >
      {tools.map((tool) => (
        <ToolCard
          key={tool.id}
          tool={tool}
          onLaunch={onLaunch}
          title={tToolName(tool.id, tool.name)}
          description={tToolDesc(tool.id, tool.description)}
        />
      ))}
    </div>
  );
};
