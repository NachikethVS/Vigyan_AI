import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserProfile, View } from '../types';
import { ProfileIcon, CopyIcon } from './icons';
import { generateCareerSuggestions } from '../services/geminiService';
import Spinner from './Spinner';
import BackButton from './BackButton';
import { fieldsOfStudy, studentYears, professionalExperience, commonSkills, commonInterests } from '../lib/constants';

const INITIAL_SUGGESTIONS_COUNT = 10;
const SUGGESTIONS_INCREMENT = 10;


interface UserProfileProps {
    setView: (view: View) => void;
}

const UserProfileComponent: React.FC<UserProfileProps> = ({ setView }) => {
    const { profile, saveProfile, isInitialized } = useAppContext();
    const [formData, setFormData] = useState<UserProfile>(profile);
    const [skillInput, setSkillInput] = useState('');
    const [interestInput, setInterestInput] = useState('');
    const [otherFieldOfStudy, setOtherFieldOfStudy] = useState('');

    const [careerSuggestions, setCareerSuggestions] = useState<string[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [suggestionsError, setSuggestionsError] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState('');
    
    const [visibleSkillsCount, setVisibleSkillsCount] = useState(INITIAL_SUGGESTIONS_COUNT);
    const [visibleInterestsCount, setVisibleInterestsCount] = useState(INITIAL_SUGGESTIONS_COUNT);

    // Autocomplete state
    const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
    const [isSkillsDropdownOpen, setSkillsDropdownOpen] = useState(false);
    const [interestSuggestions, setInterestSuggestions] = useState<string[]>([]);
    const [isInterestsDropdownOpen, setInterestsDropdownOpen] = useState(false);

    const skillsInputRef = useRef<HTMLDivElement>(null);
    const interestsInputRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        if (isInitialized) {
            setFormData(profile);
            if (profile.fieldOfStudy && !fieldsOfStudy.includes(profile.fieldOfStudy)) {
                setFormData(prev => ({ ...prev, fieldOfStudy: 'Other' }));
                setOtherFieldOfStudy(profile.fieldOfStudy);
            }
        }
    }, [profile, isInitialized]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (skillsInputRef.current && !skillsInputRef.current.contains(event.target as Node)) {
                setSkillsDropdownOpen(false);
            }
            if (interestsInputRef.current && !interestsInputRef.current.contains(event.target as Node)) {
                setInterestsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera: ", err);
                setCameraError("Could not access camera. Please ensure you have a webcam and have granted permission.");
                stopCamera();
            }
        } else {
            setCameraError("Your browser does not support camera access.");
        }
    }, [stopCamera]);

    useEffect(() => {
        if (isCameraOpen) {
            setCameraError('');
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isCameraOpen, startCamera, stopCamera]);


    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            
            const dataUrl = canvas.toDataURL('image/png');
            setFormData(prev => ({ ...prev, profilePicture: dataUrl }));
            
            setIsCameraOpen(false);
        }
    };

    const handleOpenCamera = () => setIsCameraOpen(true);
    const handleCloseCamera = () => setIsCameraOpen(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const updateSuggestions = (inputValue: string, type: 'skill' | 'interest') => {
        const sourceList = type === 'skill' ? commonSkills : commonInterests;
        const currentItems = type === 'skill' ? formData.skills : formData.interests;
        const setSuggestions = type === 'skill' ? setSkillSuggestions : setInterestSuggestions;
        const setDropdownOpen = type === 'skill' ? setSkillsDropdownOpen : setInterestsDropdownOpen;

        if (inputValue) {
            const filtered = sourceList.filter(item =>
                item.toLowerCase().includes(inputValue.toLowerCase()) &&
                !currentItems.some(s => s.toLowerCase() === item.toLowerCase())
            );
            setSuggestions(filtered.slice(0, 7));
            setDropdownOpen(filtered.length > 0);
        } else {
            setDropdownOpen(false);
        }
    };
    
    const handleSkillInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSkillInput(value);
        updateSuggestions(value, 'skill');
    };
    
    const handleInterestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInterestInput(value);
        updateSuggestions(value, 'interest');
    };

    const addItem = (item: string, type: 'skill' | 'interest') => {
        if (!item) return;
        const normalizedItem = item.trim();
        const currentItems = type === 'skill' ? formData.skills : formData.interests;
        const setter = type === 'skill' ? (skills: string[]) => setFormData(p => ({ ...p, skills })) : (interests: string[]) => setFormData(p => ({ ...p, interests }));

        if (normalizedItem && !currentItems.some(s => s.toLowerCase() === normalizedItem.toLowerCase())) {
            setter([...currentItems, normalizedItem]);
        }

        if (type === 'skill') {
            setSkillInput('');
            setSkillsDropdownOpen(false);
        } else {
            setInterestInput('');
            setInterestsDropdownOpen(false);
        }
    };
    
    const removeItem = (itemToRemove: string, type: 'skill' | 'interest') => {
        const currentItems = type === 'skill' ? formData.skills : formData.interests;
        const setter = type === 'skill' ? (skills: string[]) => setFormData(p => ({ ...p, skills })) : (interests: string[]) => setFormData(p => ({ ...p, interests }));
        setter(currentItems.filter(item => item !== itemToRemove));
    };
    
    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: 'skill' | 'interest') => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const value = type === 'skill' ? skillInput : interestInput;
            addItem(value, type);
        }
    };
    
    const handleGetSuggestions = async () => {
        if (!formData.careerAspirations) {
            setSuggestionsError("Please describe your career aspirations first to get suggestions.");
            return;
        }
        setSuggestionsLoading(true);
        setSuggestionsError('');
        setCareerSuggestions([]);
        try {
            const currentProfileState: UserProfile = {
                ...formData,
                fieldOfStudy: formData.fieldOfStudy === 'Other' ? otherFieldOfStudy : formData.fieldOfStudy,
            };
            const suggestions = await generateCareerSuggestions(currentProfileState);
            setCareerSuggestions(suggestions);
        } catch (error) {
            console.error("Failed to generate career suggestions:", error);
            setSuggestionsError("Sorry, we couldn't generate suggestions at the moment. Please try again.");
        } finally {
            setSuggestionsLoading(false);
        }
    };

    const handleUseSuggestion = (suggestion: string) => {
        setFormData(prev => ({ ...prev, careerAspirations: suggestion }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const updatedProfile = {
            ...formData,
            fieldOfStudy: formData.fieldOfStudy === 'Other' ? otherFieldOfStudy : formData.fieldOfStudy,
        };
        await saveProfile(updatedProfile);
        setView(View.DASHBOARD);
    };

    const inputClasses = "w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition";
    const labelClasses = "block text-sm font-bold text-text-primary mb-2";
    const suggestionButtonClasses = "px-3 py-1 bg-primary/20 text-primary rounded-full text-sm hover:bg-primary/40 transition-colors cursor-pointer";

    if (!isInitialized) return <div>Loading profile...</div>;

    const renderTagInput = (type: 'skill' | 'interest') => {
        const items = type === 'skill' ? formData.skills : formData.interests;
        const inputValue = type === 'skill' ? skillInput : interestInput;
        const handleInputChange = type === 'skill' ? handleSkillInputChange : handleInterestInputChange;
        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => handleInputKeyDown(e, type);
        const placeholder = type === 'skill' ? 'e.g., React, TypeScript...' : 'e.g., AI, Web Development...';
        const suggestions = type === 'skill' ? skillSuggestions : interestSuggestions;
        const isDropdownOpen = type === 'skill' ? isSkillsDropdownOpen : isInterestsDropdownOpen;
        const commonItems = type === 'skill' ? commonSkills : commonInterests;
        const visibleCount = type === 'skill' ? visibleSkillsCount : visibleInterestsCount;
        const setVisibleCount = type === 'skill' ? setVisibleSkillsCount : setVisibleInterestsCount;

        return (
            <div>
                <label className={labelClasses}>{type === 'skill' ? 'Skills' : 'Interests'}</label>
                <div className="relative" ref={type === 'skill' ? skillsInputRef : interestsInputRef}>
                    <div className={`${inputClasses} flex flex-wrap items-center gap-2`}>
                        {items.map(item => (
                            <span key={item} className="flex items-center gap-2 bg-primary text-white px-2 py-1 rounded text-sm animate-fade-in">
                                {item}
                                <button type="button" onClick={() => removeItem(item, type)} className="font-bold hover:text-red-300">×</button>
                            </span>
                        ))}
                        <input
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => updateSuggestions(inputValue, type)}
                            className="bg-transparent outline-none flex-grow"
                            placeholder={items.length === 0 ? placeholder : 'Add more...'}
                            autoComplete="off"
                        />
                    </div>
                    {isDropdownOpen && suggestions.length > 0 && (
                        <div className="absolute z-10 top-full mt-2 w-full bg-surface border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto animate-fade-in">
                            <ul className="p-1" role="listbox">
                                {suggestions.map((suggestion, i) => (
                                    <li key={i} onClick={() => addItem(suggestion, type)} className="px-3 py-2 text-sm text-text-secondary hover:bg-border hover:text-white cursor-pointer rounded-md">
                                        {suggestion}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap gap-2 mt-3 items-center">
                    {commonItems.slice(0, visibleCount).map(item => (
                        !items.some(s => s.toLowerCase() === item.toLowerCase()) && (
                            <button type="button" key={item} onClick={() => addItem(item, type)} className={suggestionButtonClasses}>
                                + {item}
                            </button>
                        )
                    ))}
                    {visibleCount < commonItems.length && (
                        <button type="button" onClick={() => setVisibleCount(prev => Math.min(prev + SUGGESTIONS_INCREMENT, commonItems.length))} className="text-sm text-primary hover:underline font-medium p-1">
                            Show 10 More
                        </button>
                    )}
                    {visibleCount > INITIAL_SUGGESTIONS_COUNT && (
                        <button type="button" onClick={() => setVisibleCount(INITIAL_SUGGESTIONS_COUNT)} className="text-sm text-text-secondary hover:underline font-medium p-1">
                            Show Less
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto">
            <BackButton setView={setView} />
            <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
            <p className="text-text-secondary mb-8">This information helps us personalize your career guidance.</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information Card */}
                <div className="bg-surface p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold mb-4 text-primary">Basic Information</h2>
                     <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-shrink-0 flex flex-col items-center gap-2">
                            {formData.profilePicture ? (
                                <img src={formData.profilePicture} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-primary" />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center border-2 border-border">
                                    <ProfileIcon className="w-12 h-12 text-text-secondary" />
                                </div>
                            )}
                            <button type="button" onClick={handleOpenCamera} className="text-sm text-primary hover:underline font-medium">
                                {formData.profilePicture ? 'Change Photo' : 'Add Photo'}
                            </button>
                        </div>
                        <div className="flex-grow w-full grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="name" className={labelClasses}>Full Name</label>
                                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={inputClasses} placeholder="e.g., Jane Doe" required />
                            </div>
                            <div>
                                <label htmlFor="status" className={labelClasses}>Current Status</label>
                                <select id="status" name="status" value={formData.status} onChange={handleChange} className={inputClasses} required>
                                    <option value="" disabled>Select your status</option>
                                    <option value="Student">Student</option>
                                    <option value="Professional">Professional</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Academic & Professional Details Card */}
                {formData.status && (
                    <div className="bg-surface p-6 rounded-xl shadow-lg animate-fade-in">
                         <h2 className="text-xl font-bold mb-4 text-primary">Academic & Professional Details</h2>
                        {formData.status === 'Student' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="fieldOfStudy" className={labelClasses}>Field of Study</label>
                                    <select id="fieldOfStudy" name="fieldOfStudy" value={formData.fieldOfStudy} onChange={handleChange} className={inputClasses}>
                                        <option value="">Select a field</option>
                                        {fieldsOfStudy.map(field => <option key={field} value={field}>{field}</option>)}
                                        <option value="Other">Other</option>
                                    </select>
                                    {formData.fieldOfStudy === 'Other' && (
                                        <input type="text" value={otherFieldOfStudy} onChange={(e) => setOtherFieldOfStudy(e.target.value)} className={`${inputClasses} mt-2`} placeholder="Please specify" />
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="yearOfStudy" className={labelClasses}>Year of Study</label>
                                    <select id="yearOfStudy" name="yearOfStudy" value={formData.yearOfStudy} onChange={handleChange} className={inputClasses}>
                                        <option value="">Select year</option>
                                        {studentYears.map(year => <option key={year} value={year}>{year}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                        {formData.status === 'Professional' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="fieldOfStudy" className={labelClasses}>Field of Expertise</label>
                                     <select id="fieldOfStudy" name="fieldOfStudy" value={formData.fieldOfStudy} onChange={handleChange} className={inputClasses}>
                                        <option value="">Select a field</option>
                                        {fieldsOfStudy.map(field => <option key={field} value={field}>{field}</option>)}
                                        <option value="Other">Other</option>
                                    </select>
                                    {formData.fieldOfStudy === 'Other' && (
                                        <input type="text" value={otherFieldOfStudy} onChange={(e) => setOtherFieldOfStudy(e.target.value)} className={`${inputClasses} mt-2`} placeholder="Please specify your expertise" />
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="yearsOfExperience" className={labelClasses}>Years of Experience</label>
                                    <select id="yearsOfExperience" name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleChange} className={inputClasses}>
                                        <option value="">Select experience</option>
                                        {professionalExperience.map(exp => <option key={exp} value={exp}>{exp}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Skills & Interests Card */}
                <div className="bg-surface p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold mb-4 text-primary">Skills & Interests</h2>
                    <div className="space-y-6">
                        {renderTagInput('skill')}
                        {renderTagInput('interest')}
                    </div>
                </div>

                {/* Career Aspirations Card */}
                <div className="bg-surface p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold mb-4 text-primary">Career Aspirations</h2>
                    <div>
                        <label htmlFor="careerAspirations" className={labelClasses}>Describe your long-term career goals</label>
                        <textarea id="careerAspirations" name="careerAspirations" value={formData.careerAspirations} onChange={handleChange} className={inputClasses} rows={4} placeholder="e.g., To become a principal engineer at a leading tech company..."></textarea>
                        
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={handleGetSuggestions}
                                disabled={suggestionsLoading}
                                className="w-full sm:w-auto bg-secondary text-white font-bold py-2 px-5 rounded-lg hover:bg-emerald-500 transition disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {suggestionsLoading ? <Spinner /> : 'Get AI Career Suggestions'}
                            </button>
                            {suggestionsError && <p className="text-red-500 text-sm mt-2">{suggestionsError}</p>}

                            {careerSuggestions.length > 0 && (
                                <div className="mt-4 bg-background p-4 rounded-lg animate-fade-in">
                                    <h3 className="font-semibold text-text-primary mb-2">Here are a few career paths to consider:</h3>
                                    <ul className="list-inside space-y-3 text-text-secondary">
                                        {careerSuggestions.map((suggestion, index) => (
                                            <li key={index} className="flex justify-between items-center gap-2 p-2 rounded-md hover:bg-surface/50">
                                                <span className="flex-grow">{suggestion}</span>
                                                <button
                                                    type="button"
                                                    title="Use this suggestion"
                                                    onClick={() => handleUseSuggestion(suggestion)}
                                                    className="text-secondary hover:text-emerald-400 transition-colors p-1 rounded-full flex-shrink-0"
                                                >
                                                    <CopyIcon className="w-5 h-5" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>


                <div className="flex justify-end">
                    <button type="submit" className="bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-focus transition-all transform hover:scale-105">
                        Save Profile
                    </button>
                </div>
            </form>
            
            {isCameraOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" onClick={handleCloseCamera}>
                    <div className="bg-surface p-6 rounded-2xl shadow-2xl w-full max-w-lg relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={handleCloseCamera} className="absolute top-4 right-4 text-2xl font-light text-text-secondary hover:text-white transition-colors">&times;</button>
                        <h3 className="text-xl font-bold mb-4 text-primary">Take Profile Photo</h3>
                        {cameraError ? (
                            <div className="text-red-500 bg-red-500/10 p-4 rounded-lg text-center">{cameraError}</div>
                        ) : (
                            <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-lg mb-4 bg-background aspect-video object-cover"></video>
                        )}
                        <canvas ref={canvasRef} className="hidden"></canvas>
                        <div className="flex justify-end space-x-4 mt-4">
                            <button type="button" onClick={handleCloseCamera} className="bg-border text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-600 transition">Cancel</button>
                            <button type="button" onClick={capturePhoto} disabled={!!cameraError} className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-focus transition disabled:bg-gray-500">Capture</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default UserProfileComponent;