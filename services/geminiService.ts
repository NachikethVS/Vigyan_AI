

// Fix: Import centralized types for API responses
import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import { UserProfile, SkillMapAnalysis, RoadmapData, SkillGapData, ResumeAnalysisResult, ProjectIdea, NetworkingData, Quest, FutureProofScoreData, SkillEvolutionData, PitchAnalysisResult, LearningHubData, Message, InterviewReport, CoverLetterResult, InterviewQuestion, CandidateScreeningResult, JobDescriptionResult, MarketInsightsResult, MarketInsightsData, AsyncInterviewAnalysisResult, OnboardingPlan } from "../types";

const getAIClient = (): GoogleGenAI => {
    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
        throw new Error("Gemini API key is missing. Please set it in the app settings.");
    }
    return new GoogleGenAI({ apiKey });
};

const parseJsonResponse = <T>(responseText: string, functionName: string): T => {
    try {
        // The API can sometimes return JSON wrapped in markdown, or with leading/trailing text.
        // First, look for a markdown block.
        const markdownMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        
        let jsonString: string | null = null;

        if (markdownMatch && markdownMatch[1]) {
            jsonString = markdownMatch[1];
        } else {
            // If no markdown, find the first '{' or '[' and the last corresponding '}' or ']'
            const firstBracket = responseText.indexOf('{');
            const firstSquare = responseText.indexOf('[');
            
            let start = -1;

            if (firstBracket === -1 && firstSquare === -1) {
                // If no JSON object or array found, maybe it's a plain string that can be parsed
                // This is a last resort.
                return JSON.parse(responseText);
            }

            if (firstBracket === -1) {
                start = firstSquare;
            } else if (firstSquare === -1) {
                start = firstBracket;
            } else {
                start = Math.min(firstBracket, firstSquare);
            }
            
            const charStart = responseText[start];
            const charEnd = charStart === '{' ? '}' : ']';
            
            const end = responseText.lastIndexOf(charEnd);

            if (end === -1 || end < start) {
                 throw new Error("Mismatched JSON brackets.");
            }
            
            jsonString = responseText.substring(start, end + 1);
        }

        return JSON.parse(jsonString.trim());

    } catch (e) {
        console.error(`Failed to parse JSON response from AI in ${functionName}:`, responseText);
        console.error("Original parsing error:", e);
        throw new Error(`Failed to get a valid response from the AI. The format was incorrect.`);
    }
}

// Fix: Add explicit return type Promise<RoadmapData>
export const generateCareerRoadmap = async (profile: UserProfile): Promise<RoadmapData> => {
    const prompt = `Based on the following user profile, generate a detailed, long-term career roadmap.
    Profile:
    - Name: ${profile.name}
    - Status: ${profile.status}
    - Field of Study/Expertise: ${profile.fieldOfStudy}
    - Skills: ${profile.skills.join(', ')}
    - Interests: ${profile.interests.join(', ')}
    - Career Aspirations: ${profile.careerAspirations}
    
    The roadmap should include recommended job roles, an analysis of relevant industry trends, and a suggested timeline with key milestones.
    Structure the output as a JSON object.`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    recommendedRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
                    industryTrends: { type: Type.STRING },
                    timeline: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                timeframe: { type: Type.STRING },
                                milestone: { type: Type.STRING },
                                description: { type: Type.STRING },
                            }
                        }
                    }
                }
            }
        }
    });
    // Fix: Use generic type with parseJsonResponse
    return parseJsonResponse<RoadmapData>(response.text, 'generateCareerRoadmap');
};

// Fix: Add explicit return type Promise<SkillGapData>
export const analyzeSkillGap = async (currentSkills: string[], desiredRole: string): Promise<SkillGapData> => {
    const prompt = `Analyze the skill gap for a professional wanting to become a "${desiredRole}".
    Their current skills are: ${currentSkills.join(', ')}.
    
    Provide a personalized, step-by-step learning plan. Include suggestions for online courses or tutorials.
    Structure the output as a JSON object.`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                    missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                    learningPlan: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                step: { type: Type.INTEGER },
                                action: { type: Type.STRING },
                                resources: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                        }
                    }
                }
            }
        }
    });
    // Fix: Use generic type with parseJsonResponse
    return parseJsonResponse<SkillGapData>(response.text, 'analyzeSkillGap');
};


