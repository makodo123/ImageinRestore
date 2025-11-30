import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Point, ImageDimensions } from '../types';
import { getCanvasCoordinates, loadImage, fileToBase64 } from '../utils/canvasUtils';
import { Button } from './ui/Button';
import { 
  Eraser, 
  Brush, 
  RotateCcw, 
  Trash2, 
  Undo2, 
  Download,
  Eye,
  EyeOff,
  Sparkles,
  ImagePlus
} from 'lucide-react';

interface CanvasEditorProps {
  imageUrl: string;
  onRestore: (imageBase64: string, maskBase64: string, prompt?: string) => void;
  isProcessing: boolean;
  restoredImage: string | null;
  onReset: () => void;
  onNewImage: (base64: string) => void;
}

const BRUSH_SIZES = [10, 20, 40, 60, 80];

export const CanvasEditor: React.FC<CanvasEditorProps> = ({ 
  imageUrl, 
  onRestore, 
  isProcessing,
  restoredImage,
  onReset,
  onNewImage
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dimensions, setDimensions] = useState<ImageDimensions>({ width: 0, height: 0, aspectRatio: 1 });
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(40);
  const [isEraser, setIsEraser] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [showOriginal, setShowOriginal] = useState(false);
  const [prompt, setPrompt] = useState('');

  // Initialize Canvases
  useEffect(() => {
    const initCanvas = async () => {
      if (!imageUrl || !imageCanvasRef.current || !maskCanvasRef.current) return;

      const img = await loadImage(imageUrl);
      const maxWidth = Math.min(window.innerWidth - 48, 1024); // Responsive max width
      const maxHeight = Math.min(window.innerHeight - 200, 800);
      
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      const aspectRatio = width / height;

      // Fit to screen logic
      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      setDimensions({ width, height, aspectRatio });

      // Setup Image Canvas
      const ctx = imageCanvasRef.current.getContext('2d');
      if (ctx) {
        imageCanvasRef.current.width = width;
        imageCanvasRef.current.height = height;
        ctx.drawImage(img, 0, 0, width, height);
      }

      // Setup Mask Canvas
      const maskCtx = maskCanvasRef.current.getContext('2d');
      if (maskCtx) {
        maskCanvasRef.current.width = width;
        maskCanvasRef.current.height = height;
        maskCtx.clearRect(0, 0, width, height);
        saveHistory();
      }
    };

    initCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  const saveHistory = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    
    // Limit history to 10 steps
    setHistory(prev => {
      const newHistory = [...prev, ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)];
      if (newHistory.length > 10) newHistory.shift();
      return newHistory;
    });
  }, []);

  const handleUndo = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || history.length <= 1) return; // Keep at least one empty state if initial
    
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop(); // Remove current state
    const previousState = newHistory[newHistory.length - 1];
    
    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
      setHistory(newHistory);
    }
  };

  const handleClear = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    saveHistory();
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (restoredImage || isProcessing) return;
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveHistory();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !maskCanvasRef.current) return;
    
    const coords = getCanvasCoordinates(e, maskCanvasRef.current);
    if (!coords) return;

    const ctx = maskCanvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    
    // Visual mask color (semi-transparent red for visibility)
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)'; // Tailwind rose-500
    
    // Draw a single point if just clicking, or line if moving
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };
  
  const lastPointRef = useRef<Point | null>(null);

  const handleDrawStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (restoredImage || isProcessing) return;
    setIsDrawing(true);
    const coords = getCanvasCoordinates(e, maskCanvasRef.current!);
    lastPointRef.current = coords;
  };

  const handleDrawMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !maskCanvasRef.current || !lastPointRef.current) return;
    
    const coords = getCanvasCoordinates(e, maskCanvasRef.current);
    if (!coords) return;

    const ctx = maskCanvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.8)'; // Visible Red Mask

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastPointRef.current = coords;
  };

  const prepareAndSubmit = () => {
    if (!imageCanvasRef.current || !maskCanvasRef.current) return;

    const imageBase64 = imageCanvasRef.current.toDataURL('image/png');

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = dimensions.width;
    tempCanvas.height = dimensions.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) return;

    // Fill black
    tempCtx.fillStyle = '#000000';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw the mask from the maskCanvas onto here
    tempCtx.globalCompositeOperation = 'source-over';
    tempCtx.drawImage(maskCanvasRef.current, 0, 0);
    
    // Convert red mask to white
    tempCtx.globalCompositeOperation = 'source-in';
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    const maskBase64 = tempCanvas.toDataURL('image/png');
    onRestore(imageBase64, maskBase64, prompt);
  };

  const handleDownload = () => {
    if (!restoredImage) return;
    const link = document.createElement('a');
    link.href = restoredImage;
    link.download = 'edited-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    
    try {
      const base64 = await fileToBase64(file);
      onNewImage(base64);
    } catch (err) {
      console.error(err);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="flex flex-col items-center w-full h-full max-w-6xl mx-auto p-4" ref={containerRef}>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*" 
      />

      {/* Toolbar */}
      <div className="sticky top-4 z-20 flex flex-wrap items-center gap-4 bg-surface/90 backdrop-blur-md border border-zinc-700 p-3 rounded-2xl shadow-2xl mb-6">
        {!restoredImage ? (
          <>
            <div className="flex items-center gap-2 border-r border-zinc-700 pr-4">
              <Button 
                variant="ghost" 
                onClick={handleUploadClick}
                title="New Image"
                className="!p-2 text-zinc-400 hover:text-white"
              >
                <ImagePlus size={20} />
              </Button>
            </div>

            <div className="flex items-center gap-2 border-r border-zinc-700 pr-4">
              <Button 
                variant={!isEraser ? 'primary' : 'secondary'} 
                onClick={() => setIsEraser(false)}
                title="Brush"
                className="!p-2"
              >
                <Brush size={20} />
              </Button>
              <Button 
                variant={isEraser ? 'primary' : 'secondary'} 
                onClick={() => setIsEraser(true)}
                title="Eraser"
                className="!p-2"
              >
                <Eraser size={20} />
              </Button>
            </div>

            <div className="flex items-center gap-2 border-r border-zinc-700 pr-4">
              <span className="text-xs font-medium text-zinc-400 uppercase hidden sm:inline">Size</span>
              {BRUSH_SIZES.map(size => (
                <button
                  key={size}
                  onClick={() => setBrushSize(size)}
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                    brushSize === size ? 'bg-zinc-600 ring-2 ring-primary' : 'hover:bg-zinc-800'
                  }`}
                >
                  <div 
                    className="bg-current rounded-full" 
                    style={{ width: size / 4 + 2, height: size / 4 + 2 }} 
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleUndo} title="Undo" className="!p-2">
                <Undo2 size={20} />
              </Button>
              <Button variant="ghost" onClick={handleClear} title="Clear Mask" className="!p-2">
                <Trash2 size={20} />
              </Button>
            </div>

            <div className="h-6 w-px bg-zinc-700 mx-2 hidden md:block" />

            <div className="flex-1 min-w-[200px] flex items-center gap-2">
               <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe changes (optional)"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder-zinc-500"
                onKeyDown={(e) => e.key === 'Enter' && prepareAndSubmit()}
              />
            </div>

            <Button 
              variant="primary" 
              onClick={prepareAndSubmit}
              disabled={isProcessing}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 border-none whitespace-nowrap"
            >
              {isProcessing ? 'Processing...' : (prompt.trim() ? 'Generate Edit' : 'Remove Object')}
              {!isProcessing && <Sparkles size={16} className="ml-2" />}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={handleUploadClick}>
              <ImagePlus size={18} className="mr-2" />
              New Image
            </Button>
            <Button variant="secondary" onClick={onReset}>
              <RotateCcw size={18} className="mr-2" />
              Reset Edits
            </Button>
            <Button 
              variant="ghost" 
              onMouseDown={() => setShowOriginal(true)}
              onMouseUp={() => setShowOriginal(false)}
              onMouseLeave={() => setShowOriginal(false)}
              onTouchStart={() => setShowOriginal(true)}
              onTouchEnd={() => setShowOriginal(false)}
              className="select-none"
            >
              {showOriginal ? <Eye size={18} className="mr-2 text-primary" /> : <EyeOff size={18} className="mr-2" />}
              Hold to Compare
            </Button>
            <Button variant="primary" onClick={handleDownload}>
              <Download size={18} className="mr-2" />
              Download
            </Button>
          </>
        )}
      </div>

      {/* Canvas Container */}
      <div 
        className="relative shadow-2xl rounded-lg overflow-hidden border border-zinc-800 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-zinc-900"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        {/* Layer 1: Base Image (Hidden if restored and not comparing) */}
        <canvas
          ref={imageCanvasRef}
          className="absolute top-0 left-0 cursor-crosshair"
          style={{ zIndex: 1 }}
        />

        {/* Layer 2: Mask (Only visible when drawing/editing) */}
        {!restoredImage && (
          <canvas
            ref={maskCanvasRef}
            className="absolute top-0 left-0 cursor-crosshair touch-none"
            style={{ zIndex: 2 }}
            onMouseDown={handleDrawStart}
            onMouseMove={handleDrawMove}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={handleDrawStart}
            onTouchMove={handleDrawMove}
            onTouchEnd={stopDrawing}
          />
        )}

        {/* Layer 3: Result Image (Overlay) */}
        {restoredImage && (
          <img 
            src={restoredImage} 
            alt="Restored" 
            className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-200 ${showOriginal ? 'opacity-0' : 'opacity-100'}`}
            style={{ zIndex: 3 }}
          />
        )}

        {isProcessing && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-24 h-24 mb-4">
              <div className="absolute inset-0 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-4 border-t-transparent border-r-accent border-b-transparent border-l-transparent rounded-full animate-spin delay-150"></div>
            </div>
            <p className="text-white font-medium animate-pulse">
              {prompt.trim() ? 'Generating Edit...' : 'Restoring Image...'}
            </p>
            <p className="text-zinc-400 text-sm mt-2">Processing with Gemini</p>
          </div>
        )}
      </div>
      
      {!restoredImage && (
        <p className="mt-4 text-zinc-500 text-sm">
          Paint over the area you want to edit. Leave the text box empty to remove objects, or describe what you want to generate.
        </p>
      )}
    </div>
  );
};