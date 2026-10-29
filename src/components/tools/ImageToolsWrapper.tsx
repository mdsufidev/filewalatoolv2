import React, { useState, useEffect } from 'react';
import {
  Minimize2,
  Maximize2,
  Crop,
  Code,
  Circle,
  Type,
  Smile,
  Pipette,
  Sliders,
  Archive,
  Wrench,
  Sparkles,
} from 'lucide-react';
import { CompressorTool } from './CompressorTool';
import { ResizerTool } from './ResizerTool';
import { CropRotateTool } from './CropRotateTool';
import { Base64ConverterTool } from './image/Base64ConverterTool';
import { RoundedCornerTool } from './image/RoundedCornerTool';
import { WatermarkerTool } from './image/WatermarkerTool';
import { MemeGeneratorTool } from './image/MemeGeneratorTool';
import { PaletteExtractorTool } from './image/PaletteExtractorTool';
import { FilterWatermarkTool } from './FilterWatermarkTool';
import { BatchTool } from './BatchTool';
import { BackgroundRemoverTool } from './image/BackgroundRemoverTool';
import { FaceEnhancerTool } from './image/FaceEnhancerTool';
import { useTheme } from '../../core/themeContext';

export type OptimizerToolId =
  | 'compressor'
  | 'resizer'
  | 'cropper'
  | 'bg-remover'
  | 'face-enhancer'
  | 'base64'
  | 'rounded'
  | 'watermark'
  | 'meme'
  | 'palette'
  | 'adjust'
  | 'batch';

export interface ImageToolMeta {
  id: OptimizerToolId;
  label: string;
  icon: React.ReactNode;
  targetKeyword: string;
  description: string;
  badge?: string;
  category?: 'optimizer' | 'creative' | 'developer';
}

export const IMAGE_TOOLS_LIST: ImageToolMeta[] = [
  // Primary 3 optimizers
  {
    id: 'compressor',
    label: 'Image Compressor',
    icon: <Minimize2 className="w-4 h-4 text-emerald-500" />,
    targetKeyword: 'Reduce PNG, JPEG, WebP file size without losing quality',
    description: 'Compress photos with real-time before/after comparison slider',
    badge: '-90%',
    category: 'optimizer',
  },
  {
    id: 'resizer',
    label: 'Image Resizer',
    icon: <Maximize2 className="w-4 h-4 text-blue-500" />,
    targetKeyword: 'Resize image dimensions by pixels or percentage',
    description: 'Scale photos with aspect ratio lock and social media presets',
    category: 'optimizer',
  },
  {
    id: 'cropper',
    label: 'Image Cropper',
    icon: <Crop className="w-4 h-4 text-indigo-500" />,
    targetKeyword: 'Crop image with custom aspect ratios like 1:1, 16:9',
    description: 'Trim photos with precision crop box and rotate 90° controls',
    category: 'optimizer',
  },
  {
    id: 'bg-remover',
    label: 'Background Remover',
    icon: <Sparkles className="w-4 h-4 text-amber-500" />,
    targetKeyword: 'Remove background from image online for free',
    description: 'Instantly remove image background with transparent PNG or solid color',
    badge: 'Chroma',
    category: 'creative',
  },
  {
    id: 'face-enhancer',
    label: 'AI Face Enhancer',
    icon: <Sparkles className="w-4 h-4 text-rose-500" />,
    targetKeyword: 'AI Face Enhancer online free / Photo face retouch and skin smoother',
    description: 'Smooth skin, sharpen eyes, unblur portraits, and upscale 2x/4x HD',
    badge: 'AI Smart',
    category: 'creative',
  },
  // Creative & Developer Utilities
  {
    id: 'base64',
    label: 'Image to Base64',
    icon: <Code className="w-4 h-4 text-cyan-500" />,
    targetKeyword: 'Convert image to Base64 string online',
    description: 'Generate CSS data:image/png;base64 URIs for inline embedding',
    badge: 'Code',
    category: 'developer',
  },
  {
    id: 'rounded',
    label: 'Rounded Corners',
    icon: <Circle className="w-4 h-4 text-purple-500" />,
    targetKeyword: 'Add border radius to image / Round image corners online',
    description: 'Create smooth circular avatars or iOS-style rounded icons with alpha PNG',
    badge: 'Radius',
    category: 'creative',
  },
  {
    id: 'watermark',
    label: 'Image Watermarker',
    icon: <Type className="w-4 h-4 text-pink-500" />,
    targetKeyword: 'Add watermark to images online for free',
    description: 'Stamp custom copyright text, logo, opacity, and positioning',
    badge: 'Protect',
    category: 'creative',
  },
  {
    id: 'meme',
    label: 'Meme Generator',
    icon: <Smile className="w-4 h-4 text-amber-500" />,
    targetKeyword: 'Add text to image / Meme generator online',
    description: 'Overlay classic top and bottom impact text with black stroke outline',
    badge: 'Viral',
    category: 'creative',
  },
  {
    id: 'palette',
    label: 'Palette Extractor',
    icon: <Pipette className="w-4 h-4 text-emerald-500" />,
    targetKeyword: 'Extract color palette from image / Image color picker',
    description: 'Pick exact hex colors from image or auto-extract top dominant swatches',
    badge: 'HEX',
    category: 'developer',
  },
  {
    id: 'adjust',
    label: 'Filters & Adjust',
    icon: <Sliders className="w-4 h-4 text-teal-500" />,
    targetKeyword: 'Brightness, contrast, saturation & blur photo editing',
    description: 'Fine-tune exposure, monochrome effects, and sharpen filters',
    category: 'creative',
  },
  // Batch
  {
    id: 'batch',
    label: 'Batch Processor',
    icon: <Archive className="w-4 h-4 text-slate-400" />,
    targetKeyword: 'Bulk process multiple images and download as ZIP archive',
    description: 'Resize, convert, or compress dozens of images at once',
    badge: 'ZIP',
    category: 'optimizer',
  },
];

