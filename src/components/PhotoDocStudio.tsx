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
} from 'lucide-react';
import { DocProject, DocPage, DocAnnotation } from '../types';
import { parseVoiceAnnotationCommands } from '../utils/gujaratiParser';
import { generateDocProjectPdf } from '../utils/pdfGenerator';
import { generateDocProjectDocx } from '../utils/docxGenerator';
import { shareDocProjectViaWhatsApp } from '../utils/whatsappShare';

interface PhotoDocStudioProps {
  activeCompanyName: string;
}

// Sample sample images to let user test immediately without needing files ready
const SAMPLE_IMAGE_1 = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22500%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23262b33%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2245%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%2394a3b8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2224%22%20font-weight%3D%22bold%22%3EBUILDING%20ROOF%20%2F%20TERRACE%20AREA%3C%2Ftext%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2255%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%2364748b%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%3ESite%20Inspection%20Photo%201%3C%2Ftext%3E%3C%2Fsvg%3E';
const SAMPLE_IMAGE_2 = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22500%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%231e293b%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2245%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%2394a3b8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2224%22%20font-weight%3D%22bold%22%3EWINDOW%20%2F%20FACADE%20STRUCTURE%3C%2Ftext%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2255%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%2364748b%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%3ESite%20Inspection%20Photo%202%3C%2Ftext%3E%3C%2Fsvg%3E';