// Fix: Add explicit return type Promise<ResumeAnalysisResult>
export const analyzeResume = async (resumeText: string, jobDescription?: string): Promise<ResumeAnalysisResult> => {
    const prompt = `Act as an expert career coach and resume writer. Analyze the following resume.
    Resume Text: "${resumeText}"
    ${jobDescription ? `Job Description: "${jobDescription}"` : ''}

    Provide three things in your response:
    1. A detailed analysis report with actionable feedback on formatting, keywords, and content.
    2. A completely revised and improved version of the resume text ('updatedResumeText') that incorporates all your feedback. This revised text should be well-formatted, with clear sections (e.g., SUMMARY, EXPERIENCE, EDUCATION, SKILLS) and bullet points for job responsibilities.
    3. An ATS (Applicant Tracking System) compatibility score from 0-100 ('atsScore'), along with a brief explanation ('atsFeedback') of what to improve for better machine readability.

    If a job description is provided, also include a percentage match score.
    Structure the output as a single JSON object.`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    matchScore: { type: Type.NUMBER, description: "Only if job description is present" },
                    atsScore: { type: Type.INTEGER, description: "ATS compatibility score from 0-100" },
                    atsFeedback: { type: Type.STRING, description: "Feedback for improving ATS score." },
                    feedback: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                area: { type: Type.STRING },
                                comment: { type: Type.STRING },
                                suggestion: { type: Type.STRING },
                            }
                        }
                    },
                    updatedResumeText: { type: Type.STRING, description: "The full, revised resume text." }
                }
            }
        }
    });
    // Fix: Use generic type with parseJsonResponse
    return parseJsonResponse<ResumeAnalysisResult>(response.text, 'analyzeResume');
};

// Fix: Add explicit return type Promise<ProjectIdea[]>
export const generateProjectIdeas = async (profile: UserProfile): Promise<ProjectIdea[]> => {
    const prompt = `Based on the user's skills (${profile.skills.join(', ')}) and desired career path (${profile.careerAspirations}), generate 3 practical and impressive project ideas.
    For each suggestion, include a project title, a clear description, and a list of key skills the project would showcase.
    Structure the output as a JSON object.`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        skillsShowcased: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        }
    });
    // Fix: Use generic type with parseJsonResponse
    return parseJsonResponse<ProjectIdea[]>(response.text, 'generateProjectIdeas');
};

// Fix: Add explicit return type Promise<NetworkingData>
export const getNetworkingRecommendations = async (profile: UserProfile): Promise<NetworkingData> => {
    const prompt = `Based on the user's interests (${profile.interests.join(', ')}) and career aspirations (${profile.careerAspirations}), provide networking recommendations.
    Suggest 3-5 influential people to follow, including their name and their area of expertise (e.g., "Frontend Development", "AI Research").
    Suggest relevant online communities to join and industry events to attend.
    Also, provide a pre-written, customizable template for a professional connection request message (e.g., for LinkedIn).
    Structure the output as a JSON object.`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    influencers: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: "The full name of the influential person." },
                                area: { type: Type.STRING, description: "Their primary area of expertise or influence." }
                            }
                        }
                    },
                    communities: { type: Type.ARRAY, items: { type: Type.STRING } },
                    events: { type: Type.ARRAY, items: { type: Type.STRING } },
                    connectionTemplate: { type: Type.STRING }
                }
            }
        }
    });
    // Fix: Use generic type with parseJsonResponse
    return parseJsonResponse<NetworkingData>(response.text, 'getNetworkingRecommendations');
};

