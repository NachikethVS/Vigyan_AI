import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, TranscriptEntry, VoiceConversation } from '../types';
import BackButton from './BackButton';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { AIVoiceAssistantIcon } from './icons';
import { useAppContext } from '../context/AppContext';
import { saveVoiceConversationToDB, getVoiceConversationsFromDB, deleteVoiceConversationFromDB } from '../services/storageService';

// Helper functions for audio encoding/decoding as per Gemini docs
function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

type AssistantState = 'idle' | 'listening' | 'speaking' | 'thinking' | 'error';
type ViewMode = 'live' | 'history' | 'replay';
type Personality = 'Friendly' | 'Formal' | 'Concise';

const PERSONALITY_PROMPTS: Record<Personality, string> = {
    Friendly: 'You are a friendly and helpful AI assistant. Keep your responses conversational and encouraging.',
    Formal: 'You are a formal and professional AI assistant. Use clear, precise language and maintain a professional tone.',
    Concise: 'You are a direct and to-the-point AI assistant. Keep your responses as brief and concise as possible.',
};


const AIVoiceAssistant: React.FC<{ setView: (view: View) => void }> = ({ setView }) => {
    const { currentUser } = useAppContext();
    const [viewMode, setViewMode] = useState<ViewMode>('live');
    const [assistantState, setAssistantState] = useState<AssistantState>('idle');
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [savedConversations, setSavedConversations] = useState<VoiceConversation[]>([]);
    const [replayingConversation, setReplayingConversation] = useState<VoiceConversation | null>(null);
    const [personality, setPersonality] = useState<Personality>('Friendly');
    const [error, setError] = useState('');

    const aiRef = useRef<GoogleGenAI | null>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const apiKey = localStorage.getItem('geminiApiKey');
        if (apiKey) {
            aiRef.current = new GoogleGenAI({ apiKey });
        } else {
            setError('Gemini API key is missing. Please set it in the app settings.');
        }
        loadHistory();
    }, []);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [transcript, replayingConversation]);

    const loadHistory = async () => {
        if (!currentUser) return;
        const convos = await getVoiceConversationsFromDB(currentUser);
        setSavedConversations(convos);
    };

    const cleanup = useCallback((session?: any) => {
        if (session) {
            try { session.close(); } catch (e) { console.error("Error closing session:", e); }
        }
        streamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close().catch(console.error);
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close().catch(console.error);
        }
        
        sourcesRef.current.forEach(source => { try { source.stop(); } catch (e) { console.error("Error stopping source:", e); }});
        sourcesRef.current.clear();
        
        sessionPromiseRef.current = null;
        streamRef.current = null;
        scriptProcessorRef.current = null;
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        nextStartTimeRef.current = 0;
    }, []);
    
    useEffect(() => {
        return () => {
            if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => cleanup(session)).catch(console.error);
            } else {
                cleanup();
            }
        };
    }, [cleanup]);

    const stopSession = async () => {
        if (sessionPromiseRef.current) {
            await sessionPromiseRef.current.then(session => cleanup(session)).catch(console.error);
        } else {
            cleanup();
        }

        if (transcript.length > 1 && currentUser) {
            const newConversation: VoiceConversation = {
                id: new Date().toISOString(),
                timestamp: Date.now(),
                transcript,
                personality,
                username: currentUser
            };
            await saveVoiceConversationToDB(newConversation);
            loadHistory();
        }
        setTranscript([]);
        setAssistantState('idle');
    };

    const startSession = async () => {
        if (!aiRef.current || assistantState !== 'idle') return;
        setAssistantState('listening');
        setError('');
        setTranscript([]);
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            // Resume audio contexts if they are in a suspended state (required by modern browsers)
            if (inputAudioContextRef.current.state === 'suspended') {
                await inputAudioContextRef.current.resume();
            }
            if (outputAudioContextRef.current.state === 'suspended') {
                await outputAudioContextRef.current.resume();
            }

            sessionPromiseRef.current = aiRef.current.live.connect({
                model: 'gemini-2.0-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        if (!streamRef.current || !inputAudioContextRef.current) return;
                        const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
                        const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.outputTranscription) {
                            const text = message.serverContent.outputTranscription.text;
                            currentOutputTranscriptionRef.current += text;
                            setTranscript(prev => {
                                const last = prev[prev.length - 1];
                                if (last?.speaker === 'ai') {
                                    return [...prev.slice(0, -1), { speaker: 'ai', text: currentOutputTranscriptionRef.current }];
                                }
                                return [...prev, { speaker: 'ai', text: currentOutputTranscriptionRef.current }];
                            });
                            setAssistantState('speaking');
                        } else if (message.serverContent?.inputTranscription) {
                            const text = message.serverContent.inputTranscription.text;
                            currentInputTranscriptionRef.current += text;
                            setTranscript(prev => {
                                const last = prev[prev.length - 1];
                                if (last?.speaker === 'user') {
                                    return [...prev.slice(0, -1), { speaker: 'user', text: currentInputTranscriptionRef.current }];
                                }
                                return [...prev, { speaker: 'user', text: currentInputTranscriptionRef.current }];
                            });
                             setAssistantState('thinking');
                        }
                        
                        if (message.serverContent?.turnComplete) {
                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                            setAssistantState('listening');
                        }
                        
                        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64EncodedAudioString && outputAudioContextRef.current) {
                            const ctx = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), ctx, 24000, 1);
                            const source = ctx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(ctx.destination);
                            source.addEventListener('ended', () => { sourcesRef.current.delete(source); });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error("Session error:", e);
                        setError(`An error occurred: ${e.message}. Please try again.`);
                        setAssistantState('error');
                        stopSession();
                    },
                    onclose: (e: CloseEvent) => {
                        console.debug('Session closed');
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    systemInstruction: PERSONALITY_PROMPTS[personality],
                },
            });

        } catch (err) {
            console.error("Media device error:", err);
            setError('Could not access microphone. Please grant permission and try again.');
            setAssistantState('error');
            cleanup();
        }
    };
    
    const handleMicClick = () => {
        if (assistantState === 'idle' || assistantState === 'error') {
            startSession();
        } else {
            stopSession();
        }
    };

    const handleDeleteConversation = async (id: string) => {
        if (!currentUser || !window.confirm("Are you sure you want to delete this conversation?")) return;
        await deleteVoiceConversationFromDB(id);
        loadHistory();
    };
    
    const renderLiveView = () => {
        const stateInfo: Record<AssistantState, { text: string; color: string; animation: string; extraClasses: string; }> = {
            idle: { text: "Tap to start conversation", color: "bg-primary", animation: "", extraClasses: "" },
            listening: { text: "Listening...", color: "bg-sky-500", animation: "animate-listening-pulse", extraClasses: "" },
            speaking: { text: "Speaking...", color: "bg-emerald-500", animation: "animate-speaking-waves", extraClasses: "" },
            thinking: { text: "Thinking...", color: "bg-gradient-to-r from-amber-400 via-amber-200 to-amber-400", animation: "animate-thinking-shimmer", extraClasses: "bg-[length:200%_auto]" },
            error: { text: "Error. Tap to reset.", color: "bg-red-500", animation: "animate-error-shake", extraClasses: "" },
        };
        return (
            <div className="flex-grow bg-surface rounded-xl shadow-lg flex flex-col p-4 overflow-hidden">
                <div className="flex-shrink-0 mb-4">
                    <label htmlFor="personality" className="text-sm font-medium text-text-secondary mr-2">AI Personality:</label>
                    <select id="personality" value={personality} onChange={e => setPersonality(e.target.value as Personality)} disabled={assistantState !== 'idle'} className="bg-background border border-border rounded-md px-2 py-1 text-sm focus:ring-primary focus:border-primary">
                        <option>Friendly</option>
                        <option>Formal</option>
                        <option>Concise</option>
                    </select>
                </div>

                <div className="flex-grow overflow-y-auto mb-4 pr-2 space-y-4">
                    {transcript.length === 0 && assistantState !== 'error' && (
                        <div className="flex items-center justify-center h-full text-text-secondary">
                            <p>Your conversation will appear here.</p>
                        </div>
                    )}
                    {transcript.map((entry, index) => (
                        <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl animate-fade-in ${entry.speaker === 'user' ? 'bg-primary text-white' : 'bg-background'}`}>
                                {entry.text}
                            </div>
                        </div>
                    ))}
                    <div ref={transcriptEndRef}></div>
                </div>
                
                {error && <p className="text-red-500 text-center mb-4 text-sm">{error}</p>}

                <div className="flex-shrink-0 flex flex-col items-center justify-center py-4">
                    <button 
                        onClick={handleMicClick} 
                        className={`w-24 h-24 rounded-full flex items-center justify-center text-white transition-colors duration-300 ${stateInfo[assistantState].color} ${stateInfo[assistantState].animation} ${stateInfo[assistantState].extraClasses}`}
                        aria-label={assistantState === 'idle' || assistantState === 'error' ? 'Start voice assistant' : 'Stop voice assistant'}>
                        <AIVoiceAssistantIcon className="w-12 h-12" />
                    </button>
                    <p className="text-text-secondary mt-4 text-sm font-semibold" aria-live="polite">{stateInfo[assistantState].text}</p>
                </div>
            </div>
        );
    };

    const renderHistoryView = () => (
        <div className="bg-surface rounded-xl shadow-lg p-4 flex-grow overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-primary">Conversation History</h2>
            {savedConversations.length === 0 ? (
                <p className="text-text-secondary">No saved conversations yet.</p>
            ) : (
                <div className="space-y-3">
                    {savedConversations.map(convo => (
                        <div key={convo.id} className="bg-background p-3 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{new Date(convo.timestamp).toLocaleString()}</p>
                                <p className="text-sm text-text-secondary italic">"{convo.transcript[0]?.text.substring(0, 40)}..." ({convo.personality})</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setReplayingConversation(convo); setViewMode('replay'); }} className="text-sm bg-primary/20 text-primary px-3 py-1 rounded-md hover:bg-primary/40">Replay</button>
                                <button onClick={() => handleDeleteConversation(convo.id)} className="text-sm bg-red-500/20 text-red-400 px-3 py-1 rounded-md hover:bg-red-500/40">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
    
    const renderReplayView = () => {
        if (!replayingConversation) return null;
        return (
            <div className="bg-surface rounded-xl shadow-lg p-4 flex flex-col flex-grow overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-primary">Conversation Replay</h2>
                        <p className="text-sm text-text-secondary">{new Date(replayingConversation.timestamp).toLocaleString()} ({replayingConversation.personality})</p>
                    </div>
                    <button onClick={() => setViewMode('history')} className="text-sm bg-border px-3 py-1 rounded-md hover:bg-slate-600">Back to History</button>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {replayingConversation.transcript.map((entry, index) => (
                        <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl ${entry.speaker === 'user' ? 'bg-primary text-white' : 'bg-background'}`}>
                                {entry.text}
                            </div>
                        </div>
                    ))}
                    <div ref={transcriptEndRef}></div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <BackButton setView={setView} />
            <div className="text-center flex-shrink-0">
                <h1 className="text-3xl font-bold mb-2">AI Voice Assistant</h1>
                <p className="text-text-secondary mb-4">Have a real-time conversation or review past chats.</p>
                <div className="flex justify-center bg-background rounded-full p-1 text-sm max-w-xs mx-auto mb-4">
                    <button onClick={() => setViewMode('live')} className={`w-1/2 px-3 py-1 rounded-full transition-colors ${viewMode === 'live' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-border'}`}>Live</button>
                    <button onClick={() => setViewMode('history')} className={`w-1/2 px-3 py-1 rounded-full transition-colors ${viewMode === 'history' || viewMode === 'replay' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-border'}`}>History</button>
                </div>
            </div>
            
            {viewMode === 'live' && renderLiveView()}
            {viewMode === 'history' && renderHistoryView()}
            {viewMode === 'replay' && renderReplayView()}
        </div>
    );
};

export default AIVoiceAssistant;