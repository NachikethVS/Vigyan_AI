
import React, { useState, useEffect } from 'react';
import { AppContextProvider } from './context/AppContext';
import { User, View } from './types';
import Dashboard from './components/Dashboard';
import UserProfile from './components/UserProfile';
import Roadmap from './components/Roadmap';
import SkillGap from './components/SkillGap';
import ResumeAnalyzer from './components/ResumeAnalyzer';
import ProjectIdeas from './components/ProjectIdeas';
import Networking from './components/Networking';
import Header from './components/Header';
import FocusReports from './components/FocusReports';
import CompanySkillMaps from './components/CompanySkillMaps';
import FutureProofScore from './components/FutureProofScore';
import SkillEvolutionTimeline from './components/SkillEvolutionTimeline';
import LivePitchPractice from './components/LivePitchPractice';
import LearningHub from './components/LearningHub';
import CoverLetterGenerator from './components/CoverLetterGenerator';
import JobApplicationTracker from './components/JobApplicationTracker';
import InterviewPrep from './components/InterviewPrep';
import CandidateScreener from './components/CandidateScreener';
import AIJobDescription from './components/JobDescriptionCopilot';
import MarketInsights from './components/MarketInsights';
import AsyncInterviewAnalysis from './components/AsyncInterviewAnalysis';
import OnboardingPlanGenerator from './components/OnboardingPlanGenerator';
import { addUserToDB, getUserFromDB } from './services/storageService';
import { LogoIcon } from './components/icons';
import Spinner from './components/Spinner';
import AIVoiceAssistant from './components/AIVoiceAssistant';

// --- Main Application Component (Authenticated View) ---

type UserRole = 'student' | 'recruiter';

const MainApp: React.FC = () => {
    const [view, setView] = useState<View>(View.DASHBOARD);
    const [userRole, setUserRole] = useState<UserRole>(() => {
        return (localStorage.getItem('userRole') as UserRole) || 'student';
    });

    const handleSetUserRole = (role: UserRole) => {
        localStorage.setItem('userRole', role);
        setUserRole(role);
        setView(View.DASHBOARD);
    };

    const renderStudentView = () => {
         switch (view) {
            case View.DASHBOARD: return <Dashboard setView={setView} userRole="student" />;
            case View.PROFILE: return <UserProfile setView={setView} />;
            case View.ROADMAP: return <Roadmap setView={setView} />;
            case View.SKILL_GAP: return <SkillGap setView={setView} />;
            case View.INTERVIEW_PREP: return <InterviewPrep setView={setView} />;
            case View.RESUME_ANALYZER: return <ResumeAnalyzer setView={setView} />;
            case View.PROJECT_IDEAS: return <ProjectIdeas setView={setView} />;
            case View.NETWORKING: return <Networking setView={setView} />;
            case View.FOCUS_REPORTS: return <FocusReports setView={setView} />;
            case View.COMPANY_SKILL_MAPS: return <CompanySkillMaps setView={setView} />;
            case View.FUTURE_PROOF_SCORE: return <FutureProofScore setView={setView} />;
            case View.SKILL_EVOLUTION_TIMELINE: return <SkillEvolutionTimeline setView={setView} />;
            case View.LIVE_PITCH_PRACTICE: return <LivePitchPractice setView={setView} />;
            case View.LEARNING_HUB: return <LearningHub setView={setView} />;
            case View.COVER_LETTER_GENERATOR: return <CoverLetterGenerator setView={setView} />;
            case View.JOB_APPLICATION_TRACKER: return <JobApplicationTracker setView={setView} />;
            case View.AI_VOICE_ASSISTANT: return <AIVoiceAssistant setView={setView} />;
            default: return <Dashboard setView={setView} userRole="student" />;
        }
    };

    const renderRecruiterView = () => {
        switch (view) {
            case View.DASHBOARD: return <Dashboard setView={setView} userRole="recruiter" />;
            case View.CANDIDATE_SCREENER: return <CandidateScreener setView={setView} />;
            case View.AI_JOB_DESCRIPTION: return <AIJobDescription setView={setView} />;
            case View.MARKET_INSIGHTS: return <MarketInsights setView={setView} />;
            case View.ASYNC_INTERVIEW_ANALYSIS: return <AsyncInterviewAnalysis setView={setView} />;
            case View.ONBOARDING_PLAN_GENERATOR: return <OnboardingPlanGenerator setView={setView} />;
            default: return <Dashboard setView={setView} userRole="recruiter" />;
        }
    };

    return (
        <div className="flex h-screen bg-background text-text-primary">
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header setView={setView} userRole={userRole} setUserRole={handleSetUserRole} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6 md:p-8">
                    <div className="animate-fade-in">
                        {userRole === 'student' ? renderStudentView() : renderRecruiterView()}
                    </div>
                </main>
            </div>
        </div>
    );
};


