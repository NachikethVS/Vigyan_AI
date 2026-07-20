import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { generateCoverLetter } from '../services/geminiService';
import Spinner from './Spinner';
import * as pdfjsLib from 'pdfjs-dist';
import { CoverLetterResult, View } from '../types';
import BackButton from './BackButton';
import { CopyIcon } from './icons';
import { sampleJobDescriptions } from '../lib/constants';

interface CoverLetterGeneratorProps {
    setView: (view: View) => void;
}

const CoverLetterGenerator: React.FC<CoverLetterGeneratorProps> = ({ setView }) => {
    const { profile } = useAppContext();
    const [resumeText, setResumeText] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [jobRoleSelection, setJobRoleSelection] = useState('');
    const [result, setResult] = useState<CoverLetterResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [isReadingFile, setIsReadingFile] = useState(false);
    const [error, setError] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsReadingFile(true);
        setError('');
        setResult(null);
        setResumeText('');

        if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = async (e) => {
                if (!e.target?.result) {
                    setError('Could not read the PDF file.');
                    setIsReadingFile(false);
                    return;
                }
                try {
                    const pdf = await pdfjsLib.getDocument({ data: e.target.result as ArrayBuffer }).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map((item: any) => item.str).join(' ');
                        fullText += pageText + '\n\n';
                    }
                    setResumeText(fullText.trim());
                } catch (pdfError) {
                    console.error('Error parsing PDF:', pdfError);
                    setError('Failed to parse the PDF. It may be corrupted or an unsupported format.');
                } finally {
                    setIsReadingFile(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (e) => {
                setResumeText(e.target?.result as string);
                setIsReadingFile(false);
            };
            reader.readAsText(file);
        } else {
            setError('Unsupported file type. Please upload a PDF or TXT file.');
            setIsReadingFile(false);
        }
    };

    const handleGenerate = async () => {
        if (!resumeText || !jobDescription) {
            setError('Please provide both your resume text and the job description.');
            return;
        }
        if (!profile.name) {
            setError('Please complete your profile first.');
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const data = await generateCoverLetter(profile, resumeText, jobDescription);
            setResult(data);
        } catch (err) {
            setError('Failed to generate cover letter. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!result) return;
        navigator.clipboard.writeText(result.coverLetterText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };
    
    const handleJobRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedRole = e.target.value;
        setJobRoleSelection(selectedRole);
        const description = (sampleJobDescriptions as any)[selectedRole] || '';
        setJobDescription(description);
    };

    const handleJobDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setJobDescription(e.target.value);
        // If user starts typing, assume it's a custom description
        if (jobRoleSelection !== 'Other (Paste your own)') {
            setJobRoleSelection('Other (Paste your own)');
        }
    };

    const textareaClasses = "w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition";
    const inputClasses = "w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition";


    return (
        <div>
            <BackButton setView={setView} />
            <h1 className="text-3xl font-bold mb-2">AI Cover Letter Generator</h1>
            <p className="text-text-secondary mb-6">Create a tailored cover letter in seconds based on your resume and a job description.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-surface p-6 rounded-xl shadow-lg space-y-4">
                    <div>
                        <label htmlFor="resumeText" className="block text-sm font-medium text-text-secondary mb-2">Upload Resume (PDF/TXT) or Paste Text</label>
                        <input
                            type="file"
                            onChange={handleFileChange}
                            accept=".pdf,.txt"
                            className="mb-2 w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 disabled:opacity-50"
                            disabled={isReadingFile}
                        />
                        <textarea
                            id="resumeText"
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                            rows={10}
                            className={textareaClasses}
                            placeholder="Paste your resume text here..."
                        />
                    </div>
                    <div>
                        <label htmlFor="jobRole" className="block text-sm font-medium text-text-secondary mb-2">Job Description (Optional)</label>
                        <select
                            id="jobRole"
                            value={jobRoleSelection}
                            onChange={handleJobRoleChange}
                            className={`${inputClasses} mb-2`}
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
                            rows={10}
                            className={textareaClasses}
                            placeholder="Paste the job description here..."
                        />
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={loading || isReadingFile || !profile.name || !resumeText || !jobDescription}
                        className="w-full bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-focus transition disabled:bg-gray-500 flex items-center justify-center"
                    >
                        {loading ? <Spinner /> : isReadingFile ? 'Reading File...' : 'Generate Cover Letter'}
                    </button>
                    {!profile.name && <p className="text-yellow-400 text-center text-sm">Please complete your user profile first.</p>}
                    {error && <p className="text-red-500 text-center mt-2">{error}</p>}
                </div>

                <div className="bg-surface p-6 rounded-xl shadow-lg animate-fade-in">
                    <h2 className="text-2xl font-bold mb-4">Generated Cover Letter</h2>
                    {result ? (
                        <div className="space-y-6">
                            <div className="relative">
                                <textarea
                                    readOnly
                                    value={result.coverLetterText}
                                    className={`${textareaClasses} h-96`}
                                />
                                <button
                                    onClick={handleCopy}
                                    className="absolute top-3 right-3 p-2 bg-background rounded-lg text-text-secondary hover:text-white hover:bg-border transition-colors"
                                    title="Copy to clipboard"
                                >
                                    {isCopied ? 'Copied!' : <CopyIcon className="w-5 h-5" />}
                                </button>
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-primary mb-3">Key Talking Points</h3>
                                <div className="space-y-3">
                                    {result.keyPoints.map((point, index) => (
                                        <div key={index} className="bg-background p-3 rounded-lg">
                                            <p className="font-semibold text-text-primary text-sm">{point.point}</p>
                                            <p className="text-xs text-text-secondary mt-1">{point.explanation}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-text-secondary">
                            <p>Your generated cover letter will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CoverLetterGenerator;