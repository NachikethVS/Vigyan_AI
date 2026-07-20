

import React, { useState, useEffect } from 'react';
import { View, ScreenedCandidate } from '../types';
import { screenCandidateResume } from '../services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';
import BackButton from './BackButton';
import Spinner from './Spinner';
import { UploadIcon, ChevronDownIcon, CheckIcon, XMarkIcon, MailIcon } from './icons';
import { sampleJobDescriptions } from '../lib/constants';

interface CandidateScreenerProps {
    setView: (view: View) => void;
}

interface ResumeFile {
    file: File;
    text: string;
}

const scoreColor = (score: number) => {
    if (score >= 75) return 'text-green-400';
    if (score >= 60) return 'text-sky-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
};

const scoreRingColor = (score: number) => {
    if (score >= 75) return 'stroke-green-400';
    if (score >= 60) return 'stroke-sky-400';
    if (score >= 40) return 'stroke-yellow-400';
    return 'stroke-red-400';
};

const ComparisonView: React.FC<{ candidates: ScreenedCandidate[] }> = ({ candidates }) => {
    const topCandidates = candidates.slice(0, 3);

    if (topCandidates.length === 0) {
        return <p className="text-text-secondary text-center py-8">No candidates to compare.</p>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {topCandidates.map((candidate) => (
                <div key={candidate.fileName} className="bg-background border border-border rounded-lg p-6 flex flex-col space-y-4">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center space-y-3">
                        <div className="relative w-24 h-24">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                <circle className="stroke-current text-border/50" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
                                <circle
                                    className={`stroke-current ${scoreRingColor(candidate.matchScore)}`}
                                    strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"
                                    strokeDasharray={`${2 * Math.PI * 40}`}
                                    strokeDashoffset={`${(2 * Math.PI * 40) * (1 - candidate.matchScore / 100)}`}
                                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                                    transform="rotate(-90 50 50)"
                                ></circle>
                                <text className={`text-2xl font-bold ${scoreColor(candidate.matchScore)}`} x="50" y="50" dy="0.3em" textAnchor="middle">
                                    {candidate.matchScore}%
                                </text>
                            </svg>
                        </div>
                        <h3 className="font-bold text-text-primary w-full truncate" title={candidate.fileName}>{candidate.fileName}</h3>
                    </div>

                    <hr className="border-border" />

                    {/* Body */}
                    <div className="space-y-4 text-sm">
                        <div>
                            <h4 className="font-bold text-primary mb-2">Summary</h4>
                            <p className="text-text-secondary leading-relaxed">{candidate.summary}</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-green-400 mb-2">Strengths</h4>
                            <ul className="space-y-1">
                                {candidate.strengths.map((s, i) => <li key={i} className="flex items-start gap-2 text-text-secondary"><span className="text-green-400 mt-1 flex-shrink-0"><CheckIcon className="w-4 h-4" /></span>{s}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-yellow-400 mb-2">Gaps</h4>
                             <ul className="space-y-1">
                                {candidate.gaps.map((g, i) => <li key={i} className="flex items-start gap-2 text-text-secondary"><span className="text-yellow-400 mt-1 flex-shrink-0"><XMarkIcon className="w-4 h-4" /></span>{g}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};


const CandidateScreener: React.FC<CandidateScreenerProps> = ({ setView }) => {
    const [jobDescription, setJobDescription] = useState('');
    const [jobRoleSelection, setJobRoleSelection] = useState('');
    const [resumeFiles, setResumeFiles] = useState<ResumeFile[]>([]);
    const [screeningResults, setScreeningResults] = useState<ScreenedCandidate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState({ loaded: 0, total: 0 });
    const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'comparison'>('list');


    useEffect(() => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;
    }, []);

    const parseFile = (file: File): Promise<ResumeFile> => {
        return new Promise((resolve, reject) => {
            if (file.type === 'application/pdf') {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    if (!e.target?.result) return reject('Could not read PDF.');
                    try {
                        const pdf = await pdfjsLib.getDocument({ data: e.target.result as ArrayBuffer }).promise;
                        let text = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            text += content.items.map((item: any) => item.str).join(' ') + '\n';
                        }
                        resolve({ file, text });
                    } catch (err) {
                        const message = err instanceof Error ? err.message : String(err);
                        reject(`Failed to parse ${file.name}: ${message}`);
                    }
                };
                reader.readAsArrayBuffer(file);
            } else if (file.type === 'text/plain') {
                const reader = new FileReader();
                reader.onload = (e) => resolve({ file, text: e.target?.result as string });
                reader.readAsText(file);
            } else {
                reject(`Unsupported file type: ${file.name}`);
            }
        });
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setError('');
        setLoading(true);

        const existingFileNames = new Set(resumeFiles.map(rf => rf.file.name));
        const newFiles = Array.from(files).filter(file => !existingFileNames.has(file.name));

        if (newFiles.length === 0) {
            setLoading(false);
            event.target.value = '';
            return;
        }

        setProgress({ loaded: 0, total: newFiles.length });

        const parsedFiles: ResumeFile[] = [];
        for (const file of newFiles) {
            try {
                const parsed = await parseFile(file as File);
                parsedFiles.push(parsed);
            } catch (err) {
                const errorMessage = String(err);
                setError(e => e ? `${e}\n${errorMessage}` : errorMessage);
            } finally {
                setProgress(p => ({ ...p, loaded: p.loaded + 1 }));
            }
        }
        setResumeFiles(prevFiles => [...prevFiles, ...parsedFiles]);
        setLoading(false);
        event.target.value = '';
    };

    const handleRemoveFile = (fileNameToRemove: string) => {
        setResumeFiles(prev => prev.filter(rf => rf.file.name !== fileNameToRemove));
    };

    const handleClearAll = () => {
        setResumeFiles([]);
    };

    const handleAnalyze = async () => {
        if (!jobDescription || resumeFiles.length === 0) {
            setError('Please provide a job description and upload at least one resume.');
            return;
        }
        setLoading(true);
        setError('');
        setScreeningResults([]);
        setProgress({ loaded: 0, total: resumeFiles.length });

        const results: ScreenedCandidate[] = [];
        for (const resumeFile of resumeFiles) {
            try {
                const result = await screenCandidateResume(resumeFile.text, jobDescription);
                const emailMatch = resumeFile.text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
                const email = emailMatch ? emailMatch[0] : undefined;
                results.push({ ...result, fileName: resumeFile.file.name, email });
// FIX: Correctly handle 'unknown' error type by using a type guard before accessing properties.
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                const fileName = resumeFile.file.name;
                setError(e => (e ? e + '\n' : '') + `Failed to analyze ${fileName}: ${message}`);
            } finally {
                setProgress(p => ({ ...p, loaded: p.loaded + 1 }));
            }
        }

        results.sort((a, b) => b.matchScore - a.matchScore);
        setScreeningResults(results);
        setLoading(false);
    };

    const handleJobRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedRole = e.target.value;
        setJobRoleSelection(selectedRole);
        const description = (sampleJobDescriptions as any)[selectedRole] || '';
        setJobDescription(description);
    };

    const handleJobDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setJobDescription(e.target.value);
        if (jobRoleSelection !== 'Other (Paste your own)') {
            setJobRoleSelection('Other (Paste your own)');
        }
    };

    const textareaClasses = "w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition";

    return (
        <div>
            <BackButton setView={setView} />
            <h1 className="text-3xl font-bold mb-2">AI Candidate Screener</h1>
            <p className="text-text-secondary mb-6">Rank and analyze multiple candidates against a single job description.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="bg-surface p-6 rounded-xl shadow-lg space-y-6">
                    <div>
                        <label htmlFor="jobDescription" className="block text-sm font-bold text-text-primary mb-2">1. Paste Job Description</label>
                        <select
                            id="jobRole"
                            value={jobRoleSelection}
                            onChange={handleJobRoleChange}
                            className={`${textareaClasses} mb-2`}
                        >
                            <option value="" disabled>Select a sample role...</option>
                            {Object.keys(sampleJobDescriptions).map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                            <option value="Other (Paste your own)">Other (Paste your own)</option>
                        </select>
                        <textarea
                            id="jobDescription"
                            value={jobDescription}
                            onChange={handleJobDescriptionChange}
                            rows={8}
                            className={textareaClasses}
                            placeholder="Paste the full job description here..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-primary mb-2">2. Upload Resumes (PDF or TXT)</label>
                        <div className="p-4 border-2 border-dashed border-border rounded-lg text-center">
                            <UploadIcon className="w-8 h-8 mx-auto text-text-secondary mb-2" />
                            <p className="text-sm text-text-secondary mb-2">Drag & drop files or click to upload</p>
                            <input
                                type="file"
                                onChange={handleFileChange}
                                accept=".pdf,.txt"
                                multiple
                                className="hidden"
                                id="resume-upload"
                            />
                            <label htmlFor="resume-upload" className="cursor-pointer bg-primary/20 text-primary font-semibold py-2 px-4 rounded-lg hover:bg-primary/30 transition">
                                Select Files
                            </label>
                        </div>
                        {resumeFiles.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-semibold text-sm">Uploaded Resumes ({resumeFiles.length}):</h4>
                                    <button onClick={handleClearAll} className="text-xs text-red-400 hover:underline">Clear All</button>
                                </div>
                                <div className="max-h-32 overflow-y-auto space-y-1 bg-background p-2 rounded-md">
                                    {resumeFiles.map(rf => (
                                        <div key={rf.file.name} className="flex justify-between items-center text-sm text-text-secondary p-1 rounded hover:bg-border">
                                            <span className="truncate pr-2">{rf.file.name}</span>
                                            <button onClick={() => handleRemoveFile(rf.file.name)} title={`Remove ${rf.file.name}`} className="text-red-500 hover:text-red-400 font-bold text-lg leading-none flex-shrink-0">&times;</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="w-full bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-focus transition disabled:bg-gray-500 flex items-center justify-center"
                    >
                        {loading ? <Spinner /> : `Screen ${resumeFiles.length} Candidate${resumeFiles.length === 1 ? '' : 's'}`}
                    </button>
                    {loading && (
                        <div className="w-full bg-border rounded-full h-2.5">
                            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(progress.loaded / (progress.total || 1)) * 100}%` }}></div>
                        </div>
                    )}
                    {error && <pre className="text-red-500 text-xs whitespace-pre-wrap">{error}</pre>}
                </div>

                {/* Results */}
                <div className="bg-surface p-6 rounded-xl shadow-lg flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Screening Results</h2>
                        {screeningResults.length > 0 && (
                            <div className="flex items-center bg-background rounded-full p-1 text-sm">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-3 py-1 rounded-full transition-colors text-xs sm:text-sm ${viewMode === 'list' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-border'}`}
                                >
                                    List
                                </button>
                                <button
                                    onClick={() => setViewMode('comparison')}
                                    className={`px-3 py-1 rounded-full transition-colors text-xs sm:text-sm ${viewMode === 'comparison' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-border'}`}
                                >
                                    Compare Top 3
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex-grow overflow-y-auto pr-2">
                        {screeningResults.length > 0 ? (
                            viewMode === 'list' ? (
                                <div className="space-y-3">
                                    {screeningResults.map((result, index) => (
                                        <div key={result.fileName} className="bg-background rounded-lg overflow-hidden border border-border">
                                            <button onClick={() => setExpandedCandidate(expandedCandidate === result.fileName ? null : result.fileName)} className="w-full flex items-center justify-between p-4 text-left">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <span className="text-sm font-bold text-text-secondary">{index + 1}</span>
                                                    <div className="flex-grow min-w-0">
                                                        <p className="font-semibold text-text-primary truncate" title={result.fileName}>{result.fileName}</p>
                                                         {result.email && (
                                                            <div className="flex items-center text-xs text-text-secondary gap-1 pt-1">
                                                                <MailIcon className="w-3 h-3 flex-shrink-0" />
                                                                <span className="truncate">{result.email}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <p className={`font-bold text-lg ${scoreColor(result.matchScore)}`}>{result.matchScore}%</p>
                                                    <ChevronDownIcon className={`w-5 h-5 text-text-secondary transition-transform ${expandedCandidate === result.fileName ? 'rotate-180' : ''}`} />
                                                </div>
                                            </button>
                                            {expandedCandidate === result.fileName && (
                                                <div className="p-4 border-t border-border animate-fade-in space-y-4">
                                                    <div>
                                                        <h4 className="font-semibold text-primary">Summary</h4>
                                                        <p className="text-sm text-text-secondary">{result.summary}</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-green-400">Strengths</h4>
                                                        <ul className="list-disc list-inside text-sm text-text-secondary space-y-1">
                                                            {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-yellow-400">Gaps</h4>
                                                        <ul className="list-disc list-inside text-sm text-text-secondary space-y-1">
                                                            {result.gaps.map((g, i) => <li key={i}>{g}</li>)}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-sky-400">Suggested Interview Questions</h4>
                                                        <ul className="list-decimal list-inside text-sm text-text-secondary space-y-1">
                                                            {result.interviewQuestions.map((q, i) => <li key={i}>{q}</li>)}
                                                        </ul>
                                                    </div>
                                                    {result.email && (
                                                        <div>
                                                            <h4 className="font-semibold text-primary">Contact Candidate</h4>
                                                            {result.matchScore >= 60 ? (
                                                                <a href={`mailto:${result.email}?subject=Invitation to Interview for ${jobRoleSelection}&body=${encodeURIComponent(`Dear Candidate,\n\nWe were very impressed with your resume and would like to invite you for an interview for the ${jobRoleSelection} position at our company.\n\nPlease let us know your availability for a call in the coming week.\n\nBest regards,\n[Your Name]`)}`}
                                                                    className="inline-flex items-center gap-2 mt-2 bg-green-500/20 text-green-300 font-bold py-2 px-4 rounded-lg hover:bg-green-500/30 transition text-sm">
                                                                    <MailIcon className="w-5 h-5" />
                                                                    Send Selection Email
                                                                </a>
                                                            ) : (
                                                                <a href={`mailto:${result.email}?subject=Update on your application for ${jobRoleSelection}&body=${encodeURIComponent(`Dear Candidate,\n\nThank you for your interest in the ${jobRoleSelection} position. After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.\n\nWe appreciate you taking the time to apply and wish you the best in your job search.\n\nBest regards,\n[Your Name]`)}`}
                                                                    className="inline-flex items-center gap-2 mt-2 bg-red-500/20 text-red-300 font-bold py-2 px-4 rounded-lg hover:bg-red-500/30 transition text-sm">
                                                                    <MailIcon className="w-5 h-5" />
                                                                    Send Rejection Email
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                }
                                </div>
                            ) : (
                                <ComparisonView candidates={screeningResults} />
                            )
                        ) : (
                            <div className="flex items-center justify-center h-full text-text-secondary">
                                <p>Analysis results will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CandidateScreener;