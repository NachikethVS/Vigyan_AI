import React, { useState, useEffect } from 'react';
import { View, JobApplication, ApplicationStatus } from '../types';
import { getApplicationsFromDB, saveApplicationToDB, deleteApplicationFromDB } from '../services/storageService';
import BackButton from './BackButton';
import Spinner from './Spinner';
import { commonCompanies, commonJobRoles } from '../lib/constants';
import { useAppContext } from '../context/AppContext';

const STATUS_LEVELS: ApplicationStatus[] = ['Wishlist', 'Applied', 'Interviewing', 'Offer', 'Rejected'];

const statusStyles: { [key in ApplicationStatus]: { border: string, bg: string, text: string } } = {
    Wishlist: { border: 'border-sky-500', bg: 'bg-sky-500/10', text: 'text-sky-400' },
    Applied: { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400' },
    Interviewing: { border: 'border-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-400' },
    Offer: { border: 'border-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    Rejected: { border: 'border-red-500', bg: 'bg-red-500/10', text: 'text-red-400' },
};

interface JobApplicationTrackerProps {
    setView: (view: View) => void;
}

const JobApplicationTracker: React.FC<JobApplicationTrackerProps> = ({ setView }) => {
    const { currentUser } = useAppContext();
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<ApplicationStatus | null>(null);

    useEffect(() => {
        const fetchApplications = async () => {
            if (!currentUser) return;
            setLoading(true);
            const apps = await getApplicationsFromDB(currentUser);
            setApplications(apps);
            setLoading(false);
        };
        fetchApplications();
    }, [currentUser]);

    const handleSaveApplication = async (app: JobApplication) => {
        if (!currentUser) return;
        const appWithUser = { ...app, username: currentUser };
        await saveApplicationToDB(appWithUser);
        const apps = await getApplicationsFromDB(currentUser);
        setApplications(apps);
        setIsModalOpen(false);
        setEditingApp(null);
    };

    const handleDeleteApplication = async (id: string) => {
        if (!currentUser) return;
        if (window.confirm('Are you sure you want to delete this application?')) {
            await deleteApplicationFromDB(id);
            setApplications(apps => apps.filter(app => app.id !== id));
        }
    };
    
    const onDragStart = (e: React.DragEvent<HTMLDivElement>, appId: string) => {
        e.dataTransfer.setData('applicationId', appId);
    };

    const onDragOver = (e: React.DragEvent<HTMLDivElement>, status: ApplicationStatus) => {
        e.preventDefault();
        setDragOverStatus(status);
    };
    
    const onDrop = async (e: React.DragEvent<HTMLDivElement>, newStatus: ApplicationStatus) => {
        e.preventDefault();
        setDragOverStatus(null);
        if (!currentUser) return;
        const appId = e.dataTransfer.getData('applicationId');
        const appToUpdate = applications.find(app => app.id === appId);
        if (appToUpdate && appToUpdate.status !== newStatus) {
            const updatedApp = { ...appToUpdate, status: newStatus };
            setApplications(prev => prev.map(app => app.id === appId ? updatedApp : app));
            await saveApplicationToDB(updatedApp);
        }
    };

    const openModal = (app?: JobApplication) => {
        setEditingApp(app || null);
        setIsModalOpen(true);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0">
                <BackButton setView={setView} />
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Job Application Tracker</h1>
                        <p className="text-text-secondary mt-1">Organize your job search with this Kanban board.</p>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-focus transition self-start md:self-center"
                    >
                        + Add Application
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-grow flex items-center justify-center"><Spinner /></div>
            ) : (
                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
                    {STATUS_LEVELS.map(status => (
                        <div
                            key={status}
                            onDragOver={(e) => onDragOver(e, status)}
                            onDragLeave={() => setDragOverStatus(null)}
                            onDrop={(e) => onDrop(e, status)}
                            className={`bg-surface/70 rounded-xl p-3 flex flex-col transition-colors ${dragOverStatus === status ? 'bg-primary/20' : ''}`}
                        >
                            <h2 className={`font-bold px-2 py-1 mb-3 text-lg ${statusStyles[status].text}`}>{status}</h2>
                            <div className="flex-grow space-y-3 overflow-y-auto pr-1">
                                {applications.filter(app => app.status === status).map(app => (
                                    <div
                                        key={app.id}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, app.id)}
                                        onClick={() => openModal(app)}
                                        className={`bg-surface p-4 rounded-lg shadow-md cursor-pointer border-l-4 ${statusStyles[status].border} hover:shadow-lg transition-shadow`}
                                    >
                                        <h3 className="font-bold text-text-primary">{app.role}</h3>
                                        <p className="text-sm text-text-secondary">{app.company}</p>
                                        <p className="text-xs text-text-secondary mt-2">{new Date(app.dateApplied).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {isModalOpen && <ApplicationModal
                app={editingApp}
                onClose={() => { setIsModalOpen(false); setEditingApp(null); }}
                onSave={handleSaveApplication}
                onDelete={handleDeleteApplication}
            />}
        </div>
    );
};

interface ApplicationModalProps {
    app: JobApplication | null;
    onClose: () => void;
    onSave: (app: JobApplication) => void;
    onDelete: (id: string) => void;
}

const ApplicationModal: React.FC<ApplicationModalProps> = ({ app, onClose, onSave, onDelete }) => {
    const { currentUser } = useAppContext();
    const [formData, setFormData] = useState<Partial<JobApplication>>({
        company: '',
        role: '',
        dateApplied: new Date().toISOString().split('T')[0],
        status: 'Wishlist',
        jobDescriptionLink: '',
        notes: '',
        ...app
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        const finalApp: JobApplication = {
            id: app?.id || Date.now().toString(),
            company: formData.company!,
            role: formData.role!,
            dateApplied: formData.dateApplied!,
            status: formData.status!,
            jobDescriptionLink: formData.jobDescriptionLink,
            notes: formData.notes,
            username: currentUser
        };
        onSave(finalApp);
    };
    
    const inputClasses = "w-full p-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition";
    const labelClasses = "block text-sm font-bold text-text-primary mb-1";
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-surface p-6 rounded-2xl shadow-2xl w-full max-w-lg relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-2xl font-light text-text-secondary hover:text-white transition-colors">&times;</button>
                <h2 className="text-2xl font-bold mb-4 text-primary">{app ? 'Edit Application' : 'Add New Application'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="role" className={labelClasses}>Job Role</label>
                            <input type="text" id="role" name="role" value={formData.role} onChange={handleChange} className={inputClasses} required list="job-roles-list" />
                            <datalist id="job-roles-list">
                                {commonJobRoles.map(role => <option key={role} value={role} />)}
                            </datalist>
                        </div>
                        <div>
                            <label htmlFor="company" className={labelClasses}>Company</label>
                            <input type="text" id="company" name="company" value={formData.company} onChange={handleChange} className={inputClasses} required list="companies-list" />
                            <datalist id="companies-list">
                                {commonCompanies.map(company => <option key={company} value={company} />)}
                            </datalist>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="dateApplied" className={labelClasses}>Date Applied</label>
                            <input type="date" id="dateApplied" name="dateApplied" value={formData.dateApplied} onChange={handleChange} className={inputClasses} required />
                        </div>
                         <div>
                            <label htmlFor="status" className={labelClasses}>Status</label>
                            <select id="status" name="status" value={formData.status} onChange={handleChange} className={inputClasses}>
                                {STATUS_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="jobDescriptionLink" className={labelClasses}>Job Posting Link</label>
                        <input type="url" id="jobDescriptionLink" name="jobDescriptionLink" value={formData.jobDescriptionLink} onChange={handleChange} className={inputClasses} placeholder="https://..." />
                    </div>
                    <div>
                        <label htmlFor="notes" className={labelClasses}>Notes</label>
                        <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} className={inputClasses} rows={4} placeholder="Contact person, key requirements, etc."></textarea>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        {app && (
                            <button type="button" onClick={() => { onDelete(app.id); onClose(); }} className="text-red-500 hover:text-red-400 font-semibold text-sm">Delete</button>
                        )}
                        <div className="flex-grow flex justify-end gap-2">
                            <button type="button" onClick={onClose} className="bg-border text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition">Cancel</button>
                            <button type="submit" className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-focus transition">Save</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default JobApplicationTracker;