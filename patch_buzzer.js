const fs = require('fs');
let content = fs.readFileSync('src/app/games/[id]/live/page.tsx', 'utf8');

const buzzerFunction = `
    const buzzerPlayedRef = useRef(false);

    const playBuzzer = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const audioCtx = new AudioContext();
            
            const gainNode = audioCtx.createGain();
            gainNode.connect(audioCtx.destination);
            
            // Hard attack, sustain 1.2s, hard release
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime + 1.2);
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
            
            // Dissonant low frequencies for the classic NBA horn
            const freqs = [150, 154, 200, 204];
            freqs.forEach(freq => {
                const osc = audioCtx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.value = freq;
                osc.connect(gainNode);
                osc.start();
                osc.stop(audioCtx.currentTime + 1.5);
            });
        } catch (e) {
            console.error("Audio playback failed", e);
        }
    };

    useEffect(() => {
        if (timeRemaining === 0 && game?.timer_status === 'running' && !buzzerPlayedRef.current) {
            buzzerPlayedRef.current = true;
            playBuzzer();
        } else if (timeRemaining > 0) {
            buzzerPlayedRef.current = false;
        }
    }, [timeRemaining, game?.timer_status]);
`;

// Insert the buzzer logic inside LiveProjectorPage, right after timeRemaining state
content = content.replace(
    "const [timeRemaining, setTimeRemaining] = useState<number>(0);",
    "const [timeRemaining, setTimeRemaining] = useState<number>(0);\n" + buzzerFunction
);

fs.writeFileSync('src/app/games/[id]/live/page.tsx', content);
console.log("Success");
