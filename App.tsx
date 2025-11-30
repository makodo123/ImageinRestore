import React, { useState } from 'react';
import { CanvasEditor } from './components/CanvasEditor';
import { Button } from './components/ui/Button';
import { fileToBase64 } from './utils/canvasUtils';
import { restoreImage } from './services/geminiService';
import { EditorMode } from './types';
import { Upload, Wand2, Image as ImageIcon, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<EditorMode>(EditorMode.UPLOAD);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [restoredImage, setRestoredImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      setError("Please upload a valid image file.");
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setImageUrl(base64);
      setMode(EditorMode.MASKING);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load image. Please try again.");
    }
  };

  const handleImageUpdate = (base64: string) => {
    setImageUrl(base64);
    setRestoredImage(null);
    setMode(EditorMode.MASKING);
    setError(null);
  };

  const handleRestore = async (imageBase64: string, maskBase64: string, prompt?: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await restoreImage({
        imageBase64,
        maskBase64,
        prompt
      });
      setRestoredImage(result);
      setMode(EditorMode.RESULT);
    } catch (err: any) {
      console.error("Restoration failed", err);
      setError(err.message || "Failed to restore image. The API might be busy or the image is too complex.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setImageUrl(null);
    setRestoredImage(null);
    setMode(EditorMode.UPLOAD);
    setError(null);
  };

  const handleNewEdit = () => {
    setRestoredImage(null);
    setMode(EditorMode.MASKING);
  };

  return (
    <div className="min-h-screen bg-background text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-surface/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleReset}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Wand2 className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              ImaginRestore
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span className="hidden sm:inline">Powered by Gemini 2.5 Flash</span>
            <div className="w-px h-4 bg-zinc-700 hidden sm:block"></div>
            <a href="#" className="hover:text-white transition-colors">Documentation</a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]"></div>
        </div>

        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/20 text-red-200 px-6 py-3 rounded-xl flex items-center gap-3 backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-top-4">
            <AlertCircle size={20} className="text-red-500" />
            {error}
            <button onClick={() => setError(null)} className="ml-2 hover:text-white">&times;</button>
          </div>
        )}

        {mode === EditorMode.UPLOAD ? (
          <div className="w-full max-w-xl text-center space-y-8 animate-in zoom-in-95 duration-500">
            <div className="space-y-4">
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                Remove or Edit Objects <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  with AI
                </span>
              </h2>
              <p className="text-zinc-400 text-lg max-w-md mx-auto">
                Upload an image, mark an area, and either remove objects or describe how you want to change them.
              </p>
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-2xl p-12 hover:border-blue-500/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-10 h-10 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">Upload an Image</h3>
                    <p className="text-zinc-500">JPG, PNG, or WEBP up to 10MB</p>
                  </div>
                  <Button variant="secondary" className="mt-2 pointer-events-none">
                    Select File
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-8 text-zinc-500 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-zinc-600"></div>
                Non-destructive
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-zinc-600"></div>
                Generative Editing
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-zinc-600"></div>
                High Resolution
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-500">
            {imageUrl && (
              <CanvasEditor 
                imageUrl={imageUrl} 
                onRestore={handleRestore}
                isProcessing={isProcessing}
                restoredImage={restoredImage}
                onReset={mode === EditorMode.RESULT ? handleNewEdit : handleReset}
                onNewImage={handleImageUpdate}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;