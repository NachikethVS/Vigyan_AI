
import React, { useState, useEffect } from 'react';
import { analyzeResume } from '../services/geminiService';
import Spinner from './Spinner';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { ResumeAnalysisResult, View } from '../types';
import BackButton from './BackButton';
import { DownloadIcon } from './icons';
import { sampleJobDescriptions } from '../lib/constants';

interface ResumeAnalyzerProps {
    setView: (view: View) => void;
}

const ResumeAnalyzer: React.FC<ResumeAnalyzerProps> = ({ setView }) => {
    const [resumeText, setResumeText] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [jobRoleSelection, setJobRoleSelection] = useState('');
    const [result, setResult] = useState<ResumeAnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [isReadingFile, setIsReadingFile] = useState(false);
    const [error, setError] = useState('');

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

    const handleAnalyze = async () => {
        if (!resumeText) {
            setError('Please upload or paste your resume text.');
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const data = await analyzeResume(resumeText, jobDescription);
            setResult(data);
        } catch (err) {
            setError('Failed to analyze resume. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = () => {
        if (!result?.updatedResumeText) return;
    
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'pt',
            format: 'a4'
        });
    
        const margin = 40;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - margin * 2;
        let y = margin;
    
        const textLines = result.updatedResumeText.split('\n').filter(line => line.trim() !== '');
    
        // 1. Header (Name & Contact)
        const name = textLines.shift() || 'Your Name';
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(name, pageWidth / 2, y, { align: 'center' });
        y += 25;
    
        const contactInfo = textLines.shift() || 'your.email@email.com | (555) 555-5555 | your-linkedin.com';
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(contactInfo, pageWidth / 2, y, { align: 'center' });
        y += 15;
    
        // Divider Line
        doc.setDrawColor(200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 25;
    
        // 2. Parse Sections
        const sections: { [key: string]: string[] } = {};
        let currentSection = 'SUMMARY'; // Assume first part is summary
        const sectionHeaders = ['SUMMARY', 'EXPERIENCE', 'EDUCATION', 'SKILLS', 'PROJECTS'];
    
        for (const line of textLines) {
            const trimmedLine = line.trim();
            const upperLine = trimmedLine.replace(/:/g, '').toUpperCase();
            const foundHeader = sectionHeaders.find(h => h === upperLine);
            
            if (foundHeader) {
                currentSection = foundHeader;
                if (!sections[currentSection]) sections[currentSection] = [];
            } else if (trimmedLine) {
                if (!sections[currentSection]) sections[currentSection] = [];
                sections[currentSection].push(trimmedLine);
            }
        }
    
        // 3. Render Sections
        const renderSection = (title: string, lines: string[]) => {
            if (!lines || lines.length === 0 || y > doc.internal.pageSize.getHeight() - margin) return;
    
            y += 10;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.text(title.toUpperCase(), margin, y);
            y += 5;
            doc.setDrawColor(200);
            doc.line(margin, y, pageWidth - margin, y);
            y += 18;
            
            doc.setFontSize(10);
            doc.setTextColor(80);
    
            for (const line of lines) {
                if (y > doc.internal.pageSize.getHeight() - margin - 20) break;
                
                const isBullet = line.startsWith('-') || line.startsWith('•');
                const isSubHeader = !isBullet && (line.includes(' | ') || line.includes(' at ') || line.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b.*\d{4}/));
                
                let textContent = isBullet ? line.substring(1).trim() : line;
                let textX = margin;
                let textWidth = contentWidth;
    
                if (isBullet) {
                    textX = margin + 15;
                    textWidth = contentWidth - 15;
                }
    
                doc.setFont('helvetica', isSubHeader ? 'bold' : 'normal');
                const splitText = doc.splitTextToSize(textContent, textWidth);
                
                if (isBullet) doc.text('•', margin + 5, y);
                
                doc.text(splitText, textX, y);
                y += splitText.length * 12 + (isSubHeader ? 6 : 4);
            }
        };
    
        // Render in a logical order
        if (sections['SUMMARY']) renderSection('Summary', sections['SUMMARY']);
        if (sections['EXPERIENCE']) renderSection('Experience', sections['EXPERIENCE']);
        if (sections['PROJECTS']) renderSection('Projects', sections['PROJECTS']);
        if (sections['EDUCATION']) renderSection('Education', sections['EDUCATION']);
        if (sections['SKILLS']) {
            const skillsLines = sections['SKILLS'];
            y += 10;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.text('SKILLS', margin, y);
            y += 5;
            doc.setDrawColor(200);
            doc.line(margin, y, pageWidth - margin, y);
            y += 18;
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80);
            
            const skillsText = skillsLines.join(' • ');
            const splitSkills = doc.splitTextToSize(skillsText, contentWidth);
            doc.text(splitSkills, margin, y);
        }
        
        doc.save('Updated_Resume.pdf');
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
    const inputClasses = "w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition";

    const scoreRingColor = (score: number) => {
        if (score >= 75) return 'stroke-green-400';
        if (score >= 50) return 'stroke-yellow-400';
        return 'stroke-red-400';
    };
    
    const ScoreGauge: React.FC<{ score: number, title: string, ringColor: string }> = ({ score, title, ringColor }) => (
        <div className="flex flex-col items-center justify-center">
            <h3 className="text-lg font-semibold text-primary mb-2">{title}</h3>
            <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle className="stroke-current text-border" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
                    <circle
                        className={`stroke-current ${ringColor}`}
                        strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${(2 * Math.PI * 40) * (1 - score / 100)}`}
                        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                        transform="rotate(-90 50 50)"
                    ></circle>
                    <text 
                        className="text-2xl font-bold text-text-primary" 
                        x="50" y="50" 
                        dy="0.3em" 
                        textAnchor="middle"
                        fill="currentColor"
                    >
                        {score}%
                    </text>
                </svg>
            </div>
        </div>
    );

    return (
        <div>
            <BackButton setView={setView} />
            <h1 className="text-3xl font-bold mb-2">Resume Analysis</h1>
            <p className="text-text-secondary mb-6">Get AI-powered feedback, an ATS score, and download an updated, professional PDF.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-surface p-6 rounded-xl shadow-lg space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Upload Resume (PDF/TXT) or Paste Text</label>
                        <input 
                            type="file" 
                            onChange={handleFileChange} 
                            accept=".pdf,.txt" 
                            className="mb-2 w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 disabled:opacity-50"
                            disabled={isReadingFile}
                        />
                        <textarea
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                            rows={10}
                            className={textareaClasses}
                            placeholder="Paste your resume text here..."
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Job Description (Optional)</label>
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
                            value={jobDescription}
                            onChange={handleJobDescriptionChange}
                            rows={10}
                            className={textareaClasses}
                            placeholder="Paste the job description here for a match score..."
                        />
                    </div>
                    <button
                        onClick={handleAnalyze}
                        disabled={loading || isReadingFile || !resumeText}
                        className="w-full bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-focus transition disabled:bg-gray-500 flex items-center justify-center"
                    >
                        {loading ? <Spinner /> : isReadingFile ? 'Reading File...' : 'Analyze Resume'}
                    </button>
                    {error && <p className="text-red-500 text-center mt-2">{error}</p>}
                </div>
                
                <div className="bg-surface p-6 rounded-xl shadow-lg animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Analysis Report</h2>
                        {result?.updatedResumeText && (
                            <button
                                onClick={handleDownloadPdf}
                                className="flex items-center gap-2 bg-secondary text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-500 transition"
                            >
                                <DownloadIcon className="w-5 h-5" />
                                <span>Download Updated Resume</span>
                            </button>
                        )}
                    </div>
                    {result ? (
                        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                            {(result.matchScore != null || result.atsScore != null) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-background p-4 rounded-lg">
                                    {result.matchScore != null && (
                                         <ScoreGauge 
                                            score={result.matchScore} 
                                            title="Job Match" 
                                            ringColor={scoreRingColor(result.matchScore)}
                                         />
                                    )}
                                    {result.atsScore != null && (
                                        <ScoreGauge 
                                            score={result.atsScore} 
                                            title="ATS Score"
                                            ringColor={scoreRingColor(result.atsScore)}
                                        />
                                    )}
                                </div>
                            )}

                             {result.atsFeedback && (
                                <div className="bg-background p-4 rounded-lg border-l-4 border-sky-400">
                                    <h4 className="font-bold text-lg text-text-primary">ATS Feedback</h4>
                                    <p className="text-text-secondary my-1 text-sm">{result.atsFeedback}</p>
                                </div>
                            )}
                             
                             {result.feedback.map((item, index) => (
                                <div key={index} className="bg-background p-4 rounded-lg border-l-4 border-primary">
                                    <h4 className="font-bold text-lg text-text-primary">{item.area}</h4>
                                    <p className="text-text-secondary my-1 text-sm">{item.comment}</p>
                                    <div className="mt-2 bg-green-500/10 p-3 rounded-md">
                                        <p className="text-sm text-green-300"><span className="font-semibold">Suggestion:</span> {item.suggestion}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-text-secondary">
                            <p>Your analysis report will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResumeAnalyzer;
