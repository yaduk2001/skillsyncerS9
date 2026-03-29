import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  Calendar,
  Upload,
  FileText,
  Link as LinkIcon,
  X,
  ExternalLink,
  User,
  BookOpen,
  Video,
  Download,
  AlertCircle,
  Loader,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Star,
  Trophy,
} from 'lucide-react';
import { jobseekerApi } from '../utils/api';

const CourseRelated = () => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [taskCategory, setTaskCategory] = useState('pending'); // 'pending' or 'completed'
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [resources, setResources] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadLink, setUploadLink] = useState('');
  const [isReupload, setIsReupload] = useState(false);

  useEffect(() => {
    loadCourseData();
  }, []);

  const loadCourseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tasksRes, meetingsRes, resourcesRes, milestonesRes] = await Promise.all([
        jobseekerApi.getCourseTasks(),
        jobseekerApi.getCourseMeetings(),
        jobseekerApi.getCourseResources(),
        jobseekerApi.getMilestoneFeedbacks().catch(() => ({ success: false, data: [] })),
      ]);

      if (tasksRes.success && tasksRes.data?.success) setTasks(tasksRes.data.data || []);
      else {
        setTasks([]);
        if (tasksRes?.data?.message) setError(tasksRes.data.message);
      }

      if (meetingsRes.success && meetingsRes.data?.success) setMeetings(meetingsRes.data.data || []);
      else setMeetings([]);

      if (resourcesRes.success && resourcesRes.data?.success) setResources(resourcesRes.data.data || []);
      else setResources([]);
      
      if (milestonesRes.success && milestonesRes.data?.success) setMilestones(milestonesRes.data.data || []);
      else setMilestones([]);
    } catch (error) {
      console.error('Error loading course data:', error);
      setError('Course module is not available yet.');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
    setUploadFiles([]);
    setUploadLink('');
    setIsReupload(false);
  };

  const handleReuploadClick = (task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
    setUploadFiles([]);
    setUploadLink('');
    setIsReupload(true);
  };

  // View submission history handler
  const handleViewHistory = async (submissionId) => {
    console.log('📋 Opening history for submissionId:', submissionId);
    
    if (!submissionId) {
      console.error('❌ No submissionId provided!');
      alert('Error: Cannot load history - submission ID is missing');
      return;
    }
    
    setLoadingHistory(true);
    try {
      console.log('🔍 Fetching history from API...');
      const response = await jobseekerApi.getSubmissionHistory(submissionId);
      console.log('📦 API Response:', response);
      
      // Handle nested response structure from API utility
      // Backend returns: {success: true, data: []}
      // API utility wraps it: {success: true, data: {success: true, data: []}, status: 200}
      const actualData = response.data?.data || response.data || [];
      console.log('📊 Extracted data:', actualData);
      
      if (response.success && actualData) {
        // Ensure data is an array
        const historyArray = Array.isArray(actualData) ? actualData : [];
        console.log('✅ History loaded:', historyArray.length, 'submissions');
        console.log('📊 History data:', historyArray);
        
        if (historyArray.length > 0) {
          console.log('🎯 Setting submission history state with', historyArray.length, 'items');
          setSubmissionHistory(historyArray);
          console.log('🎯 Opening modal...');
          setShowHistoryModal(true);
        } else {
          console.warn('⚠️ No history data found');
          alert('No submission history found for this task.');
        }
      } else {
        console.error('❌ API returned error:', response.message);
        alert('Failed to load submission history.');
      }
    } catch (error) {
      console.error('❌ Error fetching submission history:', error);
      alert('Failed to load submission history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setUploadFiles(files);
  };

  const handleSubmitTask = async () => {
    if (!selectedTask) return;

    setUploading(true);
    try {
      let res;
      
      if (isReupload) {
        // Handle re-upload for rejected tasks
        const formData = new FormData();
        if (uploadFiles.length > 0) {
          formData.append('file', uploadFiles[0]);
        }
        if (uploadLink) {
          formData.append('link', uploadLink);
          formData.append('notes', `Resubmission with link: ${uploadLink}`);
        } else if (uploadFiles.length === 0) {
          throw new Error('Please provide either a file or a link for resubmission');
        }
        
        res = await jobseekerApi.resubmitTask(selectedTask.id, formData);
      } else if (uploadFiles.length > 0) {
        // Submit with file upload
        const formData = new FormData();
        formData.append('file', uploadFiles[0]); // Only upload first file for now
        if (uploadLink) {
          formData.append('notes', `Link: ${uploadLink}`);
        }
        
        res = await jobseekerApi.submitCourseTaskFile(selectedTask.id, formData);
      } else {
        // Submit with link only
        res = await jobseekerApi.submitCourseTask(selectedTask.id, {
          link: uploadLink,
          notes: 'Marked complete',
        });
      }

      if (!res.success || !res.data?.success) {
        throw new Error(res.data?.message || 'Failed to submit task');
      }

      setShowTaskDetail(false);
      setSelectedTask(null);
      setUploadFiles([]);
      setUploadLink('');
      setIsReupload(false);
      await loadCourseData();
      alert(isReupload ? 'Task resubmitted successfully!' : 'Task submitted successfully!');
    } catch (error) {
      console.error('Error submitting task:', error);
      alert(error.message || 'Failed to submit task. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleMarkComplete = async (taskId) => {
    try {
      const res = await jobseekerApi.submitCourseTask(taskId, { link: '', notes: 'Marked complete' });
      if (!res.success || !res.data?.success) {
        throw new Error(res.data?.message || 'Failed to mark complete');
      }
      await loadCourseData();
    } catch (error) {
      console.error('Error marking task as complete:', error);
    }
  };

  const filteredTasks = tasks.filter(task =>
    taskCategory === 'pending' ? task.status === 'pending' : task.status === 'completed'
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isMeetingUpcoming = (meeting) => {
    if (meeting.status === 'completed' || meeting.status === 'cancelled') return false;
    const meetingDate = new Date(meeting.dateTime);
    return meetingDate > new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading course data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">Course module not available</h2>
            <p className="text-sm text-gray-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center mb-2">
          <BookOpen className="w-6 h-6 mr-3 text-blue-600" />
          Course Related
        </h2>
        <p className="text-gray-600 text-sm">Manage your tasks, meetings, and resources</p>
      </div>

      {/* Horizontal Tabs */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 px-6" aria-label="Tabs">
            {[
              { id: 'tasks', label: 'Tasks', icon: FileText },
              { id: 'progress', label: 'Progress', icon: Trophy },
              { id: 'meetings', label: 'Meetings', icon: Calendar },
              { id: 'resources', label: 'Resources', icon: Download }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-all duration-200
                    ${activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'tasks' && (
              <motion.div
                key="tasks"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Task Categories */}
                <div className="flex space-x-4 mb-6">
                  <button
                    onClick={() => setTaskCategory('pending')}
                    className={`
                      px-6 py-2 rounded-lg font-medium transition-all duration-200
                      ${taskCategory === 'pending'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    Pending Tasks ({tasks.filter(t => t.status === 'pending').length})
                  </button>
                  <button
                    onClick={() => setTaskCategory('completed')}
                    className={`
                      px-6 py-2 rounded-lg font-medium transition-all duration-200
                      ${taskCategory === 'completed'
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    Completed Tasks ({tasks.filter(t => t.status === 'completed').length})
                  </button>
                </div>

                {/* Task List */}
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg font-medium">
                      No {taskCategory} tasks found
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      {taskCategory === 'pending'
                        ? 'You\'re all caught up!'
                        : 'Complete tasks to see them here'}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.02 }}
                        className="bg-white rounded-xl shadow-md border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-all duration-200"
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {task.title}
                              </h3>
                              <div className="flex items-center space-x-2 flex-wrap">
                                {/* Review Status Badge for completed tasks */}
                                {task.status === 'completed' && task.submission?.reviewStatus && (
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`
                                        px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1
                                        ${
                                          task.submission.reviewStatus === 'approved'
                                            ? 'bg-green-100 text-green-800'
                                            : task.submission.reviewStatus === 'rejected'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }
                                      `}
                                    >
                                      {task.submission.reviewStatus === 'approved' ? (
                                        <><CheckCircle className="w-3 h-3" /> Approved</>
                                      ) : task.submission.reviewStatus === 'rejected' ? (
                                        <><XCircle className="w-3 h-3" /> Needs Re-upload</>
                                      ) : (
                                        <><Clock className="w-3 h-3" /> Under Review</>
                                      )}
                                    </span>
                                    
                                    {/* History Button for Jobseekers */}
                                    {task.submission.submissionVersion > 1 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewHistory(task.submission._id);
                                        }}
                                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                                      >
                                        <Clock className="w-3 h-3" />
                                        v{task.submission.submissionVersion}
                                      </button>
                                    )}
                                  </div>
                                )}
                                
                                {/* Task Status Badge */}
                                {!task.submission && (
                                  <span
                                    className={`
                                      px-3 py-1 rounded-full text-xs font-medium
                                      ${task.status === 'completed'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                      }
                                    `}
                                  >
                                    {task.status === 'completed' ? (
                                      <span className="flex items-center">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Completed
                                      </span>
                                    ) : (
                                      <span className="flex items-center">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Pending
                                      </span>
                                    )}
                                  </span>
                                )}
                                
                                {/* File indicator for completed tasks with files */}
                                {task.status === 'completed' && task.submission && task.submission.files && task.submission.files.length > 0 && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center">
                                    <Upload className="w-3 h-3 mr-1" />
                                    {task.submission.files.length} file{task.submission.files.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                              {task.description}
                            </p>
                            
                            {/* Mentor Feedback Display for completed tasks */}
                            {task.submission?.mentorFeedback && (
                              <div className={`mt-3 p-3 rounded-lg text-sm ${
                                task.submission.reviewStatus === 'approved'
                                  ? 'bg-blue-50 border-l-4 border-blue-500'
                                  : 'bg-red-50 border-l-4 border-red-500'
                              }`}>
                                <p className="font-medium text-gray-900 mb-1">Mentor Feedback:</p>
                                <p className="text-gray-700 text-xs line-clamp-2">{task.submission.mentorFeedback}</p>
                              </div>
                            )}
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-3">
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                                {task.domain}
                              </span>
                              {task.assignedMentor && (
                                <span className="flex items-center">
                                  <User className="w-4 h-4 mr-1" />
                                  Mentor: {task.assignedMentor}
                                </span>
                              )}
                              {task.dueDate && (
                                <span className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  Due: {formatDate(task.dueDate)}
                                </span>
                              )}
                            </div>
                            
                            {/* Re-upload button for rejected tasks */}
                            {task.submission?.reviewStatus === 'rejected' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReuploadClick(task);
                                }}
                                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Re-upload Submission
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'progress' && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Progress</h3>
                  <p className="text-gray-600">Track your milestones and feedback from your mentor</p>
                </div>

                {milestones && milestones.length > 0 ? (
                  <div className="space-y-6">
                    {/* Progress Overview */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-purple-600" />
                        Milestones Achieved
                      </h4>
                      <div className="flex items-center justify-around">
                        {[25, 50, 75, 100].map((milestone) => {
                          const achieved = milestones.some(m => m.milestone === milestone);
                          return (
                            <div key={milestone} className="text-center">
                              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold ${
                                achieved
                                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
                                  : 'bg-gray-200 text-gray-400'
                              }`}>
                                {milestone}%
                              </div>
                              <p className="text-xs text-gray-600 mt-2">
                                {achieved ? '✓ Achieved' : 'Not yet'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Milestone Timeline */}
                    <div className="relative">
                      {/* Vertical line */}
                      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300" />

                      {/* Milestone items */}
                      <div className="space-y-8">
                        {milestones
                          .sort((a, b) => a.milestone - b.milestone)
                          .map((m, index) => (
                            <div key={m._id || index} className="relative pl-20">
                              {/* Milestone marker */}
                              <div className="absolute left-5 w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>

                              {/* Feedback card */}
                              <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white rounded-lg shadow-md p-5 border border-gray-200"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="text-lg font-bold text-purple-600">
                                    {m.milestone}% Milestone
                                  </h5>
                                  {m.rating && (
                                    <div className="flex items-center gap-1">
                                      {Array.from({ length: m.rating }).map((_, i) => (
                                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                                  {m.feedback}
                                </p>

                                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {m.mentorId?.name || 'Your Mentor'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(m.createdAt)}
                                  </span>
                                </div>

                                {m.tasksSummary && (
                                  <div className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-600">
                                    Progress at this milestone: {m.tasksSummary.completed}/{m.tasksSummary.total} tasks completed ({m.progressSnapshot?.toFixed(1)}%)
                                  </div>
                                )}
                              </motion.div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Milestones Yet</h3>
                    <p className="text-gray-600">Complete more tasks to reach your first milestone!</p>
                    <p className="text-sm text-gray-500 mt-2">You'll receive feedback from your mentor at 25%, 50%, 75%, and 100% completion.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'meetings' && (
              <motion.div
                key="meetings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {meetings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg font-medium">No meetings scheduled</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Your mentor will schedule meetings with you
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {meetings.map((meeting) => (
                      <motion.div
                        key={meeting._id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {meeting.title}
                              </h3>
                              <span
                                className={`
                                  px-3 py-1 rounded-full text-xs font-medium
                                  ${meeting.status === 'completed'
                                    ? 'bg-gray-100 text-gray-700'
                                    : meeting.status === 'cancelled'
                                    ? 'bg-red-100 text-red-700'
                                    : isMeetingUpcoming(meeting)
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-red-100 text-red-700'
                                  }
                                `}
                              >
                                {meeting.status === 'completed'
                                  ? 'Completed'
                                  : meeting.status === 'cancelled'
                                  ? 'Cancelled'
                                  : isMeetingUpcoming(meeting)
                                  ? 'Upcoming'
                                  : 'Past'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                              <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
                                {meeting.domain}
                              </span>
                              {meeting.assignedMentor && (
                                <span className="flex items-center">
                                  <User className="w-4 h-4 mr-1" />
                                  Mentor: {meeting.assignedMentor}
                                </span>
                              )}
                              <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {formatDateTime(meeting.dateTime)}
                              </span>
                            </div>
                            {meeting.status !== 'completed' && meeting.status !== 'cancelled' && isMeetingUpcoming(meeting) && meeting.link && (
                              <a
                                href={meeting.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
                              >
                                <Video className="w-4 h-4 mr-2" />
                                Join Meeting
                                <ExternalLink className="w-4 h-4 ml-2" />
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'resources' && (
              <motion.div
                key="resources"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {resources.length === 0 ? (
                  <div className="text-center py-12">
                    <Download className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg font-medium">No resources available</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Your mentor will share resources with you
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {resources.map((resource) => (
                      <motion.div
                        key={resource._id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              {resource.type === 'video' || resource.type === 'url' ? (
                                <LinkIcon className="w-5 h-5 text-blue-600" />
                              ) : (
                                <FileText className="w-5 h-5 text-green-600" />
                              )}
                              <h3 className="text-lg font-semibold text-gray-900">
                                {resource.title}
                              </h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                              <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium">
                                {resource.domain}
                              </span>
                              {resource.uploadedBy && (
                                <span className="flex items-center">
                                  <User className="w-4 h-4 mr-1" />
                                  Uploaded by: {resource.uploadedBy}
                                </span>
                              )}
                              <span className="px-2 py-1 bg-gray-50 text-gray-700 rounded-md text-xs font-medium">
                                {String(resource.type || '').toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Task Detail Modal/Drawer */}
      <AnimatePresence>
        {showTaskDetail && selectedTask && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowTaskDetail(false);
                setSelectedTask(null);
              }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-gray-900">Task Details</h2>
                <button
                  onClick={() => {
                    setShowTaskDetail(false);
                    setSelectedTask(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Task Info */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedTask.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium">
                      {selectedTask.domain}
                    </span>
                    {selectedTask.dueDate && (
                      <span className="text-sm text-gray-600 flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Due: {formatDate(selectedTask.dueDate)}
                      </span>
                    )}
                  </div>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedTask.description}
                    </p>
                  </div>
                </div>

                {/* Submission Section */}
                {(selectedTask.status === 'pending' || (selectedTask.status === 'completed' && selectedTask.submission?.reviewStatus === 'rejected')) && (
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      {isReupload ? (
                        <>
                          <RefreshCw className="w-5 h-5 text-orange-600" />
                          Re-upload Your Work
                          <span className="text-sm font-normal text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                            Revision
                          </span>
                        </>
                      ) : (
                        'Submit Your Work'
                      )}
                    </h4>
                    
                    {/* Rejection Notice */}
                    {isReupload && selectedTask.submission?.mentorFeedback && (
                      <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                        <p className="text-sm font-medium text-red-900 mb-1">Mentor Feedback:</p>
                        <p className="text-sm text-red-800 whitespace-pre-wrap">{selectedTask.submission.mentorFeedback}</p>
                      </div>
                    )}

                    {/* File Upload */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Files (PDF, DOC, ZIP, etc.)
                      </label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label
                              htmlFor="file-upload"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                            >
                              <span>Upload files</span>
                              <input
                                id="file-upload"
                                name="file-upload"
                                type="file"
                                className="sr-only"
                                onChange={handleFileUpload}
                                accept=".pdf,.doc,.docx"
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            PDF, DOC, DOCX up to 5MB
                          </p>
                        </div>
                      </div>
                      {uploadFiles.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {uploadFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                            >
                              <span className="text-sm text-gray-700">{file.name}</span>
                              <button
                                onClick={() =>
                                  setUploadFiles(uploadFiles.filter((_, i) => i !== index))
                                }
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Link Input */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Or Submit a Link
                      </label>
                      <input
                        type="url"
                        value={uploadLink}
                        onChange={(e) => setUploadLink(e.target.value)}
                        placeholder="https://github.com/your-repo or https://your-project-link.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={handleSubmitTask}
                      disabled={uploading || (uploadFiles.length === 0 && !uploadLink)}
                      className={`
                        w-full px-6 py-3 rounded-lg font-medium transition-all duration-200
                        ${uploading || (uploadFiles.length === 0 && !uploadLink)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : isReupload
                            ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg hover:shadow-xl'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                        }
                      `}
                    >
                      {uploading ? (
                        <span className="flex items-center justify-center">
                          <Loader className="w-5 h-5 animate-spin mr-2" />
                          {isReupload ? 'Re-submitting...' : 'Submitting...'}
                        </span>
                      ) : (
                        isReupload ? 'Re-submit Task' : 'Submit Task'
                      )}
                    </button>
                  </div>
                )}

                {/* Show Submission if Completed */}
                {selectedTask.status === 'completed' && selectedTask.submission && (
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                      <span className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        Submission
                      </span>
                      {/* History Button for Jobseekers in Detail Modal */}
                      {selectedTask.submission.submissionVersion > 1 && (
                        <button
                          onClick={() => handleViewHistory(selectedTask.submission._id)}
                          className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          v{selectedTask.submission.submissionVersion} - View History
                        </button>
                      )}
                    </h4>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
                      <p className="text-sm text-gray-600">
                        Submitted on:{' '}
                        {formatDate(selectedTask.submission.submittedAt)}
                        {selectedTask.submission.submissionVersion > 1 && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Version {selectedTask.submission.submissionVersion}
                          </span>
                        )}
                      </p>
                      
                      {/* Display files if any */}
                      {selectedTask.submission.files && selectedTask.submission.files.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files:</h5>
                          <div className="space-y-2">
                            {selectedTask.submission.files.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                                <div className="flex items-center space-x-2">
                                  <FileText className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm text-gray-700 truncate max-w-xs">{file.name}</span>
                                </div>
                                <div className="flex space-x-2">
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                  >
                                    View
                                  </a>
                                  <a
                                    href={file.url}
                                    download={file.name}
                                    className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                  >
                                    Download
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Display link if present */}
                      {selectedTask.submission.type === 'link' && selectedTask.submission.value && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Submitted Link:</h5>
                          <a
                            href={selectedTask.submission.value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 flex items-center text-sm"
                          >
                            <LinkIcon className="w-4 h-4 mr-1" />
                            {selectedTask.submission.value}
                            <ExternalLink className="w-4 h-4 ml-1" />
                          </a>
                        </div>
                      )}
                      
                      {/* Display notes if present */}
                      {selectedTask.submission.notes && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Notes:</h5>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-2 rounded border">
                            {selectedTask.submission.notes}
                          </p>
                        </div>
                      )}
                      
                      {/* Show message if no content */}
                      {(!selectedTask.submission.files || selectedTask.submission.files.length === 0) &&
                       selectedTask.submission.type !== 'link' &&
                       !selectedTask.submission.notes && (
                        <p className="text-sm text-gray-500 italic">
                          No submission content available
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}

        {/* Submission History Modal for Jobseekers */}
        {showHistoryModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black bg-opacity-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  My Submission History
                </h3>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSubmissionHistory([]);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="overflow-auto flex-1 p-6">
                {(() => {
                  console.log('🖼️ Modal rendering - loadingHistory:', loadingHistory, 'submissionHistory.length:', submissionHistory.length);
                  console.log('🖼️ submissionHistory data:', submissionHistory);
                  return null;
                })()}
                {loadingHistory ? (
                  <div className="text-center py-8">
                    <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                    <p className="text-gray-600">Loading submission history...</p>
                  </div>
                ) : submissionHistory.length > 0 ? (
                  <div className="space-y-4">
                    {submissionHistory.slice().reverse().map((sub, index) => (
                      <div 
                        key={sub._id} 
                        className={`border rounded-lg p-4 ${
                          index === 0 
                            ? 'border-blue-300 bg-blue-50'  // Latest submission
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              index === 0 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-300 text-gray-700'
                            }`}>
                              v{sub.submissionVersion}
                            </span>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              sub.reviewStatus === 'approved' 
                                ? 'bg-green-100 text-green-800'
                                : sub.reviewStatus === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {sub.reviewStatus === 'approved' ? 'Approved' : 
                               sub.reviewStatus === 'rejected' ? 'Rejected' : 'Pending'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(sub.createdAt)}
                          </span>
                        </div>
                        
                        {/* Content */}
                        <div className="space-y-3">
                          {/* Files */}
                          {sub.files && sub.files.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-1">Files:</p>
                              <div className="flex flex-wrap gap-2">
                                {sub.files.map((file, i) => (
                                  <a
                                    key={i}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs px-2 py-1 bg-white border border-gray-200 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                                  >
                                    {file.name}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Link */}
                          {sub.link && (
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-1">Link:</p>
                              <a
                                href={sub.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline break-all"
                              >
                                {sub.link}
                              </a>
                            </div>
                          )}
                          
                          {/* Notes */}
                          {sub.notes && (
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-1">Notes:</p>
                              <p className="text-xs text-gray-700 bg-white p-2 rounded border whitespace-pre-wrap">
                                {sub.notes}
                              </p>
                            </div>
                          )}
                          
                          {/* Feedback */}
                          {sub.mentorFeedback && (
                            <div className={`p-3 rounded ${
                              sub.reviewStatus === 'approved' 
                                ? 'bg-green-100 border border-green-200'
                                : 'bg-red-100 border border-red-200'
                            }`}>
                              <p className="text-xs font-medium mb-1">
                                {sub.reviewStatus === 'approved' ? '✅ Mentor Feedback:' : '❌ Mentor Feedback:'}
                              </p>
                              <p className="text-xs text-gray-700 whitespace-pre-wrap">{sub.mentorFeedback}</p>
                              {sub.reviewedAt && (
                                <p className="text-xs text-gray-500 mt-2">
                                  Reviewed: {formatDate(sub.reviewedAt)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No submission history available</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CourseRelated;