export const createInterviewChat = (jobRole: string): Chat => {
    return getAIClient().chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `You are an expert interviewer conducting a mock interview for a ${jobRole} position. Ask relevant technical and behavioral questions one by one. After each user answer, provide brief, constructive feedback before asking the next question. Start the interview now with your first question.`
        },
    });
};

export const generateInterviewReport = async (messages: Message[], jobRole: string): Promise<InterviewReport> => {
    const transcript = messages.map(msg => `${msg.sender === 'user' ? 'Candidate' : 'Interviewer'}: ${msg.text}`).join('\n');

    const prompt = `Act as an expert career coach providing feedback on a mock interview.
    The candidate is interviewing for a "${jobRole}" position.
    Based on the following interview transcript, provide a detailed performance report.
    
    Transcript:
    ---
    ${transcript}
    ---

    Your report should include:
    1.  An overall performance score from 0 to 100.
    2.  A brief summary of the candidate's performance.
    3.  A list of specific strengths, identifying the area (e.g., "Technical Explanation", "Problem-Solving Approach") and providing feedback.
    4.  A list of areas for improvement, identifying the area, providing feedback, and offering an actionable suggestion.

    Structure the output as a single, valid JSON object.`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    overallScore: { type: Type.INTEGER, description: "Overall score from 0 to 100." },
                    summary: { type: Type.STRING, description: "A brief summary of the performance." },
                    strengths: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                area: { type: Type.STRING },
                                feedback: { type: Type.STRING }
                            }
                        }
                    },
                    areasForImprovement: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                area: { type: Type.STRING },
                                feedback: { type: Type.STRING },
                                suggestion: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        }
    });

    return parseJsonResponse<InterviewReport>(response.text, 'generateInterviewReport');
};


// Fix: Add explicit return type Promise<Quest[]>
export const generateCareerQuests = async (profile: UserProfile, skill?: string): Promise<Quest[]> => {
    const userLevel = profile.status === 'Student' && profile.yearOfStudy
        ? `a student in their ${profile.yearOfStudy}`
        : profile.status === 'Professional' && profile.yearsOfExperience
        ? `a professional with ${profile.yearsOfExperience} of experience`
        : 'an aspiring professional';

    const skillInstruction = skill 
        ? `**Crucially, these quests MUST be directly related to learning, practicing, and mastering the skill: "${skill}".** They should be practical tasks that help a user get better at this specific skill.`
        : "The quests should be for their general career development.";

    const prompt = `Based on the user's profile, who is ${userLevel}, generate a list of 5-7 actionable "quests". Tailor the difficulty of the quests to their experience level.
    
    ${skillInstruction}

    User Profile:
    - Skills: ${profile.skills.join(', ')}
    - Aspirations: ${profile.careerAspirations}

    Each quest must be a clear, completable task.
    Categorize quests into areas like 'Skill Development', 'Portfolio Building', 'Networking', and 'Job Readiness'.
    For each quest, provide a title, a short description, an XP (Experience Points) value between 50 and 250, a difficulty level ('Beginner', 'Intermediate', or 'Advanced'), and a 'youtubeSearchQuery'.
    The 'youtubeSearchQuery' should be a concise and effective search string to find a step-by-step guide for the quest on YouTube (e.g., for a quest to "Build a To-Do List app", a good query is "react todo list tutorial for beginners").
    Structure the output as a JSON array of objects.`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING, description: "A unique ID for the quest, e.g., 'skill-python-1'" },
                        category: { type: Type.STRING },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        xp: { type: Type.INTEGER },
                        difficulty: { type: Type.STRING, description: "The difficulty of the quest: 'Beginner', 'Intermediate', or 'Advanced'." },
                        youtubeSearchQuery: { type: Type.STRING, description: "A concise YouTube search query for a tutorial." }
                    }
                }
            }
        }
    });
    // Fix: Use generic type with parseJsonResponse
    return parseJsonResponse<Quest[]>(response.text, 'generateCareerQuests');
};

export interface SkillMapResult {
    analysis: SkillMapAnalysis;
    sources: any[];
}

