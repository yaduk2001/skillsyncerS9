import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Star, Send, AlertCircle, CheckCircle,
    Briefcase, Building2, User, Clock, Calendar,
    MessageSquare, ThumbsUp, ThumbsDown, Shield, Loader
} from 'lucide-react';

const RATING_CATEGORIES = [
    { key: 'overallExperience', label: 'Overall Experience', description: 'How was your overall internship experience?' },
    { key: 'mentorSupport', label: 'Mentor Support', description: 'How helpful and supportive was your mentor?' },
    { key: 'learningOutcome', label: 'Learning Outcome', description: 'How much did you learn during the internship?' },
    { key: 'taskRelevance', label: 'Task Relevance', description: 'Were the assigned tasks relevant and meaningful?' },
    { key: 'platformExperience', label: 'Platform Experience', description: 'How was your experience using the SkillSync platform?' },
];

const StarRating = ({ value, onChange, disabled }) => {
    const [hovered, setHovered] = useState(0);

    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={disabled}
                    className="focus:outline-none transition-transform hover:scale-110 disabled:cursor-not-allowed"
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => onChange(star)}
                >
                    <Star
                        className={`w-7 h-7 transition-colors duration-150 ${star <= (hovered || value)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-300'
                            }`}
                    />
                </button>
            ))}
            {value > 0 && (
                <span className="ml-2 text-sm font-medium text-gray-600">
                    {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][value]}
                </span>
            )}
        </div>
    );
};

