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
 * Responsive Wireframe Grid for Tool Cards
 * - Desktop/Laptop: 4 columns matching 4-by-4 layout specification
 * - Tablet: 2-3 columns
 * - Mobile: 1 column
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
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3.5 lg:gap-4 ${className}`}
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