export const generateCompanySkillMap = async (profile: UserProfile, companyName: string): Promise<SkillMapResult> => {
    const prompt = `Act as an expert career analyst. Use your search tool to find the top 10 most in-demand technical and soft skills for software engineering and related roles at "${companyName}" based on their recent job postings and company culture.
    Then, compare these required skills against the user's current skills provided below.
    User's Skills: ${profile.skills.join(', ')}

    Provide a summary of your findings.
    
    Respond ONLY with a single, valid JSON object. Do not include any text, markdown formatting, or explanations before or after the JSON object.
    The JSON object must have the following structure:
    {
      "companyName": "${companyName}",
      "requiredSkills": ["skill1", "skill2", ...],
      "matchedSkills": ["skill1", "skill2", ...],
      "missingSkills": ["skill1", "skill2", ...],
      "analysisSummary": "A brief summary of how the user's skills align with the company's needs and suggestions for improvement."
    }`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const analysis = parseJsonResponse<SkillMapAnalysis>(response.text, 'generateCompanySkillMap');
    return { analysis, sources };
};

// Fix: Add explicit return type Promise<FutureProofScoreData>
export const getFutureProofScore = async (profile: UserProfile): Promise<FutureProofScoreData> => {
    const prompt = `Act as a senior career analyst and futurist. Analyze the user's profile to determine how "future-proof" their skillset is for achieving their stated career aspirations, considering projected industry trends for the next 5-10 years.
    
    **Crucially, the score and analysis must heavily weigh the user's 'careerAspirations'. The primary goal is to assess their readiness for their desired career path, not just general future trends.**
    
    User's Profile:
    - Field of Study/Expertise: ${profile.fieldOfStudy}
    - Skills: ${profile.skills.join(', ')}
    - Career Aspirations: ${profile.careerAspirations}

    Provide a "Future-Proof Score" from 0 to 100, where 100 means their skillset is perfectly aligned with the future requirements of their aspired career.
    
    Provide a detailed analysis including:
    1.  A summary explaining the score, focusing on how their skills align with their career goals.
    2.  A list of their skills that are highly relevant and future-proof for their chosen career path.
    3.  A list of skills that might be less relevant or at risk within their aspired field.
    4.  A list of recommended emerging skills they should learn specifically to advance towards their career aspirations.

    Structure the output as a single JSON object.`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    score: { type: Type.INTEGER, description: "A score from 0 to 100." },
                    summary: { type: Type.STRING, description: "A detailed summary explaining the score." },
                    futureProofSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "User's skills that are in high demand for the future." },
                    atRiskSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "User's skills that may become less relevant." },
                    recommendedSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Emerging skills the user should learn." }
                }
            }
        }
    });
    // Fix: Use generic type with parseJsonResponse
    return parseJsonResponse<FutureProofScoreData>(response.text, 'getFutureProofScore');
};

export const generateCareerSuggestions = async (profile: UserProfile): Promise<string[]> => {
    const prompt = `Based on the following user profile, generate 3-5 tailored career path suggestions. The suggestions should be concise, actionable, and directly related to their skills, interests, and especially their career aspirations.

    User Profile:
    - Skills: ${profile.skills.join(', ')}
    - Interests: ${profile.interests.join(', ')}
    - Career Aspirations: ${profile.careerAspirations}

    Return the suggestions as a JSON object with a single key "suggestions" containing an array of strings.`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    suggestions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING, description: "A single career path suggestion." }
                    }
                }
            }
        }
    });
    const result = parseJsonResponse<{ suggestions: string[] }>(response.text, 'generateCareerSuggestions');
    return result.suggestions;
};

