import React, { useState, useEffect } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { Upload, Wand2, Download, RefreshCw, Image as ImageIcon, X, Check, PlusCircle, Share2, Copy, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { editImage, generateImage } from '../services/gemini';
import confetti from 'canvas-confetti';

type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';
type Mode = 'edit' | 'create';

export default function ImageEditor() {
  const [mode, setMode] = useState<Mode>('edit');
  const [originalImage, setOriginalImage] = useState<{ url: string; base64: string; type: string } | null>(null);
  const [editedImage, setEditedImage] = useState<{ url: string; base64: string } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('image/png');

  // Check for shared image on mount
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const shareId = pathParts[pathParts.length - 1];
    if (window.location.pathname.startsWith('/share/') && shareId) {
      fetchSharedImage(shareId);
    }
  }, []);

  const fetchSharedImage = async (id: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/images/${id}`);
      if (res.ok) {
        const data = await res.json();
        setEditedImage({
          url: `data:${data.mimeType};base64,${data.data}`,
          base64: data.data
        });
      } else {
        setError("Immagine condivisa non trovata.");
      }
    } catch (err) {
      setError("Errore nel caricamento dell'immagine condivisa.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = async () => {
    const imageToShare = editedImage || originalImage;
    if (!imageToShare) return;

    setIsSharing(true);
    try {
      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: imageToShare.base64,
          mimeType: originalImage?.type || 'image/png'
        })
      });
      if (res.ok) {
        const { id } = await res.json();
        const url = `${window.location.origin}/share/${id}`;
        setShareUrl(url);
      } else {
        setError("Impossibile generare il link di condivisione.");
      }
    } catch (err) {
      setError("Errore durante la condivisione.");
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      alert("Link copiato negli appunti!");
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setOriginalImage({
          url: reader.result as string,
          base64: (reader.result as string).split(',')[1],
          type: file.type
        });
        setEditedImage(null);
        setError(null);
        setMode('edit');
      };
      reader.readAsDataURL(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: false
  } as any);

  const handleProcess = async () => {
    if (!prompt.trim()) return;
    if (mode === 'edit' && !originalImage) return;

    setIsProcessing(true);
    setError(null);
    try {
      let result;
      if (mode === 'edit' && originalImage) {
        result = await editImage(originalImage.base64, originalImage.type, prompt);
      } else {
        result = await generateImage(prompt);
      }

      if (result) {
        setEditedImage(result);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        setError("L'IA non ha restituito un'immagine. Prova a cambiare il prompt.");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Si è verificato un errore durante l'elaborazione.";
      setError(errorMessage);
      console.error("Process error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    const imageToDownload = editedImage || originalImage;
    if (!imageToDownload) return;

    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL(exportFormat);
        const link = document.createElement('a');
        const extension = exportFormat.split('/')[1];
        link.download = `edited-image.${extension}`;
        link.href = dataUrl;
        link.click();
      }
    };
    img.src = imageToDownload.url;
  };

  const reset = () => {
    setOriginalImage(null);
    setEditedImage(null);
    setPrompt('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-12 flex justify-between items-end border-b border-black/10 pb-6">
        <div>
          <h1 className="text-5xl font-bold tracking-tighter uppercase italic">ImagiEdit AI</h1>
          <p className="text-sm opacity-50 font-mono mt-2">v1.0 // POWERED BY GEMINI 2.5 FLASH</p>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-xs font-bold uppercase tracking-widest opacity-30">Creative Tool</p>
          <p className="text-xs font-mono">01. UPLOAD → 02. PROMPT → 03. EXPORT</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar / Controls */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-50">00. Modalità</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('edit')}
                className={`py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  mode === 'edit' ? 'bg-black text-white' : 'bg-[#F9F9F9] text-black/40 hover:text-black'
                }`}
              >
                <Wand2 size={16} />
                MODIFICA
              </button>
              <button
                onClick={() => setMode('create')}
                className={`py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  mode === 'create' ? 'bg-black text-white' : 'bg-[#F9F9F9] text-black/40 hover:text-black'
                }`}
              >
                <PlusCircle size={16} />
                CREA
              </button>
            </div>
          </section>

          {mode === 'edit' && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
              <h2 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-50">01. Sorgente</h2>
              {!originalImage ? (
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDragActive ? 'border-black bg-black/5' : 'border-black/10 hover:border-black/30'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="mx-auto mb-4 opacity-30" size={32} />
                  <p className="text-sm font-medium">Trascina un'immagine o clicca per caricare</p>
                  <p className="text-xs opacity-40 mt-2">PNG, JPG, WEBP supportati</p>
                </div>
              ) : (
                <div className="relative group">
                  <img 
                    src={originalImage.url} 
                    alt="Original" 
                    className="w-full h-48 object-cover rounded-xl border border-black/5"
                  />
                  <button 
                    onClick={reset}
                    className="absolute top-2 right-2 p-2 bg-black text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </section>
          )}

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-50">
              {mode === 'edit' ? '02. Modifica' : '01. Prompt'}
            </h2>
            <div className="space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === 'edit' 
                  ? "Esempio: 'Aggiungi un cappello rosso al gatto'" 
                  : "Esempio: 'Un astronauta che cavalca un cavallo su Marte, stile cinematografico'"
                }
                className="w-full h-32 p-4 bg-[#F9F9F9] border border-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 resize-none"
                disabled={isProcessing}
              />
              <button
                onClick={handleProcess}
                disabled={(mode === 'edit' && !originalImage) || !prompt.trim() || isProcessing}
                className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${
                  (mode === 'edit' && !originalImage) || !prompt.trim() || isProcessing
                    ? 'bg-black/10 text-black/30 cursor-not-allowed'
                    : 'bg-black text-white hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    <span>ELABORAZIONE...</span>
                  </>
                ) : (
                  <>
                    {mode === 'edit' ? <Wand2 size={20} /> : <PlusCircle size={20} />}
                    <span>{mode === 'edit' ? 'GENERA MODIFICA' : 'CREA IMMAGINE'}</span>
                  </>
                )}
              </button>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-50">03. Esporta</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(['image/png', 'image/jpeg', 'image/webp'] as ExportFormat[]).map((format) => (
                  <button
                    key={format}
                    onClick={() => setExportFormat(format)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      exportFormat === format 
                        ? 'bg-black text-white border-black' 
                        : 'bg-white text-black/50 border-black/10 hover:border-black/30'
                    }`}
                  >
                    {format.split('/')[1].toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                onClick={downloadImage}
                disabled={!originalImage && !editedImage || isProcessing}
                className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold border-2 border-black transition-all ${
                  !originalImage && !editedImage || isProcessing
                    ? 'opacity-20 cursor-not-allowed'
                    : 'hover:bg-black hover:text-white'
                }`}
              >
                <Download size={20} />
                <span>SCARICA IMMAGINE</span>
              </button>

              <div className="pt-4 border-t border-black/5">
                <button
                  onClick={handleShare}
                  disabled={!originalImage && !editedImage || isProcessing || isSharing}
                  className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    !originalImage && !editedImage || isProcessing || isSharing
                      ? 'bg-black/5 text-black/20 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isSharing ? <RefreshCw className="animate-spin" size={16} /> : <Share2 size={16} />}
                  <span>GENERA LINK CONDIVISIONE</span>
                </button>

                <AnimatePresence>
                  {shareUrl && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2 overflow-hidden"
                    >
                      <div className="flex items-center gap-2 p-2 bg-[#F9F9F9] rounded-lg border border-black/5">
                        <input 
                          readOnly 
                          value={shareUrl} 
                          className="flex-1 bg-transparent text-[10px] font-mono outline-none"
                        />
                        <button onClick={copyToClipboard} className="p-1 hover:bg-black/5 rounded">
                          <Copy size={14} />
                        </button>
                      </div>
                      <a 
                        href={shareUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        <ExternalLink size={10} />
                        APRI IN NUOVA SCHEDA
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl shadow-xl border border-black/5 overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-4 border-b border-black/5 flex justify-between items-center bg-[#F9F9F9]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-[10px] font-mono opacity-30 uppercase tracking-widest">Preview Viewport</span>
            </div>
            
            <div className="flex-1 p-8 flex items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
              <AnimatePresence mode="wait">
                {error ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center p-8 max-w-md"
                  >
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <X size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Ops! Qualcosa è andato storto</h3>
                    <p className="text-sm opacity-60">{error}</p>
                  </motion.div>
                ) : editedImage ? (
                  <motion.div 
                    key="edited"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative group max-w-full"
                  >
                    <img 
                      src={editedImage.url} 
                      alt="Edited Result" 
                      className="max-h-[70vh] rounded-2xl shadow-2xl border-4 border-white"
                    />
                    <div className="absolute -bottom-4 -right-4 bg-black text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg">
                      <Check size={14} />
                      IA GENERATA
                    </div>
                  </motion.div>
                ) : originalImage ? (
                  <motion.div 
                    key="original"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-full"
                  >
                    <img 
                      src={originalImage.url} 
                      alt="Original Preview" 
                      className="max-h-[70vh] rounded-2xl shadow-lg border border-black/5 opacity-80"
                    />
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center opacity-20"
                  >
                    <ImageIcon size={80} className="mx-auto mb-4" />
                    <p className="text-xl font-medium">Nessuna immagine caricata</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto mt-12 pt-8 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-mono opacity-30 uppercase tracking-widest">
        <p>© 2026 IMAGIEDIT AI // ALL RIGHTS RESERVED</p>
        <div className="flex gap-8">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>API Status: Operational</span>
        </div>
      </footer>
    </div>
  );
}
