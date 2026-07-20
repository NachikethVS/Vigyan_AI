

import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { getLearningResources, generateCareerQuests, LearningHubResult } from '../services/geminiService';
import Spinner from './Spinner';
import { LearningResource, View, Quest } from '../types';
// FIX: Import LearningHubIcon to fix 'Cannot find name' error.
import { ArrowUpRightIcon, ChevronDownIcon, ArticleIcon, VideoIcon, CourseIcon, QuestIcon, LearningHubIcon } from './icons';
import BackButton from './BackButton';

// --- Sub-components ---

const ResourceCard: React.FC<{ resource: LearningResource, icon: React.ReactNode }> = ({ resource, icon }) => (
    <a href={resource.link} target="_blank" rel="noopener noreferrer" className="group block bg-background p-5 rounded-lg border border-border hover:border-primary hover:-translate-y-0.5 transform transition-all duration-300 relative">
        <div className="flex items-start gap-4">
            <div className="text-primary mt-1 flex-shrink-0">{icon}</div>
            <div className="flex-1">
                <h4 className="font-bold text-text-primary group-hover:text-primary transition-colors">{resource.title}</h4>
                <p className="text-sm text-text-secondary mt-1">{resource.summary}</p>
            </div>
            <ArrowUpRightIcon className="w-4 h-4 text-text-secondary transition-all opacity-0 group-hover:opacity-100 group-hover:text-primary absolute top-4 right-4" />
        </div>
    </a>
);

const categoryStyles: { [key: string]: { border: string, tag: string } } = {
    'Skill Development': { border: 'border-sky-500', tag: 'bg-sky-500/20 text-sky-300' },
    'Portfolio Building': { border: 'border-emerald-500', tag: 'bg-emerald-500/20 text-emerald-300' },
    'Networking': { border: 'border-amber-500', tag: 'bg-amber-500/20 text-amber-300' },
    'Job Readiness': { border: 'border-violet-500', tag: 'bg-violet-500/20 text-violet-300' },
};
const defaultStyle = { border: 'border-border', tag: 'bg-primary/20 text-primary' };
const getCategoryStyle = (category: string) => categoryStyles[category] || defaultStyle;

const difficultyStyles: { [key: string]: string } = {
    'Beginner': 'bg-green-500/20 text-green-300',
    'Intermediate': 'bg-yellow-500/20 text-yellow-300',
    'Advanced': 'bg-red-500/20 text-red-300',
};

const QuestCard: React.FC<{ quest: Quest; onComplete: (id: string, xp: number) => void; }> = ({ quest, onComplete }) => (
    <div className={`bg-background p-5 rounded-lg transition-shadow hover:shadow-xl border-l-4 ${getCategoryStyle(quest.category).border}`}>
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center flex-wrap gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getCategoryStyle(quest.category).tag}`}>{quest.category}</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${difficultyStyles[quest.difficulty]}`}>{quest.difficulty}</span>
                </div>
                <h4 className="font-bold text-lg mt-2 text-text-primary">{quest.title}</h4>
                <p className="text-sm text-text-secondary mt-1">{quest.description}</p>
            </div>
            <div className="text-right ml-4 flex-shrink-0">
                <p className="font-bold text-green-400 text-lg">{quest.xp} XP</p>
            </div>
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
            {quest.youtubeSearchQuery ? (
                <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(quest.youtubeSearchQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-red-500 hover:text-red-400 font-semibold transition-colors"
                    aria-label={`Watch guide for ${quest.title} on YouTube`}
                >
                    <VideoIcon className="w-5 h-5" />
                    <span>Watch Guide</span>
                </a>
            ) : <div />}
            <button
                onClick={() => onComplete(quest.id, quest.xp)}
                className="bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-emerald-500 transition text-sm"
                aria-label={`Mark quest ${quest.title} as complete`}
            >
                Mark as Complete
            </button>
        </div>
    </div>
);


// --- Main Component ---

type MainTab = 'resources' | 'quests';
type ResourceSubTab = 'articles' | 'videos' | 'courses';

interface LearningHubProps {
    setView: (view: View) => void;
}

