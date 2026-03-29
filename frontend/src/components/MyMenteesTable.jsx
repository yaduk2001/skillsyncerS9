import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Mail,
  Calendar,
  MessageCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  GraduationCap,
  Briefcase,
  UserCheck,
  ArrowUpDown,
  Activity,
  Timer,
  Award
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import ChatPanel from './ChatPanel';

const MyMenteesTable = ({ mentorId }) => {
  const [mentees, setMentees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMentee, setSelectedMentee] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    fetchMentees();
  }, [mentorId]);

  const fetchMentees = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/mentor/mentees-detailed`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setMentees(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch mentees');
      }
    } catch (err) {
      console.error('Error fetching mentees:', err);
      setError('Failed to load mentees. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 'N/A';

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Invalid Date';

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else if (diffDays < 365) {
      const months = Math.round(diffDays / 30);
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.round(diffDays / 365);
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = mentees.length;
    const active = mentees.filter(m => m.status === 'active').length;
    const completed = mentees.filter(m => m.status === 'completed').length;
    const incomplete = mentees.filter(m => m.status === 'incomplete').length;
    const internships = mentees.filter(m => m.contextType === 'internship').length;
    return { total, active, completed, incomplete, internships };
  }, [mentees]);

  // Filtered and sorted mentees
  const filteredMentees = useMemo(() => {
    let result = [...mentees];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.name?.toLowerCase().includes(query) ||
        m.email?.toLowerCase().includes(query) ||
        m.contextName?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(m => m.status === statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'startDate':
          comparison = new Date(a.startDate || 0) - new Date(b.startDate || 0);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [mentees, searchQuery, statusFilter, sortBy, sortOrder]);

  const getStatusConfig = (status) => {
    const configs = {
      active: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
        icon: Activity,
        label: 'Active'
      },
      completed: {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        text: 'text-slate-700',
        dot: 'bg-slate-500',
        icon: CheckCircle,
        label: 'Completed'
      },
      incomplete: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        dot: 'bg-orange-500',
        icon: AlertCircle,
        label: 'Incomplete'
      },
      inactive: {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-600',
        dot: 'bg-gray-400',
        icon: Clock,
        label: 'Inactive'
      }
    };
    return configs[status] || configs.inactive;
  };

  const getContextConfig = (contextType) => {
    if (!contextType) return null;
    return contextType === 'internship'
      ? {
        bg: 'bg-violet-50',
        border: 'border-violet-200',
        text: 'text-violet-700',
        icon: GraduationCap,
        label: 'Internship'
      }
      : {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        icon: Briefcase,
        label: 'Project'
      };
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColors = (name) => {
    const colors = [
      'from-slate-600 to-slate-700',
      'from-zinc-600 to-zinc-700',
      'from-stone-600 to-stone-700',
      'from-gray-600 to-gray-700'
    ];
    const index = name ? name.length % colors.length : 0;
    return colors[index];
  };

  const getContextTypeBadge = (contextType) => {
    if (!contextType) return null;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${contextType === 'internship'
          ? 'bg-purple-100 text-purple-700'
          : 'bg-indigo-100 text-indigo-700'
        }`}>
        {contextType === 'internship' ? 'Internship' : 'Project'}
      </span>
    );
  };

  const toggleRowExpansion = (menteeId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(menteeId)) {
      newExpanded.delete(menteeId);
    } else {
      newExpanded.add(menteeId);
    }
    setExpandedRows(newExpanded);
  };

  const handleChatClick = (mentee) => {
    if (!mentee.contextType || !mentee.contextId) {
      alert('This mentee does not have an active internship or project assigned.');
      return;
    }
    setSelectedMentee(mentee);
    setShowChat(true);
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-2 border-gray-800 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <div className="text-center">
            <p className="text-gray-800 font-medium">Loading mentees</p>
            <p className="text-gray-400 text-sm mt-0.5">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-start gap-5">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg mb-1">Unable to Load Mentees</h3>
            <p className="text-gray-500 mb-5">{error}</p>
            <button
              onClick={fetchMentees}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mentees.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12">
        <div className="max-w-sm mx-auto text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Users className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 text-lg mb-2">No Mentees Assigned</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Mentees will be automatically matched based on their academic performance and your areas of expertise.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Mentees */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Mentees</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats.total}</p>
              <p className="text-xs text-gray-400">Assigned to you</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Active */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats.active}</p>
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Currently ongoing
              </p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Completed</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats.completed}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Award className="w-3 h-3" />
                Successfully finished
              </p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-slate-600" />
            </div>
          </div>
        </div>

        {/* Internships */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Internships</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats.internships}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                Training programs
              </p>
            </div>
            <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-violet-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or program..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 cursor-pointer text-gray-700"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="incomplete">Incomplete</option>
              <option value="inactive">Inactive</option>
            </select>

            <button
              onClick={fetchMentees}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Results Count */}
        {filteredMentees.length !== mentees.length && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{filteredMentees.length}</span> of {mentees.length} mentees
            </p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors group"
                  >
                    Student
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Program
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors group"
                  >
                    Status
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('startDate')}
                    className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors group"
                  >
                    Timeline
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                  </button>
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <AnimatePresence mode="popLayout">
                {filteredMentees.map((mentee, index) => {
                  const statusConfig = getStatusConfig(mentee.status);
                  const contextConfig = getContextConfig(mentee.contextType);
                  const StatusIcon = statusConfig.icon;
                  const ContextIcon = contextConfig?.icon || Briefcase;

                  return (
                    <motion.tr
                      key={mentee.jobseekerId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: index * 0.02, duration: 0.2 }}
                      className="hover:bg-gray-50/80 transition-colors"
                    >
                      {/* Student */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative flex-shrink-0">
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAvatarColors(mentee.name)} flex items-center justify-center text-white font-semibold text-sm shadow-sm`}>
                              {getInitials(mentee.name)}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusConfig.dot} rounded-full border-2 border-white`}></div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{mentee.name}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{mentee.email}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Program */}
                      <td className="px-6 py-5">
                        <div className="space-y-2">
                          {contextConfig && (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${contextConfig.bg} ${contextConfig.border} ${contextConfig.text}`}>
                              <ContextIcon className="w-3.5 h-3.5" />
                              {contextConfig.label}
                            </span>
                          )}
                          <p className="text-sm text-gray-700 font-medium max-w-[200px] truncate">
                            {mentee.contextName || 'Not specified'}
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConfig.label}
                        </span>
                      </td>

                      {/* Timeline */}
                      <td className="px-6 py-5">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>{formatDate(mentee.startDate)}</span>
                            <span className="text-gray-300">→</span>
                            <span>{formatDate(mentee.endDate)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {mentee.endDate && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <Timer className="w-3 h-3" />
                                {calculateDuration(mentee.startDate, mentee.endDate)}
                              </span>
                            )}
                            {mentee.status === 'active' && getDaysRemaining(mentee.endDate) !== null && getDaysRemaining(mentee.endDate) > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">
                                {getDaysRemaining(mentee.endDate)} days left
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => handleChatClick(mentee)}
                          disabled={!mentee.contextType || !mentee.contextId}
                          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${mentee.contextType && mentee.contextId
                              ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm hover:shadow'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                          <MessageCircle className="w-4 h-4" />
                          Message
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Empty Results */}
        {filteredMentees.length === 0 && (
          <div className="py-16 text-center">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No mentees found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredMentees.map((mentee, index) => {
            const statusConfig = getStatusConfig(mentee.status);
            const contextConfig = getContextConfig(mentee.contextType);
            const StatusIcon = statusConfig.icon;
            const ContextIcon = contextConfig?.icon || Briefcase;

            return (
              <motion.div
                key={mentee.jobseekerId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ delay: index * 0.04, duration: 0.2 }}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarColors(mentee.name)} flex items-center justify-center text-white font-semibold shadow-sm`}>
                          {getInitials(mentee.name)}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusConfig.dot} rounded-full border-2 border-white`}></div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{mentee.name}</p>
                        <p className="text-sm text-gray-500 truncate flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {mentee.email}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border flex-shrink-0 ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4">
                  {/* Program */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {contextConfig && (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${contextConfig.bg} ${contextConfig.border} ${contextConfig.text}`}>
                        <ContextIcon className="w-3 h-3" />
                        {contextConfig.label}
                      </span>
                    )}
                    <p className="text-sm text-gray-700 font-medium">{mentee.contextName || 'Not specified'}</p>
                  </div>

                  {/* Date Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Start Date</p>
                      <p className="text-sm font-semibold text-gray-900">{formatDate(mentee.startDate)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">End Date</p>
                      <p className="text-sm font-semibold text-gray-900">{formatDate(mentee.endDate)}</p>
                    </div>
                  </div>

                  {/* Duration & Days Left */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {mentee.endDate && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">
                        <Timer className="w-3.5 h-3.5" />
                        {calculateDuration(mentee.startDate, mentee.endDate)}
                      </span>
                    )}
                    {mentee.status === 'active' && getDaysRemaining(mentee.endDate) !== null && getDaysRemaining(mentee.endDate) > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">
                        {getDaysRemaining(mentee.endDate)} days left
                      </span>
                    )}
                  </div>

                  {/* Expand Button */}
                  <button
                    onClick={() => toggleRowExpansion(mentee.jobseekerId)}
                    className="w-full flex items-center justify-between py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors border-t border-gray-100"
                  >
                    <span>View additional details</span>
                    {expandedRows.has(mentee.jobseekerId) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedRows.has(mentee.jobseekerId) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 border-t border-gray-100 space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Assigned</p>
                              <p className="text-sm font-medium text-gray-900">{formatDate(mentee.assignedDate)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Last Submission</p>
                              <p className="text-sm font-medium text-gray-900">{formatDate(mentee.lastSubmissionDate)}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => handleChatClick(mentee)}
                    disabled={!mentee.contextType || !mentee.contextId}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${mentee.contextType && mentee.contextId
                        ? 'bg-gray-900 text-white hover:bg-gray-800'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Start Conversation
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty Results Mobile */}
        {filteredMentees.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No mentees found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <AnimatePresence>
        {showChat && selectedMentee && (
          <ChatPanel
            mentorId={mentorId}
            mentee={selectedMentee}
            onClose={() => {
              setShowChat(false);
              setSelectedMentee(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyMenteesTable;
