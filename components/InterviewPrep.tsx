
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { createInterviewChat, generateInterviewReport, generateInterviewQuestions } from '../services/geminiService';
import { SendIcon } from './icons';
import Spinner from './Spinner';
import type { Chat } from '@google/genai';
import { Message, InterviewReport, View, InterviewQuestion } from '../types';
import BackButton from './BackButton';

// --- Constants ---
const commonJobRoles = [
    'Software Engineer',
    'Product Manager',
    'Data Analyst',
    'UI/UX Designer',
    'Frontend Developer',
    'Backend Developer',
    'Full-Stack Developer',
    'Data Scientist',
    'DevOps Engineer',
    'Cybersecurity Analyst',
    'Marketing Manager',
];
const questionTypes = ['Behavioral', 'Technical', 'Situational', 'Case Study'];
const difficulties = ['Entry-level', 'Mid-level', 'Senior'];
const inputClasses = "w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition";

// --- Sub-components for Tabs ---

const MockInterviewTab: React.FC<{ jobRole: string }> = ({ jobRole }) => {
    const [interviewState, setInterviewState] = useState<'idle' | 'running' | 'report'>('idle');
    const [messages, setMessages] = useState<Message[]>([]);
    const [report, setReport] = useState<InterviewReport | null>(null);
    const [userInput, setUserInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const startInterview = async () => {
        setLoading(true);
        setError('');
        setReport(null);
        setMessages([]);
        try {
            chatRef.current = createInterviewChat(jobRole);
            setInterviewState('running');
            setMessages([{ sender: 'ai', text: '' }]);
            const stream = await chatRef.current.sendMessageStream({ message: "Start the interview." });
            let accumulatedText = '';
            for await (const chunk of stream) {
                if (chunk.text) {
                    accumulatedText += chunk.text;
                    setMessages([{ sender: 'ai', text: accumulatedText }]);
                }
            }
        } catch (err) {
            setError('Failed to start interview. Please try again.');
            setInterviewState('idle');
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!userInput.trim() || !chatRef.current || loading) return;
        const userMessage: Message = { sender: 'user', text: userInput };
        setMessages(prev => [...prev, userMessage, { sender: 'ai', text: '' }]);
        setUserInput('');
        setLoading(true);
        try {
            const stream = await chatRef.current.sendMessageStream({ message: userMessage.text });
            let accumulatedText = '';
            for await (const chunk of stream) {
                if (chunk.text) {
                    accumulatedText += chunk.text;
                    setMessages(prev => {
                        const updated = [...prev];
                        updated[updated.length - 1] = { sender: 'ai', text: accumulatedText };
                        return updated;
                    });
                }
            }
        } catch (err) {
            setError('Failed to get response. Please try again.');
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setLoading(false);
        }
    };
    
    const handleEndInterview = async () => {
        setLoading(true);
        setError('');
        try {
            const reportData = await generateInterviewReport(messages, jobRole);
            setReport(reportData);
            setInterviewState('report');
        } catch (err) {
            setError('Failed to generate interview report.');
        } finally {
            setLoading(false);
        }
    };

    if (interviewState === 'idle') {
        return (
            <div className="text-center p-8">
                <h3 className="text-xl font-bold mb-2">Ready to Practice?</h3>
                <p className="text-text-secondary mb-6">Start a simulated interview with an AI hiring manager.</p>
                <button onClick={startInterview} disabled={loading} className="bg-primary text-white font-bold py-3 px-8 rounded-lg hover:bg-primary-focus transition disabled:bg-gray-500">
                    {loading ? <Spinner /> : 'Start Mock Interview'}
                </button>
                {error && <p className="text-red-500 text-center mt-4">{error}</p>}
            </div>
        );
    }
    
    if (interviewState === 'report' && report) {
        const scoreColor = (s: number) => s >= 75 ? 'text-green-400' : s >= 50 ? 'text-yellow-400' : 'text-red-400';
        const ringColor = (s: number) => s >= 75 ? 'stroke-green-400' : s >= 50 ? 'stroke-yellow-400' : 'stroke-red-400';
        return (
            <div className="animate-fade-in p-4">
                <h3 className="text-2xl font-bold mb-4 text-center">Interview Report</h3>
                 <div className="flex flex-col items-center justify-center mb-6">
                    <div className="relative w-32 h-32">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle className="stroke-current text-border" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
                            <circle className={`stroke-current ${ringColor(report.overallScore)}`} strokeWidth="8" cx="50" cy="50" r="40" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - report.overallScore / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-out' }} transform="rotate(-90 50 50)"></circle>
                            <text className={`text-2xl font-bold ${scoreColor(report.overallScore)}`} x="50" y="50" dy="0.3em" textAnchor="middle">{report.overallScore}%</text>
                        </svg>
                    </div>
                    <p className="text-text-secondary text-center mt-4 max-w-2xl">{report.summary}</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-bold text-xl text-green-400 mb-3">Strengths</h4>
                        {report.strengths.map((item, i) => <div key={i} className="bg-background p-3 rounded-lg mb-2"><h5 className="font-semibold">{item.area}</h5><p className="text-sm text-text-secondary">{item.feedback}</p></div>)}
                    </div>
                    <div>
                        <h4 className="font-bold text-xl text-yellow-400 mb-3">Areas for Improvement</h4>
                        {report.areasForImprovement.map((item, i) => <div key={i} className="bg-background p-3 rounded-lg mb-2"><h5 className="font-semibold">{item.area}</h5><p className="text-sm text-text-secondary">{item.feedback}</p><div className="mt-1 bg-yellow-500/10 p-2 rounded-md text-sm text-yellow-300"><span className="font-semibold">Suggestion:</span> {item.suggestion}</div></div>)}
                    </div>
                </div>
                <div className="mt-6 text-center">
                    <button onClick={() => setInterviewState('idle')} className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-focus transition">Practice Again</button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-1 sm:p-4">
            <div className="h-[50vh] overflow-y-auto mb-4 p-4 space-y-4 bg-background rounded-lg">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex items-end ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-primary text-white rounded-br-lg' : 'bg-border text-text-primary rounded-bl-lg'}`}><p style={{ whiteSpace: 'pre-wrap' }}>{msg.text || '...'}</p></div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="flex items-center space-x-2">
                <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type your answer..." className="flex-1 p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none transition" disabled={loading} />
                <button onClick={sendMessage} disabled={loading} className="bg-primary text-white p-3 rounded-lg hover:bg-primary-focus disabled:bg-gray-500"><SendIcon className="w-6 h-6" /></button>
            </div>
            <div className="mt-4 text-center">
                <button onClick={handleEndInterview} disabled={loading} className="text-sm bg-surface text-text-secondary font-bold py-2 px-4 rounded-lg hover:bg-border transition disabled:opacity-50">{loading ? 'Generating...' : 'End & Get Report'}</button>
            </div>
            {error && <p className="text-red-500 text-center mt-2">{error}</p>}
        </div>
    );
};

const QuestionBankTab: React.FC<{ jobRole: string }> = ({ jobRole }) => {
    const { profile } = useAppContext();
    const [questionType, setQuestionType] = useState('Behavioral');
    const [difficulty, setDifficulty] = useState('Entry-level');
    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!profile.name) {
            setError('Please complete your profile first.');
            return;
        }
        setLoading(true);
        setError('');
        setQuestions([]);
        try {
            const data = await generateInterviewQuestions(jobRole, questionType, difficulty);
            setQuestions(data);
        } catch (err) {
            setError('Failed to generate questions.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-1 sm:p-4">
            <div className="bg-background p-4 rounded-lg mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="questionType" className="block text-sm font-medium text-text-secondary mb-2">Question Type</label>
                        <select id="questionType" value={questionType} onChange={(e) => setQuestionType(e.target.value)} className={inputClasses}>
                            {questionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="difficulty" className="block text-sm font-medium text-text-secondary mb-2">Difficulty</label>
                        <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={inputClasses}>
                            {difficulties.map(level => <option key={level} value={level}>{level}</option>)}
                        </select>
                    </div>
                </div>
                <button onClick={handleGenerate} disabled={loading || !profile.name} className="w-full bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-focus transition disabled:bg-gray-500 flex items-center justify-center">
                    {loading ? <Spinner /> : 'Generate Questions'}
                </button>
                {error && <p className="text-red-500 text-center mt-2">{error}</p>}
            </div>
            {questions.length > 0 && (
                <div className="space-y-4 animate-fade-in max-h-[60vh] overflow-y-auto pr-2">
                    {questions.map((q, i) => (
                        <div key={i} className="bg-surface p-5 rounded-lg border-l-4 border-primary">
                            <h3 className="font-semibold text-lg">{i + 1}. {q.question}</h3>
                            <div className="mt-3 bg-background p-4 rounded-md"><p className="text-sm text-primary font-semibold">💡 Answering Tips:</p><p className="text-sm text-text-secondary mt-1">{q.tips}</p></div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


// --- Main Component ---

interface InterviewPrepProps {
    setView: (view: View) => void;
}

const InterviewPrep: React.FC<InterviewPrepProps> = ({ setView }) => {
    const [step, setStep] = useState<'setup' | 'prep'>('setup');
    const [jobRole, setJobRole] = useState('');
    const [customJobRole, setCustomJobRole] = useState('');
    const [activeTab, setActiveTab] = useState<'mock' | 'bank'>('mock');
    
    const handleStart = () => {
        if ((jobRole && jobRole !== 'Other') || (jobRole === 'Other' && customJobRole)) {
            setStep('prep');
        }
    };

    const finalJobRole = jobRole === 'Other' ? customJobRole : jobRole;

    if (step === 'setup') {
        return (
            <div>
                <BackButton setView={setView} />
                <h1 className="text-3xl font-bold mb-2">Interview Prep Hub</h1>
                <p className="text-text-secondary mb-6">Select a job role to begin your practice session.</p>
                <div className="bg-surface p-6 rounded-xl shadow-lg max-w-lg mx-auto">
                    <div className="space-y-4">
                        <label htmlFor="jobRole" className="block text-sm font-medium text-text-secondary mb-2">Job Role to Practice</label>
                        <select id="jobRole" value={jobRole} onChange={(e) => setJobRole(e.target.value)} className={inputClasses}>
                            <option value="" disabled>Select a role</option>
                            {commonJobRoles.map(role => <option key={role} value={role}>{role}</option>)}
                            <option value="Other">Other</option>
                        </select>
                        {jobRole === 'Other' && <input type="text" value={customJobRole} onChange={(e) => setCustomJobRole(e.target.value)} className={`${inputClasses} mt-2`} placeholder="Please specify the job role" />}
                    </div>
                    <button onClick={handleStart} disabled={!finalJobRole} className="w-full mt-6 bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-focus transition disabled:bg-gray-500">
                        Start Preparing
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div>
            <button onClick={() => setStep('setup')} className="flex items-center gap-2 text-sm text-text-secondary hover:text-white font-semibold mb-4 transition-colors">
                &larr; Change Role
            </button>
            <h1 className="text-3xl font-bold mb-2">Interview Prep for <span className="text-primary">{finalJobRole}</span></h1>
            <p className="text-text-secondary mb-6">Switch between a live mock interview and a question bank.</p>
            
            <div className="bg-surface p-2 sm:p-4 rounded-xl shadow-lg">
                <div className="border-b border-border mb-4">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('mock')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'mock' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-white'}`}>AI Mock Interview</button>
                        <button onClick={() => setActiveTab('bank')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'bank' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-white'}`}>Question Bank</button>
                    </nav>
                </div>
                <div>
                    {activeTab === 'mock' ? <MockInterviewTab jobRole={finalJobRole} /> : <QuestionBankTab jobRole={finalJobRole} />}
                </div>
            </div>
        </div>
    );
};

export default InterviewPrep;
