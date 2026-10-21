import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Mic,
  MicOff,
  Sparkles,
  Download,
  FileDown,
  Plus,
  Trash2,
  Move,
  Check,
  AlertCircle,
  HelpCircle,
  Layers,
  FileText,
  Volume2,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { DocProject, DocPage, DocAnnotation } from '../types';
import { parseVoiceAnnotationCommands } from '../utils/gujaratiParser';
import { generateDocProjectPdf } from '../utils/pdfGenerator';
import { generateDocProjectDocx } from '../utils/docxGenerator';
import { shareDocProjectViaWhatsApp } from '../utils/whatsappShare';

interface PhotoDocStudioProps {
  activeCompanyName: string;
}

export const PhotoDocStudio: React.FC<PhotoDocStudioProps> = ({ activeCompanyName }) => {
  // Start with an empty project without placeholder images
  const [project, setProject] = useState<DocProject>({
    id: 'proj-1',
    title: 'Site Requirements & Observation Report',
    companyName: activeCompanyName,
    clientName: '',
    date: new Date().toISOString().split('T')[0],
    pages: [],
    notes: 'Generated with Patraka DocCraft Studio',
  });

  const [activePageIndex, setActivePageIndex] = useState(0);
  const [voiceText, setVoiceText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<'gu-IN' | 'hi-IN' | 'en-IN'>('gu-IN');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceSuccessMsg, setVoiceSuccessMsg] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [preferLocalPrivacy, setPreferLocalPrivacy] = useState(false);

  const recognitionRef = useRef<any>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss voiceError after 5 seconds to prevent persistent error banners
  useEffect(() => {
    if (voiceError) {
      const t = setTimeout(() => setVoiceError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [voiceError]);

  // Keep company name in sync if parent changes
  useEffect(() => {
    setProject((prev) => ({
      ...prev,
      companyName: activeCompanyName,
    }));
  }, [activeCompanyName]);

  // Keep activePageIndex within valid bounds
  useEffect(() => {
    if (project.pages.length === 0) {
      setActivePageIndex(0);
    } else if (activePageIndex >= project.pages.length) {
      setActivePageIndex(project.pages.length - 1);
    }
  }, [project.pages.length, activePageIndex]);

  // Initialize Web Speech API if supported
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLanguage;

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setVoiceText(transcript);
        setVoiceError(null);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition warning:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission blocked. Please allow mic access in your browser bar.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [speechLanguage]);

  const toggleListening = () => {
    setVoiceError(null);
    if (!recognitionRef.current) {
      setVoiceError('Speech recognition is not natively supported in this browser. You can type or use sample instructions.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = speechLanguage;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err: any) {
        console.error(err);
      }
    }
  };

  // Multi-photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setVoiceError(null);
    const newPages: DocPage[] = [];
    let processed = 0;

    Array.from(files).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = () => {
        newPages.push({
          id: `page-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          pageNumber: project.pages.length + newPages.length + 1,
          imageDataUrl: reader.result as string,
          imageName: file.name,
          title: file.name.replace(/\.[^/.]+$/, ''),
          caption: '',
          annotations: [],
        });

        processed++;
        if (processed === files.length) {
          setProject((prev) => ({
            ...prev,
            pages: [...prev.pages, ...newPages],
          }));
          if (project.pages.length === 0) {
            setActivePageIndex(0);
          }
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Voice Instruction Processing
  const applyVoiceInstruction = async (overridePrompt?: string) => {
    const textToProcess = overridePrompt || voiceText;
    if (!textToProcess.trim()) {
      setVoiceError('Please enter or dictate an instruction first.');
      return;
    }

    if (project.pages.length === 0) {
      setVoiceError('Please upload at least one photo above before applying text annotations.');
      return;
    }

    setIsProcessingVoice(true);
    setVoiceError(null);
    setVoiceSuccessMsg(null);

    try {
      let appliedAnnotations: { pageNumber: number; text: string; xPercent: number; yPercent: number; style: any }[] = [];

      if (!preferLocalPrivacy) {
        // Try server-side Gemini Flash
        try {
          const res = await fetch('/api/interpret-voice-annotations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcript: textToProcess,
              totalPages: project.pages.length,
            }),
          });
          const json = await res.json();
          if (json.success && Array.isArray(json.annotations) && json.annotations.length > 0) {
            appliedAnnotations = json.annotations;
          }
        } catch (e) {
          console.warn('Gemini endpoint fallback to local parser:', e);
        }
      }

      // If local privacy selected or server fallback
      if (appliedAnnotations.length === 0) {
        const localParsed = parseVoiceAnnotationCommands(textToProcess);
        appliedAnnotations = localParsed.map((a) => ({
          pageNumber: a.pageNumber,
          text: a.text,
          xPercent: a.xPercent,
          yPercent: a.yPercent,
          style: a.style,
        }));
      }

      if (appliedAnnotations.length === 0) {
        throw new Error('Could not identify page numbers or text. Try: "page 1 par terrace text add kari de, 2 par Bari(window)"');
      }

      // Update project pages with parsed annotations
      setProject((prev) => {
        const updatedPages = [...prev.pages];

        appliedAnnotations.forEach((item) => {
          const targetIndex = item.pageNumber - 1;

          if (targetIndex >= 0 && targetIndex < updatedPages.length) {
            const page = updatedPages[targetIndex];
            const newAnnot: DocAnnotation = {
              id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              text: item.text,
              xPercent: item.xPercent || 30,
              yPercent: item.yPercent || 40,
              style: item.style || 'badge',
              color: '#2563EB',
              pageIndex: targetIndex,
            };
            updatedPages[targetIndex] = {
              ...page,
              annotations: [...page.annotations, newAnnot],
            };
          }
        });

        return { ...prev, pages: updatedPages };
      });

      setVoiceSuccessMsg(`Successfully added ${appliedAnnotations.length} text annotations across pages!`);
      setTimeout(() => setVoiceSuccessMsg(null), 4000);
    } catch (err: any) {
      setVoiceError(err.message || 'Error processing instructions.');
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const handleAddManualAnnotation = () => {
    if (project.pages.length === 0) return;
    const page = project.pages[activePageIndex];
    if (!page) return;

    const newAnnot: DocAnnotation = {
      id: `ann-${Date.now()}`,
      text: 'Requirement Note',
      xPercent: 40,
      yPercent: 40,
      style: 'badge',
      color: '#2563EB',
      pageIndex: activePageIndex,
    };

    const updatedPages = [...project.pages];
    updatedPages[activePageIndex] = {
      ...page,
      annotations: [...page.annotations, newAnnot],
    };
    setProject({ ...project, pages: updatedPages });
  };

  const handleUpdateAnnotationText = (annotId: string, newText: string) => {
    if (project.pages.length === 0) return;
    const page = project.pages[activePageIndex];
    if (!page) return;

    const updatedAnnots = page.annotations.map((a) => (a.id === annotId ? { ...a, text: newText } : a));
    const updatedPages = [...project.pages];
    updatedPages[activePageIndex] = { ...page, annotations: updatedAnnots };
    setProject({ ...project, pages: updatedPages });
  };

  const handleDeleteAnnotation = (annotId: string) => {
    if (project.pages.length === 0) return;
    const page = project.pages[activePageIndex];
    if (!page) return;

    const filtered = page.annotations.filter((a) => a.id !== annotId);
    const updatedPages = [...project.pages];
    updatedPages[activePageIndex] = { ...page, annotations: filtered };
    setProject({ ...project, pages: updatedPages });
  };

  const handleDeletePage = (index: number) => {
    const updated = project.pages.filter((_, i) => i !== index);
    setProject({ ...project, pages: updated });
    if (activePageIndex >= updated.length) {
      setActivePageIndex(Math.max(0, updated.length - 1));
    }
  };

  // Export handlers
  const handleExportPdf = async () => {
    if (project.pages.length === 0) {
      setVoiceError('Please upload at least one photo before exporting PDF.');
      return;
    }
    const doc = await generateDocProjectPdf(project);
    doc.save(`${(project.title || 'Site_Report').replace(/\s+/g, '_')}.pdf`);
  };

  const handleExportDocx = async () => {
    if (project.pages.length === 0) {
      setVoiceError('Please upload at least one photo before exporting Word document.');
      return;
    }
    const blob = await generateDocProjectDocx(project);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(project.title || 'Site_Report').replace(/\s+/g, '_')}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareWhatsApp = () => {
    if (project.pages.length === 0) {
      setVoiceError('Please upload at least one photo before sharing.');
      return;
    }
    shareDocProjectViaWhatsApp(project);
  };

  const activePage = project.pages[activePageIndex];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Hidden file input */}
      <input
        type="file"
        ref={multiFileInputRef}
        onChange={handlePhotoUpload}
        multiple
        accept="image/*"
        className="hidden"
        id="photo-multi-upload"
      />

      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 shrink-0 mt-0.5">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>Photo-to-PDF & Word Studio with Gujarati Speech</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload photos, dictate tags in Gujarati or English, overlay notes on images, and export clean PDF or Word (.docx) reports.
            </p>
          </div>
        </div>

        {/* Export Buttons in unified blue/white/emerald theme */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={project.pages.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleExportDocx}
            disabled={project.pages.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            title="Export as Microsoft Word (.docx)"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-600" />
            <span>Word (.docx)</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            disabled={project.pages.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#20BD5A] disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Voice Input & Speech Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
              Gujarati & Multilingual Speech-to-Annotation
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="text-slate-500 font-medium">Mic Language:</label>
            <select
              value={speechLanguage}
              onChange={(e: any) => setSpeechLanguage(e.target.value)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="gu-IN">Gujarati (gu-IN)</option>
              <option value="hi-IN">Hindi (hi-IN)</option>
              <option value="en-IN">English (India)</option>
            </select>

            <label className="flex items-center gap-1.5 ml-2 cursor-pointer">
              <input
                type="checkbox"
                checked={preferLocalPrivacy}
                onChange={(e) => setPreferLocalPrivacy(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-0"
              />
              <span className="text-[11px] text-slate-600 font-medium">
                Local Privacy Parser
              </span>
            </label>
          </div>
        </div>

        {/* Mic & Input line */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            onClick={toggleListening}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              isListening
                ? 'bg-red-600 text-white animate-pulse shadow-md'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isListening ? 'Listening... (Speak now)' : 'Start Voice Input'}</span>
          </button>

          <input
            type="text"
            value={voiceText}
            onChange={(e) => {
              setVoiceText(e.target.value);
              setVoiceError(null);
            }}
            placeholder='e.g. "page 1 par terrace text add kari de, 2 par Bari(window)"'
            className="flex-1 px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
          />

          <button
            onClick={() => applyVoiceInstruction()}
            disabled={isProcessingVoice || !voiceText.trim() || project.pages.length === 0}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            {isProcessingVoice ? (
              <span>Processing...</span>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Apply to Photos</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Voice Prompt Examples */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[11px] font-medium text-slate-500">Quick Test Prompts:</span>
          <button
            onClick={() => {
              setVoiceText('page 1 par terrace text add kari de, 2 par Bari(window)');
              applyVoiceInstruction('page 1 par terrace text add kari de, 2 par Bari(window)');
            }}
            disabled={project.pages.length === 0}
            className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 transition-colors cursor-pointer border border-slate-200"
          >
            "page 1 par terrace text add kari de, 2 par Bari(window)"
          </button>
          <button
            onClick={() => {
              setVoiceText('page 1 par bathroom piping note lakh, 2 ma AC ducting');
              applyVoiceInstruction('page 1 par bathroom piping note lakh, 2 ma AC ducting');
            }}
            disabled={project.pages.length === 0}
            className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 transition-colors cursor-pointer border border-slate-200"
          >
            "page 1: bathroom piping, page 2: AC ducting"
          </button>
        </div>

        {voiceSuccessMsg && (
          <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center justify-between gap-1.5 font-medium">
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{voiceSuccessMsg}</span>
            </div>
            <button
              onClick={() => setVoiceSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {voiceError && (
          <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 p-2.5 rounded-lg flex items-center justify-between gap-1.5 font-medium">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{voiceError}</span>
            </div>
            <button
              onClick={() => setVoiceError(null)}
              className="text-amber-700 hover:text-amber-950 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Pages Thumbnails & Workspace Grid */}
      {project.pages.length === 0 ? (
        /* Empty State */
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-10 sm:p-14 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800">
            No Work Photos Added Yet
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Upload photos of site installation, AC indoor/outdoor units, piping, or ducting to build professional photo reports with notes.
          </p>

          <button
            onClick={() => multiFileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Work Photos</span>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto mt-8 pt-6 border-t border-slate-100 text-left text-xs text-slate-600">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
              <span className="font-bold text-slate-800 block mb-0.5">1. Multi-Photo Select</span>
              Select multiple photos directly from camera or device storage.
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
              <span className="font-bold text-slate-800 block mb-0.5">2. Gujarati Voice Tag</span>
              Speak in Gujarati or English to automatically pin requirement callouts.
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
              <span className="font-bold text-slate-800 block mb-0.5">3. PDF & Word Export</span>
              Download clean A4 photo documentation or share via WhatsApp.
            </div>
          </div>
        </div>
      ) : (
        /* Workspace with Uploaded Photos */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Pages Strip */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Document Pages ({project.pages.length})
              </h3>
              <button
                onClick={() => multiFileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More Photos</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {project.pages.map((page, index) => {
                const isSelected = index === activePageIndex;
                return (
                  <div
                    key={page.id}
                    onClick={() => setActivePageIndex(index)}
                    className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-12 bg-slate-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
                      {page.imageDataUrl ? (
                        <img
                          src={page.imageDataUrl}
                          alt={`Page ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400">No Img</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Photo {index + 1}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {page.annotations.length} {page.annotations.length === 1 ? 'tag' : 'tags'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {page.title || 'Untitled Photo'}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePage(index);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      aria-label={`Delete page ${index + 1}`}
                      title="Delete photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Active Page Visual Editor & Annotator */}
          {activePage && (
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Photo {activePageIndex + 1}: {activePage.title || 'Work Inspection'}
                    </h3>
                    <span className="text-xs text-slate-500">
                      Drag text tags to position on photo, or add new annotations below
                    </span>
                  </div>

                  <button
                    onClick={handleAddManualAnnotation}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-50 cursor-pointer shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Add Text Tag</span>
                  </button>
                </div>

                {/* Interactive Image Canvas - Clean light background, no dark black canvas */}
                <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center min-h-[300px] max-h-[460px]">
                  {activePage.imageDataUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img
                        src={activePage.imageDataUrl}
                        alt={activePage.title}
                        className="max-h-[440px] w-full object-contain select-none"
                      />

                      {/* Overlaid Annotation Badges - Clean royal blue badge with crisp contrast */}
                      {activePage.annotations.map((annot) => (
                        <div
                          key={annot.id}
                          style={{
                            left: `${annot.xPercent}%`,
                            top: `${annot.yPercent}%`,
                          }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-move select-none"
                        >
                          <div className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-md border border-white/80 transition-transform group-hover:scale-105">
                            <Move className="w-3 h-3 text-blue-200" />
                            <span>{annot.text}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAnnotation(annot.id);
                              }}
                              className="ml-1 text-blue-200 hover:text-white font-bold cursor-pointer"
                              title="Remove annotation"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs">No image loaded for this page</div>
                  )}
                </div>

                {/* Page Title & Caption Editor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Photo Title / Section Name
                    </label>
                    <input
                      type="text"
                      value={activePage.title}
                      onChange={(e) => {
                        const updated = [...project.pages];
                        updated[activePageIndex].title = e.target.value;
                        setProject({ ...project, pages: updated });
                      }}
                      placeholder="e.g. Outdoor Unit Placement"
                      className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Technical Observation / Work Notes
                    </label>
                    <input
                      type="text"
                      value={activePage.caption}
                      onChange={(e) => {
                        const updated = [...project.pages];
                        updated[activePageIndex].caption = e.target.value;
                        setProject({ ...project, pages: updated });
                      }}
                      placeholder="e.g. Copper piping insulation and drain slope verified"
                      className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                {/* Current Page Tag List */}
                {activePage.annotations.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                      Active Text Tags on this Photo ({activePage.annotations.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activePage.annotations.map((annot) => (
                        <div
                          key={annot.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200"
                        >
                          <input
                            type="text"
                            value={annot.text}
                            onChange={(e) => handleUpdateAnnotationText(annot.id, e.target.value)}
                            className="flex-1 text-xs font-semibold bg-transparent border-none p-0 text-slate-800 focus:ring-0"
                          />
                          <button
                            onClick={() => handleDeleteAnnotation(annot.id)}
                            className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
