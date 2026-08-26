import { useState, useRef, useEffect } from 'react'

function App() {
  const [emotion, setEmotion] = useState('WAITING')
  const [energyLevel, setEnergyLevel] = useState('LOW')
  const [action, setAction] = useState('IDLE -> Ready for incoming speech stream...')
  const [copied, setCopied] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [transcriptLog, setTranscriptLog] = useState([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  
  const [callTime, setCallTime] = useState(0)
  const [deadAirTime, setDeadAirTime] = useState(0)
  const [isCustomerSpeaking, setIsCustomerSpeaking] = useState(false)
  const [showGraph, setShowGraph] = useState(false)
  const [sentimentHistory, setSentimentHistory] = useState([])
  
  const [activeSpeaker, setActiveSpeaker] = useState('CUSTOMER')
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
  const activeSpeakerRef = useRef('CUSTOMER')
  const isMonitoringRef = useRef(false)
  const fullTranscriptRef = useRef('')
  const currentEmotionRef = useRef('WAITING')

  const escalations = ['manager', 'supervisor', 'ridiculous', 'sue', 'cancel', 'terrible', 'worst', 'angry', 'lawyer', 'frustrated', 'refund']

  useEffect(() => {
    const handleKeyDown = (e) => { 
      if (e.key === 'Shift' && activeSpeakerRef.current !== 'AGENT') { 
        activeSpeakerRef.current = 'AGENT'
        setActiveSpeaker('AGENT')
        setInterimText('') 
        if (recognitionRef.current) recognitionRef.current.stop() 
      } 
    }
    const handleKeyUp = (e) => { 
      if (e.key === 'Shift' && activeSpeakerRef.current !== 'CUSTOMER') { 
        activeSpeakerRef.current = 'CUSTOMER'
        setActiveSpeaker('CUSTOMER')
        setInterimText('') 
        if (recognitionRef.current) recognitionRef.current.stop() 
      } 
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp) }
  }, [])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcriptLog, interimText])

  const getEmotionScore = (emo) => {
    const e = emo.toUpperCase()
    if (e.includes('HAPPY') || e.includes('CONTENT') || e.includes('CALM')) return 1
    if (e.includes('SAD')) return -0.4
    if (e.includes('ANGRY') || e.includes('FRUSTRATED')) return -1
    return 0 
  }

  const highlightText = (text) => {
    const competitors = ['competitor', 'aws', 'azure', 'zendesk', 'salesforce']
    const products = ['mantis', 'enterprise', 'subscription', 'api', 'dashboard', 'plan']

    return text.split(' ').map((word, index) => {
      const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (escalations.includes(cleanWord)) {
        return (
          <span key={index} className='text-rose-700 font-bold bg-rose-100/90 px-1.5 py-0.5 rounded border border-rose-300 inline-flex items-center gap-1 shadow-2xs text-xs'>
            {word}
            <span className='text-[8px] font-black uppercase bg-rose-600 text-white px-1 py-0.2 rounded'>Risk</span>
          </span>
        )
      } else if (competitors.includes(cleanWord)) {
        return <span key={index} className='text-amber-900 font-bold bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300'>{word} </span>
      } else if (products.includes(cleanWord)) {
        return <span key={index} className='text-[#0D7F82] font-bold bg-[#EAF5F5] px-1.5 py-0.5 rounded border border-[#0D7F82]/30'>{word} </span>
      }
      return word + ' '
    })
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const handleCopyScript = (textToCopy) => {
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const simulateDemoMessage = (speaker, text, simEmotion) => {
    const newLog = {
      speaker,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text
    }
    setTranscriptLog(prev => [...prev, newLog])
    fullTranscriptRef.current += ' ' + text

    if (simEmotion) {
      setEmotion(simEmotion)
      currentEmotionRef.current = simEmotion
      setSentimentHistory(prev => [...prev, { score: getEmotionScore(simEmotion) }].slice(-30))
      if (simEmotion.includes('ANGRY') || simEmotion.includes('FRUSTRATED')) {
        setShowNotification(true)
      }
    }

    fetch('http://localhost:8000/api/advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        transcript: fullTranscriptRef.current,
        emotion: simEmotion || currentEmotionRef.current
      })
    })
    .then(res => res.json())
    .then(data => {
      setAction(data.action)
    })
    .catch(err => console.error('Sim error:', err))
  }

  const startMonitoring = async () => {
    setTranscriptLog([])
    setSummaryData(null)
    setIsSummarizing(false)
    callTimeRef.current = 0
    deadAirTimeRef.current = 0
    fullTranscriptRef.current = ''
    setCallTime(0)
    setDeadAirTime(0)
    setSentimentHistory([])
    isMonitoringRef.current = true
    setIsMonitoring(true)
    setShowNotification(false)
    setAction('ACOUSTIC LOCK -> Live speech stream online. Analyzing...')

    socketRef.current = new WebSocket('ws://localhost:8000/ws/audio')
    
    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.emotion) {
            const raw = data.emotion
            const parts = raw.split('[')
            const emoName = parts[0].trim()
            const energy = parts[1] ? parts[1].replace(']', '').replace('ENERGY', '').trim() : 'MED'
            setEmotion(emoName)
            setEnergyLevel(energy)
            currentEmotionRef.current = raw
            
            setSentimentHistory(prev => {
              const newHist = [...prev, { score: getEmotionScore(emoName) }]
              return newHist.slice(-30) 
            })

            if (emoName.includes('ANGRY') || emoName.includes('FRUSTRATED')) {
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

        canvasCtx.fillStyle = '#f0f9f9' 
        canvasCtx.fillRect(0, 0, width, height)

        canvasCtx.strokeStyle = '#d4ebeb'
        canvasCtx.lineWidth = 1
        canvasCtx.beginPath()
        canvasCtx.moveTo(0, height / 2)
        canvasCtx.lineTo(width, height / 2)
        canvasCtx.stroke()

        const gradient = canvasCtx.createLinearGradient(0, 0, width, 0)
        gradient.addColorStop(0, '#0c7a7d') 
        gradient.addColorStop(0.5, '#0D7F82') 
        gradient.addColorStop(1, '#14b8a6') 

        canvasCtx.lineWidth = speakingRef.current ? 2.5 : 1.2
        canvasCtx.strokeStyle = speakingRef.current ? gradient : 'rgba(13, 127, 130, 0.4)' 
        canvasCtx.shadowBlur = speakingRef.current ? 6 : 0
        canvasCtx.shadowColor = '#0D7F82' 

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
          
          let currentInterim = ''
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const finalText = event.results[i][0].transcript
              const currentSpkr = activeSpeakerRef.current
              
              setTranscriptLog(prev => [...prev, { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), text: finalText, speaker: currentSpkr }])
              
              if (currentSpkr === 'CUSTOMER') {
                  fullTranscriptRef.current += ' ' + finalText
              }
              
              if (escalations.some(badWord => finalText.toLowerCase().includes(badWord))) {
                 setShowNotification(true)
              }
              
              currentInterim = ''
            } else {
              currentInterim += event.results[i][0].transcript
            }
          }
          setInterimText(currentInterim)

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
                    setAction(data.action)
                })
                .catch(err => console.error('Directive Error:', err))
            }
          }, 1500)
        }

        recognitionRef.current.onend = () => {
          if (isMonitoringRef.current) {
            try { recognitionRef.current.start() } catch { /* auto restart */ }
          }
        }

        recognitionRef.current.start()
      }

    } catch (err) {
      console.error('Hardware initialization failed:', err)
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
      ctx.fillStyle = '#f0f9f9'
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    
    setIsMonitoring(false)
    setIsCustomerSpeaking(false)
    speakingRef.current = false
    setEmotion('OFFLINE')
    setEnergyLevel('N/A')
    setAction('SESSION COMPLETE -> Post-call summary and analytics compiled below.')

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
      .catch(() => { setSummaryData('Error connecting to analytics engine.'); setIsSummarizing(false) })
    }
  }

  const deadAirRatio = callTime > 0 ? Math.round((deadAirTime / callTime) * 100) : 0
  const deadAirStatus = deadAirRatio > 35 
    ? { color: 'text-rose-700 bg-rose-100 border-rose-300', label: 'High Silence', bar: 'bg-rose-500' } 
    : (deadAirRatio > 20 ? { color: 'text-amber-800 bg-amber-100 border-amber-300', label: 'Moderate', bar: 'bg-amber-500' } : { color: 'text-emerald-800 bg-emerald-100 border-emerald-300', label: 'Optimal Flow', bar: 'bg-emerald-500' })

  const emotionColorMap = {
    'NEUTRAL': { badge: 'text-[#0D7F82] border-[#0D7F82]/40 bg-teal-50 shadow-[0_0_10px_rgba(13,127,130,0.15)]', desc: 'Baseline conversational acoustic state' },
    'HAPPY': { badge: 'text-emerald-800 border-emerald-300 bg-emerald-50 shadow-[0_0_10px_rgba(16,185,129,0.2)]', desc: 'Positive & receptive customer sentiment' },
    'CONTENT': { badge: 'text-teal-800 border-teal-300 bg-teal-50 shadow-[0_0_10px_rgba(20,184,166,0.2)]', desc: 'Calm & agreeable vocal state' },
    'ANGRY': { badge: 'text-rose-800 border-rose-300 bg-rose-50 shadow-[0_0_10px_rgba(244,63,94,0.25)]', desc: 'High escalation risk · De-escalate promptly' },
    'FRUSTRATED': { badge: 'text-amber-900 border-amber-300 bg-amber-50 shadow-[0_0_10px_rgba(245,158,11,0.2)]', desc: 'Vocal tension / agitation detected' },
    'SAD': { badge: 'text-blue-800 border-blue-300 bg-blue-50 shadow-[0_0_10px_rgba(59,130,246,0.2)]', desc: 'Low vocal energy / disappointment' },
    'WAITING': { badge: 'text-gray-700 border-gray-300 bg-gray-100', desc: 'Standby for incoming voice stream' },
    'OFFLINE': { badge: 'text-gray-500 border-gray-300 bg-gray-100', desc: 'Audio stream disconnected' }
  }

  const currentEmotionStyle = emotionColorMap[emotion.toUpperCase()] || emotionColorMap['WAITING']

  const generateGraphPath = () => {
    if (sentimentHistory.length === 0) return ''
    const width = 400
    const height = 50
    const step = width / (sentimentHistory.length > 1 ? sentimentHistory.length - 1 : 1)
    
    return sentimentHistory.map((point, index) => {
      const x = index * step
      const y = height - ((point.score + 1) / 2) * height
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  }

  const customerCount = transcriptLog.filter(l => l.speaker === 'CUSTOMER').length
  const agentCount = transcriptLog.filter(l => l.speaker === 'AGENT').length
  const totalCount = customerCount + agentCount
  const customerPercent = totalCount > 0 ? Math.round((customerCount / totalCount) * 100) : 55
  const agentPercent = totalCount > 0 ? 100 - customerPercent : 45

  return (
    <div className='h-screen w-screen max-h-screen overflow-hidden bg-gradient-to-br from-[#b4d8d9] via-[#c6e4e5] to-[#acd2d3] text-gray-800 font-sans flex flex-col justify-between selection:bg-[#0D7F82] selection:text-white'>
      
      {/* Top DrugLens Teal Header */}
      <header className='h-15 shrink-0 bg-gradient-to-r from-[#0c7a7d] via-[#0D7F82] to-[#075558] text-white px-5 py-2.5 shadow-lg border-b border-[#14b8a6]/20 flex justify-between items-center z-40'>
        <div className='flex items-center gap-3'>
          <div className='w-9 h-9 rounded-xl bg-white text-[#0D7F82] font-black text-base flex items-center justify-center shadow-md border border-white/80 shrink-0'>
            M
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-lg font-black tracking-tight text-white'>MANTIS</h1>
              <span className='text-[9px] font-bold tracking-wider uppercase bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30 backdrop-blur-sm'>
                Agent Assist v2.0
              </span>
            </div>
            <p className='text-[11px] text-teal-100/90 font-medium leading-none mt-0.5'>Real-Time Acoustic Telemetry & Contact Center Copilot</p>
          </div>
        </div>

        {/* Status Indicators & Call Action */}
        <div className='flex items-center gap-2.5'>
          <div className='flex items-center gap-1.5 px-3 py-1 bg-black/20 backdrop-blur-md rounded-xl border border-white/20 text-xs text-white font-medium'>
            <span className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-emerald-300 animate-pulse shadow-[0_0_8px_rgba(110,231,183,0.9)]' : 'bg-white/40'}`}></span>
            {isMonitoring ? 'PCM 16kHz' : 'Core Standby'}
          </div>

          <div className='flex items-center gap-1.5 px-3 py-1 bg-black/20 backdrop-blur-md rounded-xl border border-white/20 text-xs text-white font-medium'>
            <span className='w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_6px_rgba(103,232,249,0.8)]'></span>
            HuBERT + LLaMA-3
          </div>

          {isMonitoring ? (
            <button 
              onClick={stopMonitoring} 
              className='px-5 py-1.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md tracking-wider uppercase cursor-pointer'
            >
              End Call
            </button>
          ) : (
            <button 
              onClick={startMonitoring} 
              className='px-6 py-1.5 bg-white text-[#0D7F82] hover:bg-[#F4F9F9] hover:text-[#0c7a7d] text-xs font-extrabold rounded-xl transition-all shadow-lg hover:scale-102 tracking-wider uppercase cursor-pointer flex items-center gap-1.5'
            >
              <span className='w-2 h-2 rounded-full bg-[#0D7F82] animate-ping'></span>
              Start Session
            </button>
          )}
        </div>
      </header>

      {/* Floating Escalation Banner (Absolute Toast) */}
      {showNotification && (
        <div className='absolute top-18 right-6 z-50 bg-rose-50 border-2 border-rose-300 text-rose-900 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 animate-slide-in'>
          <span className='w-6 h-6 rounded-full bg-rose-600 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-sm'>!</span>
          <div className='text-xs font-bold leading-tight'>
            Escalation Trigger: Critical negative sentiment or risk term detected.
          </div>
          <button onClick={() => setShowNotification(false)} className='text-rose-700 hover:text-rose-950 font-bold text-xs px-2 py-0.5 bg-rose-100 rounded-lg hover:bg-rose-200 transition-colors cursor-pointer ml-2'>
            ✕
          </button>
        </div>
      )}

      {/* Workspace Main Area - Fits exactly in remaining viewport */}
      <main className='flex-1 min-h-0 p-3.5 grid grid-cols-1 lg:grid-cols-12 gap-3.5 overflow-hidden'>
        
        {/* Left 7 Columns: Live Speech Diarization Feed */}
        <section className='lg:col-span-7 h-full bg-white/95 backdrop-blur-md border border-teal-900/15 rounded-3xl flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)]'>
          
          <div className='h-12 shrink-0 bg-gradient-to-r from-[#F4F9F9] to-[#EAF5F5] border-b border-teal-900/10 px-5 py-2.5 flex justify-between items-center'>
            <div className='flex items-center gap-2'>
               <div className='w-2.5 h-2.5 rounded-full bg-[#0D7F82] shadow-[0_0_6px_rgba(13,127,130,0.6)]'></div>
               <h2 className='text-xs font-black uppercase tracking-wider text-gray-800'>Live Speech Transcription</h2>
            </div>
            <div className='flex items-center gap-2.5'>
              <span className='text-[10px] font-semibold text-gray-600 bg-white border border-gray-200 px-2.5 py-0.5 rounded-lg shadow-2xs'>
                Hold [Shift] to speak as Agent
              </span>
              {isCustomerSpeaking && (
                <span className={`text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${activeSpeaker === 'AGENT' ? 'text-[#0D7F82]' : 'text-blue-600'}`}>
                  <span className={`w-2 h-2 rounded-full animate-pulse ${activeSpeaker === 'AGENT' ? 'bg-[#0D7F82]' : 'bg-blue-500'}`}></span> 
                  {activeSpeaker}
                </span>
              )}
            </div>
          </div>

          {/* Conversation Transcript Stream (Scrolls internally only) */}
          <div className='flex-1 min-h-0 p-4 overflow-y-auto space-y-3.5 custom-scrollbar bg-gradient-to-b from-white via-white to-[#fafdfd]'>
            {transcriptLog.length === 0 && !interimText && (
              <div className='h-full flex flex-col items-center justify-center text-center py-6 px-4'>
                <div className='w-12 h-12 rounded-2xl bg-gradient-to-br from-[#EAF5F5] to-[#d2ecec] flex items-center justify-center text-[#0D7F82] mb-3 shadow-2xs border border-[#0D7F82]/20'>
                  <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z'/>
                    <path d='M19 10v2a7 7 0 0 1-14 0v-2'/>
                    <line x1='12' x2='12' y1='19' y2='22'/>
                  </svg>
                </div>
                <h3 className='text-sm font-bold text-gray-800'>Awaiting Conversation Audio</h3>
                <p className='text-xs text-gray-500 max-w-xs mt-0.5 mb-4'>
                  Click "Start Session" to connect your microphone or test with a sample below:
                </p>

                {/* Quick Simulation Bar */}
                <div className='w-full max-w-sm bg-gradient-to-br from-[#F4F9F9] to-[#EAF5F5] border border-teal-900/15 p-3 rounded-2xl shadow-2xs'>
                  <div className='grid grid-cols-2 gap-2'>
                    <button
                      onClick={() => simulateDemoMessage('CUSTOMER', 'I have been waiting for my refund for three weeks and this is unacceptable!', 'Angry')}
                      className='px-2.5 py-2 bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-300 text-rose-800 text-xs font-bold rounded-xl transition-all shadow-2xs text-left cursor-pointer flex items-center gap-1.5'
                    >
                      <span className='w-1.5 h-1.5 rounded-full bg-rose-500'></span>
                      Angry Caller
                    </button>
                    <button
                      onClick={() => simulateDemoMessage('CUSTOMER', 'Hi, I would like to check the details of my premium subscription plan.', 'Happy')}
                      className='px-2.5 py-2 bg-white hover:bg-teal-50 border border-teal-200 hover:border-teal-300 text-[#0D7F82] text-xs font-bold rounded-xl transition-all shadow-2xs text-left cursor-pointer flex items-center gap-1.5'
                    >
                      <span className='w-1.5 h-1.5 rounded-full bg-[#0D7F82]'></span>
                      Inquiry Caller
                    </button>
                  </div>
                </div>
              </div>
            )}

            {transcriptLog.map((log, i) => (
              <div key={i} className={`flex flex-col max-w-[85%] ${log.speaker === 'AGENT' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                <div className='flex items-center gap-1.5 mb-1 px-1'>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full ${log.speaker === 'AGENT' ? 'text-white bg-[#0D7F82]' : 'text-blue-700 bg-blue-100 border border-blue-200'}`}>
                    {log.speaker === 'AGENT' ? 'Agent (You)' : 'Customer'}
                  </span>
                  <span className='text-[9px] text-gray-400 font-mono'>{log.time}</span>
                </div>
                <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                  log.speaker === 'AGENT' 
                    ? 'bg-gradient-to-r from-[#0c7a7d] to-[#0D7F82] text-white rounded-tr-xs border border-teal-700/40' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-xs'
                }`}>
                   <span>{highlightText(log.text)}</span>
                </div>
              </div>
            ))}

            {interimText && (
              <div className={`flex flex-col max-w-[85%] opacity-70 ${activeSpeaker === 'AGENT' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                <div className='flex items-center gap-1.5 mb-1 px-1'>
                  <span className='text-[9px] font-bold text-gray-400 uppercase'>{activeSpeaker}</span>
                </div>
                <div className={`px-4 py-2.5 rounded-2xl text-xs italic ${
                  activeSpeaker === 'AGENT' 
                    ? 'bg-[#0D7F82]/20 text-[#075558] rounded-tr-xs border border-[#0D7F82]/30' 
                    : 'bg-gray-100 text-gray-600 rounded-tl-xs border border-gray-200'
                }`}>
                   <span>{interimText}</span>
                </div>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </section>

        {/* Right 5 Columns: AI Copilot & Voice Intelligence Suite */}
        <section className='lg:col-span-5 h-full flex flex-col gap-3 min-h-0 overflow-hidden'>
          
          {/* Card 1: Acoustic Emotion & Audio Waveform */}
          <div className='shrink-0 bg-white/95 backdrop-blur-md border border-teal-900/15 rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col justify-between'>
             <div className='flex justify-between items-center mb-2'>
               <div>
                 <h2 className='text-xs font-black uppercase tracking-wider text-gray-800'>Acoustic Emotion Telemetry</h2>
                 <p className='text-[10px] text-gray-500 font-medium'>HuBERT Neural Vocal Classifier</p>
               </div>
               <button 
                  onClick={() => setShowGraph(!showGraph)} 
                  className='text-[#0D7F82] hover:text-[#075558] text-[10px] font-bold bg-[#EAF5F5] hover:bg-[#d5eded] border border-[#0D7F82]/20 px-2.5 py-0.5 rounded-lg cursor-pointer transition-all shadow-2xs'
                  title='Toggle Waveform / Sentiment Graph'>
                  {showGraph ? 'Oscilloscope' : 'Sentiment Trend'}
               </button>
             </div>

             {/* Emotion & Vocal Metrics Dashboard */}
             <div className='grid grid-cols-2 gap-2 my-1.5'>
               <div className='bg-gradient-to-br from-[#F4F9F9] to-[#EAF5F5] border border-teal-900/15 p-2.5 rounded-2xl flex flex-col justify-between shadow-2xs'>
                 <span className='text-[9px] font-black uppercase tracking-wider text-teal-900/70'>Inferred Emotion</span>
                 <div className='mt-1'>
                   <span className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-black uppercase tracking-wide inline-block ${currentEmotionStyle.badge}`}>
                     {emotion}
                   </span>
                 </div>
                 <span className='text-[9px] text-gray-500 font-medium mt-1 leading-tight line-clamp-1'>{currentEmotionStyle.desc}</span>
               </div>

               <div className='bg-gradient-to-br from-[#F4F9F9] to-[#EAF5F5] border border-teal-900/15 p-2.5 rounded-2xl flex flex-col justify-between shadow-2xs'>
                 <span className='text-[9px] font-black uppercase tracking-wider text-teal-900/70'>Vocal Intensity / RMS</span>
                 <div className='flex items-center justify-between mt-1'>
                   <span className='text-[11px] font-black text-gray-800 uppercase'>{energyLevel} Vol</span>
                   <div className='flex gap-1 items-end h-4'>
                     <span className={`w-1.5 rounded-xs transition-all ${energyLevel === 'HIGH' || energyLevel === 'MEDIUM' || energyLevel === 'LOW' ? 'bg-[#0D7F82] h-2' : 'bg-gray-300 h-1'}`}></span>
                     <span className={`w-1.5 rounded-xs transition-all ${energyLevel === 'HIGH' || energyLevel === 'MEDIUM' ? 'bg-[#0D7F82] h-3' : 'bg-gray-300 h-1'}`}></span>
                     <span className={`w-1.5 rounded-xs transition-all ${energyLevel === 'HIGH' ? 'bg-[#0D7F82] h-4' : 'bg-gray-300 h-1'}`}></span>
                   </div>
                 </div>
                 <span className='text-[9px] text-gray-500 font-medium mt-1'>Microphone Energy</span>
               </div>
             </div>
             
             {/* Waveform / Curve Frame */}
             <div className='w-full h-13 bg-[#f0f9f9] rounded-2xl border border-teal-200/80 overflow-hidden relative mt-1 shadow-inner'>
               <canvas 
                 ref={canvasRef} 
                 width='400' 
                 height='52' 
                 className={`w-full h-full absolute inset-0 transition-opacity duration-300 ${showGraph ? 'opacity-0' : 'opacity-100'}`}
               ></canvas>
               
               <svg 
                 width='100%' 
                 height='100%' 
                 className={`absolute inset-0 transition-opacity duration-300 ${showGraph ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                 viewBox='0 0 400 50' 
                 preserveAspectRatio='none'
               >
                  <line x1='0' y1='12' x2='400' y2='12' stroke='#c8e4e4' strokeWidth='1' strokeDasharray='3' />
                  <line x1='0' y1='25' x2='400' y2='25' stroke='#b0dcdd' strokeWidth='1' />
                  <line x1='0' y1='37' x2='400' y2='37' stroke='#c8e4e4' strokeWidth='1' strokeDasharray='3' />
                  <path d={generateGraphPath()} fill='none' stroke='#0D7F82' strokeWidth='2.5' strokeLinejoin='round' strokeLinecap='round' />
               </svg>
             </div>
          </div>

          {/* Card 2: Call Analytics KPIs */}
          <div className='shrink-0 bg-white/95 backdrop-blur-md border border-teal-900/15 rounded-3xl p-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col gap-2'>
             <div className='flex justify-between items-center'>
               <h2 className='text-xs font-black uppercase tracking-wider text-gray-800'>Performance KPIs</h2>
               <span className='text-[9px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200'>
                 Live Diagnostics
               </span>
             </div>

             <div className='grid grid-cols-2 gap-2.5'>
               <div className='bg-gradient-to-br from-[#F4F9F9] to-[#EAF5F5] border border-teal-900/15 p-2.5 rounded-2xl flex flex-col justify-between shadow-2xs'>
                  <div className='flex items-center justify-between mb-0.5'>
                    <span className='text-[9px] font-black uppercase tracking-wider text-teal-900/70'>Call Duration</span>
                    <span className='w-2 h-2 rounded-full bg-emerald-500 animate-ping'></span>
                  </div>
                  <span className='text-xl font-black text-gray-800 font-mono tracking-tight'>{formatTime(callTime)}</span>
               </div>

               <div className='bg-gradient-to-br from-[#F4F9F9] to-[#EAF5F5] border border-teal-900/15 p-2.5 rounded-2xl flex flex-col justify-between shadow-2xs'>
                  <div className='flex justify-between items-center mb-0.5'>
                    <span className='text-[9px] font-black uppercase tracking-wider text-teal-900/70'>Silence Ratio</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full border ${deadAirStatus.color}`}>{deadAirStatus.label}</span>
                  </div>
                  <div className='flex items-baseline gap-1'>
                     <span className='text-xl font-black font-mono text-gray-800'>{deadAirRatio}%</span>
                     <span className='text-[10px] text-gray-500 font-mono'>({formatTime(deadAirTime)})</span>
                  </div>
               </div>
             </div>

             {/* Conversational Balance Split Bar */}
             <div className='bg-[#F4F9F9] border border-teal-900/10 p-2 rounded-xl'>
               <div className='flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1'>
                 <span className='text-blue-700'>Customer ({customerPercent}%)</span>
                 <span className='text-[#0D7F82]'>Agent ({agentPercent}%)</span>
               </div>
               <div className='w-full h-1.5 bg-gray-200 rounded-full overflow-hidden flex'>
                 <div style={{ width: `${customerPercent}%` }} className='bg-blue-500 h-full transition-all duration-300'></div>
                 <div style={{ width: `${agentPercent}%` }} className='bg-[#0D7F82] h-full transition-all duration-300'></div>
               </div>
             </div>
          </div>

          {/* Card 3: Real-Time Tactical AI Copilot Directives (Takes remaining height cleanly) */}
          <div className='flex-1 min-h-0 bg-white/95 backdrop-blur-md border border-teal-900/15 rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col justify-between overflow-hidden'>
             <div className='shrink-0'>
               <div className='flex items-center justify-between mb-1'>
                 <h2 className='text-xs font-black uppercase tracking-wider text-gray-800'>
                   {!isMonitoring && (isSummarizing || summaryData) ? 'Post-Call Summary & Analytics' : 'Tactical AI Directive'}
                 </h2>
                 <span className='text-[9px] font-black text-[#0D7F82] bg-teal-50 px-2 py-0.5 rounded-md border border-[#0D7F82]/30 shadow-2xs'>
                   LLaMA-3
                 </span>
               </div>
               <p className='text-[10px] text-gray-500 mb-2 font-medium'>Context-aware de-escalation guidance & suggested phrasing</p>
             </div>
             
             <div className='flex-1 min-h-0 flex flex-col justify-center my-1 overflow-y-auto custom-scrollbar'>
                {!isMonitoring && isSummarizing ? (
                   <div className='flex flex-col items-center justify-center gap-1.5 py-4'>
                      <div className='w-6 h-6 border-2 border-[#0D7F82] border-t-transparent rounded-full animate-spin'></div>
                      <p className='text-[#0D7F82] font-bold text-xs'>Compiling post-call report...</p>
                   </div>
                ) : !isMonitoring && summaryData ? (
                   <div className='text-gray-800 text-xs whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-32 pr-2 custom-scrollbar bg-gradient-to-br from-[#F4F9F9] to-[#EAF5F5] p-3 rounded-xl border border-teal-900/15 font-mono shadow-inner'>
                      {summaryData}
                   </div>
                ) : action.includes('->') ? (
                  <div className='bg-gradient-to-br from-[#EAF5F5] via-[#f0f9f9] to-[#d8ecec] border-2 border-[#0D7F82]/30 p-3 rounded-2xl flex flex-col justify-between gap-2 shadow-2xs'>
                    <div>
                      <div className='flex items-center gap-1.5 mb-1'>
                        <span className='w-1.5 h-1.5 rounded-full bg-[#0D7F82]'></span>
                        <span className='text-[9px] font-black uppercase tracking-wider text-[#0D7F82]'>
                          {action.split('->')[0].trim()}
                        </span>
                      </div>
                      <p className='text-xs font-bold text-gray-900 leading-snug'>
                        {action.split('->')[1].trim()}
                      </p>
                    </div>

                    <div className='flex justify-between items-center pt-1.5 border-t border-[#0D7F82]/20'>
                      <span className='text-[10px] text-[#0D7F82] font-semibold'>Recommended Response</span>
                      <button
                        onClick={() => handleCopyScript(action.split('->')[1].trim())}
                        className='text-[10px] font-bold text-white bg-gradient-to-r from-[#0c7a7d] to-[#0D7F82] hover:opacity-95 px-3 py-1 rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1'
                      >
                        {copied ? '✓ Copied' : 'Copy Phrasing'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className='bg-gradient-to-br from-[#F4F9F9] to-[#EAF5F5] border border-teal-900/15 p-3 rounded-2xl text-xs text-gray-700 leading-relaxed font-semibold'>
                    {action}
                  </div>
                )}
             </div>

             <div className='shrink-0 pt-2 border-t border-teal-900/10 flex justify-between items-center text-[10px] text-gray-500 font-medium'>
               <span>Automated tactical evaluation</span>
             </div>
          </div>

        </section>
      </main>

      {/* Clean Compact Slate-Teal Footer */}
      <footer className='h-8 shrink-0 bg-[#a2cbcc]/70 backdrop-blur-md border-t border-[#8fbdbd] px-5 py-1.5 flex justify-between items-center text-[11px] text-[#075558]'>
        <span className='font-bold'>Mantis AI Copilot v2.0 • Real-Time Voice Intelligence</span>
        <span className='font-semibold'>Secure Local HuBERT ML & Cloud LLM Core</span>
      </footer>

    </div>
  )
}

export default App
