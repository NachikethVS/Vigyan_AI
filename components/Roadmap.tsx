import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { generateCareerRoadmap } from '../services/geminiService';
import Spinner from './Spinner';
import { RoadmapData, View } from '../types';
import BackButton from './BackButton';
import { GrowthChartIcon, ProfileIcon, RoadmapIcon } from './icons';

interface RoadmapProps {
    setView: (view: View) => void;
}

const Roadmap: React.FC<RoadmapProps> = ({ setView }) => {
    const { profile } = useAppContext();
    const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!profile.name) {
            setError('Please complete your profile first.');
            return;
        }
        setLoading(true);
        setError('');
        setRoadmap(null);
        try {
            const data = await generateCareerRoadmap(profile);
            setRoadmap(data);
        } catch (err) {
            setError('Failed to generate roadmap. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <BackButton setView={setView} />
            <h1 className="text-3xl font-bold mb-2">AI Career Roadmap</h1>
            <p className="text-text-secondary mb-6">Generate a personalized, long-term career plan based on your profile.</p>

            <div className="bg-surface p-6 rounded-xl shadow-lg">
                <button
                    onClick={handleGenerate}
                    disabled={loading || !profile.name}
                    className="w-full bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-focus transition disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {loading ? <Spinner /> : 'Generate My Roadmap'}
                </button>
                {!profile.name && <p className="text-yellow-400 text-center mt-4">Please complete your user profile to generate a roadmap.</p>}
            </div>

            {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
            
            {roadmap && (
                <div className="mt-8 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Roles & Trends */}
                        <div className="lg:col-span-1 space-y-8">
                            <div className="bg-surface p-6 rounded-xl shadow-lg border border-border">
                                <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-3">
                                    <ProfileIcon className="w-6 h-6" />
                                    <span>Recommended Roles</span>
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {roadmap.recommendedRoles.map((role, i) => (
                                        <span key={i} className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium">{role}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-surface p-6 rounded-xl shadow-lg border border-border">
                                <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-3">
                                    <GrowthChartIcon className="w-6 h-6" />
                                    <span>Industry Trends</span>
                                </h2>
                                <p className="text-text-secondary whitespace-pre-wrap leading-relaxed">{roadmap.industryTrends}</p>
                            </div>
                        </div>

                        {/* Right Column: Timeline */}
                        <div className="lg:col-span-2 bg-surface p-6 rounded-xl shadow-lg border border-border">
                            <h2 className="text-2xl font-bold text-primary mb-8 flex items-center gap-3">
                                <RoadmapIcon className="w-7 h-7" />
                                <span>Your Development Timeline</span>
                            </h2>
                            <div className="relative">
                                {roadmap.timeline.map((item, i) => (
                                    <div key={i} className="relative pl-8 sm:pl-12 py-4 group">
                                        {/* Vertical line segment */}
                                        <div className="absolute top-0 left-2 h-full w-0.5 bg-border group-last:hidden"></div>
                                        
                                        {/* Node */}
                                        <div className="absolute top-5 -left-[6px] w-5 h-5 bg-surface border-4 border-primary rounded-full"></div>
                                        
                                        {/* Content */}
                                        <div className="transition-transform duration-300 group-hover:translate-x-1">
                                            <p className="text-sm font-semibold text-primary">{item.timeframe}</p>
                                            <h3 className="font-bold text-xl text-text-primary mt-1">{item.milestone}</h3>
                                            <p className="text-text-secondary mt-2 leading-relaxed">{item.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Roadmap;