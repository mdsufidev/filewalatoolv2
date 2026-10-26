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
 * - Desktop/Tablet: 2 wide columns matching wireframe specification
 * - Mobile: 1 column
 * - Generous horizontal space for title and description
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
      className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}
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
