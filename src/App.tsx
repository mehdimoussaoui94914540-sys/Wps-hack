import { useState, useEffect } from 'react';
import { Copy, Terminal as TerminalIcon, Shield, Download, Cpu, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateWPSResults, type WPSResults } from './lib/wps_logic';

export default function App() {
  const [macInput, setMacInput] = useState('');
  const [results, setResults] = useState<WPSResults | null>(null);
  const [error, setError] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [pythonCode, setPythonCode] = useState('');

  useEffect(() => {
    fetch('/wps_tool.py')
      .then(res => res.text())
      .then(setPythonCode)
      .catch(console.error);
  }, []);

  const handleGenerate = () => {
    try {
      setError('');
      const data = generateWPSResults(macInput);
      setResults(data);
    } catch (err) {
      setError('Invalid MAC address format.');
      setResults(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#050505] text-[#e0e0e0] font-sans selection:bg-[#00ff41] selection:text-black">
      {/* Top Bar */}
      <div className="h-10 bg-black border-b border-[#222222] flex items-center justify-between px-5 text-[12px] font-mono uppercase tracking-[1px]">
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-[#00ff41]" />
          <span className="font-bold">WPSGEN // PRO-v4.2.0</span>
        </div>
        <div className="flex gap-5">
          <div className="flex items-center gap-1.5">
            OS: <span className="text-[#00ff41]">KALI-ROLLING</span>
          </div>
          <div className="flex items-center gap-1.5 hidden md:flex">
            CPU: <span className="text-[#00ff41]">12%</span>
            <Cpu className="w-3 h-3 ml-1" />
          </div>
          <div className="flex items-center gap-1.5 hidden lg:flex">
            INT: <span className="text-[#00ff41]">WLAN0MON</span>
            <HardDrive className="w-3 h-3 ml-1" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[320px] bg-[#121212] border-r border-[#222222] p-6 flex flex-col gap-6 overflow-y-auto">
          <div>
            <span className="label-style">Target MAC Address</span>
            <div className="flex flex-col gap-2">
              <input 
                type="text" 
                value={macInput}
                onChange={(e) => setMacInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="00:1C:F0:..."
                className="input-style"
              />
              <button 
                onClick={handleGenerate}
                className="w-full py-2 bg-[#00ff41] text-black font-bold uppercase text-xs tracking-widest hover:bg-white transition-colors rounded"
              >
                Analyze Target
              </button>
              {error && <p className="text-[10px] text-red-500 font-mono italic">{error}</p>}
            </div>
          </div>

          <div>
            <span className="label-style">Identified Vendor</span>
            <div className="bg-[#00ff41]/10 text-[#00ff41] px-2 py-1.5 rounded border border-[#00ff41] text-xs font-bold uppercase tracking-wider flex items-center justify-between">
              {results?.vendor || 'Awaiting Input...'}
            </div>
          </div>

          <div className="mt-auto space-y-4">
            <button 
              onClick={() => setShowCode(!showCode)}
              className="w-full py-2 border border-[#222222] text-[#888888] text-[10px] uppercase font-bold tracking-[2px] hover:text-white hover:border-white transition-all flex items-center justify-center gap-2"
            >
              <TerminalIcon className="w-3 h-3" />
              Toggle Source View
            </button>
            
            <a 
              href="/public/wps_tool.py" 
              download 
              className="w-full py-2 bg-black border border-[#222222] text-[#00ff41] text-[10px] uppercase font-bold tracking-[2px] flex items-center justify-center gap-2 hover:border-[#00ff41] transition-all"
            >
              <Download className="w-3 h-3" />
              Download CLI Tool
            </a>

            {results && (
              <div className="card-style">
                <span className="label-style">Most Likely PIN</span>
                <div className="text-3xl font-mono text-[#00ff41] tracking-tighter">
                  {results.pins.find(p => p.isSuggested)?.pin || results.pins[0].pin}
                </div>
                <p className="text-[11px] text-[#888888] mt-2 leading-relaxed">
                  Based on OUI specific pattern matching for {results.vendor} hardware.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden flex flex-col bg-[radial-gradient(circle_at_top_right,#0a0e0a,#050505)]">
          <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8">
            <AnimatePresence mode="wait">
              {results ? (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-8"
                >
                  <div>
                    <span className="label-style">Computed PIN Variations</span>
                    <div className="grid grid-cols-2 gap-4">
                      {results.pins.map((pin, i) => (
                        <div 
                          key={i} 
                          className="bg-[#0a0a0a] p-3 border-l-[3px] transition-all hover:bg-[#111]"
                          style={{ borderColor: pin.isSuggested ? 'var(--accent)' : 'var(--cyan)' }}
                        >
                          <div className="text-[11px] text-[#888888] mb-1 font-mono uppercase tracking-widest">{pin.name}</div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xl text-white tracking-wider">{pin.pin}</span>
                            <button 
                              onClick={() => copyToClipboard(pin.pin, `pin-${i}`)}
                              className="text-[10px] text-[#888888] hover:text-[#00ff41]"
                            >
                              {copied === `pin-${i}` ? 'COPIED' : 'COPY'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="label-style">Reaver Command String</span>
                    <div className="bg-black border border-[#222222] border-dashed p-4 rounded font-mono text-sm relative group">
                      <button 
                        onClick={() => copyToClipboard(results.reaverCommand, 'cmd')}
                        className="absolute right-3 top-3 text-[10px] text-[#888888] border border-[#222222] px-2 py-1 rounded hover:text-white hover:border-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copied === 'cmd' ? 'COPIED' : 'COPY CMD'}
                      </button>
                      <code className="text-[#00e5ff] break-all block pr-16">{results.reaverCommand} -K 1 -f</code>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20 select-none">
                  <Shield className="w-32 h-32 mb-4" />
                  <p className="font-mono tracking-[4px] uppercase text-sm">Waiting for Target Scan...</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Terminal Section */}
          <div className="h-[200px] bg-black border-t border-[#222222] p-4 overflow-y-auto font-mono text-[12px] leading-relaxed text-[#bbb]">
            <div className="terminal-line"><span>[+]</span> Initializing WPSGen Wireless Security Engine...</div>
            {results && (
              <>
                <div className="terminal-line"><span>[+]</span> MAC: {results.mac} cleaned and validated.</div>
                <div className="terminal-line text-[#00e5ff]">[*] OUI Check Check: {results.mac.slice(0, 8)} -{'>'} {results.vendor}</div>
                <div className="terminal-line"><span>[+]</span> Calculating D-Link XOR PIN... Success.</div>
                <div className="terminal-line"><span>[+]</span> Calculating Zhao Standard PIN... Success.</div>
                <div className="terminal-line"><span>[+]</span> Running WPS Luhn Checksum for 8th digit... Done.</div>
                <div className="terminal-line"><span>[+]</span> All algorithms completed. Ready for injection.</div>
                <div className="terminal-line animate-pulse"><span>[_]</span> System stand-by... awaiting user selection.</div>
              </>
            )}
            {!results && (
              <div className="terminal-line animate-pulse"><span>[_]</span> kernel: waiting for peripheral input...</div>
            )}
          </div>
        </main>
      </div>

      {/* Source Code Modal */}
      <AnimatePresence>
        {showCode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/98 backdrop-blur p-10 flex items-center justify-center"
          >
            <div className="w-full max-w-4xl h-full flex flex-col bg-[#121212] border border-[#222222] rounded shadow-2xl">
              <div className="p-4 border-b border-[#222222] flex justify-between items-center bg-black">
                <span className="text-[10px] font-bold uppercase tracking-[2px] text-[#888888]">WPS_TOOL.PY // CORE_LOGIC</span>
                <button onClick={() => setShowCode(false)} className="text-[#888888] hover:text-white">CLOSE [X]</button>
              </div>
              <pre className="flex-1 overflow-auto p-6 text-[11px] font-mono text-[#00ff41] bg-black">
                <code>{pythonCode}</code>
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disclaimer */}
      <div className="border-t border-[#222222] p-3 text-[11px] text-[#cc3333] italic bg-red-500/5 px-5 flex justify-between">
        <span>DISCLAIMER: This tool is strictly for educational purposes. Use only on networks you own or have explicit permission to audit.</span>
        <span className="text-[10px] opacity-40 not-italic uppercase font-bold hidden sm:block">authorized researchers only</span>
      </div>
    </div>
  );
}