export const ImageToolsWrapper: React.FC<{
  initialTool?: OptimizerToolId;
  initialFiles?: File[] | null;
  onClearPendingFiles?: () => void;
  onNotify: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ initialTool = 'compressor', initialFiles, onClearPendingFiles, onNotify }) => {
  const [activeTool, setActiveTool] = useState<OptimizerToolId>(initialTool);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (initialTool) setActiveTool(initialTool);
  }, [initialTool]);

  const currentToolMeta =
    IMAGE_TOOLS_LIST.find((t) => t.id === activeTool) || IMAGE_TOOLS_LIST[0];

  const primaryFile = initialFiles && initialFiles.length > 0 ? initialFiles[0] : null;

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-200 select-none">
      {/* Render active tool */}
      <div>
        {activeTool === 'compressor' && <CompressorTool onNotify={onNotify} initialFile={primaryFile} />}
        {activeTool === 'resizer' && <ResizerTool onNotify={onNotify} initialFile={primaryFile} />}
        {activeTool === 'cropper' && <CropRotateTool onNotify={onNotify} initialFile={primaryFile} />}
        {activeTool === 'bg-remover' && <BackgroundRemoverTool onNotify={onNotify} initialFiles={initialFiles} />}
        {activeTool === 'face-enhancer' && <FaceEnhancerTool onNotify={onNotify} initialFiles={initialFiles} />}
        {activeTool === 'base64' && <Base64ConverterTool onNotify={onNotify} />}
        {activeTool === 'rounded' && <RoundedCornerTool onNotify={onNotify} />}
        {activeTool === 'watermark' && <WatermarkerTool onNotify={onNotify} />}
        {activeTool === 'meme' && <MemeGeneratorTool onNotify={onNotify} />}
        {activeTool === 'palette' && <PaletteExtractorTool onNotify={onNotify} />}
        {activeTool === 'adjust' && <FilterWatermarkTool onNotify={onNotify} />}
        {activeTool === 'batch' && <BatchTool onNotify={onNotify} />}
      </div>
    </div>
  );
};