export const generateSkillEvolutionTimeline = async (profile: UserProfile): Promise<SkillEvolutionData[]> => {
    const prompt = `Act as a career development expert and futurist. Analyze the user's top 3-5 most important skills based on their profile and career aspirations. For each of these key skills, project its evolution and importance over the next 5 years.

    User Profile:
    - Field of Study/Expertise: ${profile.fieldOfStudy}
    - Skills: ${profile.skills.join(', ')}
    - Career Aspirations: ${profile.careerAspirations}

    For each skill, provide a timeline with projections for "Year 1", "Year 3", and "Year 5". The projection should include the expected proficiency level ('Novice', 'Intermediate', 'Advanced', 'Expert') the user should aim for and a brief reasoning for its importance at that stage.

    Structure the output as a JSON array of objects.`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        skill: { type: Type.STRING, description: "The skill being analyzed." },
                        timeline: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    year: { type: Type.STRING, description: "The projected year, e.g., 'Year 1'" },
                                    projectedProficiency: { type: Type.STRING, description: "'Novice', 'Intermediate', 'Advanced', or 'Expert'" },
                                    reasoning: { type: Type.STRING, description: "Why this proficiency is important at this stage." },
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    return parseJsonResponse<SkillEvolutionData[]>(response.text, 'generateSkillEvolutionTimeline');
};

export const analyzePitchVideo = async (videoBase64: string, mimeType: string): Promise<PitchAnalysisResult> => {
    const prompt = `As an expert communication coach, analyze this video of a person delivering an elevator pitch. Provide a detailed, constructive analysis focusing on three key areas:
    
    1.  **Content & Clarity**: Transcribe the speech. Evaluate the clarity, conciseness, and impact of the message. Is it compelling? Does it clearly state who they are, what they do, and what they want?
    2.  **Vocal Delivery**: Assess their tone, pace, and volume. Do they sound confident, nervous, or monotone? Is the pacing effective?
    3.  **Visual Presence**: Analyze their body language, eye contact (with the camera), posture, and any gestures. Do they appear engaged and professional?
    
    For each area, provide specific feedback and a list of actionable suggestions for improvement. Structure your response as a single, valid JSON object.`;

    const videoPart = {
        inlineData: {
            data: videoBase64,
            mimeType: mimeType,
        },
    };

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [videoPart, { text: prompt }] },
    });

    return parseJsonResponse<PitchAnalysisResult>(response.text, 'analyzePitchVideo');
};

export interface LearningHubResult {
    resources: LearningHubData;
    sources: any[];
}

export const getLearningResources = async (profile: UserProfile, skill: string): Promise<LearningHubResult> => {
    const prompt = `Act as an expert learning and development advisor. Use your search tool to find the best, most reputable, and up-to-date learning resources for the skill: "${skill}".

    The user's profile is:
    - Status: ${profile.status}
    ${profile.status === 'Student' ? `- Year of Study: ${profile.yearOfStudy}` : `- Years of Experience: ${profile.yearsOfExperience}`}
    - Interests: ${profile.interests.join(', ')}

    Tailor your recommendations to be appropriate for the user's experience level. For example, recommend beginner-friendly resources if they are a student, or more advanced content for an experienced professional.

    Find 2-3 resources for each of the following categories:
    1.  Top Articles (from blogs, publications, official documentation)
    2.  Recommended Videos (from platforms like YouTube, Vimeo, etc.)
    3.  Suggested Courses (from platforms like Coursera, Udemy, edX, or free course providers)

    For each resource, provide a title, a direct link, and a brief, one-sentence summary explaining why it's a valuable resource for this user learning this skill.

    Respond ONLY with a single, valid JSON object. Do not include any text, markdown formatting, or explanations before or after the JSON object.
    The JSON object must have the following structure:
    {
      "articles": [ { "title": "...", "link": "...", "summary": "..." }, ... ],
      "videos": [ { "title": "...", "link": "...", "summary": "..." }, ... ],
      "courses": [ { "title": "...", "link": "...", "summary": "..." }, ... ]
    }`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const resources = parseJsonResponse<LearningHubData>(response.text, 'getLearningResources');
    return { resources, sources };
};

