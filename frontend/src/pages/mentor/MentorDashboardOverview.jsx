import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Briefcase,
  FolderKanban,
  FileSearch,
  Calendar,
  Percent,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

/**
 * Mentor Overview Dashboard
 * Displays summary metrics for the logged-in mentor.
 * All data is strictly isolated by mentor and company via backend API.
 */
const MentorDashboardOverview = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/mentor/overview`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load overview');
      }

      if (data.success && data.data) {
        setOverview(data.data);
      } else {
        throw new Error(data.message || 'Invalid response');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]" role="status" aria-label="Loading overview">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading your overview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-red-100 bg-red-50/50 p-6"
        role="alert"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">Unable to load overview</h3>
            <p className="mt-1 text-sm text-slate-600">{error}</p>
            <button
              onClick={fetchOverview}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  const metrics = [
    {
      label: 'Total Mentees Assigned',
      value: overview?.totalMentees ?? 0,
      icon: Users,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      delay: 0.05,
    },
    {
      label: 'Active Internships',
      value: overview?.activeInternships ?? 0,
      icon: Briefcase,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      delay: 0.1,
    },
    {
      label: 'Active Projects',
      value: overview?.activeProjects ?? 0,
      icon: FolderKanban,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      delay: 0.15,
    },
    {
      label: 'Pending Submissions',
      value: overview?.pendingSubmissions ?? 0,
      icon: FileSearch,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      delay: 0.2,
    },
    {
      label: 'Upcoming Meetings',
      value: overview?.upcomingMeetings ?? 0,
      icon: Calendar,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      delay: 0.25,
    },
    {
      label: 'Overall Completion Rate',
      value: `${overview?.completionRate ?? 0}%`,
      icon: Percent,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      delay: 0.3,
    },
  ];

  return (
    <div className="space-y-6" role="region" aria-label="Mentor overview metrics">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: metric.delay }}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
                    {metric.value}
                  </p>
                </div>
                <div
                  className={`flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center ${metric.iconBg} ${metric.iconColor}`}
                  aria-hidden
                >
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default MentorDashboardOverview;
