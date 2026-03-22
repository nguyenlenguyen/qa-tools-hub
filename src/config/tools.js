import { AlignLeft, Clock, FileJson, Film, GitCompare, Lock, Palette, Share2, Type } from 'lucide-react';
import { lazy } from 'react';

export const TOOLS_CONFIG = [
  {
    id: 'media-generator',
    name: 'Media Generator',
    description: 'Generate test images, audio files, and videos with custom dimensions, formats, and sizes.',
    icon: Film,
    component: lazy(() => import('../components/tools/MediaGenerator/index.jsx')),
    color: 'text-blue-500',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'color-converter',
    name: 'Color Converter',
    description: 'Convert between HEX and RGB color codes.',
    icon: Palette,
    component: lazy(() => import('../components/tools/ColorConverter.jsx')),
    color: 'text-pink-500',
    bgColor: 'bg-pink-50'
  },
  {
    id: 'epoch-converter',
    name: 'Epoch Converter',
    description: 'Convert between Epoch Timestamp and Local Date Time.',
    icon: Clock,
    component: lazy(() => import('../components/tools/EpochConverter.jsx')),
    color: 'text-teal-500',
    bgColor: 'bg-teal-50'
  },
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Format, beautify, and validate JSON strings.',
    icon: FileJson,
    component: lazy(() => import('../components/tools/JsonFormatter.jsx')),
    color: 'text-amber-500',
    bgColor: 'bg-amber-50'
  },
  {
    id: 'dummy-text',
    name: 'Dummy Text',
    description: 'Quickly generate Lorem Ipsum text to test UI/UX.',
    icon: Type,
    component: lazy(() => import('../components/tools/DummyTextGenerator.jsx')),
    color: 'text-purple-500',
    bgColor: 'bg-purple-50'
  },
  {
    id: 'encoder-tool',
    name: 'Encrypt / Decrypt',
    description: 'Base64 encode/decode and AES-256 encrypt/decrypt with a secret key.',
    icon: Lock,
    component: lazy(() => import('../components/tools/EncoderTool.jsx')),
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50'
  },
  {
    id: 'text-analyzer',
    name: 'Text Analyzer',
    description: 'Count paragraphs, sentences, words, and characters of a text.',
    icon: AlignLeft,
    component: lazy(() => import('../components/tools/TextAnalyzer.jsx')),
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50'
  },
  {
    id: 'text-diff-checker',
    name: 'Text Diff Checker',
    description: 'Compare two texts side-by-side to find differences (Strict line match).',
    icon: GitCompare,
    component: lazy(() => import('../components/tools/TextDiffChecker.jsx')),
    color: 'text-rose-500',
    bgColor: 'bg-rose-50'
  },
  {
    id: 'peer-share',
    name: 'Peer File Share',
    description: 'Send files directly between devices on the same network (P2P).',
    icon: Share2,
    component: lazy(() => import('../components/tools/PeerFileShare.jsx')),
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50'
  }
];