export const generateCoverLetter = async (profile: UserProfile, resumeText: string, jobDescription: string): Promise<CoverLetterResult> => {
    const prompt = `Act as an expert career coach and professional writer. Based on the user's profile, their resume, and the provided job description, write a compelling and professional cover letter.

    The cover letter should:
    1. Be tailored specifically to the job description.
    2. Highlight the most relevant skills and experiences from the user's profile and resume.
    3. Adopt a professional and enthusiastic tone.
    4. Be well-structured with an introduction, body, and conclusion.

    User Profile:
    - Name: ${profile.name}
    - Skills: ${profile.skills.join(', ')}
    - Aspirations: ${profile.careerAspirations}

    Resume Text:
    ---
    ${resumeText}
    ---

    Job Description:
    ---
    ${jobDescription}
    ---

    In addition to the cover letter, provide 3-4 key bullet points explaining why specific skills or experiences were highlighted, connecting them directly to the job description.

    Structure the output as a single, valid JSON object.`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    coverLetterText: {
                        type: Type.STRING,
                        description: "The full text of the generated cover letter."
                    },
                    keyPoints: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                point: { type: Type.STRING, description: "The key skill or experience highlighted." },
                                explanation: { type: Type.STRING, description: "Why this point is relevant to the job description." }
                            }
                        }
                    }
                }
            }
        }
    });
    return parseJsonResponse<CoverLetterResult>(response.text, 'generateCoverLetter');
};

export const generateInterviewQuestions = async (jobRole: string, questionType: string, difficulty: string): Promise<InterviewQuestion[]> => {
    const prompt = `Act as an expert hiring manager for a "${jobRole}" position.
    Generate a list of 5-7 high-quality interview questions for a candidate at the "${difficulty}" level.
    The questions should be of the "${questionType}" category.

    For each question, provide:
    1.  The question itself.
    2.  A brief "tips" section explaining what an interviewer is looking for in a good answer.
    3.  The category of the question.

    Structure the output as a JSON array of objects.`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING, description: "The interview question." },
                        tips: { type: Type.STRING, description: "Tips on how to answer the question well." },
                        category: { type: Type.STRING, description: "The category of the question (e.g., Behavioral, Technical)." }
                    }
                }
            }
        }
    });
    return parseJsonResponse<InterviewQuestion[]>(response.text, 'generateInterviewQuestions');
};

export const screenCandidateResume = async (resumeText: string, jobDescription: string): Promise<CandidateScreeningResult> => {
    const prompt = `Act as a senior recruiter and hiring manager. Analyze the following candidate's resume against the provided job description.

    Job Description:
    ---
    ${jobDescription}
    ---

    Candidate's Resume:
    ---
    ${resumeText}
    ---

    Provide a detailed screening report with the following:
    1.  A "matchScore" from 0 to 100, representing how well the candidate fits the role based on their resume.
    2.  A concise "summary" of the candidate's fit, highlighting their key qualifications or lack thereof.
    3.  A bulleted list of "strengths" (specific skills, experiences, or qualifications that align with the job description).
    4.  A bulleted list of "gaps" or potential red flags (missing skills, lack of required experience, etc.).
    5.  A list of 3 insightful "interviewQuestions" to ask the candidate to probe their skills and fill in the gaps identified in the resume.

    Structure the output as a single, valid JSON object.`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    matchScore: { type: Type.INTEGER, description: "The compatibility score from 0-100." },
                    summary: { type: Type.STRING, description: "A concise summary of the candidate's fit." },
                    strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of strengths." },
                    gaps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of gaps or red flags." },
                    interviewQuestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 3 suggested interview questions." }
                }
            }
        }
    });
    return parseJsonResponse<CandidateScreeningResult>(response.text, 'screenCandidateResume');
};

export const generateJobDescription = async (title: string, keyPoints: string, tone: string): Promise<JobDescriptionResult> => {
    const prompt = `Act as an expert recruitment copywriter and DEI (Diversity, Equity, and Inclusion) specialist.
    Based on the provided details, write a comprehensive, engaging, and inclusive job description.
    The job description should be well-structured (e.g., Summary, Responsibilities, Qualifications) and free of biased or gendered language.

    Job Title: "${title}"
    Tone: "${tone}"
    Key Responsibilities & Skills:
    ---
    ${keyPoints}
    ---

    In addition to the full job description text, provide a list of 2-3 actionable suggestions for improving the description further, focusing on inclusivity and attracting a diverse pool of candidates.

    Structure the output as a single, valid JSON object.`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    jobDescription: { type: Type.STRING, description: "The full, generated job description text." },
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Actionable suggestions for improvement." }
                }
            }
        }
    });
    return parseJsonResponse<JobDescriptionResult>(response.text, 'generateJobDescription');
};

