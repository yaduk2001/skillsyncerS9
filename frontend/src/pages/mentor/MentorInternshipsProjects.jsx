import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  FileText,
  CalendarPlus,
  FolderOpen,
  ClipboardList,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Eye,
  ExternalLink,
  Video,
  Link as LinkIcon,
  File,
  Upload,
  Loader2,
  User,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Send,
  Trophy,
  AlertTriangle,
} from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import { mentorApi } from '../../utils/api';

const TABS = [
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'submissions', label: 'Submissions', icon: FileText },
  { id: 'tasks', label: 'Assign Tasks', icon: ClipboardList },
  { id: 'schedule', label: 'Schedule Meetings', icon: CalendarPlus },
  { id: 'resources', label: 'Resources', icon: FolderOpen },
];

// Phase label from status / progress
const getPhaseLabel = (status, progressPercentage) => {
  if (status === 'completed' || progressPercentage >= 100) return 'Completed';
  if (status === 'active' && progressPercentage > 0) return 'In Progress';
  return 'Started';
};

const MentorInternshipsProjects = ({ mentorId }) => {
  const [activeTab, setActiveTab] = useState('progress');
  const [mentees, setMentees] = useState([]);
  const [loadingMentees, setLoadingMentees] = useState(true);
  const [errorMentees, setErrorMentees] = useState(null);
  const [domains, setDomains] = useState([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [errorDomains, setErrorDomains] = useState(null);
  // Submissions (from backend)
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [errorSubmissions, setErrorSubmissions] = useState(null);
  // Tasks (assignments)
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [errorTasks, setErrorTasks] = useState(null);
  const [selectedTaskDomain, setSelectedTaskDomain] = useState('');
  const [domainMentees, setDomainMentees] = useState([]);
  const [loadingDomainMentees, setLoadingDomainMentees] = useState(false);
  const [errorDomainMentees, setErrorDomainMentees] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    link: '',
    domain: '',
    assignToAllInDomain: true,
    menteeIds: [],
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  
  // Review modals state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [milestoneData, setMilestoneData] = useState(null);
  const [milestoneFeedbackText, setMilestoneFeedbackText] = useState('');
  const [milestoneRating, setMilestoneRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  
  // Meetings: { id, title, dateTime, link, domain, message, createdAt }
  const [meetings, setMeetings] = useState([]);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    date: '',
    time: '',
    link: '',
    domain: '',
    message: '',
  });
  const [scheduling, setScheduling] = useState(false);
  const [meetingFormErrors, setMeetingFormErrors] = useState({});
  const [meetingTouchedFields, setMeetingTouchedFields] = useState({});
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [errorMeetings, setErrorMeetings] = useState(null);
  // Resources: { id, title, type, url?, file?, domain, uploadDate }
  const [resources, setResources] = useState([]);
  const [resourceForm, setResourceForm] = useState({
    title: '',
    type: 'url',
    url: '',
    domain: '',
  });
  const [uploadingResource, setUploadingResource] = useState(false);
  const [loadingResources, setLoadingResources] = useState(true);
  const [errorResources, setErrorResources] = useState(null);

  const fetchMentees = async () => {
    setLoadingMentees(true);
    setErrorMentees(null);
    try {
      const token = localStorage.getItem('token');
      // Backend exposes GET /api/mentor/mentees (not /mentees-detailed).
      const res = await fetch(`${API_BASE_URL}/api/mentor/mentees`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data.success) {
        const raw = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.mentees)
            ? data.mentees
            : Array.isArray(data?.data?.mentees)
              ? data.data.mentees
              : [];

        const normalized = raw.map((m) => ({
          jobseekerId: (m?._id || m?.jobseekerId || m?.id || '').toString(),
          name: m?.name || 'Unknown',
          email: m?.email || '',
          status: m?.status || 'active',
          progressPercentage: m?.progressPercentage ?? 0,
          contextName: m?.internshipTitle || m?.contextName || 'Other',
          contextType: (m?.internshipTitle || m?.contextName) ? 'internship' : null,
          contextId: m?.applicationId || m?.contextId || null,
          assignedDate: m?.assignedAt || m?.assignedDate || null,
        }));

        setMentees(normalized);
      }
      else setErrorMentees(data.message || 'Failed to load mentees');
    } catch (err) {
      setErrorMentees(err.message || 'Failed to load mentees');
    } finally {
      setLoadingMentees(false);
    }
  };

  useEffect(() => {
    fetchMentees();
  }, []);

  const fetchDomains = async () => {
    setLoadingDomains(true);
    setErrorDomains(null);
    try {
      const res = await mentorApi.getIPDomains();
      if (res.success && res.data?.success) setDomains(res.data.data || []);
      else setErrorDomains(res.data?.message || 'Failed to load domains');
    } catch (err) {
      setErrorDomains(err.message || 'Failed to load domains');
    } finally {
      setLoadingDomains(false);
    }
  };

  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    setErrorSubmissions(null);
    try {
      const res = await mentorApi.getIPSubmissions();
      if (res.success && res.data?.success) setSubmissions(res.data.data || []);
      else setErrorSubmissions(res.data?.message || 'Failed to load submissions');
    } catch (err) {
      setErrorSubmissions(err.message || 'Failed to load submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const fetchMeetings = async () => {
    setLoadingMeetings(true);
    setErrorMeetings(null);
    try {
      const res = await mentorApi.getIPMeetings();
      if (res.success && res.data?.success) setMeetings(res.data.data || []);
      else setErrorMeetings(res.data?.message || 'Failed to load meetings');
    } catch (err) {
      setErrorMeetings(err.message || 'Failed to load meetings');
    } finally {
      setLoadingMeetings(false);
    }
  };

  const fetchResources = async () => {
    setLoadingResources(true);
    setErrorResources(null);
    try {
      const res = await mentorApi.getIPResources();
      if (res.success && res.data?.success) setResources(res.data.data || []);
      else setErrorResources(res.data?.message || 'Failed to load resources');
    } catch (err) {
      setErrorResources(err.message || 'Failed to load resources');
    } finally {
      setLoadingResources(false);
    }
  };

  const fetchTasks = async (domain) => {
    setLoadingTasks(true);
    setErrorTasks(null);
    try {
      const res = await mentorApi.getIPTasks(domain);
      if (res.success && res.data?.success) setTasks(res.data.data || []);
      else setErrorTasks(res.data?.message || 'Failed to load tasks');
    } catch (err) {
      setErrorTasks(err.message || 'Failed to load tasks');
    } finally {
      setLoadingTasks(false);
    }
  };

  // Validation functions
  const validateField = (name, value) => {
    const errors = {};
    
    switch (name) {
      case 'domain':
        if (!value) {
          errors.domain = 'Domain is required';
        }
        break;
        
      case 'title':
        if (!value) {
          errors.title = 'Task title is required';
        } else if (value.length < 3) {
          errors.title = 'Task title must be at least 3 characters';
        } else if (value.length > 100) {
          errors.title = 'Task title must be less than 100 characters';
        }
        break;
        
      case 'dueDate':
        if (value) {
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (selectedDate < today) {
            errors.dueDate = 'Due date cannot be in the past';
          } else if (selectedDate > new Date(today.getFullYear(), today.getMonth() + 6, today.getDate())) {
            errors.dueDate = 'Due date cannot be more than 6 months in the future';
          }
        }
        break;
        
      case 'link':
        if (value && value.trim()) {
          try {
            new URL(value);
          } catch (e) {
            errors.link = 'Please enter a valid URL';
          }
        }
        break;
        
      case 'description':
        if (value && value.length > 1000) {
          errors.description = 'Description must be less than 1000 characters';
        }
        break;
        
      case 'menteeIds':
        if (!taskForm.assignToAllInDomain && (!value || value.length === 0)) {
          errors.menteeIds = 'Please select at least one mentee';
        }
        break;
        
      default:
        break;
    }
    
    return errors;
  };

  const validateForm = () => {
    const errors = {};
    
    // Validate all required fields
    Object.keys(taskForm).forEach(key => {
      const fieldErrors = validateField(key, taskForm[key]);
      Object.assign(errors, fieldErrors);
    });
    
    // Additional cross-field validation
    if (!taskForm.assignToAllInDomain && (!taskForm.menteeIds || taskForm.menteeIds.length === 0)) {
      errors.menteeIds = 'Please select at least one mentee or assign to all';
    }
    
    return errors;
  };

  const handleFieldChange = (name, value) => {
    setTaskForm(prev => ({ ...prev, [name]: value }));
    
    // Validate the field immediately
    const fieldErrors = validateField(name, value);
    setFormErrors(prev => ({
      ...prev,
      ...fieldErrors,
      [name]: fieldErrors[name] || ''
    }));
    
    // Mark field as touched
    setTouchedFields(prev => ({ ...prev, [name]: true }));
  };

  const handleFieldBlur = (name) => {
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    const fieldErrors = validateField(name, taskForm[name]);
    setFormErrors(prev => ({
      ...prev,
      ...fieldErrors,
      [name]: fieldErrors[name] || ''
    }));
  };

  // Meeting validation functions
  const validateMeetingField = (name, value) => {
    const errors = {};
    
    switch (name) {
      case 'title':
        if (!value) {
          errors.title = 'Meeting title is required';
        } else if (value.length < 3) {
          errors.title = 'Meeting title must be at least 3 characters';
        } else if (value.length > 100) {
          errors.title = 'Meeting title must be less than 100 characters';
        }
        break;
        
      case 'date':
        if (!value) {
          errors.date = 'Date is required';
        } else {
          // Validate date format
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(value)) {
            errors.date = 'Please enter a valid date';
            return errors;
          }
          
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Check if date is valid
          if (isNaN(selectedDate.getTime())) {
            errors.date = 'Please enter a valid date';
            return errors;
          }
          
          if (selectedDate < today) {
            errors.date = 'Date cannot be in the past';
          } else if (selectedDate > new Date(today.getFullYear(), today.getMonth() + 6, today.getDate())) {
            errors.date = 'Date cannot be more than 6 months in the future';
          }
        }
        break;
        
      case 'time':
        if (!value) {
          errors.time = 'Time is required';
        } else {
          // Validate time format
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(value)) {
            errors.time = 'Please enter a valid time';
          }
        }
        break;
        
      case 'link':
        if (!value) {
          errors.link = 'Meeting link is required';
        } else {
          try {
            const url = new URL(value);
            const hostname = url.hostname.toLowerCase();
            
            // Check if it's a Google Meet or Zoom link
            const isGoogleMeet = hostname.includes('meet.google.com') || hostname.includes('google.com') && value.includes('/meet');
            const isZoom = hostname.includes('zoom.us') || hostname.includes('zoom.com');
            
            if (!isGoogleMeet && !isZoom) {
              errors.link = 'Please enter a valid Google Meet or Zoom link';
            }
          } catch (e) {
            errors.link = 'Please enter a valid URL';
          }
        }
        break;
        
      case 'domain':
        if (!value) {
          errors.domain = 'Domain is required';
        }
        break;
        
      case 'message':
        if (value && value.length > 500) {
          errors.message = 'Message must be less than 500 characters';
        }
        break;
        
      default:
        break;
    }
    
    return errors;
  };

  const validateMeetingForm = () => {
    const errors = {};
    
    // Validate all required fields
    Object.keys(meetingForm).forEach(key => {
      const fieldErrors = validateMeetingField(key, meetingForm[key]);
      Object.assign(errors, fieldErrors);
    });
    
    return errors;
  };

  const handleMeetingFieldChange = (name, value) => {
    setMeetingForm(prev => ({ ...prev, [name]: value }));
    
    // Validate the field immediately
    const fieldErrors = validateMeetingField(name, value);
    setMeetingFormErrors(prev => ({
      ...prev,
      ...fieldErrors,
      [name]: fieldErrors[name] || ''
    }));
    
    // Mark field as touched
    setMeetingTouchedFields(prev => ({ ...prev, [name]: true }));
  };

  const handleMeetingFieldBlur = (name) => {
    setMeetingTouchedFields(prev => ({ ...prev, [name]: true }));
    const fieldErrors = validateMeetingField(name, meetingForm[name]);
    setMeetingFormErrors(prev => ({
      ...prev,
      ...fieldErrors,
      [name]: fieldErrors[name] || ''
    }));
  };

  const fetchMenteesByDomain = async (domain) => {
    if (!domain) {
      setDomainMentees([]);
      return;
    }
    setLoadingDomainMentees(true);
    setErrorDomainMentees(null);
    try {
      const res = await mentorApi.getIPMenteesByDomain(domain);
      if (res.success && res.data?.success) setDomainMentees(res.data.data || []);
      else setErrorDomainMentees(res.data?.message || 'Failed to load mentees');
    } catch (err) {
      setErrorDomainMentees(err.message || 'Failed to load mentees');
    } finally {
      setLoadingDomainMentees(false);
    }
  };

  useEffect(() => {
    fetchDomains();
    fetchSubmissions();
    fetchMeetings();
    fetchResources();
    fetchTasks();
  }, []);

  useEffect(() => {
    fetchMenteesByDomain(selectedTaskDomain);
  }, [selectedTaskDomain]);

  const handleOpenSubmission = async (sub) => {
    setSelectedSubmission(sub);
    try {
      if (!sub.viewed) {
        await mentorApi.markIPSubmissionViewed(sub._id || sub.id);
        await fetchSubmissions();
      }
    } catch (_) {
      // ignore transient errors; UI still opens
    }
  };

  const handleCloseSubmission = () => setSelectedSubmission(null);

  // Approve submission handler
  const handleApprove = async () => {
    if (!selectedSubmission) return;
    
    setSubmittingReview(true);
    try {
      const response = await mentorApi.approveSubmission(selectedSubmission._id, {
        mentorFeedback: reviewFeedback.trim()
      });

      if (response.success) {
        // Check if milestone was crossed
        if (response.progress?.milestoneCrossed) {
          setMilestoneData({
            milestone: response.progress.milestoneCrossed,
            menteeId: selectedSubmission.menteeId._id,
            menteeName: selectedSubmission.menteeId.name,
            domain: selectedSubmission.domain,
            progress: response.progress
          });
          setShowApproveModal(false);
          setShowMilestoneModal(true);
        } else {
          // No milestone - just close and refresh
          setShowApproveModal(false);
          setSelectedSubmission(null);
          await fetchSubmissions();
        }
        setReviewFeedback('');
      }
    } catch (error) {
      console.error('Error approving submission:', error);
      alert('Failed to approve submission. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Reject submission handler
  const handleReject = async () => {
    if (!selectedSubmission) return;
    
    if (reviewFeedback.trim().length < 20) {
      alert('Please provide detailed feedback (at least 20 characters)');
      return;
    }
    
    setSubmittingReview(true);
    try {
      const response = await mentorApi.rejectSubmission(selectedSubmission._id, {
        mentorFeedback: reviewFeedback.trim()
      });

      if (response.success) {
        setShowRejectModal(false);
        setSelectedSubmission(null);
        await fetchSubmissions();
        setReviewFeedback('');
      }
    } catch (error) {
      console.error('Error rejecting submission:', error);
      alert('Failed to reject submission. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Submit milestone feedback handler
  const handleSubmitMilestoneFeedback = async () => {
    if (!milestoneData) return;
    
    if (milestoneFeedbackText.trim().length < 50) {
      alert('Please provide detailed feedback (at least 50 characters)');
      return;
    }
    
    setSubmittingReview(true);
    try {
      const response = await mentorApi.submitMilestoneFeedback({
        menteeId: milestoneData.menteeId,
        domain: milestoneData.domain,
        milestone: milestoneData.milestone,
        feedback: milestoneFeedbackText.trim(),
        rating: milestoneRating || null
      });

      if (response.success) {
        setShowMilestoneModal(false);
        setMilestoneData(null);
        setMilestoneFeedbackText('');
        setMilestoneRating(0);
        await fetchSubmissions();
      }
    } catch (error) {
      console.error('Error submitting milestone feedback:', error);
      alert('Failed to submit milestone feedback. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // View submission history handler
  const handleViewHistory = async (submissionId) => {
    try {
      const response = await mentorApi.getSubmissionHistory(submissionId);
      if (response.success) {
        // Handle nested response structure from API utility
        const actualData = response.data?.data || response.data || [];
        const historyArray = Array.isArray(actualData) ? actualData : [];
        setSubmissionHistory(historyArray);
        setShowHistoryModal(true);
      }
    } catch (error) {
      console.error('Error fetching submission history:', error);
      alert('Failed to load submission history.');
    }
  };

  const sortedSubmissions = [...submissions].sort((a, b) => {
    if (a.viewed !== b.viewed) return a.viewed ? 1 : -1;
    return new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp);
  });

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched for validation display
    const allFields = Object.keys(meetingForm);
    const touched = {};
    allFields.forEach(field => touched[field] = true);
    setMeetingTouchedFields(touched);
    
    // Validate the entire form
    const errors = validateMeetingForm();
    setMeetingFormErrors(errors);
    
    // If there are validation errors, don't submit
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    setScheduling(true);
    try {
      const dateTime = `${meetingForm.date}T${meetingForm.time}`;
      await mentorApi.createIPMeeting({
        title: meetingForm.title,
        domain: meetingForm.domain,
        dateTime,
        link: meetingForm.link,
        message: meetingForm.message || '',
      });
      
      // Reset form and show success
      await fetchMeetings();
      setMeetingForm({ title: '', date: '', time: '', link: '', domain: '', message: '' });
      setMeetingFormErrors({});
      setMeetingTouchedFields({});
      
      // Show success message (you can implement this with a toast notification)
      console.log('Meeting scheduled successfully!');
      
    } catch (error) {
      // Handle API errors
      console.error('Error scheduling meeting:', error);
      setMeetingFormErrors({
        submit: error.message || 'Failed to schedule meeting. Please try again.'
      });
    } finally {
      setScheduling(false);
    }
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    if (!resourceForm.title || !resourceForm.domain) return;
    if (!resourceForm.url) return;
    setUploadingResource(true);
    try {
      await mentorApi.createIPResource({
        title: resourceForm.title,
        type: resourceForm.type,
        url: resourceForm.url,
        domain: resourceForm.domain,
      });
      await fetchResources();
      setResourceForm({ title: '', type: 'url', url: '', domain: '' });
    } finally {
      setUploadingResource(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched for validation display
    const allFields = Object.keys(taskForm);
    const touched = {};
    allFields.forEach(field => touched[field] = true);
    setTouchedFields(touched);
    
    // Validate the entire form
    const errors = validateForm();
    setFormErrors(errors);
    
    // If there are validation errors, don't submit
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    setCreatingTask(true);
    try {
      await mentorApi.createIPTask({
        title: taskForm.title,
        description: taskForm.description,
        domain: taskForm.domain,
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null,
        link: taskForm.link,
        assignToAllInDomain: !!taskForm.assignToAllInDomain,
        menteeIds: Array.isArray(taskForm.menteeIds) ? taskForm.menteeIds : [],
      });
      
      // Reset form and show success
      await fetchTasks(taskForm.domain);
      setSelectedTaskDomain(taskForm.domain);
      setTaskForm({
        title: '',
        description: '',
        dueDate: '',
        link: '',
        domain: taskForm.domain,
        assignToAllInDomain: true,
        menteeIds: [],
      });
      setFormErrors({});
      setTouchedFields({});
      
      // Show success message (you can implement this with a toast notification)
      console.log('Task created successfully!');
      
    } catch (error) {
      // Handle API errors
      console.error('Error creating task:', error);
      setFormErrors({
        submit: error.message || 'Failed to create task. Please try again.'
      });
    } finally {
      setCreatingTask(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const formatDateTime = (d) => {
    if (!d) return 'N/A';
    const date = new Date(d);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const progressByDomain = mentees.reduce((acc, m) => {
    const domain = m.contextName || 'Other';
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Enhanced Tab Navigation */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
        <nav className="flex overflow-x-auto scrollbar-thin px-1 py-1.5" aria-label="Internships & Projects tabs">
          {TABS.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-2.5 px-5 py-3 text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap mx-0.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </motion.button>
            );
          })}
        </nav>
      </div>

      <AnimatePresence mode="wait">
        {/* Progress Tab - Redesigned */}
        {activeTab === 'progress' && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {loadingMentees ? (
              <div className="flex items-center justify-center min-h-[320px] bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex flex-col items-center gap-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full"
                  />
                  <p className="text-gray-600 font-medium">Loading progress data...</p>
                </div>
              </div>
            ) : errorMentees ? (
              <div className="rounded-2xl border border-red-200 bg-red-50/30 p-8 flex items-start gap-5 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg mb-2">Unable to load progress</h3>
                  <p className="text-gray-600 mb-4">{errorMentees}</p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={fetchMentees}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </motion.button>
                </div>
              </div>
            ) : Object.keys(progressByDomain).length === 0 ? (
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm p-16 text-center transition-all duration-300 hover:shadow-md">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-5"
                >
                  <Briefcase className="w-10 h-10 text-indigo-600" />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Internships</h3>
                <p className="text-gray-600 max-w-md mx-auto">Mentee progress will appear here once they are enrolled in internship programs. Assign mentees to get started.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(progressByDomain).map(([domain, list], domainIndex) => (
                  <motion.div
                    key={domain}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: domainIndex * 0.1 }}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md"
                  >
                    {/* Domain Header */}
                    <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{domain}</h3>
                          <p className="text-sm text-gray-600 mt-1">{list.length} mentee{list.length !== 1 ? 's' : ''} enrolled</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-sm font-medium text-gray-700">Active</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Mentee Grid */}
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {list.map((mentee, menteeIndex) => {
                          const phase = getPhaseLabel(mentee.status, mentee.progressPercentage);
                          const progressColor = phase === 'Completed' 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                            : phase === 'In Progress' 
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                            : 'bg-gradient-to-r from-gray-400 to-gray-500';
                          
                          return (
                            <motion.div
                              key={mentee.jobseekerId}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: menteeIndex * 0.05 }}
                              whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                              className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-5 transition-all duration-300 hover:border-gray-300"
                            >
                              {/* Mentee Info */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                                    <User className="w-6 h-6 text-indigo-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-gray-900 truncate max-w-[140px]">{mentee.name}</h4>
                                    <p className="text-xs text-gray-500 truncate max-w-[140px] mt-0.5">{mentee.contextName || domain}</p>
                                  </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  phase === 'Completed'
                                    ? 'bg-green-100 text-green-800'
                                    : phase === 'In Progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {phase}
                                </span>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-medium text-gray-700">Progress</span>
                                  <span className="text-xs font-bold text-gray-900">{mentee.progressPercentage || 0}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                  <motion.div 
                                    className={`h-full rounded-full ${progressColor}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${mentee.progressPercentage || 0}%` }}
                                    transition={{ duration: 1, delay: 0.3 }}
                                  />
                                </div>
                              </div>
                              
                              {/* Status Details */}
                              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Started {mentee.assignedDate ? formatDate(mentee.assignedDate) : 'Recently'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  <span>{mentee.status || 'Active'}</span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <motion.div
            key="submissions"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {loadingSubmissions ? (
              <div className="flex items-center justify-center min-h-[220px] bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-sm text-slate-500">Loading submissions...</p>
                </div>
              </div>
            ) : errorSubmissions ? (
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-slate-900">Error loading submissions</h3>
                  <p className="text-sm text-slate-600 mt-1">{errorSubmissions}</p>
                  <button
                    onClick={fetchSubmissions}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try again
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-800">Unviewed</h3>
                <p className="text-xs text-slate-500">Submissions you haven&apos;t opened yet</p>
              </div>
              <ul className="divide-y divide-slate-200">
                {sortedSubmissions.filter((s) => !s.viewed).length === 0 ? (
                  <li className="px-5 py-8 text-center text-slate-500 text-sm">No unviewed submissions</li>
                ) : (
                  sortedSubmissions
                    .filter((s) => !s.viewed)
                    .map((sub) => (
                      <li key={sub._id}>
                        <button
                          onClick={() => handleOpenSubmission(sub)}
                          className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{sub.title}</p>
                            <p className="text-sm text-slate-500 truncate">{sub.menteeId?.name || 'Mentee'} · {sub.domain}</p>
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">{formatDateTime(sub.createdAt)}</span>
                          <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Unviewed</span>
                          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        </button>
                      </li>
                    ))
                )}
              </ul>
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-800">Viewed</h3>
                <p className="text-xs text-slate-500">Submissions you&apos;ve already opened</p>
              </div>
              <ul className="divide-y divide-slate-200">
                {sortedSubmissions.filter((s) => s.viewed).length === 0 ? (
                  <li className="px-5 py-8 text-center text-slate-500 text-sm">No viewed submissions</li>
                ) : (
                  sortedSubmissions
                    .filter((s) => s.viewed)
                    .map((sub) => (
                      <li key={sub._id}>
                        <button
                          onClick={() => handleOpenSubmission(sub)}
                          className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Eye className="w-5 h-5 text-slate-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{sub.title}</p>
                            <p className="text-sm text-slate-500 truncate">{sub.menteeId?.name || 'Mentee'} · {sub.domain}</p>
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">{formatDateTime(sub.createdAt)}</span>
                          <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Viewed</span>
                          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        </button>
                      </li>
                    ))
                )}
              </ul>
            </div>
            )}

            {/* Submission detail modal */}
            {selectedSubmission && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
                onClick={handleCloseSubmission}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
                >
                  <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">{selectedSubmission.title}</h3>
                    <button
                      onClick={handleCloseSubmission}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                    >
                      ×
                    </button>
                  </div>
                  <div className="p-6 overflow-auto flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-slate-600"><strong>Mentee:</strong> {selectedSubmission.menteeId?.name || 'Mentee'}</p>
                        <p className="text-sm text-slate-600 mt-1"><strong>Domain:</strong> {selectedSubmission.domain}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedSubmission.reviewStatus && (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                            selectedSubmission.reviewStatus === 'approved' ? 'bg-green-100 text-green-800' :
                            selectedSubmission.reviewStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {selectedSubmission.reviewStatus === 'approved' ? <CheckCircle className="w-3.5 h-3.5" /> :
                             selectedSubmission.reviewStatus === 'rejected' ? <XCircle className="w-3.5 h-3.5" /> :
                             <Clock className="w-3.5 h-3.5" />}
                            {selectedSubmission.reviewStatus === 'approved' ? 'Approved' :
                             selectedSubmission.reviewStatus === 'rejected' ? 'Rejected' :
                             'Pending Review'}
                          </span>
                        )}
                        
                        {/* History Button */}
                        {selectedSubmission.submissionVersion > 1 && (
                          <button
                            onClick={() => handleViewHistory(selectedSubmission._id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            History
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">Submitted {formatDateTime(selectedSubmission.createdAt)}</p>
                    
                    {selectedSubmission.mentorFeedback && (
                      <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                        <p className="text-sm font-medium text-blue-900 mb-1">Your Feedback:</p>
                        <p className="text-sm text-blue-800 whitespace-pre-wrap">{selectedSubmission.mentorFeedback}</p>
                        {selectedSubmission.reviewedAt && (
                          <p className="text-xs text-blue-600 mt-2">Reviewed {formatDateTime(selectedSubmission.reviewedAt)}</p>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-4 space-y-3">
                      {selectedSubmission.link && (
                        <a
                          href={selectedSubmission.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" /> Open submission link
                        </a>
                      )}
                      
                      {selectedSubmission.files && selectedSubmission.files.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">Uploaded files:</p>
                          <div className="space-y-2">
                            {selectedSubmission.files.map((file, index) => (
                              <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                <File className="w-4 h-4 text-slate-500" />
                                <span className="text-sm text-slate-700 flex-1 truncate">{file.name}</span>
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-indigo-600 hover:underline flex-shrink-0"
                                >
                                  View
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedSubmission.notes && (
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">Submission notes:</p>
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedSubmission.notes}</p>
                          </div>
                        </div>
                      )}
                      
                      {!selectedSubmission.link && 
                       (!selectedSubmission.files || selectedSubmission.files.length === 0) && 
                       !selectedSubmission.notes && (
                        <p className="text-sm text-slate-700 italic">No submission content provided.</p>
                      )}
                    </div>
                    
                    {/* Action buttons for pending submissions */}
                    {selectedSubmission.reviewStatus === 'pending' && (
                      <div className="mt-6 pt-6 border-t border-slate-200 flex gap-3">
                        <button
                          onClick={() => {
                            setReviewFeedback('');
                            setShowApproveModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setReviewFeedback('');
                            setShowRejectModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {/* Approve Modal */}
        {showApproveModal && selectedSubmission && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
            >
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Approve Submission
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  You're about to approve <strong>{selectedSubmission.menteeId?.name}'s</strong> submission for <strong>{selectedSubmission.title}</strong>.
                </p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Feedback (optional)
                  </label>
                  <textarea
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Add positive feedback or suggestions for the mentee..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowApproveModal(false)}
                    disabled={submittingReview}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={submittingReview}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submittingReview ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Approving...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /> Confirm Approval</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedSubmission && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
            >
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Reject Submission
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  You're about to reject <strong>{selectedSubmission.menteeId?.name}'s</strong> submission. They will be able to re-upload after receiving your feedback.
                </p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Feedback <span className="text-red-500">*required, min 20 characters</span>
                  </label>
                  <textarea
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Explain what needs to be improved and how the mentee can correct it..."
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {reviewFeedback.length} / 20 characters minimum
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRejectModal(false)}
                    disabled={submittingReview}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={submittingReview || reviewFeedback.trim().length < 20}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submittingReview ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Rejecting...</>
                    ) : (
                      <><XCircle className="w-4 h-4" /> Confirm Rejection</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Milestone Feedback Modal */}
        {showMilestoneModal && milestoneData && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
            >
              <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-purple-600" />
                  🎉 Milestone Achieved: {milestoneData.milestone}%
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="text-center py-4">
                  <div className="inline-block bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-6 py-3 rounded-full text-2xl font-bold shadow-lg">
                    {milestoneData.milestone}%
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    <strong>{milestoneData.menteeName}</strong> has reached a new milestone!
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {milestoneData.progress?.completedTasks}/{milestoneData.progress?.totalTasks} tasks completed
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Milestone Feedback <span className="text-red-500">*required, min 50 characters</span>
                  </label>
                  <textarea
                    value={milestoneFeedbackText}
                    onChange={(e) => setMilestoneFeedbackText(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Provide encouraging feedback on their progress, strengths, and areas for continued growth..."
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {milestoneFeedbackText.length} / 50 characters minimum
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rating (optional)
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setMilestoneRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= milestoneRating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    {milestoneRating > 0 && (
                      <button
                        type="button"
                        onClick={() => setMilestoneRating(0)}
                        className="ml-2 text-xs text-slate-500 hover:text-slate-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSubmitMilestoneFeedback}
                    disabled={submittingReview || milestoneFeedbackText.trim().length < 50}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
                  >
                    {submittingReview ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Submit Milestone Feedback</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Assign Tasks Tab */}
        {activeTab === 'tasks' && (
          <motion.div
            key="tasks"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Assign a task</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Choose a domain, then assign the task to mentees under that domain (and under you).
                </p>

                {loadingDomains ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading domains...
                  </div>
                ) : errorDomains ? (
                  <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">Unable to load domains</p>
                      <p className="text-sm text-slate-600 mt-1">{errorDomains}</p>
                      <button
                        onClick={fetchDomains}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Try again
                      </button>
                    </div>
                  </div>
                ) : domains.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No domains found yet (no mentees enrolled in internships/projects under you).
                  </div>
                ) : (
                  <form onSubmit={handleCreateTask} className="space-y-4">
                    {/* Global error message */}
                    {formErrors.submit && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-800">Error</p>
                            <p className="text-sm text-red-700 mt-1">{formErrors.submit}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Domain *</label>
                      <select
                        value={taskForm.domain}
                        onChange={(e) => {
                          const d = e.target.value;
                          setSelectedTaskDomain(d);
                          handleFieldChange('domain', d);
                          setTaskForm((f) => ({ ...f, domain: d, menteeIds: [] }));
                          fetchTasks(d);
                        }}
                        onBlur={() => handleFieldBlur('domain')}
                        className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 ${
                          touchedFields.domain && formErrors.domain 
                            ? 'border-red-300 focus:border-red-500' 
                            : 'border-slate-200 focus:border-indigo-500'
                        }`}
                      >
                        <option value="">Select domain</option>
                        {domains.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      {touchedFields.domain && formErrors.domain && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.domain}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Task title *</label>
                        <input
                          type="text"
                          value={taskForm.title}
                          onChange={(e) => handleFieldChange('title', e.target.value)}
                          onBlur={() => handleFieldBlur('title')}
                          placeholder="e.g. Build REST API for TODO app"
                          className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-indigo-500 text-slate-900 ${
                            touchedFields.title && formErrors.title 
                              ? 'border-red-300 focus:border-red-500' 
                              : 'border-slate-200 focus:border-indigo-500'
                          }`}
                        />
                        {touchedFields.title && formErrors.title && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Due date (optional)</label>
                        <input
                          type="date"
                          value={taskForm.dueDate}
                          onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                          onBlur={() => handleFieldBlur('dueDate')}
                          min={new Date().toISOString().split('T')[0]}
                          className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-indigo-500 text-slate-900 ${
                            touchedFields.dueDate && formErrors.dueDate 
                              ? 'border-red-300 focus:border-red-500' 
                              : 'border-slate-200 focus:border-indigo-500'
                          }`}
                        />
                        {touchedFields.dueDate && formErrors.dueDate && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.dueDate}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Reference link (optional)</label>
                      <input
                        type="url"
                        value={taskForm.link}
                        onChange={(e) => handleFieldChange('link', e.target.value)}
                        onBlur={() => handleFieldBlur('link')}
                        placeholder="https://..."
                        className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-indigo-500 text-slate-900 ${
                          touchedFields.link && formErrors.link 
                            ? 'border-red-300 focus:border-red-500' 
                            : 'border-slate-200 focus:border-indigo-500'
                        }`}
                      />
                      {touchedFields.link && formErrors.link && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.link}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
                      <textarea
                        value={taskForm.description}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        onBlur={() => handleFieldBlur('description')}
                        rows={3}
                        placeholder="What to build, acceptance criteria, submission format..."
                        className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-indigo-500 text-slate-900 ${
                          touchedFields.description && formErrors.description 
                            ? 'border-red-300 focus:border-red-500' 
                            : 'border-slate-200 focus:border-indigo-500'
                        }`}
                      />
                      {touchedFields.description && formErrors.description && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                      )}
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-slate-500">
                          {taskForm.description?.length || 0}/1000 characters
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={taskForm.assignToAllInDomain}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setTaskForm((f) => ({
                              ...f,
                              assignToAllInDomain: checked,
                              menteeIds: [],
                            }));
                            // Clear mentee selection error when switching to "assign all"
                            if (checked) {
                              setFormErrors(prev => ({ ...prev, menteeIds: '' }));
                            }
                          }}
                        />
                        Assign to all mentees in this domain
                      </label>

                      <div className="mt-3">
                        <p className="text-xs text-slate-500 mb-2">Mentees in selected domain</p>

                        {loadingDomainMentees ? (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading mentees...
                          </div>
                        ) : errorDomainMentees ? (
                          <p className="text-sm text-red-600">{errorDomainMentees}</p>
                        ) : domainMentees.length === 0 ? (
                          <p className="text-sm text-slate-500">No mentees found in this domain.</p>
                        ) : taskForm.assignToAllInDomain ? (
                          <p className="text-sm text-slate-700">
                            {domainMentees.length} mentee{domainMentees.length !== 1 ? 's' : ''} will receive this task.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {domainMentees.map((m) => {
                              const id = m.id?.toString?.() || m.id;
                              const checked = taskForm.menteeIds.includes(id);
                              return (
                                <label key={id} className="flex items-center justify-between gap-3 text-sm">
                                  <span className="text-slate-700">{m.name}</span>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? Array.from(new Set([...taskForm.menteeIds, id]))
                                        : taskForm.menteeIds.filter((x) => x !== id);
                                      setTaskForm((f) => ({ ...f, menteeIds: next }));
                                      handleFieldChange('menteeIds', next);
                                    }}
                                  />
                                </label>
                              );
                            })}
                            {touchedFields.menteeIds && formErrors.menteeIds && (
                              <p className="mt-2 text-sm text-red-600">{formErrors.menteeIds}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={creatingTask}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 font-medium rounded-lg transition-colors ${
                        creatingTask
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {creatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                      Create & assign task
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Tasks</h3>
              <p className="text-xs text-slate-500 mb-3">
                {selectedTaskDomain ? `Showing tasks for “${selectedTaskDomain}”` : 'Select a domain to filter tasks'}
              </p>
              {loadingTasks ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading tasks...
                </div>
              ) : errorTasks ? (
                <p className="text-sm text-red-600">{errorTasks}</p>
              ) : tasks.length === 0 ? (
                <p className="text-sm text-slate-500">No tasks created yet.</p>
              ) : (
                <ul className="space-y-3">
                  {tasks
                    .filter((t) => (selectedTaskDomain ? t.domain === selectedTaskDomain : true))
                    .slice(0, 8)
                    .map((t) => (
                      <li key={t._id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                        <p className="font-medium text-slate-900 text-sm">{t.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{t.domain}</p>
                        {t.dueDate && <p className="text-xs text-slate-500 mt-1">Due: {formatDate(t.dueDate)}</p>}
                        {t.link && (
                          <a
                            href={t.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:underline mt-1 inline-flex items-center gap-1"
                          >
                            <LinkIcon className="w-3 h-3" /> Reference link
                          </a>
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}

        {/* Schedule Meetings Tab */}
        {activeTab === 'schedule' && (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Schedule a meeting</h3>
              <p className="text-sm text-slate-500 mb-4">Select a domain to send the meeting invite to all mentees enrolled in that domain.</p>
              <form onSubmit={handleScheduleMeeting} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Meeting title</label>
                  <input
                    type="text"
                    value={meetingForm.title}
                    onChange={(e) => setMeetingForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Weekly sync – Python Developer"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={meetingForm.date}
                      onChange={(e) => setMeetingForm((f) => ({ ...f, date: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={meetingForm.time}
                      onChange={(e) => setMeetingForm((f) => ({ ...f, time: e.target.value }))}
                      min={meetingForm.date === new Date().toISOString().split('T')[0] ? new Date().toTimeString().substring(0, 5) : undefined}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Meeting link (Google Meet / Zoom / Custom) *</label>
                  <input
                    type="url"
                    value={meetingForm.link}
                    onChange={(e) => handleMeetingFieldChange('link', e.target.value)}
                    onBlur={() => handleMeetingFieldBlur('link')}
                    placeholder="https://meet.google.com/..."
                    className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-indigo-500 text-slate-900 ${
                      meetingTouchedFields.link && meetingFormErrors.link 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-slate-200 focus:border-indigo-500'
                    }`}
                  />
                  {meetingTouchedFields.link && meetingFormErrors.link && (
                    <p className="mt-1 text-sm text-red-600">{meetingFormErrors.link}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Domain *</label>
                  <select
                    value={meetingForm.domain}
                    onChange={(e) => handleMeetingFieldChange('domain', e.target.value)}
                    onBlur={() => handleMeetingFieldBlur('domain')}
                    className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-indigo-500 text-slate-900 ${
                      meetingTouchedFields.domain && meetingFormErrors.domain 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-slate-200 focus:border-indigo-500'
                    }`}
                  >
                    <option value="">Select domain</option>
                    {domains.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {meetingTouchedFields.domain && meetingFormErrors.domain && (
                    <p className="mt-1 text-sm text-red-600">{meetingFormErrors.domain}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">Invitation will be sent to all mentees in this domain.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Message / Agenda (optional)</label>
                  <textarea
                    value={meetingForm.message}
                    onChange={(e) => handleMeetingFieldChange('message', e.target.value)}
                    onBlur={() => handleMeetingFieldBlur('message')}
                    placeholder="Brief agenda or note for mentees"
                    rows={3}
                    className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-indigo-500 text-slate-900 ${
                      meetingTouchedFields.message && meetingFormErrors.message 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-slate-200 focus:border-indigo-500'
                    }`}
                  />
                  {meetingTouchedFields.message && meetingFormErrors.message && (
                    <p className="mt-1 text-sm text-red-600">{meetingFormErrors.message}</p>
                  )}
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-500">
                      {meetingForm.message?.length || 0}/500 characters
                    </span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={scheduling || loadingDomains || domains.length === 0}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 font-medium rounded-lg transition-colors ${
                    scheduling || loadingDomains || domains.length === 0
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {scheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
                  Schedule & send invite
                </button>
              </form>
              {domains.length === 0 && (
                <p className="text-sm text-amber-600 mt-2">Add mentees with domains to see the domain dropdown.</p>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Upcoming meetings</h3>
              {loadingMeetings ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading meetings...
                </div>
              ) : errorMeetings ? (
                <p className="text-sm text-red-600">{errorMeetings}</p>
              ) : meetings.length === 0 ? (
                <p className="text-sm text-slate-500">No meetings scheduled yet.</p>
              ) : (
                <ul className="space-y-3">
                  {meetings.slice(0, 5).map((m) => (
                    <li key={m._id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                      <p className="font-medium text-slate-900 text-sm">{m.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{formatDateTime(m.dateTime)}</p>
                      <p className="text-xs text-slate-600 mt-1">{m.domain}</p>
                      <a href={m.link} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline mt-1 inline-flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" /> Open link
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <motion.div
            key="resources"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload resource</h3>
              <p className="text-sm text-slate-500 mb-4">Select a domain so only mentees in that domain can see this resource.</p>
              <form onSubmit={handleAddResource} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Resource title</label>
                  <input
                    type="text"
                    value={resourceForm.title}
                    onChange={(e) => setResourceForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Python best practices PDF"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={resourceForm.type}
                    onChange={(e) => setResourceForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                  >
                    <option value="url">External URL</option>
                    <option value="pdf">PDF</option>
                    <option value="doc">Docs</option>
                    <option value="ppt">PPT</option>
                    <option value="video">Video link</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">URL / file link</label>
                  <input
                    type="url"
                    value={resourceForm.url}
                    onChange={(e) => setResourceForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Domain</label>
                  <select
                    value={resourceForm.domain}
                    onChange={(e) => setResourceForm((f) => ({ ...f, domain: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                    required
                  >
                    <option value="">Select domain</option>
                    {domains.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={uploadingResource || loadingDomains || domains.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploadingResource ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Add resource
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-800">Resources by domain</h3>
              </div>
              {loadingResources ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
                  Loading resources...
                </div>
              ) : errorResources ? (
                <div className="p-8 text-center text-red-600 text-sm">{errorResources}</div>
              ) : resources.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  No resources uploaded yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {Object.entries(
                    resources.reduce((acc, r) => {
                      if (!acc[r.domain]) acc[r.domain] = [];
                      acc[r.domain].push(r);
                      return acc;
                    }, {})
                  ).map(([domain, list]) => (
                    <div key={domain} className="p-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-3">{domain}</h4>
                      <ul className="space-y-2">
                        {list.map((r) => (
                          <li
                            key={r._id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                          >
                            {r.type === 'video' ? (
                              <Video className="w-5 h-5 text-slate-500" />
                            ) : r.type === 'url' ? (
                              <LinkIcon className="w-5 h-5 text-slate-500" />
                            ) : (
                              <File className="w-5 h-5 text-slate-500" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 text-sm truncate">{r.title}</p>
                              <p className="text-xs text-slate-500">{r.type.toUpperCase()} · {formatDate(r.createdAt)}</p>
                            </div>
                            {r.url ? (
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
                              >
                                <ExternalLink className="w-4 h-4" /> View
                              </a>
                            ) : (
                              <span className="flex-shrink-0 text-sm text-slate-500">Download</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Submission History Modal */}
        {showHistoryModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Submission History
                </h3>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSubmissionHistory([]);
                  }}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="overflow-auto flex-1 p-6">
                {submissionHistory.length > 0 ? (
                  <div className="space-y-4">
                    {submissionHistory.slice().reverse().map((sub, index) => (
                      <div 
                        key={sub._id} 
                        className={`border rounded-lg p-4 ${
                          index === 0 
                            ? 'border-blue-300 bg-blue-50'  // Latest submission
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              index === 0 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-slate-300 text-slate-700'
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
                          <span className="text-xs text-slate-500">
                            {formatDateTime(sub.createdAt)}
                          </span>
                        </div>
                        
                        {/* Content */}
                        <div className="space-y-3">
                          {/* Files */}
                          {sub.files && sub.files.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-slate-700 mb-1">Files:</p>
                              <div className="flex flex-wrap gap-2">
                                {sub.files.map((file, i) => (
                                  <a
                                    key={i}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs px-2 py-1 bg-white border border-slate-200 rounded text-blue-600 hover:bg-blue-50 transition-colors"
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
                              <p className="text-xs font-medium text-slate-700 mb-1">Link:</p>
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
                              <p className="text-xs font-medium text-slate-700 mb-1">Notes:</p>
                              <p className="text-xs text-slate-700 bg-white p-2 rounded border whitespace-pre-wrap">
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
                                {sub.reviewStatus === 'approved' ? '✅ Approval Feedback:' : '❌ Rejection Feedback:'}
                              </p>
                              <p className="text-xs text-slate-700 whitespace-pre-wrap">{sub.mentorFeedback}</p>
                              {sub.reviewedAt && (
                                <p className="text-xs text-slate-500 mt-2">
                                  Reviewed: {formatDateTime(sub.reviewedAt)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
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

export default MentorInternshipsProjects;
