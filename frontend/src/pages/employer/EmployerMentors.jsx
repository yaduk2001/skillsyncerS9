import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    UserCheck,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Award,
    Mail,
    Briefcase,
    Target,
    CheckCircle,
    Clock,
    XCircle,
    BarChart3,
    Star,
    Sparkles,
    GraduationCap
} from 'lucide-react';

const EmployerMentors = ({ mentorsData, loadingMentors, reload }) => {
    const [expandedMentor, setExpandedMentor] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const mentors = mentorsData?.mentors || [];
    const totalMentors = mentorsData?.totalMentors || 0;
    const totalMentees = mentorsData?.totalMenteesAcrossAll || 0;

    // Compute average progress across all mentees
    const allMentees = mentors.flatMap(m => m.mentees || []);
    const avgProgress = allMentees.length > 0
        ? Math.round(allMentees.reduce((sum, m) => sum + (m.progress?.progressPercent || 0), 0) / allMentees.length)
        : 0;

    // Filter mentors by search
    const filteredMentors = mentors.filter(m => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            m.name?.toLowerCase().includes(q) ||
            m.email?.toLowerCase().includes(q) ||
            m.expertise?.some(e => e.toLowerCase().includes(q)) ||
            m.mentees?.some(mt => mt.name?.toLowerCase().includes(q))
        );
    });

    const toggleMentor = (id) => {
        setExpandedMentor(prev => prev === id ? null : id);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-emerald-100 text-emerald-800';
            case 'active':
            case 'internship-started': return 'bg-blue-100 text-blue-800';
            case 'selected': return 'bg-amber-100 text-amber-800';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getProgressColor = (percent) => {
        if (percent >= 80) return 'from-emerald-500 to-green-400';
        if (percent >= 50) return 'from-blue-500 to-cyan-400';
        if (percent >= 25) return 'from-amber-500 to-yellow-400';
        return 'from-gray-400 to-gray-300';
    };

    const getGradeBadge = (grade) => {
        if (grade === 'A') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm">
                    <Star className="w-3 h-3" /> Grade A
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-violet-400 to-purple-400 text-white shadow-sm">
                <Award className="w-3 h-3" /> Grade B
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        Company Mentors
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Manage mentors and track mentee progress</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={reload}
                    disabled={loadingMentors}
                    className="bg-white text-gray-700 px-4 py-2.5 rounded-xl font-medium border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${loadingMentors ? 'animate-spin' : ''}`} />
                    Refresh
                </motion.button>
            </motion.div>

            {/* KPI Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
                {[
                    {
                        label: 'Total Mentors',
                        value: totalMentors,
                        icon: UserCheck,
                        gradient: 'from-violet-500 to-purple-600',
                        bg: 'bg-violet-50',
                        text: 'text-violet-700'
                    },
                    {
                        label: 'Total Mentees',
                        value: totalMentees,
                        icon: Users,
                        gradient: 'from-blue-500 to-indigo-600',
                        bg: 'bg-blue-50',
                        text: 'text-blue-700'
                    },
                    {
                        label: 'Avg. Progress',
                        value: `${avgProgress}%`,
                        icon: BarChart3,
                        gradient: 'from-emerald-500 to-green-600',
                        bg: 'bg-emerald-50',
                        text: 'text-emerald-700'
                    }
                ].map((kpi, idx) => (
                    <motion.div
                        key={kpi.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + idx * 0.05 }}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/40 p-5 hover:shadow-xl transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{kpi.label}</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                            </div>
                            <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shadow-lg`}>
                                <kpi.icon className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Search */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative"
            >
                <input
                    type="text"
                    placeholder="Search mentors, mentees, or expertise..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-96 border border-gray-200 rounded-xl pl-4 pr-4 py-2.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400 transition-all"
                />
            </motion.div>

            {/* Content */}
            {loadingMentors ? (
                <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading mentors...</p>
                </div>
            ) : filteredMentors.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30"
                >
                    <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <GraduationCap className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">No Mentors Found</h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                        {searchQuery
                            ? 'No mentors match your search criteria. Try adjusting your search.'
                            : 'No mentors are currently assigned to your company. Submit a mentor request to get started.'}
                    </p>
                </motion.div>
            ) : (
                <div className="space-y-4">
                    {filteredMentors.map((mentor, idx) => (
                        <motion.div
                            key={mentor._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * idx }}
                            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/40 overflow-hidden hover:shadow-xl transition-all"
                        >
                            {/* Mentor Card Header */}
                            <div
                                className="p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                onClick={() => toggleMentor(mentor._id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg ring-2 ring-white">
                                            <span className="text-white text-lg font-bold">
                                                {(mentor.name || 'M').charAt(0).toUpperCase()}
                                            </span>
                                        </div>

                                        {/* Info */}
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base font-semibold text-gray-900">{mentor.name}</h3>
                                                {getGradeBadge(mentor.grade)}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Mail className="w-3 h-3" /> {mentor.email}
                                                </span>
                                                {mentor.department && (
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Briefcase className="w-3 h-3" /> {mentor.department}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* Capacity */}
                                        <div className="hidden sm:flex flex-col items-end gap-1">
                                            <span className="text-xs font-medium text-gray-500">
                                                Mentees: {mentor.mentees?.length || 0} / {mentor.maxMentees}
                                            </span>
                                            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min(((mentor.mentees?.length || 0) / mentor.maxMentees) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Expertise tags */}
                                        <div className="hidden md:flex gap-1.5 flex-wrap max-w-[200px] justify-end">
                                            {(mentor.expertise || []).slice(0, 3).map((exp, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-medium border border-violet-100"
                                                >
                                                    {exp}
                                                </span>
                                            ))}
                                            {(mentor.expertise || []).length > 3 && (
                                                <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full text-xs border border-gray-100">
                                                    +{mentor.expertise.length - 3}
                                                </span>
                                            )}
                                        </div>

                                        {/* Expand arrow */}
                                        <motion.div
                                            animate={{ rotate: expandedMentor === mentor._id ? 180 : 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-200"
                                        >
                                            <ChevronDown className="w-4 h-4 text-gray-500" />
                                        </motion.div>
                                    </div>
                                </div>
                            </div>

                            {/* Mentees Dropdown */}
                            <AnimatePresence>
                                {expandedMentor === mentor._id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="overflow-hidden"
                                    >
                                        <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
                                            {/* Mobile expertise display */}
                                            <div className="md:hidden px-5 pt-3 flex gap-1.5 flex-wrap">
                                                {(mentor.expertise || []).map((exp, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-medium border border-violet-100"
                                                    >
                                                        {exp}
                                                    </span>
                                                ))}
                                            </div>

                                            {(!mentor.mentees || mentor.mentees.length === 0) ? (
                                                <div className="px-5 py-8 text-center">
                                                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                                        <Users className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                    <p className="text-sm text-gray-500">No mentees assigned yet</p>
                                                </div>
                                            ) : (
                                                <div className="px-5 py-4 space-y-3">
                                                    {/* Column Headers */}
                                                    <div className="hidden lg:grid lg:grid-cols-12 gap-3 px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                        <div className="col-span-3">Mentee</div>
                                                        <div className="col-span-3">Internship</div>
                                                        <div className="col-span-1 text-center">Grade</div>
                                                        <div className="col-span-1 text-center">Status</div>
                                                        <div className="col-span-4">Progress</div>
                                                    </div>

                                                    {mentor.mentees.map((mentee, mIdx) => (
                                                        <motion.div
                                                            key={mentee._id || mIdx}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: mIdx * 0.05 }}
                                                            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4"
                                                        >
                                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                                                                {/* Mentee Name & Email */}
                                                                <div className="lg:col-span-3 flex items-center gap-3">
                                                                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-sm flex-shrink-0">
                                                                        <span className="text-white text-sm font-bold">
                                                                            {(mentee.name || 'M').charAt(0).toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-semibold text-gray-900 truncate">{mentee.name}</p>
                                                                        <p className="text-xs text-gray-400 truncate">{mentee.email}</p>
                                                                    </div>
                                                                </div>

                                                                {/* Internship */}
                                                                <div className="lg:col-span-3">
                                                                    <p className="text-sm text-gray-700 truncate">{mentee.internshipTitle}</p>
                                                                    {mentee.internshipDuration && (
                                                                        <p className="text-xs text-gray-400">{mentee.internshipDuration}</p>
                                                                    )}
                                                                </div>

                                                                {/* Grade */}
                                                                <div className="lg:col-span-1 flex lg:justify-center">
                                                                    {mentee.grade ? (
                                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${mentee.grade === 'A' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                                                                            }`}>
                                                                            {mentee.grade}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-400">—</span>
                                                                    )}
                                                                </div>

                                                                {/* Status */}
                                                                <div className="lg:col-span-1 flex lg:justify-center">
                                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusColor(mentee.applicationStatus)}`}>
                                                                        {mentee.applicationStatus?.replace('-', ' ') || 'N/A'}
                                                                    </span>
                                                                </div>

                                                                {/* Progress */}
                                                                <div className="lg:col-span-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center justify-between mb-1">
                                                                                <span className="text-xs font-medium text-gray-600">
                                                                                    {mentee.progress?.approvedSubmissions || 0} / {mentee.progress?.totalTasks || 0} tasks
                                                                                </span>
                                                                                <span className={`text-xs font-bold ${(mentee.progress?.progressPercent || 0) >= 80 ? 'text-emerald-600' :
                                                                                        (mentee.progress?.progressPercent || 0) >= 50 ? 'text-blue-600' :
                                                                                            'text-gray-500'
                                                                                    }`}>
                                                                                    {mentee.progress?.progressPercent || 0}%
                                                                                </span>
                                                                            </div>
                                                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                                <motion.div
                                                                                    initial={{ width: 0 }}
                                                                                    animate={{ width: `${mentee.progress?.progressPercent || 0}%` }}
                                                                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                                                                    className={`h-full bg-gradient-to-r ${getProgressColor(mentee.progress?.progressPercent || 0)} rounded-full`}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Mini task stats */}
                                                                    <div className="flex items-center gap-3 mt-2">
                                                                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                                                                            <CheckCircle className="w-3 h-3" /> {mentee.progress?.approvedSubmissions || 0}
                                                                        </span>
                                                                        <span className="flex items-center gap-1 text-xs text-amber-600">
                                                                            <Clock className="w-3 h-3" /> {mentee.progress?.pendingSubmissions || 0}
                                                                        </span>
                                                                        <span className="flex items-center gap-1 text-xs text-red-500">
                                                                            <XCircle className="w-3 h-3" /> {mentee.progress?.rejectedSubmissions || 0}
                                                                        </span>
                                                                        <span className="flex items-center gap-1 text-xs text-gray-400">
                                                                            <Target className="w-3 h-3" /> {mentee.progress?.totalTasks || 0} total
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EmployerMentors;