// --- Authentication Screen Component (Login/Signup) ---

const LoginSignup: React.FC<{ onLoginSuccess: (username: string) => void }> = ({ onLoginSuccess }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLoginView) {
                const user = await getUserFromDB(username);
                if (user && user.password === password) {
                    onLoginSuccess(username);
                } else {
                    setError('Invalid username or password.');
                }
            } else {
                const existingUser = await getUserFromDB(username);
                if (existingUser) {
                    setError('Username already exists. Please choose another.');
                } else if (username.length < 3 || password.length < 4) {
                    setError('Username must be at least 3 characters and password at least 4.');
                } else {
                    await addUserToDB({ username, password });
                    onLoginSuccess(username);
                }
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    const inputClasses = "w-full px-4 py-3 bg-slate-800/50 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition";

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-md m-4 p-8 bg-surface/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-border animate-slide-in-up">
                <div className="text-center mb-8">
                    <LogoIcon className="w-12 h-12 text-primary mx-auto mb-3" />
                    <h1 className="text-3xl font-bold">Welcome to Vigyan AI</h1>
                    <p className="text-text-secondary mt-2">{isLoginView ? "Sign in to continue" : "Create your account"}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="username" className="block text-sm font-bold text-text-primary mb-2">Username</label>
                        <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} className={inputClasses} required />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-bold text-text-primary mb-2">Password</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClasses} required />
                    </div>
                    
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-focus transition disabled:bg-gray-500 flex items-center justify-center">
                        {loading ? <Spinner /> : (isLoginView ? 'Login' : 'Sign Up')}
                    </button>
                </form>

                <p className="text-center text-sm text-text-secondary mt-6">
                    {isLoginView ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => { setIsLoginView(!isLoginView); setError('') }} className="font-semibold text-primary hover:underline ml-2">
                        {isLoginView ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    );
};


// --- API Key Setup Screen ---

const ApiKeyPrompt: React.FC<{ onKeySet: () => void }> = ({ onKeySet }) => {
    const [key, setKey] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (key.trim()) {
            localStorage.setItem('geminiApiKey', key.trim());
            onKeySet();
        }
    };
    
    const inputClasses = "w-full px-4 py-3 bg-slate-800/50 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition";

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-md m-4 p-8 bg-surface/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-border animate-slide-in-up">
                <div className="text-center mb-8">
                    <LogoIcon className="w-12 h-12 text-primary mx-auto mb-3" />
                    <h1 className="text-3xl font-bold">Set API Key</h1>
                    <p className="text-text-secondary mt-2">Please enter your Gemini API key to continue.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="apiKey" className="block text-sm font-bold text-text-primary mb-2">Gemini API Key</label>
                        <input 
                            type="password" 
                            id="apiKey" 
                            value={key} 
                            onChange={(e) => setKey(e.target.value)} 
                            placeholder="AIzaSy..."
                            className={inputClasses} 
                            required 
                        />
                    </div>
                    
                    <button type="submit" className="w-full bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-focus transition flex items-center justify-center">
                        Save Key
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- App Entry Point ---

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasApiKey, setHasApiKey] = useState<boolean>(!!localStorage.getItem('geminiApiKey'));

    useEffect(() => {
        // Check session storage for a logged-in user when the app loads.
        // This provides session persistence for the duration of the tab.
        const loggedInUser = sessionStorage.getItem('currentUser');
        if (loggedInUser) {
            setCurrentUser(loggedInUser);
        }
        setIsLoading(false);
    }, []);

    const handleLogin = (username: string) => {
        sessionStorage.setItem('currentUser', username);
        setCurrentUser(username);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('currentUser');
        setCurrentUser(null);
    };

    const handleApiKeySet = () => {
        setHasApiKey(true);
    };
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Spinner />
            </div>
        );
    }

    if (!hasApiKey) {
        return <ApiKeyPrompt onKeySet={handleApiKeySet} />;
    }

    if (!currentUser) {
        return <LoginSignup onLoginSuccess={handleLogin} />;
    }

    return (
        <AppContextProvider currentUser={currentUser} logout={handleLogout}>
            <MainApp />
        </AppContextProvider>
    );
};

export default App;
