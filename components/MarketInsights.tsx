import React, { useState } from 'react';
import { View, MarketInsightsResult } from '../types';
import { getMarketInsights } from '../services/geminiService';
import BackButton from './BackButton';
import Spinner from './Spinner';
import { commonJobRoles, commonLocations } from '../lib/constants';

interface MarketInsightsProps {
    setView: (view: View) => void;
}

const MarketInsights: React.FC<MarketInsightsProps> = ({ setView }) => {
    const [jobTitleSelection, setJobTitleSelection] = useState('');
    const [customJobTitle, setCustomJobTitle] = useState('');
    const [locationSelection, setLocationSelection] = useState('');
    const [customLocation, setCustomLocation] = useState('');
    const [result, setResult] = useState<MarketInsightsResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const finalJobTitle = jobTitleSelection === 'Other' ? customJobTitle : jobTitleSelection;
    const finalLocation = locationSelection === 'Other' ? customLocation : locationSelection;

    const handleGetInsights = async () => {
        if (!finalJobTitle || !finalLocation) {
            setError('Please provide both a job title and a location.');
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const data = await getMarketInsights(finalJobTitle, finalLocation);
            setResult(data);
        } catch (err) {
            setError('Failed to get market insights. The AI may be unable to find data for this specific role and location. Please try again with a broader search.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition";

    return (
        <div>
            <BackButton setView={setView} />
            <h1 className="text-3xl font-bold mb-2">Market & Salary Insights</h1>
            <p className="text-text-secondary mb-6">Get data-driven insights to inform your hiring strategy and set competitive compensation.</p>

            <div className="bg-surface p-6 rounded-xl shadow-lg mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="jobTitle" className="block text-sm font-bold text-text-primary mb-2">Job Title</label>
                         <select
                            id="jobTitle"
                            value={jobTitleSelection}
                            onChange={(e) => setJobTitleSelection(e.target.value)}
                            className={inputClasses}
                        >
                            <option value="" disabled>Select a job title</option>
                            {commonJobRoles.map(role => <option key={role} value={role}>{role}</option>)}
                            <option value="Other">Other</option>
                        </select>
                        {jobTitleSelection === 'Other' && (
                            <input
                                type="text"
                                value={customJobTitle}
                                onChange={(e) => setCustomJobTitle(e.target.value)}
                                className={`${inputClasses} mt-2`}
                                placeholder="Please specify job title"
                            />
                        )}
                    </div>
                    <div>
                        <label htmlFor="location" className="block text-sm font-bold text-text-primary mb-2">Location</label>
                         <select
                            id="location"
                            value={locationSelection}
                            onChange={(e) => setLocationSelection(e.target.value)}
                            className={inputClasses}
                        >
                            <option value="" disabled>Select a location</option>
                            {commonLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                            <option value="Other">Other</option>
                        </select>
                        {locationSelection === 'Other' && (
                            <input
                                type="text"
                                value={customLocation}
                                onChange={(e) => setCustomLocation(e.target.value)}
                                className={`${inputClasses} mt-2`}
                                placeholder="Please specify location"
                            />
                        )}
                    </div>
                </div>
                <button
                    onClick={handleGetInsights}
                    disabled={loading || !finalJobTitle || !finalLocation}
                    className="w-full bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-focus transition disabled:bg-gray-500 flex items-center justify-center"
                >
                    {loading ? <Spinner /> : 'Get Insights'}
                </button>
                {error && <p className="text-red-500 text-center mt-4">{error}</p>}
            </div>

            {result && result.data && (
                <div className="animate-fade-in space-y-6">
                    <div className="bg-surface p-6 rounded-xl">
                        <h2 className="text-2xl font-bold mb-4">Insights for <span className="text-primary">{finalJobTitle}</span> in <span className="text-primary">{finalLocation}</span></h2>
                        <p className="text-text-secondary">{result.data.marketSummary}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-surface p-6 rounded-xl">
                            <h3 className="font-semibold text-lg text-primary mb-3">Average Salary Range</h3>
                            <p className="text-3xl font-bold text-text-primary">{result.data.salaryRange}</p>
                            <p className="text-sm text-text-secondary mt-1">Note: This is an estimate based on available market data and may vary.</p>
                        </div>
                        <div className="bg-surface p-6 rounded-xl">
                            <h3 className="font-semibold text-lg text-primary mb-3">Hiring Difficulty</h3>
                            <div className="flex items-center gap-2">
                                <p className="text-3xl font-bold text-text-primary">{result.data.hiringDifficulty} / 10</p>
                                <div className="w-full bg-border rounded-full h-4 mt-1">
                                    <div className="bg-primary h-4 rounded-full" style={{ width: `${result.data.hiringDifficulty * 10}%` }}></div>
                                </div>
                            </div>
                             <p className="text-sm text-text-secondary mt-1">Score from 1 (Easy) to 10 (Very Difficult).</p>
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-xl">
                        <h3 className="font-semibold text-lg text-primary mb-3">Top In-Demand Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {result.data.inDemandSkills.map((skill, i) => (
                                <span key={i} className="bg-background text-primary px-3 py-1 rounded-full text-sm font-medium">{skill}</span>
                            ))}
                        </div>
                    </div>

                    {result.sources && result.sources.length > 0 && (
                        <div className="bg-surface p-6 rounded-xl">
                            <h3 className="font-semibold text-lg text-text-primary mb-3">Sources from Google Search</h3>
                            <ul className="space-y-2">
                                {result.sources.map((source, i) => (
                                    source.web && (
                                        <li key={i} className="flex items-center gap-3">
                                            <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0"></span>
                                            <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm truncate">
                                                {source.web.title || source.web.uri}
                                            </a>
                                        </li>
                                    )
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MarketInsights;