import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Search,
    Filter,
    MessageSquare,
    CheckCircle,
    Clock,
    AlertCircle,
    Calendar,
    BarChart3,
    Star,
    Award,
    TrendingUp,
    ListChecks,
    ClipboardCheck,
    User,
    Briefcase,
    ArrowRight,
    Loader2,
    FileText,
    Target,
    X,
    Send,
    History,
    ChevronDown,
    Eye
} from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

// ─── FEEDBACK MODAL ────────────────────────────────────────
const FeedbackModal = ({ isOpen, onClose, internship, onSubmitSuccess }) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setRating(0);
            setHoverRating(0);
            setFeedback('');
            setError('');
            setSuccess(false);
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (rating === 0) { setError('Please select a rating'); return; }
        if (!feedback.trim()) { setError('Please write your feedback'); return; }
        if (feedback.trim().length < 10) { setError('Feedback must be at least 10 characters'); return; }

        setSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/mentor/submit-feedback/${internship.applicationId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rating,
                    feedback: feedback.trim(),
                    domain: internship.internshipTitle
                })
            });

            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                setTimeout(() => {
                    onSubmitSuccess && onSubmitSuccess(internship.applicationId);
                    onClose();
                }, 1500);
            } else {
                setError(data.message || 'Failed to submit feedback');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const ratingLabels = ['', 'Needs Improvement', 'Below Average', 'Satisfactory', 'Good', 'Excellent'];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 px-6 py-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5" />
                                    Give Feedback
                                </h3>
                                <p className="text-blue-200 text-sm mt-0.5">{internship?.jobseekerName} — {internship?.internshipTitle}</p>
                            </div>
                            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {success ? (
                        /* Success state */
                        <div className="p-8 text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 15 }}
                                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                            >
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </motion.div>
                            <h4 className="text-lg font-bold text-gray-800">Feedback Submitted!</h4>
                            <p className="text-gray-500 text-sm mt-1">Your feedback has been saved successfully.</p>
                        </div>
                    ) : (
                        /* Form */
                        <div className="p-6 space-y-5">
                            {/* Intern summary */}
                            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white font-bold text-xs">
                                        {internship?.jobseekerName?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">{internship?.jobseekerName}</p>
                                    <p className="text-gray-400 text-xs">{internship?.internshipTitle} • {internship?.tasksSubmitted}/{internship?.tasksAssigned} tasks • {internship?.progress}%</p>
                                </div>
                            </div>

                            {/* Star Rating */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Overall Rating</label>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            onClick={() => setRating(star)}
                                            className="p-1 transition-transform hover:scale-110"
                                        >
                                            <Star
                                                className={`h-8 w-8 transition-colors ${star <= (hoverRating || rating)
                                                    ? 'text-amber-400 fill-amber-400'
                                                    : 'text-gray-300'
                                                    }`}
                                            />
                                        </button>
                                    ))}
                                    {(hoverRating || rating) > 0 && (
                                        <span className="ml-3 text-sm font-medium text-gray-500">
                                            {ratingLabels[hoverRating || rating]}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Feedback Text */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Written Feedback</label>
                                <textarea
                                    rows={4}
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Share your assessment of the intern's performance, strengths, areas for improvement, and overall contribution…"
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all resize-none bg-gray-50 hover:bg-white"
                                    maxLength={3000}
                                />
                                <p className="text-[11px] text-gray-400 mt-1 text-right">{feedback.length}/3000</p>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={onClose}
                                    disabled={submitting}
                                    className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200/50 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Submitting…
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4" />
                                            Submit Feedback
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ─── MAIN COMPONENT ────────────────────────────────────────
const FeedbackAssessments = () => {
    const [completedInternships, setCompletedInternships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('progress');
    const [feedbackModal, setFeedbackModal] = useState({ open: false, internship: null });
    const [feedbackGiven, setFeedbackGiven] = useState({}); // track which have feedback (session)
    const [activeTab, setActiveTab] = useState('current'); // 'current' or 'history'

    useEffect(() => {
        fetchCompletedInternships();
    }, []);

    const fetchCompletedInternships = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/mentor/completed-internships`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setCompletedInternships(data.data);
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to fetch completed internships');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const stats = useMemo(() => {
        if (completedInternships.length === 0) return { total: 0, avgProgress: 0, totalTasksDone: 0, totalTasksAssigned: 0 };
        const avgProgress = Math.round(completedInternships.reduce((sum, i) => sum + i.progress, 0) / completedInternships.length);
        const totalTasksDone = completedInternships.reduce((sum, i) => sum + i.tasksSubmitted, 0);
        const totalTasksAssigned = completedInternships.reduce((sum, i) => sum + i.tasksAssigned, 0);
        return { total: completedInternships.length, avgProgress, totalTasksDone, totalTasksAssigned };
    }, [completedInternships]);

    const filteredInternships = useMemo(() => {
        let result = completedInternships.filter(item =>
            item.jobseekerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.internshipTitle?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        result.sort((a, b) => {
            if (sortBy === 'progress') return b.progress - a.progress;
            if (sortBy === 'name') return a.jobseekerName.localeCompare(b.jobseekerName);
            if (sortBy === 'date') return new Date(b.endDate) - new Date(a.endDate);
            return 0;
        });
        return result;
    }, [completedInternships, searchTerm, sortBy]);

    // Split into current (no feedback) and history (has feedback)
    const currentInternships = useMemo(() =>
        filteredInternships.filter(item => !item.feedbackData && !feedbackGiven[item.applicationId]),
        [filteredInternships, feedbackGiven]
    );
    const historyInternships = useMemo(() =>
        filteredInternships.filter(item => item.feedbackData || feedbackGiven[item.applicationId]),
        [filteredInternships, feedbackGiven]
    );

    const getProgressColor = (progress) => {
        if (progress >= 95) return 'from-emerald-500 to-green-400';
        if (progress >= 90) return 'from-teal-500 to-cyan-400';
        return 'from-blue-500 to-indigo-400';
    };

    const getProgressBg = (progress) => {
        if (progress >= 95) return 'bg-emerald-50';
        if (progress >= 90) return 'bg-teal-50';
        return 'bg-blue-50';
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleFeedbackSuccess = (applicationId) => {
        setFeedbackGiven(prev => ({ ...prev, [applicationId]: true }));
        // Refetch to get updated feedbackData from backend
        fetchCompletedInternships();
    };

    const formatTimeAgo = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-80 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
                <div className="text-center">
                    <p className="text-gray-700 font-semibold text-sm">Loading completed internships…</p>
                    <p className="text-gray-400 text-xs mt-1">Evaluating eligibility criteria</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Feedback Modal */}
            <FeedbackModal
                isOpen={feedbackModal.open}
                onClose={() => setFeedbackModal({ open: false, internship: null })}
                internship={feedbackModal.internship}
                onSubmitSuccess={handleFeedbackSuccess}
            />

            {/* Summary Stats */}
            {completedInternships.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Eligible Interns', value: stats.total, icon: Users, bg: 'bg-indigo-50', text: 'text-indigo-600' },
                        { label: 'Avg. Progress', value: `${stats.avgProgress}%`, icon: TrendingUp, bg: 'bg-emerald-50', text: 'text-emerald-600' },
                        { label: 'Tasks Completed', value: stats.totalTasksDone, icon: CheckCircle, bg: 'bg-teal-50', text: 'text-teal-600' },
                        { label: 'Total Assigned', value: stats.totalTasksAssigned, icon: ListChecks, bg: 'bg-violet-50', text: 'text-violet-600' },
                    ].map((stat, idx) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.08 }}
                            className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow duration-300"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                                    <stat.icon className={`h-5 w-5 ${stat.text}`} />
                                </div>
                                <div>
                                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{stat.label}</p>
                                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Current / History Tabs */}
            <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-gray-100">
                    {/* Tab Buttons */}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                        <button
                            onClick={() => setActiveTab('current')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'current'
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <ClipboardCheck className="h-4 w-4" />
                            Current
                            {currentInternships.length > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === 'current' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'
                                    }`}>{currentInternships.length}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'history'
                                    ? 'bg-white text-emerald-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <History className="h-4 w-4" />
                            History
                            {historyInternships.length > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === 'history' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                                    }`}>{historyInternships.length}</span>
                            )}
                        </button>
                    </div>

                    {/* Search & Sort */}
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search by name or title…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-200 bg-gray-50 hover:bg-white"
                            />
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 bg-gray-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-200 cursor-pointer"
                        >
                            <option value="progress">Sort: Progress</option>
                            <option value="name">Sort: Name</option>
                            <option value="date">Sort: End Date</option>
                        </select>
                    </div>
                </div>

                {/* Tab subtitle */}
                <div className="px-4 pt-3 pb-1">
                    <p className="text-gray-400 text-xs">
                        {activeTab === 'current'
                            ? 'Interns awaiting your feedback — internship end date passed with ≥90% task completion'
                            : 'Feedback you have already submitted for completed internships'
                        }
                    </p>
                </div>
            </motion.div>

            {/* Error State */}
            {error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center space-x-3 border border-red-100"
                >
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <div>
                        <p className="font-medium text-sm">{error}</p>
                        <button onClick={fetchCompletedInternships} className="text-xs text-red-500 underline mt-1 hover:text-red-700">Try again</button>
                    </div>
                </motion.div>
            )}

            {/* ─── CURRENT TAB ─── */}
            {activeTab === 'current' && (
                <>
                    {currentInternships.length === 0 && !error ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200"
                        >
                            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <CheckCircle className="h-8 w-8 text-indigo-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">All caught up!</h3>
                            <p className="text-gray-400 mt-2 max-w-md mx-auto text-sm leading-relaxed">
                                {searchTerm
                                    ? `No pending feedback matching "${searchTerm}".`
                                    : 'You\'ve submitted feedback for all eligible interns. Great job!'
                                }
                            </p>
                            {historyInternships.length > 0 && (
                                <button onClick={() => setActiveTab('history')} className="mt-4 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors inline-flex items-center gap-1.5">
                                    <History className="h-3.5 w-3.5" />
                                    View History ({historyInternships.length})
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <AnimatePresence>
                                {currentInternships.map((item, index) => {
                                    const taskRatio = item.tasksAssigned > 0 ? (item.tasksSubmitted / item.tasksAssigned) * 100 : 0;
                                    return (
                                        <motion.div
                                            key={item.applicationId}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ delay: index * 0.07, duration: 0.35 }}
                                            className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-400 border border-gray-100 overflow-hidden group"
                                        >
                                            {/* Card Header */}
                                            <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 px-5 py-3.5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            <Briefcase className="h-4 w-4 text-white" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="font-bold text-white text-sm truncate">{item.internshipTitle}</h3>
                                                            <p className="text-blue-200 text-[11px]">{item.duration} internship</p>
                                                        </div>
                                                    </div>
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 bg-amber-400/20 text-amber-100 ring-1 ring-amber-400/30">
                                                        Awaiting Review
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-5 space-y-5">
                                                {/* Jobseeker Info */}
                                                <div className="flex items-center gap-3">
                                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-100 flex-shrink-0">
                                                        <span className="text-white font-bold text-xs">{getInitials(item.jobseekerName)}</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-gray-900 text-sm truncate">{item.jobseekerName}</p>
                                                        <p className="text-gray-400 text-xs">Jobseeker / Intern</p>
                                                    </div>
                                                </div>

                                                {/* Duration */}
                                                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
                                                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                    <div className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
                                                        <span className="font-medium text-gray-700">{formatDate(item.startDate)}</span>
                                                        <ArrowRight className="h-3 w-3 text-gray-300" />
                                                        <span className="font-medium text-gray-700">{formatDate(item.endDate)}</span>
                                                    </div>
                                                    <span className="ml-auto text-xs text-gray-400 font-medium bg-white px-2 py-0.5 rounded-md border border-gray-100">{item.duration}</span>
                                                </div>

                                                {/* Progress */}
                                                <div className={`${getProgressBg(item.progress)} rounded-xl p-4`}>
                                                    <div className="flex justify-between items-center mb-2.5">
                                                        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                                            <Target className="h-3.5 w-3.5" />
                                                            Approved Submissions
                                                        </span>
                                                        <span className={`text-2xl font-extrabold bg-gradient-to-r ${getProgressColor(item.progress)} bg-clip-text text-transparent`}>
                                                            {item.progress}%
                                                        </span>
                                                    </div>
                                                    <div className="h-3 w-full bg-white rounded-full overflow-hidden shadow-inner">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${item.progress}%` }}
                                                            transition={{ duration: 1.2, ease: 'easeOut', delay: index * 0.1 }}
                                                            className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(item.progress)} relative`}
                                                        >
                                                            <div className="absolute inset-0 bg-white/20 rounded-full"
                                                                style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.15) 8px, rgba(255,255,255,0.15) 16px)' }}
                                                            />
                                                        </motion.div>
                                                    </div>
                                                </div>

                                                {/* Tasks Comparison */}
                                                <div className="border border-gray-100 rounded-xl overflow-hidden">
                                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                                                        <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 uppercase tracking-wider">
                                                            <BarChart3 className="h-3.5 w-3.5" />
                                                            Tasks Assigned vs Approved
                                                        </p>
                                                    </div>
                                                    <div className="p-4">
                                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                                            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                                                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                                                    <ListChecks className="h-4 w-4 text-blue-600" />
                                                                </div>
                                                                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Assigned</p>
                                                                <p className="text-2xl font-extrabold text-gray-800">{item.tasksAssigned}</p>
                                                            </div>
                                                            <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-xl p-4 border border-indigo-100/50 text-center">
                                                                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                                                    <ClipboardCheck className="h-4 w-4 text-indigo-600" />
                                                                </div>
                                                                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Approved</p>
                                                                <p className="text-2xl font-extrabold text-indigo-700">{item.tasksSubmitted}</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                                                                <span>Completion ratio</span>
                                                                <span>{item.tasksSubmitted}/{item.tasksAssigned} approved</span>
                                                            </div>
                                                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${taskRatio}%` }}
                                                                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 + index * 0.1 }}
                                                                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Give Feedback Button */}
                                                <div className="flex space-x-3 pt-2">
                                                    <button
                                                        onClick={() => setFeedbackModal({ open: true, internship: item })}
                                                        className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-200/50 flex items-center justify-center space-x-2 group/btn"
                                                    >
                                                        <Star className="h-4 w-4 group-hover/btn:rotate-12 transition-transform" />
                                                        <span>Give Feedback</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </>
            )}

            {/* ─── HISTORY TAB ─── */}
            {activeTab === 'history' && (
                <>
                    {historyInternships.length === 0 && !error ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200"
                        >
                            <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <History className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">No feedback submitted yet</h3>
                            <p className="text-gray-400 mt-2 max-w-md mx-auto text-sm leading-relaxed">
                                {searchTerm
                                    ? `No history matching "${searchTerm}".`
                                    : 'Once you submit feedback for an intern, it will appear here.'
                                }
                            </p>
                            {currentInternships.length > 0 && (
                                <button onClick={() => setActiveTab('current')} className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors inline-flex items-center gap-1.5">
                                    <ClipboardCheck className="h-3.5 w-3.5" />
                                    Review Pending ({currentInternships.length})
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <AnimatePresence>
                                {historyInternships.map((item, index) => {
                                    const fb = item.feedbackData;
                                    return (
                                        <motion.div
                                            key={item.applicationId}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ delay: index * 0.07, duration: 0.35 }}
                                            className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-400 border border-gray-100 overflow-hidden"
                                        >
                                            {/* Card Header — Green for reviewed */}
                                            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-5 py-3.5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            <Briefcase className="h-4 w-4 text-white" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="font-bold text-white text-sm truncate">{item.internshipTitle}</h3>
                                                            <p className="text-emerald-200 text-[11px]">{item.duration} internship</p>
                                                        </div>
                                                    </div>
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 bg-green-400/20 text-green-100 ring-1 ring-green-400/30">
                                                        ✓ Reviewed
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-5 space-y-4">
                                                {/* Jobseeker Info */}
                                                <div className="flex items-center gap-3">
                                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-100 flex-shrink-0">
                                                        <span className="text-white font-bold text-xs">{getInitials(item.jobseekerName)}</span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-gray-900 text-sm truncate">{item.jobseekerName}</p>
                                                        <p className="text-gray-400 text-xs">Jobseeker / Intern</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-2xl font-extrabold bg-gradient-to-r ${getProgressColor(item.progress)} bg-clip-text text-transparent`}>
                                                            {item.progress}%
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-medium">{item.tasksSubmitted}/{item.tasksAssigned} tasks</p>
                                                    </div>
                                                </div>

                                                {/* Submitted Feedback Display */}
                                                {fb && (
                                                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                                                                <MessageSquare className="h-3.5 w-3.5" />
                                                                Your Feedback
                                                            </span>
                                                            {fb.rating && (
                                                                <div className="flex items-center gap-1">
                                                                    {[1, 2, 3, 4, 5].map(s => (
                                                                        <Star
                                                                            key={s}
                                                                            className={`h-3.5 w-3.5 ${s <= fb.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                                                                        />
                                                                    ))}
                                                                    <span className="text-xs text-gray-500 ml-1 font-medium">{fb.rating}/5</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                                                            {fb.feedback}
                                                        </p>
                                                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-emerald-100">
                                                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                Submitted {formatTimeAgo(fb.createdAt)}
                                                            </span>
                                                            {fb.updatedAt && fb.updatedAt !== fb.createdAt && (
                                                                <span className="text-[10px] text-gray-400">
                                                                    Updated {formatTimeAgo(fb.updatedAt)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Duration row */}
                                                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2">
                                                    <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                    <span className="text-xs text-gray-600">{formatDate(item.startDate)} → {formatDate(item.endDate)}</span>
                                                    <span className="ml-auto text-xs text-gray-400 font-medium">{item.duration}</span>
                                                </div>

                                                {/* Edit Feedback button */}
                                                <div className="flex space-x-3 pt-1">
                                                    <button
                                                        onClick={() => setFeedbackModal({ open: true, internship: item })}
                                                        className="flex-1 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-semibold border border-emerald-200 hover:bg-emerald-100 transition-all duration-200 flex items-center justify-center space-x-2"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                        <span>Edit Feedback</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default FeedbackAssessments;
