import React from 'react';
import { View } from '../types';
import { ArrowLeftIcon } from './icons';

interface BackButtonProps {
    setView: (view: View) => void;
}

const BackButton: React.FC<BackButtonProps> = ({ setView }) => {
    return (
        <button
            onClick={() => setView(View.DASHBOARD)}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-white font-semibold mb-6 transition-colors"
        >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Dashboard
        </button>
    );
};

export default BackButton;