export const PhotoDocStudio: React.FC<PhotoDocStudioProps> = ({ activeCompanyName }) => {
  const [project, setProject] = useState<DocProject>({
    id: 'proj-1',
    title: 'Site Requirements & Observation Report',
    companyName: activeCompanyName,
    clientName: 'Shree Shddhi Createurs',
    date: new Date().toISOString().split('T')[0],
    pages: [
      {
        id: 'page-1',
        pageNumber: 1,
        imageDataUrl: SAMPLE_IMAGE_1,
        imageName: 'site_photo_roof.jpg',
        title: 'Terrace & Piping Layout',
        caption: 'Terrace area inspection for AC outdoor condenser unit installation and copper pipe routing.',
        annotations: [
          {
            id: 'ann-1',
            text: 'Terrace Area',
            xPercent: 30,
            yPercent: 35,
            style: 'badge',
            color: '#0F172A',
            pageIndex: 0,
          },
        ],
      },
      {
        id: 'page-2',
        pageNumber: 2,
        imageDataUrl: SAMPLE_IMAGE_2,
        imageName: 'site_photo_window.jpg',
        title: 'Window & Drainage Opening',
        caption: 'Window frame inspection for indoor unit drainage and power cable connection.',
        annotations: [
          {
            id: 'ann-2',
            text: 'Bari (Window)',
            xPercent: 50,
            yPercent: 40,
            style: 'badge',
            color: '#0F172A',
            pageIndex: 1,
          },
        ],
      },
    ],
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
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission blocked. Please allow mic access in browser.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [speechLanguage]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setVoiceError('Speech recognition is not natively supported in this browser. You can type or use sample instructions.');
      return;
    }

    setVoiceError(null);
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

    const newPages: DocPage[] = [];
    let processed = 0;

    Array.from(files).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = () => {
        newPages.push({
          id: `page-${Date.now()}-${idx}`,
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
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Voice Instruction Processing (Gemini AI + Local Gujarati Parser Fallback)
  const applyVoiceInstruction = async (overridePrompt?: string) => {
    const textToProcess = overridePrompt || voiceText;
    if (!textToProcess.trim()) {
      setVoiceError('Please speak or type instructions first.');
      return;
    }

    setIsProcessingVoice(true);
    setVoiceError(null);
    setVoiceSuccessMsg(null);

    try {
      let appliedAnnotations: { pageNumber: number; text: string; xPercent: number; yPercent: number; style: any }[] = [];

      if (!preferLocalPrivacy) {
        // Try server-side Gemini 3.8 Flash for advanced bilingual context
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

          // If page exists, add annotation
          if (targetIndex >= 0 && targetIndex < updatedPages.length) {
            const page = updatedPages[targetIndex];
            const newAnnot: DocAnnotation = {
              id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              text: item.text,
              xPercent: item.xPercent || 30,
              yPercent: item.yPercent || 40,
              style: item.style || 'badge',
              color: '#0F172A',
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

      setVoiceSuccessMsg(`Successfully parsed & added ${appliedAnnotations.length} text annotations across pages!`);
      setTimeout(() => setVoiceSuccessMsg(null), 4000);
    } catch (err: any) {
      setVoiceError(err.message || 'Error processing instructions.');
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const handleAddManualAnnotation = () => {
    const page = project.pages[activePageIndex];
    if (!page) return;

    const newAnnot: DocAnnotation = {
      id: `ann-${Date.now()}`,
      text: 'New Requirement Note',
      xPercent: 40,
      yPercent: 40,
      style: 'badge',
      color: '#0F172A',
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
    const page = project.pages[activePageIndex];
    if (!page) return;

    const updatedAnnots = page.annotations.map((a) => (a.id === annotId ? { ...a, text: newText } : a));
    const updatedPages = [...project.pages];
    updatedPages[activePageIndex] = { ...page, annotations: updatedAnnots };
    setProject({ ...project, pages: updatedPages });
  };

  const handleDeleteAnnotation = (annotId: string) => {
    const page = project.pages[activePageIndex];
    if (!page) return;

    const filtered = page.annotations.filter((a) => a.id !== annotId);
    const updatedPages = [...project.pages];
    updatedPages[activePageIndex] = { ...page, annotations: filtered };
    setProject({ ...project, pages: updatedPages });
  };

  const handleDeletePage = (index: number) => {
    if (project.pages.length <= 1) return;
    const updated = project.pages.filter((_, i) => i !== index);
    setProject({ ...project, pages: updated });
    if (activePageIndex >= updated.length) {
      setActivePageIndex(updated.length - 1);
    }
  };

  // Export handlers
  const handleExportPdf = async () => {
    const doc = await generateDocProjectPdf(project);
    doc.save(`${project.title.replace(/\s+/g, '_')}_Report.pdf`);
  };

  const handleExportDocx = async () => {
    const blob = await generateDocProjectDocx(project);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '_')}_WordDoc.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareWhatsApp = () => {
    shareDocProjectViaWhatsApp(project);
  };

  const activePage = project.pages[activePageIndex] || project.pages[0];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl p-4 sm:p-5 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <span>Photo-to-PDF & Word Studio with Gujarati Speech</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Upload photos, dictate in Gujarati or English, overlay requirements text on images, and export directly as PDF or Word (.docx).
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 rounded-lg shadow-xs transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleExportDocx}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 rounded-lg transition-colors whitespace-nowrap"
            title="Export as Microsoft Word (.docx)"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Word (.docx)</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#20BD5A] rounded-lg shadow-xs transition-colors whitespace-nowrap"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Voice Input & Gujarati Speech Control Bar */}
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
              Gujarati & Multilingual Speech-to-Annotation
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="text-neutral-500 dark:text-neutral-400 font-medium">Mic Language:</label>
            <select
              value={speechLanguage}
              onChange={(e: any) => setSpeechLanguage(e.target.value)}
              className="px-2 py-1 text-xs font-semibold rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
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
                className="rounded border-neutral-300 text-neutral-900 focus:ring-0"
              />
              <span className="text-[11px] text-neutral-600 dark:text-neutral-400">
                Local Privacy Parser
              </span>
            </label>
          </div>
        </div>

        {/* Mic & Input line */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            onClick={toggleListening}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              isListening
                ? 'bg-red-600 text-white animate-pulse shadow-md'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isListening ? 'Listening... (Speak now)' : 'Start Voice Input'}</span>
          </button>

          <input
            type="text"
            value={voiceText}
            onChange={(e) => setVoiceText(e.target.value)}
            placeholder='e.g. "page 1 par terrace text add kari de, 2 par Bari(window)"'
            className="flex-1 px-3 py-2 text-xs sm:text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-1 focus:ring-neutral-900"
          />

          <button
            onClick={() => applyVoiceInstruction()}
            disabled={isProcessingVoice || !voiceText.trim()}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 rounded-lg disabled:opacity-50 transition-colors shrink-0"
          >
            {isProcessingVoice ? (
              <span>Processing...</span>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Apply to Photos</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Voice Prompt Examples */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[11px] font-medium text-neutral-400">Quick Test Prompts:</span>
          <button
            onClick={() => {
              setVoiceText('page 1 par terrace text add kari de, 2 par Bari(window)');
              applyVoiceInstruction('page 1 par terrace text add kari de, 2 par Bari(window)');
            }}
            className="text-[11px] px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200 transition-colors"
          >
            "page 1 par terrace text add kari de, 2 par Bari(window)"
          </button>
          <button
            onClick={() => {
              setVoiceText('page 1 par bathroom piping note lakh, 2 ma AC ducting');
              applyVoiceInstruction('page 1 par bathroom piping note lakh, 2 ma AC ducting');
            }}
            className="text-[11px] px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200 transition-colors"
          >
            "page 1: bathroom piping, page 2: AC ducting"
          </button>
        </div>

        {voiceSuccessMsg && (
          <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
            <Check className="w-4 h-4" />
            <span>{voiceSuccessMsg}</span>
          </div>
        )}

        {voiceError && (
          <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>{voiceError}</span>
          </div>
        )}
      </div>

      {/* Pages Thumbnails & Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pages Strip */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Document Pages ({project.pages.length})
            </h3>
            <div>
              <input
                type="file"
                ref={multiFileInputRef}
                onChange={handlePhotoUpload}
                multiple
                accept="image/*"
                className="hidden"
                id="photo-multi-upload"
              />
              <button
                onClick={() => multiFileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Photos</span>
              </button>
            </div>
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
                      ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-850 shadow-xs ring-1 ring-neutral-900 dark:ring-white'
                      : 'border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-12 bg-neutral-200 dark:bg-neutral-700 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                    {page.imageDataUrl ? (
                      <img
                        src={page.imageDataUrl}
                        alt={`Page ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-neutral-400">No Img</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white">
                        Page {index + 1}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {page.annotations.length} {page.annotations.length === 1 ? 'tag' : 'tags'}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      {page.title || 'Untitled Photo'}
                    </div>
                  </div>

                  {project.pages.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePage(index);
                      }}
                      className="p-1 text-neutral-400 hover:text-red-500"
                      aria-label={`Delete page ${index + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Page Visual Editor & Annotator */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Page {activePageIndex + 1}: {activePage.title || 'Photo View'}
                </h3>
                <span className="text-xs text-neutral-400">
                  Click on the image or use the button below to add text callouts
                </span>
              </div>

              <button
                onClick={handleAddManualAnnotation}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 rounded-lg border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Text Tag</span>
              </button>
            </div>

            {/* Interactive Image Canvas */}
            <div className="relative border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden bg-neutral-950 flex items-center justify-center min-h-[300px] max-h-[440px]">
              {activePage.imageDataUrl ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={activePage.imageDataUrl}
                    alt={activePage.title}
                    className="max-h-[420px] w-full object-contain select-none"
                  />

                  {/* Overlaid Annotation Badges */}
                  {activePage.annotations.map((annot) => (
                    <div
                      key={annot.id}
                      style={{
                        left: `${annot.xPercent}%`,
                        top: `${annot.yPercent}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-move"
                    >
                      <div className="flex items-center gap-1.5 bg-neutral-900/90 hover:bg-neutral-900 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg border border-white/20 backdrop-blur-xs transition-transform group-hover:scale-105">
                        <Move className="w-3 h-3 text-neutral-400" />
                        <span>{annot.text}</span>
                        <button
                          onClick={() => handleDeleteAnnotation(annot.id)}
                          className="ml-1 text-neutral-400 hover:text-red-400"
                          title="Remove annotation"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-neutral-500 text-xs">No image loaded for this page</div>
              )}
            </div>

            {/* Page Title & Caption Editor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Page Section Title
                </label>
                <input
                  type="text"
                  value={activePage.title}
                  onChange={(e) => {
                    const updated = [...project.pages];
                    updated[activePageIndex].title = e.target.value;
                    setProject({ ...project, pages: updated });
                  }}
                  placeholder="e.g. Terrace & Piping Layout"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Site Caption / Technical Notes
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
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>
            </div>

            {/* Current Page Tag List */}
            {activePage.annotations.length > 0 && (
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-2">
                  Active Text Tags on this Photo ({activePage.annotations.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activePage.annotations.map((annot) => (
                    <div
                      key={annot.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700/80"
                    >
                      <input
                        type="text"
                        value={annot.text}
                        onChange={(e) => handleUpdateAnnotationText(annot.id, e.target.value)}
                        className="flex-1 text-xs font-medium bg-transparent border-none p-0 text-neutral-900 dark:text-white focus:ring-0"
                      />
                      <button
                        onClick={() => handleDeleteAnnotation(annot.id)}
                        className="p-1 text-neutral-400 hover:text-red-500"
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
      </div>
    </div>
  );
};