export const getMarketInsights = async (jobTitle: string, location: string): Promise<MarketInsightsResult> => {
    const prompt = `Act as a senior market analyst and compensation specialist. Use your search tool to find up-to-date market data for a "${jobTitle}" in "${location}".
    
    Provide the following information:
    1.  An estimated average "salaryRange" for this role in the specified location.
    2.  A list of the top 5 most "inDemandSkills" for this role currently.
    3.  A "hiringDifficulty" score from 1 (very easy) to 10 (very difficult), representing how hard it is to fill this role in the current market.
    4.  A concise "marketSummary" explaining the current job market for this role in this location.

    Respond ONLY with a single, valid JSON object with the keys "salaryRange", "inDemandSkills", "hiringDifficulty", and "marketSummary". Do not include any text, markdown formatting, or explanations before or after the JSON object.`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const data = parseJsonResponse<MarketInsightsData>(response.text, 'getMarketInsights');
    
    return { data, sources };
};

export const analyzeVideoInterview = async (videoBase64: string, mimeType: string, questions: string[]): Promise<AsyncInterviewAnalysisResult> => {
    const prompt = `Act as an expert hiring manager and communication coach. Analyze the provided video of a candidate answering a series of interview questions.
    
    The questions asked were:
    ${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

    Your analysis should provide:
    1. An "overallSummary" of the candidate's performance, considering their answers and communication style across all questions.
    2. An overall "communicationScore" from 0 to 100, evaluating clarity, confidence, and professionalism.
    3. A breakdown for each question in "questionAnalyses", which should include:
        - The original "question".
        - A "transcript" of the candidate's answer to that specific question.
        - Constructive "feedback" on the quality and relevance of their answer.
        - A "clarityScore" from 0-100 for that specific answer.

    Structure your response as a single, valid JSON object.`;

    const videoPart = {
        inlineData: {
            data: videoBase64,
            mimeType: mimeType,
        },
    };

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [videoPart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    overallSummary: { type: Type.STRING },
                    communicationScore: { type: Type.INTEGER },
                    questionAnalyses: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                transcript: { type: Type.STRING },
                                feedback: { type: Type.STRING },
                                clarityScore: { type: Type.INTEGER },
                            }
                        }
                    }
                }
            }
        }
    });

    return parseJsonResponse<AsyncInterviewAnalysisResult>(response.text, 'analyzeVideoInterview');
};

export const generateOnboardingPlan = async (role: string, companyName: string): Promise<OnboardingPlan> => {
    const prompt = `Act as an experienced HR manager and team lead. Create a structured 30-60-90 day onboarding plan for a new hire in the role of "${role}" at "${companyName}".

    The plan should be broken down into three phases: 'First 30 Days', 'First 60 Days', and 'First 90 Days'.
    - The 'First 30 Days' should focus on learning, integration, and initial setup.
    - The 'First 60 Days' should focus on contribution, collaboration, and taking on more responsibility.
    - The 'First 90 Days' should focus on ownership, initiative, and long-term planning.

    For each phase, provide a clear title, a list of high-level goals, and a list of specific, actionable tasks.
    
    Structure the output as a single, valid JSON object.`;

    const response = await getAIClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    role: { type: Type.STRING },
                    plan: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                phase: { type: Type.STRING },
                                title: { type: Type.STRING },
                                goals: { type: Type.ARRAY, items: { type: Type.STRING } },
                                tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
                            }
                        }
                    }
                }
            }
        }
    });

    return parseJsonResponse<OnboardingPlan>(response.text, 'generateOnboardingPlan');
};