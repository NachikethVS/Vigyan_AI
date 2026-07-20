

import React, { useState } from 'react';
import { View, JobDescriptionResult } from '../types';
import { generateJobDescription } from '../services/geminiService';
import BackButton from './BackButton';
import Spinner from './Spinner';
import { CopyIcon } from './icons';
import { sampleJobData } from '../lib/constants';

interface AIJobDescriptionProps {
    setView: (view: View) => void;
}

const AIJobDescription: React.FC<AIJobDescriptionProps> = ({ setView }) => {
    const [jobTitle, setJobTitle] = useState('');
    const [keyPoints, setKeyPoints] = useState('');
    const [tone, setTone] = useState('Professional');
    const [jobRoleSelection, setJobRoleSelection] = useState('');
    const [result, setResult] = useState<JobDescriptionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    const handleGenerate = async () => {
        if (!jobTitle || !keyPoints) {
            setError('Please provide a job title and key points.');
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const data = await generateJobDescription(jobTitle, keyPoints, tone);
            setResult(data);
        } catch (err) {
            setError('Failed to generate the job description. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!result) return;
        navigator.clipboard.writeText(result.jobDescription);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleJobRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedRole = e.target.value;
        setJobRoleSelection(selectedRole);
        const data = (sampleJobData as any)[selectedRole];
        if (data) {
            setJobTitle(data.title);
            setKeyPoints(data.points);
        } else {
            setJobTitle('');
            setKeyPoints('');
        }
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setJobTitle(e.target.value);
        setJobRoleSelection('Other (Custom)');
    };
    
    const handlePointsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setKeyPoints(e.target.value);
        setJobRoleSelection('Other (Custom)');
    };

    const inputClasses = "w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition";
    const textareaClasses = `${inputClasses} min-h-[150px]`;

    return (
        <div>
            <BackButton setView={setView} />
            <h1 className="text-3xl font-bold mb-2">AI Job Description</h1>
            <p className="text-text-secondary mb-6">Create clear, effective, and inclusive job descriptions with AI assistance.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="bg-surface p-6 rounded-xl shadow-lg space-y-6">
                    <div>
                        <label htmlFor="jobRoleSelection" className="block text-sm font-bold text-text-primary mb-2">Use a Template</label>
                        <select
                            id="jobRoleSelection"
                            value={jobRoleSelection}
                            onChange={handleJobRoleChange}
                            className={inputClasses}
                        >
                            <option value="" disabled>Select a template...</option>
                            {Object.keys(sampleJobData).map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                            <option value="Other (Custom)">Other (Custom)</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="jobTitle" className="block text-sm font-bold text-text-primary mb-2">Job Title</label>
                        <input
                            id="jobTitle"
                            type="text"
                            value={jobTitle}
                            onChange={handleTitleChange}
                            className={inputClasses}
                            placeholder="e.g., Senior Frontend Engineer"
                        />
                    </div>
                    <div>
                        <label htmlFor="keyPoints" className="block text-sm font-bold text-text-primary mb-2">Key Responsibilities & Skills</label>
                        <textarea
                            id="keyPoints"
                            value={keyPoints}
                            onChange={handlePointsChange}
                            className={textareaClasses}
                            placeholder="- Develop and maintain web applications using React and TypeScript&#10;- Collaborate with UX/UI designers&#10;- Experience with AWS and CI/CD pipelines"
                        />
                    </div>
                    <div>
                        <label htmlFor="tone" className="block text-sm font-bold text-text-primary mb-2">Tone of Voice</label>
                        <select
                            id="tone"
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            className={inputClasses}
                        >
                            <option>Professional</option>
                            <option>Casual</option>
                            <option>Enthusiastic</option>
                            <option>Formal</option>
                        </select>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !jobTitle || !keyPoints}
                        className="w-full bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-focus transition disabled:bg-gray-500 flex items-center justify-center"
                    >
                        {loading ? <Spinner /> : 'Generate Description'}
                    </button>
                    {error && <p className="text-red-500 text-center">{error}</p>}
                </div>

                {/* Results */}
                <div className="bg-surface p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-4">Generated Description</h2>
                    {result ? (
                        <div className="space-y-6">
                            <div className="relative">
                                <textarea
                                    readOnly
                                    value={result.jobDescription}
                                    className={`${textareaClasses} h-80 whitespace-pre-wrap`}
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
                                <h3 className="font-semibold text-lg text-primary mb-3">Improvement Suggestions</h3>
                                <ul className="list-disc list-inside text-text-secondary space-y-2 text-sm">
                                    {result.suggestions.map((suggestion, index) => (
                                        <li key={index}>{suggestion}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-text-secondary">
                            <p>Your generated job description will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIJobDescription;