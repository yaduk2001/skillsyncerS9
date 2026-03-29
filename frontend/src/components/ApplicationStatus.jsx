import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jobseekerApi } from '../utils/api';
import {
  FileText,
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  X,
  Loader,
  Award,
  BookOpen,
  Target,
  Download,
  MessageSquare
} from 'lucide-react';
import JobseekerFeedbackModal from './JobseekerFeedbackModal';

const ApplicationStatus = () => {
  const [applications, setApplications] = useState([]);
  const [assignedMentor, setAssignedMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [showTestDetails, setShowTestDetails] = useState(false);
  const [testDetails, setTestDetails] = useState(null);
  const [loadingTestDetails, setLoadingTestDetails] = useState(false);
  const [feedbackModalApp, setFeedbackModalApp] = useState(null);
  const [feedbackStatuses, setFeedbackStatuses] = useState({}); // { [appId]: boolean }

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await jobseekerApi.getDetailedApplications();
      if (response.success) {
        // The API util wraps responses as { success, data } and backend may also wrap as { success, data }
        const payload = response?.data?.success ? response.data.data : response.data;
        const apps = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
        console.log('--- DEBUG: Received Applications ---', apps);
        apps.forEach(app => {
          console.log(`App: ${app.internshipId?.title || 'Untitled'}, MentorId:`, app.mentorId);
        });
        setApplications(apps);
        // Mentor is assigned at user level; API returns assignedMentor alongside applications
        setAssignedMentor(response?.data?.assignedMentor ?? null);
      } else {
        setError(response.message || 'Failed to load applications');
        setApplications([]);
        setAssignedMentor(null);
      }
    } catch (error) {
      setError(error.message || 'An error occurred while loading applications');
      setApplications([]);
      setAssignedMentor(null);
    } finally {
      setLoading(false);
    }
  };

  const loadTestDetails = async (applicationId) => {
    setLoadingTestDetails(true);
    try {
      const response = await jobseekerApi.getTestDetails(applicationId);
      console.log('Test details response:', response);
      if (response.success) {
        const payload = response?.data?.success ? response.data.data : response.data;
        console.log('Test details payload:', payload);
        setTestDetails(payload);
        setShowTestDetails(true);
      } else {
        const message = response?.data?.message || response?.message || 'Failed to load test details';
        alert(message);
      }
    } catch (error) {
      console.error('Error loading test details:', error);
      alert(error.message || 'Failed to load test details');
    } finally {
      setLoadingTestDetails(false);
    }
  };

  const getStatusBadge = (status, decision) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      'shortlisted': { color: 'bg-blue-100 text-blue-800', text: 'Shortlisted' },
      'test-assigned': { color: 'bg-purple-100 text-purple-800', text: 'Test Assigned' },
      'selected': { color: 'bg-green-100 text-green-800', text: 'Selected' },
      'rejected': {
        color: decision === 'Auto-Rejected' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800',
        text: decision === 'Auto-Rejected' ? 'Auto Rejected' : 'Rejected'
      },
      'active': { color: 'bg-green-100 text-green-800', text: 'Active' },
      'completed': { color: 'bg-gray-100 text-gray-800', text: 'Completed' },
      'incomplete': { color: 'bg-orange-100 text-orange-800', text: 'Incomplete' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };

    return (
      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getTestStatusBadge = (result, score) => {
    if (result === 'Passed') {
      return (
        <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center">
          <CheckCircle className="w-3 h-3 mr-1" />
          Passed
        </span>
      );
    } else if (result === 'Failed') {
      return (
        <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </span>
      );
    } else {
      return <span className="text-gray-500 text-xs">—</span>;
    }
  };

  const getTestLinkStatus = (application) => {
    const { testLink, testExpiry, submittedAt, result, score, answers } = application || {};
    if (!testLink) return <span className="text-gray-500 text-xs">—</span>;

    const now = new Date();
    const isExpired = testExpiry && now > new Date(testExpiry);
    const hasSubmitted = !!submittedAt || !!result || typeof score === 'number' || (Array.isArray(answers) && answers.length > 0);

    if (hasSubmitted || isExpired) {
      return (
        <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Closed
        </span>
      );
    }

    return (
      <a
        href={testLink}
        target="_blank"
        rel="noreferrer"
        className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors flex items-center"
      >
        <ExternalLink className="w-3 h-3 mr-1" />
        Open
      </a>
    );
  };

  const getLinkExpiredStatus = (application) => {
    const { testExpiry, submittedAt, result, score, answers } = application || {};
    if (!testExpiry) return <span className="text-gray-500 text-xs">—</span>;

    const now = new Date();
    const isExpired = now > new Date(testExpiry);
    const hasSubmitted = !!submittedAt || !!result || typeof score === 'number' || (Array.isArray(answers) && answers.length > 0);

    if (hasSubmitted || isExpired) {
      return <span className="text-red-600 font-medium text-xs">Yes</span>;
    }
    return <span className="text-yellow-600 font-medium text-xs">No</span>;
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show error state
  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Applications</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => loadApplications()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your applications...</p>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Applications Yet</h3>
        <p className="text-gray-600">Start applying to internships to see your applications here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <FileText className="w-6 h-6 mr-3 text-blue-600" />
          Application Status
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">INTERNSHIP NAME</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">COMPANY</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">START DATE</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">MODE</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">TEST STATUS</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">TEST LINK</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">LINK EXPIRED</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">APPLICATION STATUS</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">MENTOR ASSIGNED</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">TEST SCORE</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application, index) => (
                <motion.tr
                  key={application._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-2 px-3">
                    <div className="font-medium text-gray-900 text-xs">
                      {application.internshipId?.title || 'Internship'}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-gray-700 text-xs">
                    {application.internshipId?.companyName || 'Company'}
                  </td>
                  <td className="py-2 px-3 text-gray-700 text-xs">
                    {formatDate(application.internshipId?.startDate)}
                  </td>
                  <td className="py-2 px-3 text-gray-700 text-xs">
                    {application.internshipId?.mode || '—'}
                  </td>
                  <td className="py-2 px-3">
                    {getTestStatusBadge(application.result, application.score)}
                  </td>
                  <td className="py-2 px-3">
                    {getTestLinkStatus(application)}
                  </td>
                  <td className="py-2 px-3">
                    {getLinkExpiredStatus(application)}
                  </td>
                  <td className="py-2 px-3">
                    {getStatusBadge(application.status, application.decision)}
                  </td>
                  <td className="py-2 px-3">
                    {(() => {
                      const mentor = application.mentorId;
                      if (mentor) {
                        return (
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-900">{mentor.name}</span>
                            {mentor.mentorProfile?.grade && (
                              <span className="text-[10px] text-gray-500">Grade {mentor.mentorProfile.grade}</span>
                            )}
                          </div>
                        );
                      }
                      if (application.status === 'selected' || (application.result === 'Passed' && application.status === 'test-assigned')) {
                        return <span className="text-xs text-yellow-600 font-medium">Pending allocation</span>;
                      }
                      return <span className="text-gray-400 text-xs">—</span>;
                    })()}
                  </td>
                  <td className="py-2 px-3 text-gray-700 text-xs">
                    {(() => {
                      const score = application.score;
                      if (typeof score === 'number') {
                        // Score calculation based on 80 being the total, capped at 100%
                        const pct = Math.min(100, Math.round((score / 80) * 100));
                        const grade = pct >= 80 ? 'A' : (pct >= 60 ? 'B' : null);

                        return (
                          <span className="inline-flex items-center space-x-2">
                            <span className="font-mono font-medium">{`${pct} / 100`}</span>
                            {grade && (
                              <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${grade === 'A' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                Grade {grade}
                              </span>
                            )}
                          </span>
                        );
                      }
                      if (application.status === 'rejected' && application.result) return 'N/A';
                      return '—';
                    })()}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-center gap-2.5">
                      {/* View Test */}
                      {((application.testLink && (!!application.submittedAt || !!application.result || typeof application.score === 'number' || (Array.isArray(application.answers) && application.answers.length > 0) || new Date() > new Date(application.testExpiry))) ||
                        (application.status === 'rejected' && application.score !== null)) && (
                          <motion.button
                            whileHover={{ scale: 1.08, y: -1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => loadTestDetails(application._id)}
                            disabled={loadingTestDetails}
                            className="group relative flex items-center justify-center w-[34px] h-[34px] rounded-[10px] bg-[#4F6BF6] text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ boxShadow: '0 2px 8px rgba(79, 107, 246, 0.35)' }}
                          >
                            {loadingTestDetails ? (
                              <Loader className="w-[16px] h-[16px] animate-spin" strokeWidth={1.75} />
                            ) : (
                              <Eye className="w-[16px] h-[16px]" strokeWidth={1.75} />
                            )}
                            <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#4F6BF6] px-2.5 py-1 text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10"
                              style={{ boxShadow: '0 4px 12px rgba(79, 107, 246, 0.3)' }}>
                              View Test
                            </span>
                          </motion.button>
                        )}

                      {/* Feedback / Certificate (only for completed) */}
                      {application.status === 'completed' && (
                        <>
                          {(application.feedbackSubmitted || feedbackStatuses[application._id]) ? (
                            <motion.button
                              whileHover={{ scale: 1.08, y: -1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={async () => {
                                try {
                                  await jobseekerApi.downloadCertificate(application._id);
                                } catch (err) {
                                  alert(err.message || 'Failed to download certificate');
                                }
                              }}
                              className="group relative flex items-center justify-center w-[34px] h-[34px] rounded-[10px] bg-[#10B981] text-white transition-all duration-200"
                              style={{ boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)' }}
                            >
                              <Download className="w-[16px] h-[16px]" strokeWidth={1.75} />
                              <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#10B981] px-2.5 py-1 text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10"
                                style={{ boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
                                Certificate
                              </span>
                            </motion.button>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.08, y: -1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setFeedbackModalApp(application)}
                              className="group relative flex items-center justify-center w-[34px] h-[34px] rounded-[10px] bg-[#F59E0B] text-white transition-all duration-200"
                              style={{ boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)' }}
                            >
                              <MessageSquare className="w-[16px] h-[16px]" strokeWidth={1.75} />
                              <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#F59E0B] px-2.5 py-1 text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10"
                                style={{ boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>
                                Feedback
                              </span>
                            </motion.button>
                          )}
                        </>
                      )}

                      {/* Empty state */}
                      {!(((application.testLink && (!!application.submittedAt || !!application.result || typeof application.score === 'number' || (Array.isArray(application.answers) && application.answers.length > 0) || new Date() > new Date(application.testExpiry))) ||
                        (application.status === 'rejected' && application.score !== null)) || application.status === 'completed') && (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Test Details Modal */}
      <AnimatePresence>
        {showTestDetails && testDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowTestDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <BookOpen className="w-6 h-6 mr-3 text-blue-600" />
                  Test Details
                </h3>
                <button
                  onClick={() => setShowTestDetails(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Test Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {testDetails.questions && testDetails.questions.length > 0
                          ? Math.round((testDetails.score / testDetails.questions.length) * 100)
                          : 0}
                      </div>
                      <div className="text-sm text-gray-600">Score / 100</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{testDetails.result || '—'}</div>
                      <div className="text-sm text-gray-600">Result</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {testDetails.questions?.length || 0}
                      </div>
                      <div className="text-sm text-gray-600">Questions</div>
                    </div>
                  </div>
                </div>

                {/* Questions and Answers */}
                <div className="space-y-6">
                  {testDetails.questions?.map((question, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">
                          Question {index + 1}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {testDetails.correctness?.[index] !== undefined && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${testDetails.correctness[index]
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                              }`}>
                              {testDetails.correctness[index] ? 'Correct' : 'Incorrect'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-gray-700 mb-2">{question.question || question.q}</p>
                        {question.options && question.options.length > 0 && (
                          <div className="space-y-2">
                            {question.options.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                className={`p-2 rounded-lg border ${testDetails.answers?.[index] === option
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200'
                                  }`}
                              >
                                {option}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                            <Target className="w-4 h-4 mr-2 text-green-600" />
                            Your Answer
                          </h5>
                          <p className="text-gray-700 bg-gray-50 p-2 rounded">
                            {testDetails.answers?.[index] || 'No answer provided'}
                          </p>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                            <Award className="w-4 h-4 mr-2 text-blue-600" />
                            Correct Answer
                          </h5>
                          <p className="text-gray-700 bg-green-50 p-2 rounded">
                            {testDetails.solutions?.[index]?.correctAnswer || 'Not available'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jobseeker Feedback Modal */}
      <JobseekerFeedbackModal
        isOpen={!!feedbackModalApp}
        onClose={() => setFeedbackModalApp(null)}
        application={feedbackModalApp}
        onSubmitSuccess={() => {
          // Mark feedback as submitted for this application
          if (feedbackModalApp) {
            setFeedbackStatuses(prev => ({ ...prev, [feedbackModalApp._id]: true }));
          }
          setFeedbackModalApp(null);
          // Reload applications to get updated feedbackSubmitted flag
          loadApplications();
        }}
      />
    </div>
  );
};

export default ApplicationStatus;
