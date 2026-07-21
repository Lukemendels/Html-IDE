import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CodeJar } from 'codejar';
import Prism from 'prismjs';

// Import Prism stylesheets and key syntax highlighter rules
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';

import {
  FileCode,
  Upload,
  Download,
  Sparkles,
  Check,
  AlertCircle,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  Laptop,
  Tablet,
  Smartphone,
  ExternalLink,
  Zap
} from 'lucide-react';

export default function App() {
  // Global application states
  const [code, setCode] = useState<string>(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Minimalist Pomodoro Clock</title>
  
  <!-- Modern Tailwind styles will render in our live pane -->
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
</head>
<body class="bg-slate-950 text-white min-h-screen flex flex-col justify-center items-center font-sans">

  <div class="w-full max-w-md mx-auto p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-2xl backdrop-blur-md text-center">
    
    <!-- Title and details -->
    <h1 class="text-2xl font-bold tracking-tight text-white mb-2">Focus Session</h1>
    <p class="text-xs text-slate-400 font-medium mb-12 uppercase tracking-widest">Time to align and create</p>

    <!-- Circular Dial Visual -->
    <div class="relative w-64 h-64 mx-auto mb-10 flex items-center justify-center">
      <div class="absolute inset-0 rounded-full border-4 border-slate-800/50"></div>
      <div id="radialFill" class="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-500 transition-all duration-1000 rotate-45 animate-pulse"></div>
      
      <!-- Time counter -->
      <div class="z-10">
        <span id="timerDisplay" class="text-5xl font-mono font-bold tracking-tight text-white">25:00</span>
        <div id="sessionType" class="text-[10px] text-blue-400 uppercase tracking-widest font-semibold mt-2">Work Interval</div>
      </div>
    </div>

    <!-- Clock Control Actions -->
    <div class="flex items-center justify-center space-x-6">
      <button id="resetTimer" class="h-12 w-12 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer">
        <i class="fa-solid fa-rotate-left text-sm"></i>
      </button>
      
      <button id="playPauseTimer" class="h-16 w-16 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-blue-500/20 scale-100 hover:scale-105 active:scale-95">
        <i id="playIcon" class="fa-solid fa-play text-lg translate-x-0.5"></i>
      </button>
      
      <button id="toggleSession" class="h-12 w-12 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer">
        <i class="fa-solid fa-circle-half-stroke text-sm"></i>
      </button>
    </div>

  </div>

  <script>
    // Embedded micro clock mechanics
    let timeRemaining = 25 * 60;
    let timerRunning = false;
    let timerInterval = null;
    let isWorkSession = true;

    const timerDisplay = document.getElementById('timerDisplay');
    const playPauseBtn = document.getElementById('playPauseTimer');
    const playIcon = document.getElementById('playIcon');
    const resetBtn = document.getElementById('resetTimer');
    const toggleSessionBtn = document.getElementById('toggleSession');
    const sessionType = document.getElementById('sessionType');
    const radialFill = document.getElementById('radialFill');

    function updateDisplay() {
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = timeRemaining % 60;
      timerDisplay.textContent = \`\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
      
      // Rotate radial fill slightly to simulate ticking down
      const total = isWorkSession ? 25 * 60 : 5 * 60;
      const progress = (total - timeRemaining) / total;
      radialFill.style.transform = \`rotate(\${45 + (progress * 360)}deg)\`;
    }

    function toggleTimer() {
      if (timerRunning) {
        clearInterval(timerInterval);
        playIcon.className = "fa-solid fa-play text-lg translate-x-0.5";
        timerRunning = false;
      } else {
        timerInterval = setInterval(() => {
          if (timeRemaining > 0) {
            timeRemaining--;
            updateDisplay();
          } else {
            clearInterval(timerInterval);
            timerRunning = false;
            playIcon.className = "fa-solid fa-play text-lg translate-x-0.5";
            alert(isWorkSession ? "Work session completed! Time for a short break." : "Break finished! Back to work.");
            switchMode();
          }
        }, 1000);
        playIcon.className = "fa-solid fa-pause text-lg";
        timerRunning = true;
      }
    }

    function resetTimer() {
      clearInterval(timerInterval);
      timerRunning = false;
      playIcon.className = "fa-solid fa-play text-lg translate-x-0.5";
      timeRemaining = isWorkSession ? 25 * 60 : 5 * 60;
      updateDisplay();
    }

    function switchMode() {
      isWorkSession = !isWorkSession;
      timeRemaining = isWorkSession ? 25 * 60 : 5 * 60;
      sessionType.textContent = isWorkSession ? "Work Interval" : "Short Break";
      sessionType.className = isWorkSession ? "text-[10px] text-blue-400 uppercase tracking-widest font-semibold mt-2" : "text-[10px] text-teal-400 uppercase tracking-widest font-semibold mt-2";
      playPauseBtn.className = isWorkSession ? "h-16 w-16 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-blue-500/20" : "h-16 w-16 rounded-full bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-teal-500/20";
      resetTimer();
    }

    playPauseBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', resetTimer);
    toggleSessionBtn.addEventListener('click', switchMode);

    updateDisplay();
  </script>
</body>
</html>`);

  const [currentFileName, setCurrentFileName] = useState<string>('pomodoro-clock.html');
  const [aiDrawerOpen, setAiDrawerOpen] = useState<boolean>(false);
  const [aiPacket, setAiPacket] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'full' | 'tablet' | 'mobile'>('full');
  
  // Status confirmations
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);

  // References
  const editorRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const jarRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronized line counts
  const lines = useMemo(() => {
    return code.split('\n');
  }, [code]);

  // Handle line gutter highlighting & scroll mirroring
  const handleEditorScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Setup CodeJar on component mount
  useEffect(() => {
    if (editorRef.current) {
      const highlight = (editor: HTMLElement) => {
        Prism.highlightElement(editor);
      };

      const jar = CodeJar(editorRef.current, highlight, {
        tab: '  '
      });

      jarRef.current = jar;
      jar.updateCode(code);

      // Listen to typing updates
      jar.onUpdate((newCode: string) => {
        setCode(newCode);
      });

      return () => {
        jar.destroy();
      };
    }
  }, []);

  // Update editor externally (file uploads or packet applies)
  useEffect(() => {
    if (jarRef.current) {
      const currentJarCode = jarRef.current.toString();
      if (currentJarCode !== code) {
        jarRef.current.updateCode(code);
      }
    }
  }, [code]);

  // Synchronize Live Preview Iframe with debounce to save CPU
  useEffect(() => {
    const handler = setTimeout(() => {
      if (iframeRef.current) {
        iframeRef.current.srcdoc = code;
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [code]);

  // Copy code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    });
  };

  // Reset to simple workspace baseline
  const handleResetWorkspace = () => {
    if (window.confirm('Are you sure you want to reset the active workspace? Unsaved changes will be discarded.')) {
      const resetBoilerplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clean Workspace Canvas</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#0b0f19] text-gray-100 flex items-center justify-center min-h-screen">
  <div class="p-10 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-sm">
    <h1 class="text-xl font-bold text-white mb-2">Workspace Reset</h1>
    <p class="text-xs text-slate-400">Pasted AI modifications or uploaded codes will populate this canvas.</p>
  </div>
</body>
</html>`;
      setCode(resetBoilerplate);
      setCurrentFileName('blank-app.html');
    }
  };

  // Apply one atomic JSON-only html-ide-patch v2 packet.
  const sourceHash = async (source: string) => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
    return 'sha256:' + Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const applyAiPacketUpdate = async () => {
    if (!aiPacket.trim()) {
      alert('Please paste one complete JSON html-ide-patch v2 packet.');
      return;
    }
    setIsApplying(true);
    try {
      const fenced = aiPacket.trim().match(/^```json\s*\n([\s\S]*?)\n```$/i);
      const packet = JSON.parse(fenced ? fenced[1] : aiPacket);
      if (packet.protocol !== 'html-ide-patch' || packet.version !== '2.0') throw new Error('Only html-ide-patch version 2.0 JSON packets are supported.');
      if (!packet.target?.sourceHash || packet.target.sourceHash !== await sourceHash(code)) throw new Error('Stale patch rejected: target.sourceHash must match the exact current source.');
      if (!Array.isArray(packet.patches) || !packet.patches.length) throw new Error('A non-empty patches array is required.');
      const ids = new Set<string>();
      const operations = new Set(['replace', 'insert_before', 'insert_after', 'delete']);
      const resolved = packet.patches.map((patch: any, index: number) => {
        if (!patch?.id || typeof patch.id !== 'string' || ids.has(patch.id)) throw new Error(`Patch #${index + 1} requires a unique string id.`);
        ids.add(patch.id);
        if (!operations.has(patch.operation) || patch.matching?.strategy !== 'exact' || !Number.isInteger(patch.matching?.expectedMatches) || patch.matching.expectedMatches < 1 || !patch.matching.search) throw new Error(`Patch ${patch.id} is not a valid exact-match v2 operation.`);
        const search = patch.matching.search as string, matches: number[] = []; let at = code.indexOf(search);
        while (at !== -1) { matches.push(at); at = code.indexOf(search, at + Math.max(1, search.length)); }
        if (matches.length !== patch.matching.expectedMatches) throw new Error(`Patch ${patch.id} expected ${patch.matching.expectedMatches} match(es), found ${matches.length}.`);
        return { patch, matches };
      });
      const ranges = resolved.flatMap(({ patch, matches }: any) => matches.map((start: number) => ({ patch, start, end: start + patch.matching.search.length }))).sort((left: any, right: any) => right.start - left.start);
      if (ranges.some((range: any, index: number) => index && range.end > ranges[index - 1].start)) throw new Error('Overlapping patch ranges are rejected.');
      let output = code;
      for (const { patch, start, end } of ranges) {
        const replacement = patch.operation === 'delete' ? '' : (patch.replacement || '');
        output = patch.operation === 'insert_before' ? output.slice(0, start) + replacement + output.slice(start) : patch.operation === 'insert_after' ? output.slice(0, end) + replacement + output.slice(end) : output.slice(0, start) + replacement + output.slice(end);
      }
      setCode(output); setAiPacket('');
    } catch (err: any) {
      alert(err.message || 'Error occurred while parsing the JSON update packet.');
    } finally { setIsApplying(false); }
  };

  // Standalone File Export
  const handleDownloadCompletedTool = () => {
    const blob = new Blob([code], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentFileName.replace(/\.html$/, '') + '-compiled.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Read local HTML file uploaded by client
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const fileContent = evt.target?.result as string;
        setCode(fileContent);
        setCurrentFileName(file.name);
      };
      reader.readAsText(file);
    }
  };

  // Download the standalone workspace IDE itself ('local-ide.html')
  const handleDownloadStandaloneIde = () => {
    fetch('/local-ide.html')
      .then(res => {
        if (!res.ok) throw new Error('File local-ide.html not found on server.');
        return res.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'local-ide.html';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      })
      .catch(err => {
        alert('Could not download standalone file directly. You can copy the code or export the directory as a ZIP instead!\nError: ' + err.message);
      });
  };

  // Demo packet loading helper
  const handleLoadDemoPacket = async (e: React.MouseEvent) => {
    e.preventDefault();
    const search = '<h1 class="text-xl font-bold text-white mb-2">';
    setAiPacket(JSON.stringify({ protocol: 'html-ide-patch', version: '2.0', target: { sourceHash: await sourceHash(code) }, patches: [{ id: 'example-heading', operation: 'insert_after', matching: { strategy: 'exact', expectedMatches: 1, search }, replacement: 'Updated: ' }] }, null, 2));
    setAiDrawerOpen(true);
  };

  // Refresh view manually
  const triggerManualRefresh = () => {
    setIsSpinning(true);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = code;
    }
    setTimeout(() => setIsSpinning(false), 600);
  };

  return (
    <div className="h-screen w-screen bg-[#0f0f11] text-gray-100 flex flex-col select-none overflow-hidden font-sans">
      
      {/* HEADER BAR */}
      <header className="h-14 bg-[#141417] border-b border-[#222227] flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
            <FileCode className="text-white h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white flex items-center space-x-2">
              <span>Local HTML IDE</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 font-semibold px-2 py-0.5 rounded-full border border-blue-500/20">Active Workspace</span>
            </h1>
            <p class="text-[10px] text-gray-500 font-mono">browser-native developer workspace</p>
          </div>
        </div>

        {/* Center Name Indicator */}
        <div className="hidden md:flex items-center space-x-2 bg-[#1a1a20] px-4 py-1.5 rounded-md border border-[#272730]">
          <FileCode className="text-blue-400 h-3.5 w-3.5" />
          <span className="text-xs font-mono text-gray-300">{currentFileName}</span>
          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" title="Ready to render" />
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleDownloadStandaloneIde}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-purple-900/40 to-purple-800/40 hover:from-purple-800/50 hover:to-purple-700/50 border border-purple-500/30 text-[11px] text-purple-300 font-medium px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-lg shadow-purple-500/5"
            title="Download fully standalone HTML file version"
          >
            <Zap className="h-3 w-3 text-purple-400 animate-pulse" />
            <span>Get Standalone IDE</span>
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 bg-[#1d1d24] hover:bg-[#252530] border border-[#2a2a35] text-xs text-gray-300 font-medium px-3.5 py-2 rounded-lg cursor-pointer transition-all"
          >
            <Upload className="h-3.5 w-3.5 text-blue-400" />
            <span>Open HTML File</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".html,.htm" 
            className="hidden" 
          />

          <button 
            onClick={handleDownloadCompletedTool}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-lg shadow-blue-500/10 border border-blue-400/20 cursor-pointer transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Completed Tool</span>
          </button>
        </div>
      </header>

      {/* WORKSPACE DIVIDERLAYOUT */}
      <main className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: Editor & Control Decks */}
        <section className="w-1/2 flex flex-col bg-[#141417] border-r border-[#222227] h-full overflow-hidden">
          


          {/* Deck B: CodeJar Text Editor Canvas */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#16161a]">
            {/* Inner sub header */}
            <div className="h-9 bg-[#111113] px-4 flex items-center justify-between border-b border-[#222227] shrink-0 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 font-mono text-[11px]">Source Editor</span>
                <span className="text-gray-600">|</span>
                <span className="text-gray-500 text-[10px] font-mono">{lines.length} lines</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-500">
                <button 
                  onClick={handleCopyCode} 
                  className={`hover:text-blue-400 transition-colors cursor-pointer flex items-center space-x-1 ${isCopied ? 'text-green-400' : ''}`}
                  title="Copy to clipboard"
                >
                  {isCopied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button 
                  onClick={handleResetWorkspace} 
                  className="hover:text-red-400 transition-colors cursor-pointer" 
                  title="Clear Workspace Template"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Codejar + line number column */}
            <div className="flex-1 flex overflow-hidden editor-container relative">
              {/* Line number gutter */}
              <div 
                ref={gutterRef}
                className="select-none py-4 text-right pr-3 pl-4 bg-[#111113]/80 text-[#4c4c5e] border-r border-[#222227] overflow-hidden text-xs leading-6 no-scrollbar flex flex-col h-full w-12 shrink-0"
              >
                {lines.map((_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>

              {/* Editable Area */}
              <div 
                ref={editorRef}
                onScroll={handleEditorScroll}
                className="codejar-editor flex-1 p-4 overflow-auto h-full text-xs leading-6 language-html focus:outline-none text-[#e2e8f0]"
                style={{ whiteSpace: 'pre', wordBreak: 'keep-all' }}
              />
            </div>
          </div>

          {/* Deck C: Collapsible AI Packet Drawer */}
          <div className={`border-t border-[#222227] bg-[#111113] flex flex-col shadow-inner shrink-0 ${aiDrawerOpen ? 'border-purple-500/20 shadow-purple-500/5' : ''}`}>
            
            {/* Trigger Header */}
            <button 
              onClick={() => setAiDrawerOpen(!aiDrawerOpen)}
              className="w-full px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#16161a] transition-all"
            >
              <div className="flex items-center space-x-2.5">
                <div className="h-6 w-6 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-purple-400 animate-pulse" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-semibold text-gray-200">Paste AI Update Packet</span>
                  <p className="text-[9px] text-gray-500 font-mono">Apply JSON-only html-ide-patch v2 updates</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[10px] bg-purple-500/10 text-purple-400 font-semibold px-2 py-0.5 rounded-full border border-purple-500/20">Apply</span>
                {aiDrawerOpen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronUp className="h-4 w-4 text-gray-500" />}
              </div>
            </button>

            {/* Collapsible Content */}
            <AnimatePresence initial={false}>
              {aiDrawerOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 pb-5 space-y-3.5 overflow-hidden"
                >
                  <div className="relative">
                    <textarea 
                      value={aiPacket}
                      onChange={(e) => setAiPacket(e.target.value)}
                      placeholder={`{\n  "protocol": "html-ide-patch",\n  "version": "2.0",\n  ...\n}`}
                      className="w-full h-32 bg-[#16161a] border border-gray-800 rounded-xl p-3 text-xs font-mono text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 resize-none transition-all focus:ring-1 focus:ring-purple-500/20"
                    />
                    
                    <div className="absolute right-3.5 bottom-3 text-[10px] text-gray-600 font-mono select-none">
                      One JSON packet; a fenced JSON packet is accepted
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-gray-500">
                      <a 
                        href="#" 
                        onClick={handleLoadDemoPacket}
                        className="text-purple-400 hover:underline"
                      >
                        Load Example Packet
                      </a>
                    </div>
                    
                    <button 
                      onClick={applyAiPacketUpdate}
                      disabled={isApplying}
                      className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-semibold px-4.5 py-2 rounded-lg cursor-pointer transition-all border border-purple-400/20 shadow-lg shadow-purple-500/10 disabled:opacity-50"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{isApplying ? 'Applying...' : 'Apply Changes'}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </section>

        {/* RIGHT COLUMN: Interactive Live Render Window */}
        <section className="w-1/2 flex flex-col bg-[#0f0f11] h-full overflow-hidden">
          
          {/* Controls strip */}
          <div className="h-12 bg-[#121214] border-b border-[#222227] px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <Eye className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-300 tracking-wider uppercase">Live Render Preview</span>
            </div>

            <div className="flex items-center space-x-4">
              {/* Frame Resolution Selectors */}
              <div className="flex items-center space-x-1.5 bg-[#17171c] p-0.5 rounded-lg border border-[#23232c]">
                <button 
                  onClick={() => setPreviewMode('full')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all flex items-center space-x-1 cursor-pointer ${previewMode === 'full' ? 'text-white bg-blue-600/20 border border-blue-500/30' : 'text-gray-400 border border-transparent'}`}
                >
                  <Laptop className="h-3 w-3" />
                  <span>Full</span>
                </button>
                <button 
                  onClick={() => setPreviewMode('tablet')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all flex items-center space-x-1 cursor-pointer ${previewMode === 'tablet' ? 'text-white bg-blue-600/20 border border-blue-500/30' : 'text-gray-400 border border-transparent'}`}
                >
                  <Tablet className="h-3 w-3" />
                  <span>Tablet</span>
                </button>
                <button 
                  onClick={() => setPreviewMode('mobile')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all flex items-center space-x-1 cursor-pointer ${previewMode === 'mobile' ? 'text-white bg-blue-600/20 border border-blue-500/30' : 'text-gray-400 border border-transparent'}`}
                >
                  <Smartphone className="h-3 w-3" />
                  <span>Mobile</span>
                </button>
              </div>

              {/* Force Render Frame button */}
              <button 
                onClick={triggerManualRefresh}
                className="h-7 w-7 rounded-lg bg-[#1a1a20] hover:bg-[#22222a] border border-[#2a2a35] flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer" 
                title="Force Render Frame"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Actual responsive viewport canvas */}
          <div className="flex-1 bg-[#09090b] flex items-center justify-center p-4 overflow-hidden relative">
            <div 
              className="bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 border border-gray-900/50 h-full w-full"
              style={{
                width: previewMode === 'full' ? '100%' : previewMode === 'tablet' ? '768px' : '375px',
                maxWidth: '100%'
              }}
            >
              <iframe 
                ref={iframeRef}
                title="Workspace Preview Frame"
                className="w-full h-full bg-white block" 
                sandbox="allow-scripts"
              />
            </div>
          </div>

        </section>

      </main>

    </div>
  );
}
