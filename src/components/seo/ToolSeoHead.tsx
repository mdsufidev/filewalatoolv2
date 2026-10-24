import React from 'react';
import { ToolJsonLdSeo, ToolJsonLdSeoProps } from './ToolJsonLdSeo';

export { ToolJsonLdSeo };
export type { ToolJsonLdSeoProps };

/**
 * ToolSeoHead (Backward-compatible adapter)
 * Delegates to the comprehensive ToolJsonLdSeo engine with AEO, GEO, and Schema.org @graph.
 */
export const ToolSeoHead: React.FC<ToolJsonLdSeoProps> = (props) => {
  return <ToolJsonLdSeo {...props} />;
};

