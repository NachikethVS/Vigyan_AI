import { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { saveUserProfileToDB, getUserProfileFromDB } from '../services/storageService';

const emptyProfile: UserProfile = {
    name: '',
    status: '',
    fieldOfStudy: '',
    yearOfStudy: '',
    yearsOfExperience: '',
    skills: [],
    interests: [],
    careerAspirations: '',
    profilePicture: '',
};

export const useUserProfile = (username: string | null) => {
    const [profile, setProfile] = useState<UserProfile>(emptyProfile);
    const [isInitialized, setInitialized] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            if (!username) {
                setProfile(emptyProfile);
                setInitialized(true);
                return;
            }
            
            setInitialized(false);
            try {
                const storedProfile = await getUserProfileFromDB(username);
                setProfile(storedProfile || emptyProfile);
            } catch (error) {
                console.error("Failed to load user profile from IndexedDB", error);
                setProfile(emptyProfile);
            } finally {
                setInitialized(true);
            }
        };
        loadProfile();
    }, [username]);

    const saveProfile = useCallback(async (newProfile: UserProfile) => {
        if (!username) {
            console.error("Cannot save profile, no user is logged in.");
            return;
        }
        try {
            await saveUserProfileToDB(username, newProfile);
            setProfile(newProfile);
        } catch (error) {
            console.error("Failed to save user profile to IndexedDB", error);
        }
    }, [username]);
    
    return { profile, saveProfile, isInitialized };
};