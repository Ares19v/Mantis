import { useState, useRef, useEffect } from 'react'

function App() {
  const [emotion, setEmotion] = useState("WAITING...")
  const [action, setAction] = useState("IDLE -> Waiting for speech...")
  const [interimText, setInterimText] = useState("")
  const [transcriptLog, setTranscriptLog] = useState([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  
  const [callTime, setCallTime] = useState(0)
  const [deadAirTime, setDeadAirTime] = useState(0)
  const [isCustomerSpeaking, setIsCustomerSpeaking] = useState(false)
  const [showGraph, setShowGraph] = useState(false)
  const [sentimentHistory, setSentimentHistory] = useState([])
  
  const [activeSpeaker, setActiveSpeaker] = useState("CUSTOMER")
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summaryData, setSummaryData] = useState(null)
  
  const socketRef = useRef(null)
  const recognitionRef = useRef(null)
  const audioContextRef = useRef(null)
  const streamRef = useRef(null)
  const processorRef = useRef(null)
  const dummyNodeRef = useRef(null)
  const canvasRef = useRef(null)
  const drawVisualRef = useRef(null)
  const transcriptEndRef = useRef(null)

  const callTimeRef = useRef(0)
  const deadAirTimeRef = useRef(0)
  const speakingRef = useRef(false)
  const timerIntervalRef = useRef(null)
  const silenceTimeoutRef = useRef(null)
  const activeSpeakerRef = useRef("CUSTOMER")
  const isMonitoringRef = useRef(false)
  const fullTranscriptRef = useRef("")
  const currentEmotionRef = useRef("WAITING...")

  const escalations = ['manager', 'ridiculous', 'sue', 'cancel', 'terrible', 'worst', 'fuck', 'shit', 'angry', 'mad']

  useEffect(() => {
    const handleKeyDown = (e) => { 
      if (e.key === 'Shift' && activeSpeakerRef.current !== "AGENT") { 
        activeSpeakerRef.current = "AGENT"
        setActiveSpeaker("AGENT")
        setInterimText("") 
        if (recognitionRef.current) recognitionRef.current.stop() 
      } 
    }
    const handleKeyUp = (e) => { 
      if (e.key === 'Shift' && activeSpeakerRef.current !== "CUSTOMER") { 
        activeSpeakerRef.current = "CUSTOMER"
        setActiveSpeaker("CUSTOMER")
        setInterimText("") 
        if (recognitionRef.current) recognitionRef.current.stop() 
      } 
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp) }
  }, [])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcriptLog, interimText])

  const getEmotionScore = (emo) => {
    const e = emo.toUpperCase()
    if (e.includes('HAPPY') || e.includes('CALM')) return 1
    if (e.includes('SAD') || e.includes('FEARFUL')) return -0.5
    if (e.includes('ANGRY') || e.includes('DISGUST') || e.includes('FRUSTRATED')) return -1
    return 0 
  }

  const highlightText = (text) => {
    const competitors = ['competitor', 'aws', 'azure', 'zendesk', 'salesforce']
    const products = ['mantis', 'premium', 'subscription', 'api', 'dashboard']

    return text.split(' ').map((word, index) => {
      const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (escalations.includes(cleanWord)) {
        return <span key={index} className="text-rose-400 font-bold bg-rose-500/10 px-1 mx-[2px] rounded border border-rose-500/20">{word} </span>
      } else if (competitors.includes(cleanWord)) {
        return <span key={index} className="text-amber-400 font-bold bg-amber-500/10 px-1 mx-[2px] rounded border border-amber-500/20">{word} </span>
      } else if (products.includes(cleanWord)) {
        return <span key={index} className="text-indigo-400 font-bold bg-indigo-500/10 px-1 mx-[2px] rounded border border-indigo-500/20">{word} </span>
      }
      return word + ' '
    })
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const startMonitoring = async () => {
    setTranscriptLog([])
    setSummaryData(null)
    setIsSummarizing(false)
    callTimeRef.current = 0
    deadAirTimeRef.current = 0
    fullTranscriptRef.current = ""
    setCallTime(0)
    setDeadAirTime(0)
    setSentimentHistory([])
    isMonitoringRef.current = true
    setIsMonitoring(true)
    setShowNotification(false)
    setAction("IDLE -> Waiting for speech...")

    socketRef.current = new WebSocket('ws://localhost:8000/ws/audio')
    
    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.emotion) {
            setEmotion(data.emotion)
            currentEmotionRef.current = data.emotion
            
            setSentimentHistory(prev => {
              const newHist = [...prev, { score: getEmotionScore(data.emotion) }]
              return newHist.slice(-30) 
            })

            if (data.emotion.includes("ANGRY") || data.emotion.includes("FRUSTRATED")) {
                setShowNotification(true)
            }
        }
      } catch(e) { console.error(e) }
    }

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContextRef.current = new window.AudioContext({ sampleRate: 16000 })
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume()
      
      const input = audioContextRef.current.createMediaStreamSource(streamRef.current)
      const analyser = audioContextRef.current.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.85 
      input.connect(analyser)
      
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1)
      dummyNodeRef.current = audioContextRef.current.createGain()
      dummyNodeRef.current.gain.value = 0 
      
      input.connect(processorRef.current)
      processorRef.current.connect(dummyNodeRef.current)
      dummyNodeRef.current.connect(audioContextRef.current.destination)
      
      processorRef.current.onaudioprocess = (e) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0)
          const pcmData = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF
          }
          socketRef.current.send(pcmData.buffer) 
        }
      }
      
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      const draw = () => {
        drawVisualRef.current = requestAnimationFrame(draw)
        if(!canvasRef.current) return
        
        const canvasCtx = canvasRef.current.getContext('2d')
        const width = canvasRef.current.width
        const height = canvasRef.current.height
        
        analyser.getByteTimeDomainData(dataArray)

        canvasCtx.fillStyle = '#131B2C' 
        canvasCtx.fillRect(0, 0, width, height)

        const gradient = canvasCtx.createLinearGradient(0, 0, width, 0)
        gradient.addColorStop(0, '#38bdf8') 
        gradient.addColorStop(0.5, '#818cf8') 
        gradient.addColorStop(1, '#38bdf8') 

        canvasCtx.lineWidth = speakingRef.current ? 3 : 1
        canvasCtx.strokeStyle = speakingRef.current ? gradient : 'rgba(51, 65, 85, 0.4)' 
        canvasCtx.shadowBlur = speakingRef.current ? 12 : 0
        canvasCtx.shadowColor = '#818cf8' 

        canvasCtx.beginPath()
        const sliceWidth = width * 1.0 / bufferLength
        let x = 0
        const centerY = height / 2

        for (let i = 0; i < bufferLength; i++) {
          const v = (dataArray[i] - 128) / 128.0 
          const y = centerY + (v * centerY * (speakingRef.current ? 1.5 : 0.2))
          if (i === 0) canvasCtx.moveTo(x, y)
          else canvasCtx.lineTo(x, y)
          x += sliceWidth
        }
        canvasCtx.lineTo(width, centerY)
        canvasCtx.stroke()
      }
      draw() 
      
      timerIntervalRef.current = setInterval(() => {
        callTimeRef.current += 1
        setCallTime(callTimeRef.current)
        if (!speakingRef.current) {
          deadAirTimeRef.current += 1
          setDeadAirTime(deadAirTimeRef.current)
        }
      }, 1000)

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        
        recognitionRef.current.onresult = (event) => {
          speakingRef.current = true
          setIsCustomerSpeaking(true)
          
          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current)
          
          let currentInterim = ""
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const finalText = event.results[i][0].transcript
              const currentSpkr = activeSpeakerRef.current
              
              setTranscriptLog(prev => [...prev, { time: new Date().toLocaleTimeString(), text: finalText, speaker: currentSpkr }])
              
              if (currentSpkr === "CUSTOMER") {
                  fullTranscriptRef.current += " " + finalText
              }
              
              if (escalations.some(badWord => finalText.toLowerCase().includes(badWord))) {
                 setShowNotification(true)
              }
              
              currentInterim = ""
            } else {
              currentInterim += event.results[i][0].transcript
            }
          }
          setInterimText(currentInterim)

          // FIRE GROQ API CALL SECURELY OVER HTTP POST
          silenceTimeoutRef.current = setTimeout(() => {
            speakingRef.current = false
            setIsCustomerSpeaking(false)
            
            if (fullTranscriptRef.current.trim().length > 5) {
                fetch('http://localhost:8000/api/advice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        transcript: fullTranscriptRef.current,
                        emotion: currentEmotionRef.current
                    })
                })
                .then(res => res.json())
                .then(data => {
                    const statusColor = currentEmotionRef.current.includes('ANGRY') || currentEmotionRef.current.includes('SAD') ? 'ALERT' : 'STABLE'
                    setAction(`[${statusColor}] ${data.action}`)
                })
                .catch(err => console.error("Groq Error:", err))
            }
          }, 1500)
        }

        recognitionRef.current.onend = () => {
          if (isMonitoringRef.current) {
            try { recognitionRef.current.start() } catch { /* recognition restarts automatically */ }
          }
        }

        recognitionRef.current.start()
      }

    } catch (err) {
      console.error("Hardware initialization failed:", err)
    }
  }

  const stopMonitoring = () => {
    isMonitoringRef.current = false
    streamRef.current?.getTracks().forEach(t => t.stop())
    socketRef.current?.close()
    audioContextRef.current?.close()
    if(recognitionRef.current) recognitionRef.current.stop()
    
    if (drawVisualRef.current) cancelAnimationFrame(drawVisualRef.current)
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current)
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx.fillStyle = '#131B2C'
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    
    setIsMonitoring(false)
    setIsCustomerSpeaking(false)
    speakingRef.current = false
    setEmotion("OFFLINE")
    setAction("SYSTEM HALTED")

    const logSnapshot = [...transcriptLog]
    const fullLog = logSnapshot.map(l => `${l.speaker}: ${l.text}`).join('\n')
    if (fullLog.trim().length > 10) {
      setIsSummarizing(true)
      fetch('http://localhost:8000/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullLog })
      })
      .then(res => res.json())
      .then(data => { setSummaryData(data.summary); setIsSummarizing(false) })
      .catch(() => { setSummaryData("Error connecting to analytics engine."); setIsSummarizing(false) })
    }
  }

  const deadAirRatio = callTime > 0 ? Math.round((deadAirTime / callTime) * 100) : 0
  const deadAirColor = deadAirRatio > 35 ? 'text-rose-400' : (deadAirRatio > 20 ? 'text-amber-400' : 'text-emerald-400')

  const generateGraphPath = () => {
    if (sentimentHistory.length === 0) return ""
    const width = 400
    const height = 64
    const step = width / (sentimentHistory.length > 1 ? sentimentHistory.length - 1 : 1)
    
    return sentimentHistory.map((point, index) => {
      const x = index * step
      const y = height - ((point.score + 1) / 2) * height
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 p-8 font-sans relative overflow-hidden">
      
      {/* IPHONE NOTIFICATION SLIDER */}
      <div 
         onClick={() => setShowNotification(false)}
         className={`fixed bottom-8 right-8 w-[280px] h-[480px] bg-[#0A0A0A] rounded-[40px] border-[6px] border-slate-800 shadow-[0_30px_60px_rgba(0,0,0,0.6)] z-[60] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex flex-col cursor-pointer ${showNotification ? 'translate-y-0' : 'translate-y-[150%]'}`}>
         <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-b-2xl w-32 mx-auto z-10"></div>
         <div className="flex-1 bg-gradient-to-b from-slate-900 to-[#0B0F19] pt-14 px-4 relative">
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white text-sm font-bold shadow-[0_0_10px_rgba(244,63,94,0.5)]">!</div>
                  <div className="flex flex-col">
                     <p className="text-white text-xs font-bold tracking-wide">Mantis Alert</p>
                     <p className="text-slate-400 text-[10px]">now</p>
                  </div>
               </div>
               <p className="text-white/90 text-xs leading-relaxed mt-2">Critical escalation detected. Supervisor requested on Line 4.</p>
            </div>
         </div>
         <div className="absolute bottom-2 inset-x-0 h-1 bg-white/20 rounded-full w-1/3 mx-auto"></div>
      </div>

      <div className="flex justify-between items-center mb-8 border-b border-slate-800/60 pb-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">MANTIS <span className="text-sm font-semibold text-indigo-400 ml-2">AGENT ASSIST v2.0</span></h1>
          <p className="text-slate-400 text-sm mt-1">Acoustic Emotion Inference Pipeline</p>
        </div>
        <div className="flex items-center gap-6">
          
          <button onClick={() => setShowNotification(!showNotification)} className="px-4 py-2 bg-[#131B2C] border border-slate-700 text-slate-400 text-[10px] font-bold rounded-lg hover:bg-slate-800 hover:text-white transition-colors shadow-sm">
            TOGGLE NOTIFICATION
          </button>

          {isMonitoring ? (
            <button onClick={stopMonitoring} className="px-8 py-2.5 bg-rose-500/10 text-rose-400 text-sm font-bold rounded-lg hover:bg-rose-500/20 transition-all border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)] tracking-wide">END CALL</button>
          ) : (
            <button onClick={startMonitoring} className="px-8 py-2.5 bg-emerald-500/10 text-emerald-400 text-sm font-bold rounded-lg hover:bg-emerald-500/20 transition-all border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] tracking-wide">CALL</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[72vh]">
        
        <div className="lg:col-span-2 bg-[#131B2C] border border-slate-800/60 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
          <div className="bg-[#131B2C] border-b border-slate-800/60 p-5 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-4">
               <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Transcription Feed</h2>
               <span className="text-[9px] bg-slate-800/50 border border-slate-700/50 text-slate-400 px-2 py-0.5 rounded font-bold">HOLD SHIFT TO SPEAK AS AGENT</span>
            </div>
            {isCustomerSpeaking && (
              <span className={`text-[10px] font-bold tracking-widest animate-pulse flex items-center gap-2 ${activeSpeaker === 'AGENT' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                <div className={`w-2 h-2 rounded-full ${activeSpeaker === 'AGENT' ? 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'}`}></div> {activeSpeaker}
              </span>
            )}
          </div>
          <div className="flex-1 p-6 overflow-y-auto font-sans text-sm space-y-6 custom-scrollbar">
            {transcriptLog.map((log, i) => (
              <div key={i} className={`flex flex-col max-w-[80%] ${log.speaker === 'AGENT' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                <span className="text-[10px] text-slate-500 font-bold mb-1.5 ml-1">{log.speaker} • {log.time}</span>
                <div className={`px-5 py-3.5 rounded-2xl shadow-sm ${log.speaker === 'AGENT' ? 'bg-indigo-600/90 text-white rounded-tr-sm border border-indigo-500/50' : 'bg-slate-800/60 border border-slate-700/50 text-slate-200 rounded-tl-sm'}`}>
                   <span className="leading-relaxed">{highlightText(log.text)}</span>
                </div>
              </div>
            ))}
            {interimText && (
              <div className={`flex flex-col max-w-[80%] opacity-50 ${activeSpeaker === 'AGENT' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                <span className="text-[10px] text-slate-500 font-bold mb-1.5 ml-1">{activeSpeaker} • {new Date().toLocaleTimeString()}</span>
                <div className={`px-5 py-3.5 rounded-2xl ${activeSpeaker === 'AGENT' ? 'bg-indigo-600/90 text-white rounded-tr-sm' : 'bg-slate-800/60 text-slate-200 rounded-tl-sm'}`}>
                   <span className="italic">{interimText}</span>
                </div>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          
          <div className="bg-[#131B2C] border border-slate-800/60 rounded-2xl p-6 shadow-2xl flex flex-col justify-center items-center relative group">
             <button 
                onClick={() => setShowGraph(!showGraph)} 
                className="absolute top-4 right-4 text-slate-700 hover:text-slate-400 text-[10px] cursor-pointer transition-colors z-10"
                title="Toggle Telemetry Mode">
                ●
             </button>

             <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 w-full text-center">Acoustic Emotion Inference</h2>
             <div className="text-2xl font-black text-white text-center tracking-wide mb-6">
                {emotion}
             </div>
             
             <div className="w-full h-16 bg-[#0B0F19] rounded-xl border border-slate-800/60 overflow-hidden shadow-inner relative">
               <canvas 
                 ref={canvasRef} 
                 width="400" 
                 height="64" 
                 className={`w-full h-full absolute inset-0 transition-opacity duration-500 ${showGraph ? 'opacity-0' : 'opacity-100'}`}
               ></canvas>
               
               <svg 
                 width="100%" 
                 height="100%" 
                 className={`absolute inset-0 transition-opacity duration-500 ${showGraph ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                 viewBox="0 0 400 64" 
                 preserveAspectRatio="none"
               >
                  <line x1="0" y1="16" x2="400" y2="16" stroke="#1e293b" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1="32" x2="400" y2="32" stroke="#1e293b" strokeWidth="1" />
                  <line x1="0" y1="48" x2="400" y2="48" stroke="#1e293b" strokeWidth="1" strokeDasharray="4" />
                  <path d={generateGraphPath()} fill="none" stroke="#818cf8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
               </svg>
             </div>
          </div>

          <div className="bg-[#131B2C] border border-slate-800/60 rounded-2xl p-5 shadow-2xl flex items-center justify-between">
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Call Duration</span>
                <span className="text-xl font-mono font-semibold text-slate-200">{formatTime(callTime)}</span>
             </div>
             <div className="h-8 w-px bg-slate-700/50"></div>
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dead Air Ratio</span>
                <div className="flex items-baseline gap-2">
                   <span className={`text-xl font-mono font-semibold ${deadAirColor}`}>{deadAirRatio}%</span>
                   <span className="text-xs font-mono text-slate-500">({formatTime(deadAirTime)})</span>
                </div>
             </div>
          </div>

          <div className={`flex-1 border rounded-2xl p-6 shadow-2xl flex flex-col transition-colors duration-500 
             ${!isMonitoring && (isSummarizing || summaryData) ? 'bg-indigo-500/10 border-indigo-500/30' : 
               (action.includes('ALERT') || action.includes('CRITICAL') ? 'bg-rose-500/10 border-rose-500/30' : 'bg-[#131B2C] border-slate-800/60')}`}>
             
             <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
               {!isMonitoring && (isSummarizing || summaryData) ? 'Post-Call Analytics Report' : 'Suggestive Measure'}
             </h2>
             
             <div className="flex-1 flex flex-col justify-center">
                {!isMonitoring && isSummarizing ? (
                   <div className="flex flex-col items-center justify-center gap-4 py-4">
                      <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-indigo-400/80 animate-pulse font-mono text-xs">Compiling Report...</p>
                   </div>
                ) : !isMonitoring && summaryData ? (
                   <div className="text-slate-300 font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-40 pr-2 custom-scrollbar">
                      {summaryData}
                   </div>
                ) : action.includes('->') ? (
                  action.split('->').map((part, index) => (
                    <span key={index} className={index === 0 ? "text-slate-400 font-semibold mb-1 block text-xs" : "text-xl font-bold text-slate-100"}>
                      {part.trim()}
                    </span>
                  ))
                ) : (
                  <span className="text-lg font-bold text-slate-200">{action}</span>
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default App
