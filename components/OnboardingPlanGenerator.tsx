import React, { useState } from 'react';
import { View, OnboardingPlan } from '../types';
import { generateOnboardingPlan } from '../services/geminiService';
import BackButton from './BackButton';
import Spinner from './Spinner';
import { CopyIcon } from './icons';
import { commonCompanies, commonJobRoles } from '../lib/constants';

interface OnboardingPlanGeneratorProps {
    setView: (view: View) => void;
}

const OnboardingPlanGenerator: React.FC<OnboardingPlanGeneratorProps> = ({ setView }) => {
    const [roleSelection, setRoleSelection] = useState('');
    const [customRole, setCustomRole] = useState('');
    const [companySelection, setCompanySelection] = useState('');
    const [customCompany, setCustomCompany] = useState('');
    const [result, setResult] = useState<OnboardingPlan | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    const finalRole = roleSelection === 'Other' ? customRole : roleSelection;
    const finalCompany = companySelection === 'Other' ? customCompany : companySelection;
    
    const handleGenerate = async () => {
        if (!finalRole || !finalCompany) {
            setError('Please provide both a role and a company name.');
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const data = await generateOnboardingPlan(finalRole, finalCompany);
            setResult(data);
        } catch (err) {
            // FIX: Correctly handle 'unknown' error type.
            const message = err instanceof Error ? err.message : String(err);
            setError(message || 'Failed to generate the onboarding plan. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    const formatPlanToText = () => {
        if (!result) return '';
        let text = `Onboarding Plan for: ${result.role}\n\n`;
        result.plan.forEach(phase => {
            text += `--- ${phase.phase}: ${phase.title} ---\n\n`;
            text += `Goals:\n`;
            phase.goals.forEach(goal => text += `- ${goal}\n`);
            text += `\nTasks:\n`;
            phase.tasks.forEach(task => text += `- ${task}\n`);
            text += '\n';
        });
        return text;
    };

    const handleCopy = () => {
        const textToCopy = formatPlanToText();
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const inputClasses = "w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition";

    return (
        <div>
            <BackButton setView={setView} />
            <h1 className="text-3xl font-bold mb-2">Onboarding Plan Generator</h1>
            <p className="text-text-secondary mb-6">Create a structured 30-60-90 day plan for new hires to ensure a successful start.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Inputs */}
                <div className="lg:col-span-1 bg-surface p-6 rounded-xl shadow-lg space-y-6 self-start">
                    <div>
                        <label htmlFor="role" className="block text-sm font-bold text-text-primary mb-2">New Hire's Role</label>
                        <select id="role" value={roleSelection} onChange={(e) => setRoleSelection(e.target.value)} className={inputClasses}>
                            <option value="" disabled>Select a role</option>
                            {commonJobRoles.map(r => <option key={r} value={r}>{r}</option>)}
                            <option value="Other">Other</option>
                        </select>
                        {roleSelection === 'Other' && (
                            <input type="text" value={customRole} onChange={(e) => setCustomRole(e.target.value)} className={`${inputClasses} mt-2`} placeholder="e.g., Software Engineer" />
                        )}
                    </div>
                    <div>
                        <label htmlFor="companyName" className="block text-sm font-bold text-text-primary mb-2">Company Name</label>
                        <select id="companyName" value={companySelection} onChange={(e) => setCompanySelection(e.target.value)} className={inputClasses}>
                            <option value="" disabled>Select a company</option>
                            {commonCompanies.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="Other">Other</option>
                        </select>
                        {companySelection === 'Other' && (
                            <input type="text" value={customCompany} onChange={(e) => setCustomCompany(e.target.value)} className={`${inputClasses} mt-2`} placeholder="e.g., Acme Corp" />
                        )}
                    </div>
                    <button onClick={handleGenerate} disabled={loading || !finalRole || !finalCompany} className="w-full bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-focus transition disabled:bg-gray-500 flex items-center justify-center">
                        {loading ? <Spinner /> : 'Generate Plan'}
                    </button>
                    {error && <p className="text-red-500 text-center">{error}</p>}
                </div>

                {/* Results */}
                <div className="lg:col-span-2 bg-surface p-6 rounded-xl shadow-lg min-h-[50vh]">
                     <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Generated Plan</h2>
                         {result && (
                            <button onClick={handleCopy} className="flex items-center gap-2 bg-secondary text-white font-bold text-sm py-2 px-3 rounded-lg hover:bg-emerald-500 transition">
                                <CopyIcon className="w-4 h-4" />
                                <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
                            </button>
                         )}
                    </div>
                    {loading && <div className="flex justify-center items-center h-full"><Spinner /></div>}
                    {result ? (
                        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                           {result.plan.map((phase, index) => (
                               <div key={index} className="bg-background p-5 rounded-lg border-l-4 border-primary">
                                    <h3 className="font-bold text-xl text-primary">{phase.phase}: <span className="text-text-primary font-semibold">{phase.title}</span></h3>
                                    <div className="mt-4">
                                        <h4 className="font-semibold text-text-primary mb-2">Goals:</h4>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary">
                                            {phase.goals.map((goal, i) => <li key={i}>{goal}</li>)}
                                        </ul>
                                    </div>
                                    <div className="mt-4">
                                        <h4 className="font-semibold text-text-primary mb-2">Tasks:</h4>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary">
                                            {phase.tasks.map((task, i) => <li key={i}>{task}</li>)}
                                        </ul>
                                    </div>
                               </div>
                           ))}
                        </div>
                    ) : (
                        !loading && <div className="flex items-center justify-center h-full text-text-secondary"><p>The onboarding plan will appear here.</p></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingPlanGenerator;