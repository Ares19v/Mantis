let socket;
let audioContext;
let processor;
let input;
let globalStream;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const emotionDisplay = document.getElementById('emotion-display');
const actionDisplay = document.getElementById('action-display');

startBtn.onclick = async () => {
    // Connect to Terminal 1 (Backend)
    socket = new WebSocket('ws://localhost:8000/ws/audio');
    
    socket.onopen = () => {
        console.log("Mantis Connected to AI Backend");
        startBtn.disabled = true;
        stopBtn.disabled = false;
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        emotionDisplay.innerText = data.emotion;
        actionDisplay.innerText = data.status;
        actionDisplay.style.color = data.status === "ALERT" ? "#ef4444" : "#22c55e";
    };

    globalStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new AudioContext({ sampleRate: 16000 });
    input = audioContext.createMediaStreamSource(globalStream);
    processor = audioContext.createScriptProcessor(4096, 1, 1);

    input.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
        if (socket.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
            }
            socket.send(pcmData.buffer);
        }
    };
};

stopBtn.onclick = () => {
    if (globalStream) globalStream.getTracks().forEach(t => t.stop());
    if (socket) socket.close();
    startBtn.disabled = false;
    stopBtn.disabled = true;
};
