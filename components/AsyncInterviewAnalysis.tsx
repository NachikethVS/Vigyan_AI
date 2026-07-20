import React, { useState } from 'react';
import { View, AsyncInterviewAnalysisResult } from '../types';
import { analyzeVideoInterview, generateInterviewQuestions } from '../services/geminiService';
import BackButton from './BackButton';
import Spinner from './Spinner';
import { UploadIcon } from './icons';
import { commonJobRoles } from '../lib/constants';

interface AsyncInterviewAnalysisProps {
    setView: (view: View) => void;
}

const AsyncInterviewAnalysis: React.FC<AsyncInterviewAnalysisProps> = ({ setView }) => {
    const [questions, setQuestions] = useState('');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [result, setResult] = useState<AsyncInterviewAnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [jobRoleSelection, setJobRoleSelection] = useState('');
    const [customJobRole, setCustomJobRole] = useState('');
    const [sampleQuestionsLoading, setSampleQuestionsLoading] = useState(false);
    const [isSampleLoading, setIsSampleLoading] = useState(false);

    const finalJobRole = jobRoleSelection === 'Other' ? customJobRole : jobRoleSelection;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('video/')) {
            setVideoFile(file);
            setError('');
        } else {
            setVideoFile(null);
            setError('Please upload a valid video file.');
        }
    };

    const handleLoadSamples = async () => {
        if (!finalJobRole) {
            setError('Please select a job role to load sample questions.');
            return;
        }
        setSampleQuestionsLoading(true);
        setError('');
        try {
            const sampleQuestions = await generateInterviewQuestions(finalJobRole, 'Behavioral', 'Entry-level');
            const questionText = sampleQuestions.map(q => q.question).join('\n');
            setQuestions(questionText);
        } catch (err) {
            setError('Could not load sample questions. Please try again.');
        } finally {
            setSampleQuestionsLoading(false);
        }
    };

    const handleUseSampleVideo = async () => {
        setIsSampleLoading(true);
        setError('');
        try {
            // A publicly available, short sample video.
            const response = await fetch('https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4');
            if (!response.ok) {
                throw new Error(`Network response was not ok (${response.status})`);
            }
            const blob = await response.blob();
            const sampleFile = new File([blob], "sample-interview.mp4", { type: "video/mp4" });
            setVideoFile(sampleFile);
        } catch (err) {
            console.error("Failed to load sample video:", err);
            const message = err instanceof Error ? err.message : String(err);
            setError(`Could not load the sample video: ${message}. Please check your network connection.`);
        } finally {
            setIsSampleLoading(false);
        }
    };

    const handleAnalyze = async () => {
        const questionList = questions.split('\n').filter(q => q.trim() !== '');
        if (!videoFile || questionList.length === 0) {
            setError('Please provide interview questions and upload a video response.');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const reader = new FileReader();
            reader.readAsDataURL(videoFile);
            reader.onloadend = async () => {
                try {
                    const base64data = reader.result as string;
                    const base64content = base64data.split(',')[1];
                    const mimeType = videoFile.type.split(';')[0];
                    
                    const analysisResult = await analyzeVideoInterview(base64content, mimeType, questionList);
                    setResult(analysisResult);
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    setError(message || 'Failed to analyze the video. Please try again.');
                } finally {
                    setLoading(false);
                }
            };
            reader.onerror = () => {
                throw new Error("Failed to read the video file.");
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message || 'Failed to analyze the video. Please try again.');
            setLoading(false);
        }
    };
    
    const scoreColor = (s: number) => s >= 75 ? 'text-green-400' : s >= 50 ? 'text-yellow-400' : 'text-red-400';

    const textareaClasses = "w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition";
    const inputClasses = "w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition";

    return (
        <div>
            <BackButton setView={setView} />
            <h1 className="text-3xl font-bold mb-2">Asynchronous Interview Analysis</h1>
            <p className="text-text-secondary mb-6">Analyze a candidate's pre-recorded video interview responses.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="bg-surface p-6 rounded-xl shadow-lg space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-text-primary mb-2">Optional: Load Sample Questions</label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <select
                                value={jobRoleSelection}
                                onChange={(e) => setJobRoleSelection(e.target.value)}
                                className={inputClasses}
                            >
                                <option value="" disabled>Select a role...</option>
                                {commonJobRoles.map(role => <option key={role} value={role}>{role}</option>)}
                                <option value="Other">Other</option>
                            </select>
                            <button onClick={handleLoadSamples} disabled={sampleQuestionsLoading || !finalJobRole} className="bg-secondary text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-500 transition disabled:bg-gray-500 flex items-center justify-center flex-shrink-0">
                                {sampleQuestionsLoading ? <Spinner /> : 'Load Samples'}
                            </button>
                        </div>
                        {jobRoleSelection === 'Other' && (
                            <input type="text" value={customJobRole} onChange={(e) => setCustomJobRole(e.target.value)} className={`${inputClasses} mt-2`} placeholder="Specify job role" />
                        )}
                    </div>

                    <div>
                        <label htmlFor="questions" className="block text-sm font-bold text-text-primary mb-2">1. Interview Questions (one per line)</label>
                        <textarea
                            id="questions"
                            value={questions}
                            onChange={(e) => setQuestions(e.target.value)}
                            rows={6}
                            className={textareaClasses}
                            placeholder="e.g., Tell me about a time you faced a challenge.&#10;Why are you interested in this role?"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-primary mb-2">2. Upload Candidate's Video Response</label>
                        <div className="p-4 border-2 border-dashed border-border rounded-lg text-center">
                            <UploadIcon className="w-8 h-8 mx-auto text-text-secondary mb-2" />
                            <p className="text-sm text-text-secondary mb-2">{videoFile ? videoFile.name : 'Drag & drop or click to upload'}</p>
                            <input type="file" onChange={handleFileChange} accept="video/*" className="hidden" id="video-upload" />
                            <label htmlFor="video-upload" className="cursor-pointer bg-primary/20 text-primary font-semibold py-2 px-4 rounded-lg hover:bg-primary/30 transition">
                                Select Video
                            </label>
                        </div>
                        <div className="text-center mt-2">
                             <span className="text-sm text-text-secondary">or</span>
                             <button
                                onClick={handleUseSampleVideo}
                                disabled={isSampleLoading || loading}
                                className="text-sm text-primary hover:underline ml-2 font-semibold disabled:text-text-secondary disabled:cursor-not-allowed"
                            >
                                {isSampleLoading ? 'Loading Sample...' : 'Use Sample Video'}
                            </button>
                        </div>
                    </div>
                    <button onClick={handleAnalyze} disabled={loading || isSampleLoading} className="w-full bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-focus transition disabled:bg-gray-500 flex items-center justify-center">
                        {loading ? <Spinner /> : 'Analyze Interview'}
                    </button>
                    {error && <p className="text-red-500 text-center">{error}</p>}
                </div>

                {/* Results */}
                <div className="bg-surface p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-4">Analysis Report</h2>
                    {loading && <div className="flex justify-center items-center h-full"><Spinner /></div>}
                    {result ? (
                        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
                            <div className="bg-background p-4 rounded-lg">
                                <h3 className="font-semibold text-lg text-primary mb-2">Overall Summary</h3>
                                <p className="text-text-secondary text-sm">{result.overallSummary}</p>
                                <div className="flex items-baseline gap-2 mt-3">
                                    <h4 className="font-semibold text-text-primary">Communication Score:</h4>
                                    <p className={`font-bold text-xl ${scoreColor(result.communicationScore)}`}>{result.communicationScore}/100</p>
                                </div>
                            </div>
                            {result.questionAnalyses.map((qa, index) => (
                                <div key={index} className="bg-background p-4 rounded-lg">
                                    <h4 className="font-bold text-text-primary mb-2">Question {index + 1}: <span className="font-normal italic">"{qa.question}"</span></h4>
                                    <p className="text-xs text-text-secondary mb-2 border-l-2 border-border pl-2"><strong>Transcript:</strong> {qa.transcript}</p>
                                    <p className="text-sm text-text-secondary mb-2"><strong>Feedback:</strong> {qa.feedback}</p>
                                    <div className="flex items-baseline gap-2 text-sm">
                                        <h5 className="font-semibold text-text-primary">Clarity Score:</h5>
                                        <p className={`font-bold ${scoreColor(qa.clarityScore)}`}>{qa.clarityScore}/100</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        !loading && <div className="flex items-center justify-center h-full text-text-secondary"><p>Analysis results will appear here.</p></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AsyncInterviewAnalysis;