import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { useUserProfile } from '../hooks/useUserProfile';

declare const faceapi: any;

interface AppContextType {
    currentUser: string | null;
    profile: UserProfile;
    saveProfile: (newProfile: UserProfile) => Promise<void>;
    isInitialized: boolean;
    logout: () => void;
    areFaceModelsLoaded: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppContextProviderProps {
    children: ReactNode;
    currentUser: string | null;
    logout: () => void;
}

export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children, currentUser, logout }) => {
    const { profile, saveProfile, isInitialized } = useUserProfile(currentUser);
    const [areFaceModelsLoaded, setAreFaceModelsLoaded] = useState(false);

    useEffect(() => {
        const loadModels = async () => {
            if (typeof faceapi === 'undefined') {
                console.error("face-api.js not loaded");
                return;
            }
            const MODEL_URL = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/faceapi/';
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ]);
                setAreFaceModelsLoaded(true);
                console.log("Face detection models pre-loaded successfully.");
            } catch (error) {
                console.error("Failed to pre-load face-api models:", error);
            }
        };
        loadModels();
    }, []);

    const value = {
        currentUser,
        profile,
        saveProfile,
        isInitialized,
        logout,
        areFaceModelsLoaded
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppContextProvider');
    }
    return context;
};