const JobseekerFeedbackModal = ({ isOpen, onClose, application, onSubmitSuccess }) => {
    const [ratings, setRatings] = useState({
        overallExperience: 0,
        mentorSupport: 0,
        learningOutcome: 0,
        taskRelevance: 0,
        platformExperience: 0,
    });

    const [feedback, setFeedback] = useState({
        whatWentWell: '',
        areasOfImprovement: '',
        additionalComments: '',
    });

    const [wouldRecommend, setWouldRecommend] = useState(null);
    const [declarationAccepted, setDeclarationAccepted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const calculateEndDate = (startDate, duration) => {
        if (!startDate || !duration) return null;
        const start = new Date(startDate);
        const end = new Date(start);
        const durationMatch = duration.match(/(\d+)\s*(day|month|year|s)/i);
        if (!durationMatch) return null;
        const value = parseInt(durationMatch[1]);
        const unit = durationMatch[2].toLowerCase();
        switch (unit) {
            case 'day': case 'days': end.setDate(start.getDate() + value); break;
            case 'month': case 'months': end.setMonth(start.getMonth() + value); break;
            case 'year': case 'years': end.setFullYear(start.getFullYear() + value); break;
            default: return null;
        }
        return end;
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    // Internship details
    const internshipTitle = application?.internshipId?.title || application?.internshipDetails?.title || 'Internship';
    const companyName = application?.internshipId?.companyName || 'Company';
    const mentorName = application?.mentorId?.name || 'N/A';
    const duration = application?.internshipId?.duration || application?.internshipDetails?.duration || 'N/A';
    const startDate = application?.internshipId?.startDate || application?.internshipDetails?.startDate;
    const completionDate = calculateEndDate(startDate, duration);

    const validate = () => {
        // Check all ratings
        for (const cat of RATING_CATEGORIES) {
            if (!ratings[cat.key] || ratings[cat.key] < 1) {
                setError(`Please rate "${cat.label}"`);
                return false;
            }
        }
        if (!feedback.whatWentWell || feedback.whatWentWell.trim().length < 10) {
            setError('"What went well" must be at least 10 characters');
            return false;
        }
        if (!feedback.areasOfImprovement || feedback.areasOfImprovement.trim().length < 10) {
            setError('"Areas of improvement" must be at least 10 characters');
            return false;
        }
        if (wouldRecommend === null) {
            setError('Please select whether you would recommend this internship');
            return false;
        }
        if (!declarationAccepted) {
            setError('Please accept the declaration to proceed');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        setError('');
        if (!validate()) return;

        setSubmitting(true);
        try {
            const { jobseekerApi } = await import('../utils/api');
            const response = await jobseekerApi.submitFeedback({
                applicationId: application._id,
                ratings,
                feedback,
                wouldRecommend,
                declarationAccepted,
            });

            if (response.success && response.data?.success !== false) {
                setSuccess(true);
                setTimeout(() => {
                    onSubmitSuccess?.();
                    onClose();
                }, 2000);
            } else {
                setError(response.data?.message || 'Failed to submit feedback');
            }
        } catch (err) {
            setError(err.message || 'Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Submit Internship Feedback</h2>
                                <p className="text-blue-100 text-xs">Complete to unlock your certificate</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
                        {/* Success State */}
                        {success && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-3"
                            >
                                <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-green-800">Feedback Submitted Successfully!</p>
                                    <p className="text-sm text-green-600">Your certificate is now unlocked. You can download it from the Actions column.</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Error */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2"
                            >
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                <p className="text-sm text-red-700">{error}</p>
                            </motion.div>
                        )}

                        {!success && (
                            <>
                                {/* Internship Details (Read-Only) */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-blue-500" />
                                        Internship Details
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Internship Title</p>
                                                <p className="text-xs font-medium text-gray-800">{internshipTitle}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Company</p>
                                                <p className="text-xs font-medium text-gray-800">{companyName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <User className="w-3.5 h-3.5 text-gray-400" />
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Mentor</p>
                                                <p className="text-xs font-medium text-gray-800">{mentorName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Duration</p>
                                                <p className="text-xs font-medium text-gray-800">{duration}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 col-span-2">
                                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Completion Date</p>
                                                <p className="text-xs font-medium text-gray-800">{formatDate(completionDate)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Star Ratings */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <Star className="w-4 h-4 text-amber-500" />
                                        Rate Your Experience
                                        <span className="text-red-500 text-xs">*</span>
                                    </h3>
                                    <div className="space-y-4">
                                        {RATING_CATEGORIES.map((cat) => (
                                            <div key={cat.key} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-800">{cat.label}</p>
                                                        <p className="text-[10px] text-gray-400">{cat.description}</p>
                                                    </div>
                                                    <StarRating
                                                        value={ratings[cat.key]}
                                                        onChange={(val) => setRatings(prev => ({ ...prev, [cat.key]: val }))}
                                                        disabled={submitting}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Text Feedback */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-blue-500" />
                                        Written Feedback
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                What went well? <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                value={feedback.whatWentWell}
                                                onChange={(e) => setFeedback(prev => ({ ...prev, whatWentWell: e.target.value }))}
                                                placeholder="Share what you enjoyed about the internship, mentor guidance, tasks, etc."
                                                rows={3}
                                                maxLength={1000}
                                                disabled={submitting}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none disabled:opacity-50 transition-colors"
                                            />
                                            <p className="text-right text-[10px] text-gray-400 mt-0.5">{feedback.whatWentWell.length}/1000</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Areas of Improvement <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                value={feedback.areasOfImprovement}
                                                onChange={(e) => setFeedback(prev => ({ ...prev, areasOfImprovement: e.target.value }))}
                                                placeholder="What could be improved about the internship experience or the SkillSync platform?"
                                                rows={3}
                                                maxLength={1000}
                                                disabled={submitting}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none disabled:opacity-50 transition-colors"
                                            />
                                            <p className="text-right text-[10px] text-gray-400 mt-0.5">{feedback.areasOfImprovement.length}/1000</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Additional Comments <span className="text-gray-400">(optional)</span>
                                            </label>
                                            <textarea
                                                value={feedback.additionalComments}
                                                onChange={(e) => setFeedback(prev => ({ ...prev, additionalComments: e.target.value }))}
                                                placeholder="Any other thoughts, suggestions, or experiences you'd like to share..."
                                                rows={2}
                                                maxLength={1000}
                                                disabled={submitting}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none disabled:opacity-50 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Recommendation */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <ThumbsUp className="w-4 h-4 text-green-500" />
                                        Would you recommend this internship to others?
                                        <span className="text-red-500 text-xs">*</span>
                                    </h3>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            disabled={submitting}
                                            onClick={() => setWouldRecommend(true)}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all text-sm font-medium ${wouldRecommend === true
                                                    ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                                                    : 'border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50/50'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            <ThumbsUp className={`w-5 h-5 ${wouldRecommend === true ? 'text-green-500' : 'text-gray-400'}`} />
                                            Yes, I would
                                        </button>
                                        <button
                                            type="button"
                                            disabled={submitting}
                                            onClick={() => setWouldRecommend(false)}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all text-sm font-medium ${wouldRecommend === false
                                                    ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                                                    : 'border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:bg-red-50/50'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            <ThumbsDown className={`w-5 h-5 ${wouldRecommend === false ? 'text-red-500' : 'text-gray-400'}`} />
                                            No, I wouldn't
                                        </button>
                                    </div>
                                </div>

                                {/* Declaration */}
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={declarationAccepted}
                                            onChange={(e) => setDeclarationAccepted(e.target.checked)}
                                            disabled={submitting}
                                            className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                        />
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Shield className="w-4 h-4 text-blue-500" />
                                                <span className="text-xs font-semibold text-blue-800">Declaration</span>
                                                <span className="text-red-500 text-xs">*</span>
                                            </div>
                                            <p className="text-xs text-blue-700 leading-relaxed">
                                                I declare that the feedback provided above is honest and based on my genuine experience
                                                during the internship. I understand that this feedback will be used to improve the
                                                SkillSync platform and mentoring experience for future users.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    {!success && (
                        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50 flex-shrink-0">
                            <button
                                onClick={onClose}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
                            >
                                {submitting ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Submit Feedback
                                    </>
                                )}
                            </motion.button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default JobseekerFeedbackModal;