const LearningHub: React.FC<LearningHubProps> = ({ setView }) => {
    const { profile } = useAppContext();
    const [skill, setSkill] = useState('');
    const [resourceResult, setResourceResult] = useState<LearningHubResult | null>(null);
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [mainTab, setMainTab] = useState<MainTab>('resources');
    const [resourceSubTab, setResourceSubTab] = useState<ResourceSubTab>('articles');
    
    // Quest related state
    const [xp, setXp] = useState(0);
    const [completedQuests, setCompletedQuests] = useState<string[]>([]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        try {
            const savedXp = localStorage.getItem('careerQuestXp');
            const savedCompleted = localStorage.getItem('careerQuestCompleted');
            if (savedXp) setXp(JSON.parse(savedXp));
            if (savedCompleted) setCompletedQuests(JSON.parse(savedCompleted));
        } catch (err) {
            console.error("Failed to load quest data from localStorage", err);
        }
    }, []);

    useEffect(() => {
        if (resourceResult) {
            if (resourceResult.resources.articles?.length > 0) setResourceSubTab('articles');
            else if (resourceResult.resources.videos?.length > 0) setResourceSubTab('videos');
            else if (resourceResult.resources.courses?.length > 0) setResourceSubTab('courses');
        }
    }, [resourceResult]);

    const handleCompleteQuest = (questId: string, xpValue: number) => {
        if (completedQuests.includes(questId)) return;
        const newCompletedQuests = [...completedQuests, questId];
        const newXp = xp + xpValue;

        setCompletedQuests(newCompletedQuests);
        setXp(newXp);

        try {
            localStorage.setItem('careerQuestCompleted', JSON.stringify(newCompletedQuests));
            localStorage.setItem('careerQuestXp', JSON.stringify(newXp));
        } catch (err) {
            console.error("Failed to save quest data to localStorage", err);
        }
    };
    
    const staticSuggestions = ['React', 'JavaScript', 'Python', 'SQL', 'Data Analysis', 'Project Management', 'UI/UX Design', 'Node.js', 'AWS', 'Public Speaking', 'Leadership', 'Digital Marketing'];
    const suggestedSkills = Array.from(new Set([...profile.skills, ...profile.interests, ...staticSuggestions])).filter(Boolean);
    const filteredSuggestions = skill ? suggestedSkills.filter(s => s.toLowerCase().includes(skill.toLowerCase()) && s.toLowerCase() !== skill.toLowerCase()) : suggestedSkills;

    const handleSearch = async (skillToSearch?: string) => {
        const searchSkill = skillToSearch || skill;
        if (!searchSkill) {
            setError('Please enter a skill to search for.');
            return;
        }
        if (!profile.name) {
            setError('Please complete your profile first for personalized results.');
            return;
        }
        setLoading(true);
        setError('');
        setResourceResult(null);
        setQuests([]);
        try {
            const [resourcesData, questsData] = await Promise.all([
                getLearningResources(profile, searchSkill),
                generateCareerQuests(profile, searchSkill)
            ]);
            setResourceResult(resourcesData);
            setQuests(questsData);
            setMainTab('resources');
        } catch (err: any) {
            setError(err.message || 'Failed to find resources or quests. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAndSearch = (selectedSkill: string) => {
        setSkill(selectedSkill);
        setIsDropdownOpen(false);
        handleSearch(selectedSkill);
    };

    const activeQuests = quests.filter(q => !completedQuests.includes(q.id));
    const iconClass = "w-6 h-6";

    return (
        <div className="max-w-4xl mx-auto">
            <BackButton setView={setView} />
            <div className="flex justify-between items-center mb-2">
                 <h1 className="text-3xl font-bold">AI Learning Hub</h1>
                 <div className="bg-surface p-2 rounded-lg text-right">
                    <div className="text-xs text-text-secondary">TOTAL XP</div>
                    <div className="text-xl font-bold text-primary">{xp}</div>
                 </div>
            </div>
            <p className="text-text-secondary mb-6">Find curated resources and complete skill-based quests to accelerate your learning.</p>

            {/* Search Bar */}
            <div className="bg-surface p-6 rounded-xl shadow-lg space-y-4 mb-8">
                 <div className="relative" ref={dropdownRef}>
                    <div className="flex flex-col sm:flex-row items-stretch gap-2">
                        <div className="relative flex-grow">
                            <input type="text" value={skill} onChange={e => {setSkill(e.target.value); if(!isDropdownOpen) setIsDropdownOpen(true);}} onFocus={() => setIsDropdownOpen(true)} onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()} placeholder="e.g., Python, Data Structures, Public Speaking..." className="w-full p-3 pr-10 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"/>
                            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} title="Show suggestions" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-white transition-colors" aria-haspopup="true" aria-expanded={isDropdownOpen}><ChevronDownIcon className="w-5 h-5" /></button>
                        </div>
                        <button onClick={() => handleSearch()} disabled={loading || !profile.name || !skill} className="bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-focus transition disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center">
                            {loading ? <Spinner /> : 'Search'}
                        </button>
                    </div>
                    {isDropdownOpen && <div className="absolute z-10 top-full mt-2 w-full bg-surface border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto animate-fade-in"><ul className="p-1" role="listbox">{filteredSuggestions.length > 0 ? filteredSuggestions.map((s, i) => (<li key={i} onClick={() => handleSelectAndSearch(s)} className="px-3 py-2 text-sm text-text-secondary hover:bg-border hover:text-white cursor-pointer rounded-md" role="option" aria-selected={false}>{s}</li>)) : <li className="px-3 py-2 text-sm text-text-secondary italic">{skill ? "No matching skills found." : "No suggestions available."}</li>}</ul></div>}
                </div>
                 {!profile.name && <p className="text-yellow-400 text-center text-sm">Please complete your user profile to get personalized results.</p>}
                 {error && <p className="text-red-500 text-center mt-2">{error}</p>}
            </div>
            
            {loading && <div className="flex justify-center items-center p-8"><Spinner /></div>}

            {(resourceResult || quests.length > 0) && (
                 <div className="animate-fade-in">
                    <div className="border-b border-border mb-6">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <button onClick={() => setMainTab('resources')} className={`flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${mainTab === 'resources' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-white'}`}><LearningHubIcon className="w-5 h-5"/> Learning Resources</button>
                            <button onClick={() => setMainTab('quests')} className={`flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${mainTab === 'quests' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-white'}`}><QuestIcon className="w-5 h-5"/> Skill Quests</button>
                        </nav>
                    </div>
                    
                    {mainTab === 'resources' && (
                        <div className="bg-surface p-6 rounded-xl">
                            {/* Resource rendering logic */}
                            {(() => {
                                const tabs = [{ id: 'articles', label: 'Articles', data: resourceResult?.resources.articles, icon: <ArticleIcon className={iconClass}/> }, { id: 'videos', label: 'Videos', data: resourceResult?.resources.videos, icon: <VideoIcon className={iconClass}/> }, { id: 'courses', label: 'Courses', data: resourceResult?.resources.courses, icon: <CourseIcon className={iconClass}/> }];
                                const activeTabData = tabs.find(t => t.id === resourceSubTab)?.data || [];
                                const noResults = !tabs.some(t => t.data && t.data.length > 0);
                                if (noResults) return <div className="text-center py-8"><h3 className="text-xl font-bold">No Learning Resources Found</h3><p className="text-text-secondary mt-2">Try searching for a different skill.</p></div>
                                
                                return <>
                                    <div className="border-b border-border mb-4"><nav className="-mb-px flex space-x-6">{tabs.map(tab => (tab.data && tab.data.length > 0) && <button key={tab.id} onClick={() => setResourceSubTab(tab.id as ResourceSubTab)} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${resourceSubTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-white hover:border-gray-500'}`} aria-current={resourceSubTab === tab.id ? 'page' : undefined}>{tab.label} <span className="bg-background text-xs font-semibold px-2 py-0.5 rounded-full ml-1">{tab.data.length}</span></button>)}</nav></div>
                                    <div className="space-y-3">{activeTabData.map((res, i) => <ResourceCard key={i} resource={res} icon={tabs.find(t=>t.id===resourceSubTab)!.icon} />)}</div>
                                </>
                            })()}
                        </div>
                    )}

                    {mainTab === 'quests' && (
                        <div className="space-y-4">
                            {activeQuests.length > 0 ? activeQuests.map(quest => <QuestCard key={quest.id} quest={quest} onComplete={handleCompleteQuest} />) : <div className="text-center bg-surface p-8 rounded-xl"><h3 className="text-xl font-bold">No Quests Available</h3><p className="text-text-secondary mt-2">We couldn't generate any quests for this skill, or you've completed them all!</p></div>}
                        </div>
                    )}
                    
                    {resourceResult?.sources && resourceResult.sources.length > 0 && mainTab === 'resources' && (
                        <div className="bg-surface p-6 rounded-xl mt-8">
                            <h3 className="font-semibold text-lg text-text-primary mb-3">Sources from Google Search</h3>
                            <ul className="space-y-2">{resourceResult.sources.map((source, i) => source.web && <li key={i} className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0"></span><a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm truncate">{source.web.title || source.web.uri}</a></li>)}</ul>
                        </div>
                    )}
                 </div>
            )}
        </div>
    );
};

export default LearningHub;