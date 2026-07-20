

export interface User {
    username: string;
    // In a real application, this would be a securely hashed password.
    // For this client-side simulation, we're storing it as plain text.
    password?: string; 
}

export interface UserProfile {
    name: string;
    status: 'Student' | 'Professional' | '';
    fieldOfStudy: string;
    yearOfStudy: string | '';
    yearsOfExperience: string | '';
    skills: string[];
    interests: string[];
    careerAspirations: string;
    profilePicture?: string;
}

export interface FocusReport {
    id: string;
    date: string;
    duration: number; // in seconds
    focusScore: number;
    distractions: number;
    distractionSeconds: number;
    username: string; // Associate report with a user
}

export interface SkillMapAnalysis {
    companyName: string;
    requiredSkills: string[];
    matchedSkills: string[];
    missingSkills: string[];
    analysisSummary: string;
}

// Fix: Add centralized types for API responses
export interface RoadmapData {
    recommendedRoles: string[];
    industryTrends: string;
    timeline: {
        timeframe: string;
        milestone: string;
        description: string;
    }[];
}

export interface SkillGapData {
    requiredSkills: string[];
    missingSkills: string[];
    learningPlan: {
        step: number;
        action: string;
        resources: string[];
    }[];
}

export interface ResumeAnalysisResult {
    matchScore?: number;
    feedback: {
        area: string;
        comment: string;
        suggestion: string;
    }[];
    updatedResumeText?: string;
    atsScore?: number;
    atsFeedback?: string;
}

export interface ProjectIdea {
    title: string;
    description: string;
    skillsShowcased: string[];
}

export interface Influencer {
    name: string;
    area: string;
}

export interface NetworkingData {
    influencers: Influencer[];
    communities: string[];
    events: string[];
    connectionTemplate: string;
}

export type QuestDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Quest {
    id: string;
    category: string;
    title: string;
    description: string;
    xp: number;
    difficulty: QuestDifficulty;
    youtubeSearchQuery?: string;
}

export interface FutureProofScoreData {
    score: number;
    summary: string;
    futureProofSkills: string[];
    atRiskSkills: string[];
    recommendedSkills: string[];
}

export interface SkillEvolutionData {
    skill: string;
    timeline: {
        year: string; // e.g., "Year 1", "Year 3", "Year 5"
        projectedProficiency: 'Novice' | 'Intermediate' | 'Advanced' | 'Expert';
        reasoning: string;
    }[];
}

export interface PitchAnalysisResult {
    transcript: string;
    contentClarity: {
        feedback: string;
        suggestions: string[];
    };
    vocalDelivery: {
        feedback: string;
        suggestions: string[];
    };
    visualPresence: {
        feedback: string;
        suggestions: string[];
    };
}

export interface LearningResource {
    title: string;
    link: string;
    summary: string;
}

export interface LearningHubData {
    articles: LearningResource[];
    videos: LearningResource[];
    courses: LearningResource[];
}

export interface CoverLetterResult {
    coverLetterText: string;
    keyPoints: {
        point: string;
        explanation: string;
    }[];
}

export interface InterviewQuestion {
    question: string;
    tips: string;
    category: string;
}

export type ApplicationStatus = 'Wishlist' | 'Applied' | 'Interviewing' | 'Offer' | 'Rejected';

export interface JobApplication {
    id: string;
    company: string;
    role: string;
    dateApplied: string;
    status: ApplicationStatus;
    jobDescriptionLink?: string;
    notes?: string;
    username: string; // Associate application with a user
}

export interface CandidateScreeningResult {
    matchScore: number;
    summary: string;
    strengths: string[];
    gaps: string[];
    interviewQuestions: string[];
}

export interface ScreenedCandidate extends CandidateScreeningResult {
    fileName: string;
    email?: string;
}

export interface JobDescriptionResult {
    jobDescription: string;
    suggestions: string[];
}

export interface MarketInsightsData {
    salaryRange: string;
    inDemandSkills: string[];
    hiringDifficulty: number;
    marketSummary: string;
}

export interface MarketInsightsResult {
    data: MarketInsightsData;
    sources: any[];
}

export interface AsyncInterviewAnalysisResult {
    overallSummary: string;
    communicationScore: number; // 0-100
    questionAnalyses: {
        question: string;
        transcript: string;
        feedback: string;
        clarityScore: number; // 0-100
    }[];
}

export interface OnboardingPlan {
    role: string;
    plan: {
        phase: 'First 30 Days' | 'First 60 Days' | 'First 90 Days';
        title: string;
        goals: string[];
        tasks: string[];
    }[];
}

// FIX: Add TranscriptEntry for AI Voice Assistant
export interface TranscriptEntry {
    speaker: 'user' | 'ai';
    text: string;
}

// FIX: Add VoiceConversation for AI Voice Assistant History
export interface VoiceConversation {
    id: string;
    timestamp: number;
    transcript: TranscriptEntry[];
    personality: 'Friendly' | 'Formal' | 'Concise';
    username: string;
}


export enum View {
    DASHBOARD = 'Dashboard',
    PROFILE = 'User Profile',
    ROADMAP = 'Career Roadmap',
    SKILL_GAP = 'Skill Gap Analysis',
    INTERVIEW_PREP = 'Interview Prep',
    RESUME_ANALYZER = 'Resume Analyzer',
    PROJECT_IDEAS = 'Project Ideas',
    NETWORKING = 'Networking',
    FOCUS_REPORTS = 'Focus Reports',
    COMPANY_SKILL_MAPS = 'Company Skill Maps',
    FUTURE_PROOF_SCORE = 'Future-Proof Score',
    SKILL_EVOLUTION_TIMELINE = 'Skill Evolution Timeline',
    LIVE_PITCH_PRACTICE = 'Live Pitch Practice',
    LEARNING_HUB = 'Learning Hub',
    COVER_LETTER_GENERATOR = 'AI Cover Letter Generator',
    JOB_APPLICATION_TRACKER = 'Job Application Tracker',
    CANDIDATE_SCREENER = 'Candidate Screener',
    AI_JOB_DESCRIPTION = 'AI Job Description',
    MARKET_INSIGHTS = 'Market & Salary Insights',
    ASYNC_INTERVIEW_ANALYSIS = 'Async Video Interview',
    ONBOARDING_PLAN_GENERATOR = 'Onboarding Plan Generator',
    AI_VOICE_ASSISTANT = 'AI Voice Assistant',
    // FIX: Add CAREER_QUEST to fix compile error in Sidebar.tsx
    CAREER_QUEST = 'Career Quest',
}

export interface Message {
    sender: 'user' | 'ai';
    text: string;
}

export interface InterviewReport {
    overallScore: number;
    summary: string;
    strengths: {
        area: string;
        feedback: string;
    }[];
    areasForImprovement: {
        area: string;
        feedback: string;
        suggestion: string;
    }[];
}