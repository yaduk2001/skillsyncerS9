import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config/api';
import {
    Users,
    User,
    Building,
    Briefcase,
    Settings,
    LogOut,
    BarChart3,
    PieChart,
    Activity,
    Search,
    Filter,
    Eye,
    Edit,
    Trash2,
    UserCheck,
    UserX,
    RefreshCw,
    Download,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Mail,
    Phone,
    MapPin,
    Shield,
    AlertCircle,
    CheckCircle,
    Clock,
    TrendingUp,
    TrendingDown,
    Bell,
    Menu,
    X,
    Home,
    Star,
    Award,
    Target,
    Zap,
    Globe,
    DollarSign,
    GraduationCap,
    Plus,
    FileText,
    FolderOpen,
    Lightbulb,
    ShoppingCart,
    MessageSquare,
    Link,
    Image,
    Upload,
    Check,
    BadgeCheck
} from 'lucide-react';

const AdminDashboard = () => {
    const [activeSection, setActiveSection] = useState('overview');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [recentUsers, setRecentUsers] = useState([]);
    const [recentUsersLoading, setRecentUsersLoading] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [mentorRequests, setMentorRequests] = useState([]);

    const [stats, setStats] = useState({});
    const [pagination, setPagination] = useState({});
    const [filters, setFilters] = useState({
        role: '',
        status: '',
        search: ''
    });
    const [globalSearch, setGlobalSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Project Finder States
    const [projectTemplates, setProjectTemplates] = useState([]);
    const [customizationRequests, setCustomizationRequests] = useState([]);
    const [projectIdeas, setProjectIdeas] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [projectStats, setProjectStats] = useState(null);
    const [internalRequests, setInternalRequests] = useState([]);
    const [pendingInternalRequestsCount, setPendingInternalRequestsCount] = useState(0);

    // Modal States for Project Templates
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [projectFormData, setProjectFormData] = useState({
        title: '',
        description: '',
        category: '',
        techStack: '',
        difficulty: 'intermediate',
        price: '',
        demoLink: '',
        screenshotsLink: '',
        zipFileLink: '',
        domain: '',
        features: ''
    });

    // File Upload States
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [notifications, setNotifications] = useState(3);
    const [showMentorForm, setShowMentorForm] = useState(false);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [pendingMentorRequestsCount, setPendingMentorRequestsCount] = useState(0);

    const [selectedMentorRequest, setSelectedMentorRequest] = useState(null);
    const [showMentorRequestModal, setShowMentorRequestModal] = useState(false);
    const [selectedMentor, setSelectedMentor] = useState(null);
    const [showMentorModal, setShowMentorModal] = useState(false);
    const [showSetGradesModal, setShowSetGradesModal] = useState(false);
    const [gradeForm, setGradeForm] = useState({ companyName: '', mentorAId: '', mentorBId: '' });
    const [mentorFormData, setMentorFormData] = useState({
        name: '',
        email: '',
        expertise: '',
        experience: '',
        phone: '',
        location: '',
        companyId: ''
    });
    const navigate = useNavigate();

    // Standard UI styles (professional, consistent)
    const ui = {
        section: 'space-y-6',
        card: 'bg-white rounded-2xl shadow-md border border-gray-200',
        headerBar: 'px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl',
        tableWrap: 'overflow-x-auto',
        tableHead: 'bg-gray-50',
        tableHeadCell: 'px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider',
        tableCell: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700',
        badgeInfo: 'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
        btnPrimary: 'flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors',
        btnNeutral: 'flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors'
    };

    // API Functions
    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchCompaniesAll = async () => {
        try {
            const token = localStorage.getItem('token');
            // Fetch up to 500 companies for dropdown
            const response = await fetch(`${API_BASE_URL}/api/admin/companies?limit=500`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                setCompanies(data.data.companies || []);
            }
        } catch (error) {
            console.error('Error fetching companies list:', error);
        }
    };

    const approveMentorRequest = async (requestId, adminNotes = '') => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/mentor/admin/requests/${requestId}/approve`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ adminNotes })
            });
            const data = await response.json();
            if (data.success) {
                setSuccessMessage('Mentor request approved successfully!');
                setShowSuccessPopup(true);
                fetchMentorRequests(currentPage);
                fetchPendingCounts();
            } else {
                alert(data.message || 'Error approving mentor request');
            }
        } catch (error) {
            console.error('Error approving mentor request:', error);
            alert('Error approving mentor request');
        }
    };

    const rejectMentorRequest = async (requestId, adminNotes = '') => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/mentor/admin/requests/${requestId}/reject`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ adminNotes })
            });
            const data = await response.json();
            if (data.success) {
                setSuccessMessage('Mentor request rejected');
                setShowSuccessPopup(true);
                fetchMentorRequests(currentPage);
                fetchPendingCounts();
            } else {
                alert(data.message || 'Error rejecting mentor request');
            }
        } catch (error) {
            console.error('Error rejecting mentor request:', error);
            alert('Error rejecting mentor request');
        }
    };

    const handleInternalRequestStatus = async (requestId, status, adminNotes = '') => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/employee-requests/${requestId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status, adminNotes })
            });
            const data = await response.json();
            if (data.success) {
                setSuccessMessage(`Employee request ${status} successfully!`);
                setShowSuccessPopup(true);
                fetchInternalRequests(currentPage);
                fetchPendingCounts();
            } else {
                alert(data.message || 'Error updating request status');
            }
        } catch (error) {
            console.error('Error updating internal request status:', error);
            alert('Error updating request status');
        }
    };

    const deleteInternalRequest = async (requestId) => {
        if (!window.confirm('Are you sure you want to delete this internal staff request?')) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/employee-requests/${requestId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                setSuccessMessage('Request deleted successfully');
                setShowSuccessPopup(true);
                fetchInternalRequests(currentPage);
            }
        } catch (error) {
            console.error('Error deleting internal request:', error);
        }
    };
    const fetchUsers = async (page = 1) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                ...(filters.role && { role: filters.role }),
                ...(filters.status && { status: filters.status })
            });

            const response = await fetch(`${API_BASE_URL}/api/admin/users?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                setUsers(data.data.users);
                setPagination(data.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const submitSetGrades = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/mentors/set-grades`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gradeForm)
            });
            const data = await response.json();
            if (data.success) {
                setSuccessMessage('Grades set successfully');
                setShowSuccessPopup(true);
                setShowSetGradesModal(false);
                fetchMentors(currentPage);
            } else {
                alert(data.message || 'Failed to set grades');
            }
        } catch (error) {
            console.error('Error setting grades:', error);
            alert('Error setting grades');
        }
    };

    const fetchRecentUsers = async () => {
        try {
            setRecentUsersLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/users?page=1&limit=5&sortBy=createdAt&sortOrder=desc`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                setRecentUsers(data.data.users);
            }
        } catch (error) {
            console.error('Error fetching recent users:', error);
        } finally {
            setRecentUsersLoading(false);
        }
    };

    const fetchCompanies = async (page = 1) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '10'
            });

            const response = await fetch(`${API_BASE_URL}/api/admin/companies?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                setCompanies(data.data.companies);
                setPagination(data.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching companies:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async (page = 1) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                role: 'employee',
            });

            const response = await fetch(`${API_BASE_URL}/api/admin/users?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                setEmployees(data.data.users || []);
                setPagination(data.data.pagination || {});
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMentors = async (page = 1) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '10'
            });

            const response = await fetch(`${API_BASE_URL}/api/mentor/admin/mentors?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success && data.data) {
                setMentors(data.data.mentors || []);
                setPagination(data.data.pagination || {});
            }
        } catch (error) {
            console.error('Error fetching mentors:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchInternalRequests = async (page = 1) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/employee-requests?isInternalService=true&page=${page}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                setInternalRequests(data.data.requests);
                setPagination(data.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching internal requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjectTemplates = async (page = 1) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/project-templates?page=${page}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                setProjectTemplates(data.data.templates);
                setPagination(data.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching project templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomizationRequests = async (page = 1) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/customization-requests?page=${page}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                setCustomizationRequests(data.data.requests);
                setPagination(data.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching customization requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjectIdeas = async (page = 1) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/project-ideas?page=${page}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                setProjectIdeas(data.data.ideas);
                setPagination(data.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching project ideas:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjectStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/statistics`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                setProjectStats(data.data);
            }
        } catch (error) {
            console.error('Error fetching project stats:', error);
        }
    };

    const fetchPurchases = async (page = 1) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/purchases?page=${page}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                setPurchases(data.data.purchases);
                setPagination(data.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching purchases:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteMentor = async (mentorId) => {
        if (!window.confirm('Delete this mentor? All assigned mentees will be unassigned.')) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/mentors/${mentorId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                setSuccessMessage('Mentor deleted successfully');
                setShowSuccessPopup(true);
                fetchMentors(currentPage);
            } else {
                alert(data.message || 'Error deleting mentor');
            }
        } catch (error) {
            console.error('Error deleting mentor:', error);
            alert('Error deleting mentor');
        }
    };



    const fetchMentorRequests = async (page = 1) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                ...(filters.status && { status: filters.status })
            });

            const response = await fetch(`${API_BASE_URL}/api/mentor/admin/requests?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                setMentorRequests(data.data.requests || []);
                setPagination(data.data.pagination || {});
            }
        } catch (error) {
            console.error('Error fetching mentor requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const addMentor = async (mentorData) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/mentors`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: mentorData.name,
                    email: mentorData.email,
                    mentorProfile: {
                        expertise: mentorData.expertise ? [mentorData.expertise] : [],
                        yearsOfExperience: mentorData.experience,
                        location: mentorData.location,

                        phone: mentorData.phone
                    },
                    companyId: mentorData.companyId || null
                })
            });
            const data = await response.json();
            if (data.success) {
                setShowMentorForm(false);
                setMentorFormData({
                    name: '',
                    email: '',
                    expertise: '',
                    experience: '',
                    phone: '',
                    location: '',
                    companyId: ''
                });
                fetchMentors(currentPage);

                // Show custom success popup
                setSuccessMessage('Mentor added successfully! Login credentials have been auto-generated and sent via email.');
                setShowSuccessPopup(true);
            } else {
                alert(data.message || 'Error adding mentor');
            }
        } catch (error) {
            console.error('Error adding mentor:', error);
            alert('Error adding mentor');
        } finally {
            setLoading(false);
        }
    };

    const updateUserStatus = async (userId, isActive) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive })
            });
            const data = await response.json();
            if (data.success) {
                fetchUsers(currentPage);
                if (activeSection === 'mentors') {
                    fetchMentors(currentPage);
                }
            }
        } catch (error) {
            console.error('Error updating user status:', error);
        }
    };



    const fetchPendingCounts = async () => {
        try {
            const token = localStorage.getItem('token');
            // Mentor Requests pending count
            const mentorResp = await fetch(`${API_BASE_URL}/api/mentor/admin/requests?status=pending&limit=1&page=1`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const mentorData = await mentorResp.json();
            if (mentorData.success) {
                setPendingMentorRequestsCount(mentorData.data?.pagination?.totalRequests || 0);
            }

            // Internal Employee Requests pending count
            const internalResp = await fetch(`${API_BASE_URL}/api/admin/employee-requests?isInternalService=true&status=pending&limit=1`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const internalData = await internalResp.json();
            if (internalData.success) {
                setPendingInternalRequestsCount(internalData.data?.pagination?.totalRequests || 0);
            }


        } catch (e) {
            // Non-fatal
            console.warn('Failed to fetch pending counts');
        }
    };

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch data on component mount and section change
    useEffect(() => {
        fetchStats();
        fetchRecentUsers(); // Always fetch recent users for dashboard
        fetchPendingCounts();
        fetchCompaniesAll();
        if (activeSection === 'users') {
            fetchUsers(currentPage);
        } else if (activeSection === 'companies') {
            fetchCompanies(currentPage);
        } else if (activeSection === 'employees') {
            fetchEmployees(currentPage);
        } else if (activeSection === 'mentors') {
            fetchMentors(currentPage);

        } else if (activeSection === 'mentor-requests') {
            fetchMentorRequests(currentPage);
        } else if (activeSection === 'internal-requests') {
            fetchInternalRequests(currentPage);
        } else if (activeSection === 'project-templates') {
            fetchProjectTemplates(currentPage);
        } else if (activeSection === 'customization-requests') {
            fetchCustomizationRequests(currentPage);
            fetchEmployees(1);
        } else if (activeSection === 'project-ideas') {
            fetchProjectIdeas(currentPage);
        } else if (activeSection === 'purchases') {
            fetchPurchases(currentPage);
            fetchProjectStats();
        }
    }, [activeSection, currentPage, filters]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        navigate('/auth');
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleGlobalSearch = (searchTerm) => {
        setGlobalSearch(searchTerm);
        // Filter recent users based on search term
        if (searchTerm.trim() === '') {
            fetchRecentUsers();
        } else {
            const filtered = recentUsers.filter(user =>
                user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.role?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setRecentUsers(filtered);
        }
    };

    const handleMentorFormChange = (key, value) => {
        setMentorFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleMentorFormSubmit = (e) => {
        e.preventDefault();
        if (!mentorFormData.name || !mentorFormData.email || !mentorFormData.expertise || !mentorFormData.phone) {
            alert('Please fill in all required fields');
            return;
        }
        addMentor(mentorFormData);
    };

    // Project Template CRUD handlers
    const handleProjectSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const payload = {
                title: projectFormData.title,
                description: projectFormData.description,
                category: projectFormData.category,
                techStack: projectFormData.techStack ? projectFormData.techStack.split(',').map(s => s.trim()).filter(Boolean) : [],
                difficulty: projectFormData.difficulty,
                price: projectFormData.price ? Number(projectFormData.price) : 0,
                demoLink: projectFormData.demoLink || '',
                screenshotsLink: projectFormData.screenshotsLink || '',
                zipFileLink: projectFormData.zipFileLink || '',
                domain: projectFormData.domain || '',
                features: projectFormData.features ? projectFormData.features.split('\n').map(s => s.trim()).filter(Boolean) : []
            };

            const url = editingProject
                ? `${API_BASE_URL}/api/admin/project-templates/${editingProject._id}`
                : `${API_BASE_URL}/api/admin/project-templates`;
            const method = editingProject ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.success) {
                setSuccessMessage(editingProject ? 'Template updated successfully!' : 'Template published successfully!');
                setShowSuccessPopup(true);
                setShowProjectModal(false);
                setEditingProject(null);
                fetchProjectTemplates(currentPage);
            } else {
                alert(data.message || 'Error saving project template');
            }
        } catch (error) {
            console.error('Error saving project template:', error);
            alert('Error saving project template');
        } finally {
            setLoading(false);
        }
    };

    const deleteProjectTemplate = async (templateId) => {
        if (!window.confirm('Are you sure you want to delete this project template?')) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/project-templates/${templateId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                setSuccessMessage('Template deleted successfully');
                setShowSuccessPopup(true);
                fetchProjectTemplates(currentPage);
            } else {
                alert(data.message || 'Error deleting template');
            }
        } catch (error) {
            console.error('Error deleting project template:', error);
            alert('Error deleting project template');
        }
    };

    const handleFileUpload = async (e, type) => {
        const files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
        if (!files || files.length === 0) return;

        try {
            setUploadingFiles(true);
            const token = localStorage.getItem('token');
            const formData = new FormData();

            if (type === 'zip') {
                formData.append('zipFile', files[0]);
            } else if (type === 'screenshot') {
                formData.append('screenshot', files[0]);
            }

            const response = await fetch(`${API_BASE_URL}/api/admin/upload-project-files`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                setProjectFormData(prev => ({
                    ...prev,
                    ...(data.data.zipFileLink && { zipFileLink: data.data.zipFileLink }),
                    ...(data.data.screenshotsLink && { screenshotsLink: data.data.screenshotsLink })
                }));
            } else {
                alert(data.message || 'Error uploading file');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading file');
        } finally {
            setUploadingFiles(false);
        }
    };

    const handleIdeaReview = async (ideaId, action) => {
        try {
            const token = localStorage.getItem('token');
            let adminFeedback = '';
            if (action === 'reject') {
                adminFeedback = prompt('Please provide a reason for rejection:');
                if (adminFeedback === null) return; // cancelled
                if (!adminFeedback.trim()) {
                    alert('Feedback is required when rejecting an idea');
                    return;
                }
            }

            const response = await fetch(`${API_BASE_URL}/api/admin/project-ideas/${ideaId}/${action}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ adminFeedback })
            });
            const data = await response.json();
            if (data.success) {
                setSuccessMessage(`Project idea ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
                setShowSuccessPopup(true);
                fetchProjectIdeas(currentPage);
            } else {
                alert(data.message || `Error ${action}ing project idea`);
            }
        } catch (error) {
            console.error(`Error ${action}ing project idea:`, error);
            alert(`Error ${action}ing project idea`);
        }
    };

    const assignStaffToRequest = async (requestId, employeeId) => {
        if (!employeeId) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/customization-requests/${requestId}/assign`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ employeeId })
            });
            const data = await response.json();
            if (data.success) {
                setSuccessMessage('Staff assigned successfully!');
                setShowSuccessPopup(true);
                fetchCustomizationRequests(currentPage);
            } else {
                alert(data.message || 'Error assigning staff');
            }
        } catch (error) {
            console.error('Error assigning staff:', error);
            alert('Error assigning staff');
        }
    };

    const updateRequestStatus = async (requestId, status) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/customization-requests/${requestId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            const data = await response.json();
            if (data.success) {
                setSuccessMessage(`Request status updated to ${status}`);
                setShowSuccessPopup(true);
                fetchCustomizationRequests(currentPage);
            } else {
                alert(data.message || 'Error updating request status');
            }
        } catch (error) {
            console.error('Error updating request status:', error);
            alert('Error updating request status');
        }
    };

    const updatePurchaseStatus = async (purchaseId, paymentStatus) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/purchases/${purchaseId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ paymentStatus })
            });
            const data = await response.json();
            if (data.success) {
                setSuccessMessage(`Purchase marked as ${paymentStatus}`);
                setShowSuccessPopup(true);
                fetchPurchases(currentPage);
            } else {
                alert(data.message || 'Error updating purchase status');
            }
        } catch (error) {
            console.error('Error updating purchase status:', error);
            alert('Error updating purchase status');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const sidebarItems = [
        // Overview
        { id: 'overview', name: 'Overview', icon: Home, color: 'from-blue-500 to-blue-600' },
        // People
        { id: 'users', name: 'Users', icon: Users, color: 'from-green-500 to-green-600' },
        { id: 'employees', name: 'Employees', icon: User, color: 'from-emerald-500 to-emerald-600' },
        { id: 'mentors', name: 'Mentors', icon: GraduationCap, color: 'from-indigo-500 to-indigo-600' },
        // Companies
        { id: 'companies', name: 'Companies', icon: Building, color: 'from-purple-500 to-purple-600' },
        // Requests
        { id: 'mentor-requests', name: 'Mentor Requests', icon: Award, color: 'from-violet-500 to-violet-600', badge: pendingMentorRequestsCount },
        { id: 'internal-requests', name: 'Internal Requests', icon: Shield, color: 'from-red-500 to-red-600', badge: pendingInternalRequestsCount },
        
        // Project Finder
        { id: 'project-templates', name: 'Templates', icon: FolderOpen, color: 'from-amber-500 to-amber-600' },
        { id: 'customization-requests', name: 'Customizations', icon: MessageSquare, color: 'from-blue-400 to-blue-500' },
        { id: 'project-ideas', name: 'Project Ideas', icon: Lightbulb, color: 'from-yellow-400 to-yellow-500' },
        { id: 'purchases', name: 'Purchases', icon: ShoppingCart, color: 'from-pink-500 to-pink-600' }
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white shadow-xl relative transition-all duration-300 border-r border-gray-200/50`}
            >
                {/* Logo & Admin Profile Combined Section */}
                <div className="p-4 border-b border-gray-200/50 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-indigo-50/30 hover:from-blue-50/50 hover:via-purple-50/40 hover:to-indigo-50/50 transition-all duration-300 group cursor-pointer">
                    <div className={`${sidebarCollapsed ? 'flex flex-col items-center space-y-2' : 'flex flex-col items-center text-center space-y-3'}`}>

                        {/* Logo Icon - Smaller and positioned at top */}
                        {!sidebarCollapsed && (
                            <div className="relative">
                                <div className="w-7 h-7 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                                    <Zap className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div className="absolute inset-0 rounded-lg ring-1 ring-blue-200/40 ring-offset-1 ring-offset-transparent"></div>
                            </div>
                        )}

                        {/* Brand Name - Compact */}
                        {!sidebarCollapsed && (
                            <div className="mb-1">
                                <h1 className="text-sm font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                    SkillSyncer
                                </h1>
                                <div className="h-0.5 w-8 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto mt-0.5 rounded-full"></div>
                            </div>
                        )}

                        {/* Admin Profile Picture */}
                        <div className="relative">
                            <div className="relative">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 p-1 shadow-lg ring-3 ring-white/50 ring-offset-1 ring-offset-transparent group-hover:ring-blue-200/60 group-hover:shadow-xl transition-all duration-300">
                                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-inner">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                            <User className="w-5 h-5 text-white" />
                                        </div>
                                    </div>
                                </div>

                                {/* Online Status Indicator */}
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                </div>

                                {/* Edit Icon on Hover */}
                                <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gray-700 hover:bg-gray-800 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
                                    <Edit className="w-2.5 h-2.5 text-white" />
                                </div>
                            </div>
                        </div>

                        {!sidebarCollapsed && (
                            <div className="text-center space-y-1.5">
                                {/* Admin Name & Role */}
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm group-hover:text-blue-700 transition-colors duration-200">
                                        {localStorage.getItem('userName') || 'Admin User'}
                                    </h3>
                                    <p className="text-xs text-blue-600 font-medium">Administrator</p>
                                </div>

                                {/* Admin Email */}
                                <p className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors duration-200 truncate px-2">
                                    {localStorage.getItem('userEmail') || 'admin@skillsyncer.com'}
                                </p>

                                {/* Online Status Badge with Time */}
                                <div className="inline-flex items-center space-x-1.5 bg-green-100 group-hover:bg-green-200 px-2 py-0.5 rounded-full transition-all duration-200">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-[11px] text-green-700 font-medium">Online</span>
                                    <Clock className="w-2.5 h-2.5 text-green-600" />
                                    <span className="text-xs text-green-600 font-mono">
                                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        )}

                        {sidebarCollapsed && (
                            <div className="text-center space-y-1.5">
                                {/* Logo for collapsed state */}
                                <div className="w-7 h-7 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                                    <Zap className="w-3.5 h-3.5 text-white" />
                                </div>
                                {/* Admin initials below logo */}
                                <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
                                    <span className="text-xs font-bold text-blue-700">
                                        {(localStorage.getItem('userName') || 'Admin User').split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Actions - Only show when sidebar is expanded */}
                    {!sidebarCollapsed && (
                        <div className="mt-3 flex items-center space-x-1.5">
                            <button className="flex-1 bg-white/80 hover:bg-white border border-gray-200/60 hover:border-blue-200 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-700 hover:text-blue-700 transition-all duration-200 hover:shadow-md group/btn">
                                <Settings className="w-3 h-3 inline mr-1.5 group-hover/btn:rotate-90 transition-transform duration-300" />
                                Edit Profile
                            </button>
                            <button className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200 hover:shadow-md transform hover:scale-105">
                                <Bell className="w-3 h-3 inline mr-1.5" />
                                Notifications
                            </button>
                        </div>
                    )}
                </div>

                {/* Toggle Button */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="absolute -right-3 top-20 w-6 h-6 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:shadow-xl transition-all duration-200"
                >
                    {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                </button>

                {/* Navigation */}
                <nav className="p-3 flex-1 space-y-1.5">
                    {sidebarItems.map((item, index) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                            <motion.button
                                key={item.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                onClick={() => setActiveSection(item.id)}
                                className={`w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-lg text-left text-sm transition-all duration-200 group relative overflow-hidden ${isActive
                                    ? `bg-gradient-to-r ${item.color} text-white shadow-md`
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-gradient-to-r from-white/15 to-transparent rounded-lg"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'} transition-colors`} />
                                {!sidebarCollapsed && (
                                    <span className={`font-medium ${isActive ? 'text-white' : ''}`}>{item.name}</span>
                                )}
                                {!sidebarCollapsed && item.id === 'mentor-requests' && (
                                    <span className="ml-auto inline-flex items-center justify-center rounded-full text-[10px] font-semibold px-1.5 py-0.5 bg-violet-100 text-violet-700">
                                        {pendingMentorRequestsCount}
                                    </span>
                                )}
                                {isActive && !sidebarCollapsed && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
                                    />
                                )}
                            </motion.button>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-4">
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group ${sidebarCollapsed ? 'justify-center' : ''
                            }`}
                    >
                        <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        {!sidebarCollapsed && <span className="font-medium">Logout</span>}
                    </button>
                </div>
            </motion.div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto bg-gray-50">
                {/* Top Header Bar */}
                <div className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {activeSection === 'overview' && 'Dashboard Overview'}
                                {activeSection === 'users' && 'User Management'}
                                {activeSection === 'companies' && 'Company Management'}
                                {activeSection === 'employees' && 'Employees'}
                                {activeSection === 'mentors' && 'Mentor Management'}
                                {activeSection === 'mentor-requests' && 'Mentor Requests'}

                                {activeSection === 'jobs' && 'Job Management'}
                                {activeSection === 'analytics' && 'Analytics'}
                                {activeSection === 'settings' && 'Settings'}
                            </h1>
                            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
                                <span>•</span>
                                <span>{currentTime.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'short',
                                    day: 'numeric'
                                })}</span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* Search Bar */}
                            <div className="hidden md:flex items-center bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 w-80 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300">
                                <Search className="w-5 h-5 text-gray-400 mr-3" />
                                <input
                                    type="text"
                                    placeholder="Search users, companies, mentors..."
                                    value={globalSearch}
                                    onChange={(e) => handleGlobalSearch(e.target.value)}
                                    className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1 font-medium"
                                />
                                {globalSearch && (
                                    <button
                                        onClick={() => handleGlobalSearch('')}
                                        className="ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <X className="w-4 h-4 text-gray-400" />
                                    </button>
                                )}
                            </div>

                            {/* Notifications */}
                            <div className="relative">
                                <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200">
                                    <Bell className="w-5 h-5 text-gray-600" />
                                    {notifications > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                                            {notifications}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* Admin Profile in Header */}
                            <div className="flex items-center space-x-3 bg-gray-100 rounded-lg px-3 py-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <User className="w-4 h-4 text-white" />
                                </div>
                                <div className="hidden md:block">
                                    <p className="text-sm font-medium text-gray-900">
                                        {localStorage.getItem('userName')?.split(' ')[0] || 'Admin'}
                                    </p>
                                    <p className="text-xs text-gray-500">Administrator</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="p-8">
                    {/* Welcome Header for Overview */}
                    {activeSection === 'overview' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-8"
                        >
                            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl">
                                {/* Background Pattern */}
                                <div className="absolute inset-0 opacity-10">
                                    <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-20 -translate-y-20"></div>
                                    <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-20 translate-y-20"></div>
                                    <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
                                </div>

                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center mb-4">
                                            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4">
                                                <Zap className="w-8 h-8 text-yellow-300" />
                                            </div>
                                            <div>
                                                <h2 className="text-4xl font-bold mb-1">
                                                    Welcome back, <span className="text-yellow-300">{localStorage.getItem('userName')?.split(' ')[0] || 'Admin'}</span>!
                                                </h2>
                                                <p className="text-blue-100 text-xl font-medium">
                                                    {currentTime.getHours() < 12 ? 'Good morning' :
                                                        currentTime.getHours() < 17 ? 'Good afternoon' : 'Good evening'}! Here's your platform overview for today.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Quick Stats Row */}
                                        <div className="flex items-center space-x-6 mt-6">
                                            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                                                <div className="flex items-center space-x-2">
                                                    <Activity className="w-4 h-4 text-green-300" />
                                                    <span className="text-sm font-medium text-green-300">System Online</span>
                                                </div>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                                                <div className="flex items-center space-x-2">
                                                    <Users className="w-4 h-4 text-blue-300" />
                                                    <span className="text-sm font-medium text-blue-300">{stats.overview?.totalUsers || 0} Active Users</span>
                                                </div>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                                                <div className="flex items-center space-x-2">
                                                    <TrendingUp className="w-4 h-4 text-yellow-300" />
                                                    <span className="text-sm font-medium text-yellow-300">Growth +12%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <Calendar className="w-5 h-5 text-white/80" />
                                                <p className="text-white/90 text-sm font-medium">
                                                    {currentTime.toLocaleDateString('en-US', {
                                                        weekday: 'long',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <Clock className="w-5 h-5 text-white/80" />
                                                <p className="text-white font-bold text-xl">
                                                    {currentTime.toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Section Description for non-overview pages */}
                    {activeSection !== 'overview' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6"
                        >
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <p className="text-gray-600">
                                    {activeSection === 'users' && 'Manage user accounts, permissions, and monitor user activity across the platform.'}
                                    {activeSection === 'companies' && 'Oversee company registrations, verifications, and manage corporate partnerships.'}
                                    {activeSection === 'mentors' && 'Add new mentors, manage existing mentor profiles, and monitor mentorship activities.'}
                                    {activeSection === 'employee-requests' && 'Review and approve employee access requests from individuals wanting to join registered companies.'}
                                    {activeSection === 'jobs' && 'Monitor job postings, track applications, and manage employment opportunities.'}
                                    {activeSection === 'analytics' && 'Analyze platform data, user engagement, and generate comprehensive reports.'}
                                    {activeSection === 'settings' && 'Configure system settings, preferences, and platform-wide configurations.'}
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* Overview Section */}
                    {activeSection === 'overview' && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="overview"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                {/* Top Action Bar */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20"
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            {/* Time Period Filter */}
                                            <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg px-3 py-2 border border-blue-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                                                <Calendar className="w-4 h-4 text-blue-600" />
                                                <select className="text-sm font-medium text-blue-700 bg-transparent border-none outline-none cursor-pointer">
                                                    <option>Last 30 days</option>
                                                    <option>Last 7 days</option>
                                                    <option>Today</option>
                                                </select>
                                            </div>

                                            {/* Refresh Button */}
                                            <button
                                                onClick={() => {
                                                    fetchStats();
                                                    fetchRecentUsers();
                                                }}
                                                className="flex items-center space-x-2 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-lg px-3 py-2 shadow-sm border border-gray-200/50 transition-all duration-200 hover:shadow-md group"
                                            >
                                                <RefreshCw className="w-4 h-4 text-gray-600 group-hover:rotate-180 transition-transform duration-500" />
                                                <span className="text-sm font-medium text-gray-700">Refresh</span>
                                            </button>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            {/* Export Button */}
                                            <button className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                                                <Download className="w-4 h-4" />
                                                <span className="text-sm font-medium">Export</span>
                                            </button>

                                            {/* Add User Button */}
                                            <button className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                                                <Plus className="w-4 h-4" />
                                                <span className="text-sm font-medium">Add User</span>
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Key Metrics */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        {
                                            title: 'Total Users',
                                            value: stats.overview?.totalUsers || 1247,
                                            change: '+12%',
                                            changeType: 'positive',
                                            icon: Users,
                                            color: 'blue',
                                            description: 'Active platform users'
                                        },
                                        {
                                            title: 'Employees',
                                            value: stats.overview?.employees || 0,
                                            change: '+8%',
                                            changeType: 'positive',
                                            icon: User,
                                            color: 'green',
                                            description: 'Active employees'
                                        },
                                        {
                                            title: 'Companies',
                                            value: stats.overview?.employers || 156,
                                            change: '+15%',
                                            changeType: 'positive',
                                            icon: Building,
                                            color: 'purple',
                                            description: 'Registered employers'
                                        },
                                        {
                                            title: 'Mentors',
                                            value: stats.overview?.mentors || 23,
                                            change: '+18%',
                                            changeType: 'positive',
                                            icon: GraduationCap,
                                            color: 'indigo',
                                            description: 'Available mentors'
                                        }
                                    ].map((metric, index) => (
                                        <motion.div
                                            key={metric.title}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 + index * 0.1 }}
                                            className={`bg-gradient-to-br ${metric.color === 'blue' ? 'from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200' :
                                                metric.color === 'green' ? 'from-green-50 to-green-100 border-green-200 hover:from-green-100 hover:to-green-200' :
                                                    metric.color === 'purple' ? 'from-purple-50 to-purple-100 border-purple-200 hover:from-purple-100 hover:to-purple-200' :
                                                        metric.color === 'indigo' ? 'from-indigo-50 to-indigo-100 border-indigo-200 hover:from-indigo-100 hover:to-indigo-200' :
                                                            'from-orange-50 to-orange-100 border-orange-200 hover:from-orange-100 hover:to-orange-200'
                                                } rounded-xl border-2 p-4 hover:shadow-lg transition-all duration-300 group relative overflow-hidden`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className={`p-2 rounded-lg ${metric.color === 'blue' ? 'bg-blue-500 text-white shadow-blue-200' :
                                                    metric.color === 'green' ? 'bg-green-500 text-white shadow-green-200' :
                                                        metric.color === 'purple' ? 'bg-purple-500 text-white shadow-purple-200' :
                                                            metric.color === 'indigo' ? 'bg-indigo-500 text-white shadow-indigo-200' :
                                                                'bg-orange-500 text-white shadow-orange-200'
                                                    } shadow-lg`}>
                                                    <metric.icon className="w-5 h-5" />
                                                </div>
                                                <div className={`px-2 py-1 rounded-full text-xs font-bold ${metric.changeType === 'positive'
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-red-500 text-white'
                                                    }`}>
                                                    {metric.changeType === 'positive' ? (
                                                        <TrendingUp className="w-3 h-3 inline mr-1" />
                                                    ) : (
                                                        <TrendingDown className="w-3 h-3 inline mr-1" />
                                                    )}
                                                    {metric.change}
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-sm font-medium text-gray-600 mb-1">{metric.title}</p>
                                                <p className="text-2xl font-bold text-gray-900 mb-1">
                                                    {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                                                </p>
                                                <p className="text-xs text-gray-500">{metric.description}</p>
                                                <p className="text-xs text-gray-400 mt-1">vs last month</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Main Content Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Recent Users Table */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-xl hover:shadow-2xl transition-all duration-300"
                                    >
                                        <div className="px-6 py-5 border-b border-gray-200/50 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white rounded-t-2xl">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                                                        <Users className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold">Recent Users</h3>
                                                        <p className="text-blue-100 text-sm font-medium">Latest platform registrations</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    {globalSearch && (
                                                        <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1">
                                                            <Search className="w-4 h-4" />
                                                            <span className="text-sm font-medium">Filtered</span>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => setActiveSection('users')}
                                                        className="flex items-center space-x-2 text-sm text-blue-100 hover:text-white font-semibold bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-all duration-200 backdrop-blur-sm"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        <span>View All</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                                            <div className="flex items-center space-x-2">
                                                                <User className="w-4 h-4" />
                                                                <span>User</span>
                                                            </div>
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                                            <div className="flex items-center space-x-2">
                                                                <Shield className="w-4 h-4" />
                                                                <span>Role</span>
                                                            </div>
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                                            <div className="flex items-center space-x-2">
                                                                <Activity className="w-4 h-4" />
                                                                <span>Status</span>
                                                            </div>
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                                            <div className="flex items-center space-x-2">
                                                                <Calendar className="w-4 h-4" />
                                                                <span>Joined</span>
                                                            </div>
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white/50 backdrop-blur-sm divide-y divide-gray-100">
                                                    {recentUsersLoading ? (
                                                        <tr>
                                                            <td colSpan="4" className="px-6 py-12 text-center">
                                                                <div className="flex flex-col items-center">
                                                                    <div className="relative">
                                                                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                                                                            <RefreshCw className="w-8 h-8 text-white animate-spin" />
                                                                        </div>
                                                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl animate-pulse opacity-20"></div>
                                                                    </div>
                                                                    <p className="text-gray-600 text-lg font-semibold mb-2">Loading Recent Users</p>
                                                                    <p className="text-gray-400 text-sm">Fetching the latest platform registrations...</p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ) : recentUsers.length > 0 ? recentUsers.map((user, index) => (
                                                        <motion.tr
                                                            key={user._id || index}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: index * 0.1 }}
                                                            className="hover:bg-blue-50/50 hover:shadow-sm transition-all duration-200 group"
                                                        >
                                                            <td className="px-6 py-5 whitespace-nowrap">
                                                                <div className="flex items-center">
                                                                    <div className="flex-shrink-0 h-12 w-12">
                                                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg transition-all duration-200 group-hover:scale-105 ${(user.role === 'employer' || user.role === 'company')
                                                                            ? 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-purple-200'
                                                                            : user.role === 'mentor'
                                                                                ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-200'
                                                                                : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-200'
                                                                            }`}>
                                                                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="ml-4">
                                                                        <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                                                                            {user.name || 'Unknown User'}
                                                                        </div>
                                                                        <div className="text-sm text-gray-500 font-medium">{user.email}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-3 py-2 text-xs font-bold rounded-xl shadow-sm transition-all duration-200 group-hover:scale-105 ${(user.role === 'employer' || user.role === 'company')
                                                                    ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 shadow-purple-100'
                                                                    : user.role === 'mentor'
                                                                        ? 'bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 shadow-indigo-100'
                                                                        : user.role === 'admin'
                                                                            ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 shadow-red-100'
                                                                            : user.role === 'employee'
                                                                                ? 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 shadow-emerald-100'
                                                                                : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 shadow-blue-100'
                                                                    }`}>
                                                                    {(user.role === 'employer' || user.role === 'company') ? (
                                                                        <>
                                                                            <Building className="w-3 h-3 mr-1" />
                                                                            Company
                                                                        </>
                                                                    ) : user.role === 'mentor' ? (
                                                                        <>
                                                                            <GraduationCap className="w-3 h-3 mr-1" />
                                                                            Mentor
                                                                        </>
                                                                    ) : user.role === 'admin' ? (
                                                                        <>
                                                                            <Shield className="w-3 h-3 mr-1" />
                                                                            Admin
                                                                        </>
                                                                    ) : user.role === 'employee' ? (
                                                                        <>
                                                                            <UserCheck className="w-3 h-3 mr-1" />
                                                                            Employee
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <User className="w-3 h-3 mr-1" />
                                                                            Job Seeker
                                                                        </>
                                                                    )}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-5 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-3 py-2 text-xs font-bold rounded-xl shadow-sm transition-all duration-200 group-hover:scale-105 ${user.isActive
                                                                    ? 'bg-gradient-to-r from-green-100 to-emerald-200 text-green-800 shadow-green-100'
                                                                    : 'bg-gradient-to-r from-red-100 to-pink-200 text-red-800 shadow-red-100'
                                                                    }`}>
                                                                    {user.isActive ? (
                                                                        <>
                                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                                            Active
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <AlertCircle className="w-3 h-3 mr-1" />
                                                                            Inactive
                                                                        </>
                                                                    )}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-5 whitespace-nowrap">
                                                                <div className="flex items-center space-x-2 text-sm text-gray-600 font-medium">
                                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                                    <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        year: 'numeric'
                                                                    }) : 'Unknown'}</span>
                                                                </div>
                                                            </td>
                                                        </motion.tr>
                                                    )) : (
                                                        <tr>
                                                            <td colSpan="4" className="px-6 py-12 text-center">
                                                                <div className="flex flex-col items-center">
                                                                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                                                                        <Users className="w-10 h-10 text-gray-400" />
                                                                    </div>
                                                                    <p className="text-gray-600 text-lg font-semibold mb-2">
                                                                        {globalSearch ? 'No matching users found' : 'No recent users found'}
                                                                    </p>
                                                                    <p className="text-gray-400 text-sm mb-4">
                                                                        {globalSearch
                                                                            ? `No users match your search for "${globalSearch}"`
                                                                            : 'New user registrations will appear here'
                                                                        }
                                                                    </p>
                                                                    <div className="flex items-center space-x-3">
                                                                        {globalSearch && (
                                                                            <button
                                                                                onClick={() => handleGlobalSearch('')}
                                                                                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors font-medium"
                                                                            >
                                                                                <X className="w-4 h-4" />
                                                                                <span>Clear Search</span>
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={fetchRecentUsers}
                                                                            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                                                                        >
                                                                            <RefreshCw className="w-4 h-4" />
                                                                            <span>Refresh</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </motion.div>

                                    {/* Activity Feed */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="bg-gradient-to-br from-white to-green-50/30 rounded-xl border-2 border-green-100 shadow-lg"
                                    >
                                        <div className="px-6 py-4 border-b border-green-200 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-t-xl">
                                            <h3 className="text-lg font-semibold flex items-center">
                                                <Activity className="w-5 h-5 mr-2" />
                                                Activity Feed
                                            </h3>
                                        </div>
                                        <div className="p-6">
                                            <div className="space-y-4">
                                                {/* Dynamic activities based on recent users */}
                                                {recentUsers.slice(0, 3).map((user, index) => (
                                                    <motion.div
                                                        key={user._id || index}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.1 }}
                                                        className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                                                    >
                                                        <div className="flex-shrink-0">
                                                            <div className={`p-2 rounded-lg ${(user.role === 'employer' || user.role === 'company') ? 'bg-purple-100' : 'bg-blue-100'
                                                                }`}>
                                                                {(user.role === 'employer' || user.role === 'company') ? (
                                                                    <Building className="w-4 h-4 text-purple-600" />
                                                                ) : (
                                                                    <UserCheck className="w-4 h-4 text-blue-600" />
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-gray-900 font-medium">
                                                                {(user.role === 'employer' || user.role === 'company') ? 'New company registered' : 'New user registered'}
                                                            </p>
                                                            <p className="text-xs text-gray-600 truncate">
                                                                {user.name} ({user.email})
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                ))}

                                                {/* Static activities */}
                                                {[
                                                    { icon: Shield, text: 'System backup completed', time: '1 hour ago', color: 'text-green-500', bg: 'bg-green-100' },
                                                    { icon: BarChart3, text: 'Analytics report generated', time: '2 hours ago', color: 'text-blue-500', bg: 'bg-blue-100' }
                                                ].map((activity, index) => (
                                                    <motion.div
                                                        key={`static-${index}`}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: (recentUsers.length + index) * 0.1 }}
                                                        className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                                                    >
                                                        <div className="flex-shrink-0">
                                                            <div className={`p-2 rounded-lg ${activity.bg}`}>
                                                                <activity.icon className={`w-4 h-4 ${activity.color}`} />
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-gray-900 font-medium">{activity.text}</p>
                                                            <p className="text-xs text-gray-500">{activity.time}</p>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* System Status */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="bg-gradient-to-br from-white to-purple-50/30 rounded-xl border-2 border-purple-100 shadow-lg hover:shadow-xl transition-shadow duration-300"
                                >
                                    <div className="px-6 py-4 border-b border-purple-200 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-t-xl">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold flex items-center">
                                                <Shield className="w-5 h-5 mr-2" />
                                                System Status
                                            </h3>
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                                                <span className="text-sm text-green-200 font-medium">All Systems Operational</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                            {[
                                                { label: 'API Status', status: 'Operational', color: 'green', icon: CheckCircle, detail: 'All endpoints responding' },
                                                { label: 'Database', status: 'Connected', color: 'green', icon: CheckCircle, detail: 'MongoDB cluster healthy' },
                                                { label: 'Response Time', status: '< 200ms', color: 'blue', icon: Zap, detail: 'Average response time' },
                                                { label: 'Uptime', status: '99.9%', color: 'green', icon: Activity, detail: 'Last 30 days' }
                                            ].map((item, index) => (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: 0.8 + index * 0.1 }}
                                                    className="text-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 group"
                                                >
                                                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-3 transition-transform duration-200 group-hover:scale-110 ${item.color === 'green' ? 'bg-green-100 group-hover:bg-green-200' :
                                                        item.color === 'blue' ? 'bg-blue-100 group-hover:bg-blue-200' :
                                                            'bg-gray-100 group-hover:bg-gray-200'
                                                        }`}>
                                                        <item.icon className={`w-7 h-7 ${item.color === 'green' ? 'text-green-600' :
                                                            item.color === 'blue' ? 'text-blue-600' :
                                                                'text-gray-600'
                                                            }`} />
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-900 mb-1">{item.label}</p>
                                                    <p className={`text-lg font-bold mb-1 ${item.color === 'green' ? 'text-green-600' :
                                                        item.color === 'blue' ? 'text-blue-600' :
                                                            'text-gray-600'
                                                        }`}>
                                                        {item.status}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{item.detail}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>


                            </motion.div>
                        </AnimatePresence>
                    )}

                    {/* Employees Section */}
                    {activeSection === 'employees' && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="employees"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">Employees</h3>
                                            <p className="text-sm text-gray-600 mt-1">All approved employee accounts</p>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => fetchEmployees(currentPage)}
                                            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            <span className="font-medium">Refresh</span>
                                        </motion.button>
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                                        </div>
                                    ) : employees.length === 0 ? (
                                        <div className="text-center py-12">
                                            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Employees</h3>
                                            <p className="text-gray-500">Approved employees will appear here after admin approval.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {employees.map((emp, index) => (
                                                        <motion.tr key={emp._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                                                                <div className="text-sm text-gray-500">{emp.email}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                                {emp.employeeProfile?.companyId?.name || '—'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{emp.employeeProfile?.joinDate ? new Date(emp.employeeProfile.joinDate).toLocaleDateString() : '—'}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${emp.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{emp.isActive ? 'Active' : 'Inactive'}</span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                <div className="flex items-center space-x-2">
                                                                    <button
                                                                        onClick={() => updateUserStatus(emp._id, !emp.isActive)}
                                                                        className={`p-2 rounded-lg transition-colors ${emp.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                                                        title={emp.isActive ? 'Deactivate' : 'Activate'}
                                                                    >
                                                                        {emp.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </motion.tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {employees.length > 0 && pagination.totalPages > 1 && (
                                        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                            <div className="flex-1 flex justify-between sm:hidden">
                                                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={!pagination.hasPrev} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Previous</button>
                                                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))} disabled={!pagination.hasNext} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Next</button>
                                            </div>
                                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-700">Showing <span className="font-medium">{((currentPage - 1) * 10) + 1}</span> to <span className="font-medium">{Math.min(currentPage * 10, pagination.totalUsers || 0)}</span> of <span className="font-medium">{pagination.totalUsers || 0}</span> results</p>
                                                </div>
                                                <div>
                                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                                        <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={!pagination.hasPrev} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="h-5 w-5" /></button>
                                                        <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))} disabled={!pagination.hasNext} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"><ChevronRight className="h-5 w-5" /></button>
                                                    </nav>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </motion.div>
                        </AnimatePresence>
                    )}
                    {/* Mentor Requests Section */}
                    {activeSection === 'mentor-requests' && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="mentor-requests"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                {/* Header */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">Mentor Requests</h3>
                                            <p className="text-sm text-gray-600 mt-1">Review and manage mentor assignment requests</p>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <select
                                                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
                                                value={filters.status}
                                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                            >
                                                <option value="">All Status</option>
                                                <option value="pending">Pending</option>
                                                <option value="approved">Approved</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => fetchMentorRequests(currentPage)}
                                                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-violet-700 text-white rounded-xl hover:from-violet-700 hover:to-violet-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                                <span className="font-medium">Refresh</span>
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => { if (!mentors || mentors.length === 0) { fetchMentors(1); } setShowSetGradesModal(true); }}
                                                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                                            >
                                                <Award className="w-4 h-4" />
                                                <span className="font-medium">Set Grades (A/B)</span>
                                            </motion.button>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Table */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                                        </div>
                                    ) : mentorRequests.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Mentor Requests</h3>
                                            <p className="text-gray-500">No mentor requests found matching your criteria.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50/50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mentor Grade</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white/30 divide-y divide-gray-200">
                                                    {mentorRequests.map((request) => (
                                                        <motion.tr key={request._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/50 transition-colors">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div>
                                                                    <div className="text-sm font-medium text-gray-900">{request.employeeName}</div>
                                                                    <div className="text-sm text-gray-500">{request.employeeEmail}</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900">{request.companyId?.company?.name || request.companyId?.name || 'N/A'}</div>
                                                                <div className="text-sm text-gray-500">{request.companyId?.email || 'N/A'}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${request.status === 'approved'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : request.status === 'rejected'
                                                                        ? 'bg-red-100 text-red-800'
                                                                        : 'bg-yellow-100 text-yellow-800'
                                                                    }`}>
                                                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(request.createdAt)}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                {request.employeeMentorGrade ? (
                                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${request.employeeMentorGrade === 'A' ? 'bg-indigo-100 text-indigo-800' : 'bg-purple-100 text-purple-800'}`}>
                                                                        Grade {request.employeeMentorGrade}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-400">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                {request.status === 'pending' ? (
                                                                    <div className="flex space-x-2">
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.05 }}
                                                                            whileTap={{ scale: 0.95 }}
                                                                            onClick={() => { setSelectedMentorRequest(request); setShowMentorRequestModal(true); }}
                                                                            className="flex items-center space-x-1 px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                                                        >
                                                                            <Eye className="w-4 h-4" />
                                                                            <span>View</span>
                                                                        </motion.button>
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.05 }}
                                                                            whileTap={{ scale: 0.95 }}
                                                                            onClick={() => approveMentorRequest(request._id)}
                                                                            className="flex items-center space-x-1 px-3 py-1 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                                                                        >
                                                                            <CheckCircle className="w-4 h-4" />
                                                                            <span>Approve</span>
                                                                        </motion.button>
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.05 }}
                                                                            whileTap={{ scale: 0.95 }}
                                                                            onClick={() => {
                                                                                const reason = prompt('Enter rejection reason (optional):');
                                                                                rejectMentorRequest(request._id, reason || '');
                                                                            }}
                                                                            className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                            <span>Reject</span>
                                                                        </motion.button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center space-x-2">
                                                                        <span className="text-gray-600">
                                                                            {request.status === 'approved' ? 'Approved' : 'Rejected'}
                                                                            {request.reviewedAt && (
                                                                                <div className="text-xs text-gray-500 mt-1">on {formatDate(request.reviewedAt)}</div>
                                                                            )}
                                                                        </span>
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.05 }}
                                                                            whileTap={{ scale: 0.95 }}
                                                                            onClick={() => { setSelectedMentorRequest(request); setShowMentorRequestModal(true); }}
                                                                            className="flex items-center space-x-1 px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                                                        >
                                                                            <Eye className="w-4 h-4" />
                                                                            <span>View</span>
                                                                        </motion.button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </motion.tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Pagination */}
                                    {mentorRequests.length > 0 && pagination.totalPages > 1 && (
                                        <div className="bg-white/50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                                            <div className="flex-1 flex justify-between sm:hidden">
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                    disabled={!pagination.hasPrev}
                                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                                                    disabled={!pagination.hasNext}
                                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-700">
                                                        Showing{' '}
                                                        <span className="font-medium">{((currentPage - 1) * 10) + 1}</span>{' '}
                                                        to{' '}
                                                        <span className="font-medium">{Math.min(currentPage * 10, pagination.totalRequests || 0)}</span>{' '}
                                                        of <span className="font-medium">{pagination.totalRequests || 0}</span> results
                                                    </p>
                                                </div>
                                                <div>
                                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                                        <button
                                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                            disabled={!pagination.hasPrev}
                                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                        >
                                                            <ChevronLeft className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                                                            disabled={!pagination.hasNext}
                                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                        >
                                                            <ChevronRight className="h-5 w-5" />
                                                        </button>
                                                    </nav>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>

                                {/* Mentor Request Details Modal */}
                                <AnimatePresence>
                                    {showMentorRequestModal && selectedMentorRequest && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
                                        >
                                            <motion.div
                                                initial={{ scale: 0.95, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.95, opacity: 0 }}
                                                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden"
                                            >
                                                <div className="flex items-center justify-between px-6 py-4 border-b">
                                                    <h3 className="text-lg font-semibold text-gray-900">Mentor Request Details</h3>
                                                    <button onClick={() => setShowMentorRequestModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                                        <X className="w-5 h-5 text-gray-600" />
                                                    </button>
                                                </div>
                                                <div className="p-6 space-y-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Employee</h4>
                                                            <div className="rounded-lg border p-3 text-sm text-gray-700">
                                                                <p><span className="font-semibold">Name:</span> {selectedMentorRequest.employeeName}</p>
                                                                <p><span className="font-semibold">Email:</span> {selectedMentorRequest.employeeEmail}</p>
                                                                <p><span className="font-semibold">Phone:</span> {selectedMentorRequest.employeePhone}</p>
                                                                <p><span className="font-semibold">Position:</span> {selectedMentorRequest.employeePosition}</p>
                                                                <p><span className="font-semibold">Department:</span> {selectedMentorRequest.employeeDepartment}</p>
                                                                <p><span className="font-semibold">Experience:</span> {selectedMentorRequest.yearsOfExperience}</p>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Company</h4>
                                                            <div className="rounded-lg border p-3 text-sm text-gray-700">
                                                                <p><span className="font-semibold">Name:</span> {selectedMentorRequest.companyId?.company?.name || selectedMentorRequest.companyId?.name}</p>
                                                                <p><span className="font-semibold">Email:</span> {selectedMentorRequest.companyId?.email}</p>
                                                                {selectedMentorRequest.companyId?.company?.industry && (
                                                                    <p><span className="font-semibold">Industry:</span> {selectedMentorRequest.companyId.company.industry}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {selectedMentorRequest.expertise && selectedMentorRequest.expertise.length > 0 && (
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Expertise</h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {selectedMentorRequest.expertise.map((skill, idx) => (
                                                                    <span key={idx} className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 border">{skill}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Justification</h4>
                                                        <p className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 border">{selectedMentorRequest.justification}</p>
                                                    </div>

                                                    <div className="flex items-center justify-between text-sm text-gray-600">
                                                        <div>
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${selectedMentorRequest.status === 'approved' ? 'bg-green-100 text-green-800' : selectedMentorRequest.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                {selectedMentorRequest.status.charAt(0).toUpperCase() + selectedMentorRequest.status.slice(1)}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs">
                                                            <span className="text-gray-500">Submitted:</span> {selectedMentorRequest.createdAt ? new Date(selectedMentorRequest.createdAt).toLocaleString() : '—'}
                                                            {selectedMentorRequest.reviewedAt && (
                                                                <span className="ml-3"><span className="text-gray-500">Reviewed:</span> {new Date(selectedMentorRequest.reviewedAt).toLocaleString()}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </AnimatePresence>
                    )}
                    {/* Users Section */}
                    {activeSection === 'users' && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="users"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                {/* Filters and Search */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <input
                                                    type="text"
                                                    placeholder="Search users..."
                                                    className="pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200 w-full sm:w-64"
                                                    value={filters.search}
                                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                                />
                                            </div>
                                            <select
                                                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
                                                value={filters.role}
                                                onChange={(e) => handleFilterChange('role', e.target.value)}
                                            >
                                                <option value="">All Roles</option>
                                                <option value="jobseeker">Job Seekers</option>
                                                <option value="employer">Employers</option>
                                            </select>
                                            <select
                                                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
                                                value={filters.status}
                                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                            >
                                                <option value="">All Status</option>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => fetchUsers(currentPage)}
                                                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                                <span className="font-medium">Refresh</span>
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                                            >
                                                <Download className="w-4 h-4" />
                                                <span className="font-medium">Export</span>
                                            </motion.button>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Users Table */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20"
                                >
                                    <div className="px-6 py-6 border-b border-gray-200/50 bg-gradient-to-r from-gray-50 to-white">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900">Registered Users</h3>
                                                <p className="text-sm text-gray-600 mt-1">Manage all registered users on the platform</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                                    {pagination.totalUsers || 0} Total
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {loading ? (
                                        <div className="flex flex-col items-center justify-center py-16">
                                            <div className="relative">
                                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
                                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0"></div>
                                            </div>
                                            <span className="mt-4 text-gray-600 font-medium">Loading users...</span>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200/50">
                                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">User</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Joined</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Verification</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white/50 divide-y divide-gray-200/30">
                                                    {users.map((user, index) => (
                                                        <motion.tr
                                                            key={user._id}
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: index * 0.05 }}
                                                            className="hover:bg-blue-50/50 transition-all duration-200 group"
                                                        >
                                                            <td className="px-6 py-5 whitespace-nowrap">
                                                                <div className="flex items-center">
                                                                    <div className="flex-shrink-0 h-12 w-12">
                                                                        <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200">
                                                                            <span className="text-white font-bold text-sm">
                                                                                {user.name.charAt(0).toUpperCase()}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="ml-4">
                                                                        <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">
                                                                            {user.name}
                                                                        </div>
                                                                        <div className="text-sm text-gray-500 flex items-center mt-1">
                                                                            <Mail className="w-3 h-3 mr-1" />
                                                                            {user.email}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold shadow-sm ${user.role === 'jobseeker'
                                                                    ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800'
                                                                    : (user.role === 'employer' || user.role === 'company')
                                                                        ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800'
                                                                        : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800'
                                                                    }`}>
                                                                    {user.role === 'jobseeker' && <User className="w-3 h-3 mr-1" />}
                                                                    {(user.role === 'employer' || user.role === 'company') && <Building className="w-3 h-3 mr-1" />}
                                                                    {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                                                                    {(user.role === 'employer' || user.role === 'company') ? 'Company' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-5 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold shadow-sm ${user.isActive ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800' : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800'
                                                                    }`}>
                                                                    {user.isActive ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                                                                    {user.isActive ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">
                                                                <div className="flex items-center">
                                                                    <Calendar className="w-3 h-3 mr-2 text-gray-400" />
                                                                    <span className="font-medium">{formatDate(user.createdAt)}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold shadow-sm ${user.isEmailVerified ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800' : 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800'
                                                                    }`}>
                                                                    {user.isEmailVerified ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                                                                    {user.isEmailVerified ? 'Verified' : 'Pending'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                                                                <div className="flex items-center space-x-2">
                                                                    <motion.button
                                                                        whileHover={{ scale: 1.1 }}
                                                                        whileTap={{ scale: 0.9 }}
                                                                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-all duration-200"
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                    </motion.button>
                                                                    <motion.button
                                                                        whileHover={{ scale: 1.1 }}
                                                                        whileTap={{ scale: 0.9 }}
                                                                        className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg transition-all duration-200"
                                                                    >
                                                                        <Edit className="w-4 h-4" />
                                                                    </motion.button>
                                                                    <motion.button
                                                                        whileHover={{ scale: 1.1 }}
                                                                        whileTap={{ scale: 0.9 }}
                                                                        onClick={() => updateUserStatus(user._id, !user.isActive)}
                                                                        className={`p-2 rounded-lg transition-all duration-200 ${user.isActive
                                                                            ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-100'
                                                                            : 'text-green-600 hover:text-green-800 hover:bg-green-100'
                                                                            }`}
                                                                    >
                                                                        {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                                                    </motion.button>
                                                                    {user.role !== 'admin' && (
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.1 }}
                                                                            whileTap={{ scale: 0.9 }}
                                                                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-all duration-200"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </motion.button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </motion.tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Pagination */}
                                    {pagination.totalPages > 1 && (
                                        <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 flex items-center justify-between border-t border-gray-200/50">
                                            <div className="flex-1 flex justify-between sm:hidden">
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                    disabled={!pagination.hasPrev}
                                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 shadow-sm"
                                                >
                                                    Previous
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                                                    disabled={!pagination.hasNext}
                                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 shadow-sm"
                                                >
                                                    Next
                                                </motion.button>
                                            </div>
                                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-700 font-medium">
                                                        Showing <span className="font-bold text-blue-600">{((currentPage - 1) * 10) + 1}</span> to{' '}
                                                        <span className="font-bold text-blue-600">{Math.min(currentPage * 10, pagination.totalUsers)}</span> of{' '}
                                                        <span className="font-bold text-blue-600">{pagination.totalUsers}</span> results
                                                    </p>
                                                </div>
                                                <div>
                                                    <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px">
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                            disabled={!pagination.hasPrev}
                                                            className="relative inline-flex items-center px-3 py-2 rounded-l-xl border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                        >
                                                            <ChevronLeft className="h-4 w-4" />
                                                        </motion.button>
                                                        {[...Array(Math.min(pagination.totalPages, 5))].map((_, index) => (
                                                            <motion.button
                                                                key={index + 1}
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => setCurrentPage(index + 1)}
                                                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-all duration-200 ${currentPage === index + 1
                                                                    ? 'z-10 bg-gradient-to-r from-blue-500 to-blue-600 border-blue-500 text-white shadow-lg'
                                                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                                    }`}
                                                            >
                                                                {index + 1}
                                                            </motion.button>
                                                        ))}
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                                                            disabled={!pagination.hasNext}
                                                            className="relative inline-flex items-center px-3 py-2 rounded-r-xl border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                        >
                                                            <ChevronRight className="h-4 w-4" />
                                                        </motion.button>
                                                    </nav>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </motion.div>
                        </AnimatePresence>
                    )}

                    {/* Companies Section */}
                    {activeSection === 'companies' && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="companies"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                {/* Companies Header */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">Companies & Employers</h3>
                                            <p className="text-sm text-gray-600 mt-1">Manage registered companies and employers</p>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => fetchCompanies(currentPage)}
                                            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            <span className="font-medium">Refresh</span>
                                        </motion.button>
                                    </div>
                                </motion.div>

                                {/* Companies Table */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            <span className="ml-2 text-gray-600">Loading companies...</span>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {companies.map((company) => (
                                                        <tr key={company.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center">
                                                                    <div className="flex-shrink-0 h-10 w-10">
                                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                                                                            <Building className="w-5 h-5 text-white" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="ml-4">
                                                                        <div className="text-sm font-medium text-gray-900">{company.name}</div>
                                                                        <div className="text-sm text-gray-500 flex items-center">
                                                                            <Mail className="w-3 h-3 mr-1" />
                                                                            {company.email}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                    {company.industry}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                <div className="flex items-center">
                                                                    <MapPin className="w-3 h-3 mr-1" />
                                                                    {company.location}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {company.size}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex flex-col space-y-1">
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${company.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                                        }`}>
                                                                        {company.status === 'active' ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                                                                        {company.status}
                                                                    </span>
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${company.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                                        }`}>
                                                                        {company.verified ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                                                                        {company.verified ? 'Verified' : 'Pending'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                <div className="flex items-center">
                                                                    <Calendar className="w-3 h-3 mr-1" />
                                                                    {formatDate(company.joinDate)}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                <div className="flex items-center space-x-2">
                                                                    <button className="text-blue-600 hover:text-blue-900 p-1 rounded">
                                                                        <Eye className="w-4 h-4" />
                                                                    </button>
                                                                    <button className="text-green-600 hover:text-green-900 p-1 rounded">
                                                                        <Edit className="w-4 h-4" />
                                                                    </button>
                                                                    <button className="text-red-600 hover:text-red-900 p-1 rounded">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Pagination for Companies */}
                                    {pagination.totalPages > 1 && (
                                        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                            <div className="flex-1 flex justify-between sm:hidden">
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                    disabled={!pagination.hasPrev}
                                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                                                    disabled={!pagination.hasNext}
                                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-700">
                                                        Showing <span className="font-medium">{((currentPage - 1) * 10) + 1}</span> to{' '}
                                                        <span className="font-medium">{Math.min(currentPage * 10, pagination.totalCompanies)}</span> of{' '}
                                                        <span className="font-medium">{pagination.totalCompanies}</span> results
                                                    </p>
                                                </div>
                                                <div>
                                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                                        <button
                                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                            disabled={!pagination.hasPrev}
                                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                        >
                                                            <ChevronLeft className="h-5 w-5" />
                                                        </button>
                                                        {[...Array(Math.min(pagination.totalPages, 5))].map((_, index) => (
                                                            <button
                                                                key={index + 1}
                                                                onClick={() => setCurrentPage(index + 1)}
                                                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === index + 1
                                                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                                    }`}
                                                            >
                                                                {index + 1}
                                                            </button>
                                                        ))}
                                                        <button
                                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                                                            disabled={!pagination.hasNext}
                                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                        >
                                                            <ChevronRight className="h-5 w-5" />
                                                        </button>
                                                    </nav>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </motion.div>
                        </AnimatePresence>
                    )}

                    {/* Mentors Section */}
                    {activeSection === 'mentors' && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="mentors"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                {/* Mentors Header */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">Mentors Management</h3>
                                            <p className="text-sm text-gray-600 mt-1">Add and manage mentors on the platform</p>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setShowMentorForm(true)}
                                                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                                            >
                                                <Plus className="w-4 h-4" />
                                                <span className="font-medium">Add Mentor</span>
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => fetchMentors(currentPage)}
                                                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                                <span className="font-medium">Refresh</span>
                                            </motion.button>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Add Mentor Form Modal */}
                                {showMentorForm && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                                    >
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.9, opacity: 0 }}
                                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                                        >
                                            <div className="p-6 border-b border-gray-200">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-xl font-bold text-gray-900">Add New Mentor</h3>
                                                    <button
                                                        onClick={() => setShowMentorForm(false)}
                                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                    >
                                                        <X className="w-5 h-5 text-gray-500" />
                                                    </button>
                                                </div>
                                            </div>

                                            <form onSubmit={handleMentorFormSubmit} className="p-6 space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Full Name *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={mentorFormData.name}
                                                            onChange={(e) => handleMentorFormChange('name', e.target.value)}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                            placeholder="Enter mentor's full name"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Email Address *
                                                        </label>
                                                        <input
                                                            type="email"
                                                            value={mentorFormData.email}
                                                            onChange={(e) => handleMentorFormChange('email', e.target.value)}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                            placeholder="Enter mentor's email"
                                                            required
                                                        />
                                                    </div>



                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Expertise Area *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={mentorFormData.expertise}
                                                            onChange={(e) => handleMentorFormChange('expertise', e.target.value)}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                            placeholder="e.g., Web Development, Data Science"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Experience Level
                                                        </label>
                                                        <select
                                                            value={mentorFormData.experience}
                                                            onChange={(e) => handleMentorFormChange('experience', e.target.value)}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                        >
                                                            <option value="">Select experience</option>
                                                            <option value="1-3">1-3 years</option>
                                                            <option value="3-5">3-5 years</option>
                                                            <option value="5-10">5-10 years</option>
                                                            <option value="10+">10+ years</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Phone Number
                                                        </label>
                                                        <input
                                                            type="tel"
                                                            value={mentorFormData.phone}
                                                            onChange={(e) => handleMentorFormChange('phone', e.target.value)}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                            placeholder="Enter phone number"
                                                        />
                                                    </div>

                                                    <div className="md:col-span-2">
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Assign Company (Optional)
                                                        </label>
                                                        <select
                                                            value={mentorFormData.companyId}
                                                            onChange={(e) => handleMentorFormChange('companyId', e.target.value)}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                        >
                                                            <option value="">No Company Assignment</option>
                                                            {companies.map(company => (
                                                                <option key={company.id} value={company.id}>{company.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Location
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={mentorFormData.location}
                                                        onChange={(e) => handleMentorFormChange('location', e.target.value)}
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                        placeholder="Enter location"
                                                    />
                                                </div>



                                                <div className="flex items-center justify-end space-x-4 pt-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowMentorForm(false)}
                                                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={loading}
                                                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 disabled:opacity-50"
                                                    >
                                                        {loading ? 'Adding...' : 'Add Mentor'}
                                                    </button>
                                                </div>
                                            </form>
                                        </motion.div>
                                    </motion.div>
                                )}

                                {/* Mentors Table */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                            <span className="ml-2 text-gray-600">Loading mentors...</span>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Name
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Email
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {mentors.map((mentor, index) => (
                                                        <motion.tr
                                                            key={mentor._id}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: index * 0.1 }}
                                                            className="hover:bg-gray-50 transition-colors"
                                                        >
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center">
                                                                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                                                        <GraduationCap className="w-5 h-5 text-white" />
                                                                    </div>
                                                                    <div className="ml-4">
                                                                        <div className="text-sm font-medium text-gray-900">{mentor.name}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900">{mentor.email}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${mentor.isActive
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-red-100 text-red-800'
                                                                    }`}>
                                                                    {mentor.isActive ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(mentor.createdAt)}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                                {mentor?.mentorProfile?.grade ? (
                                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${mentor.mentorProfile.grade === 'A' ? 'bg-indigo-100 text-indigo-800' : 'bg-purple-100 text-purple-800'}`}>
                                                                        {mentor.mentorProfile.grade}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-400">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                <div className="flex items-center space-x-2">
                                                                    <button
                                                                        onClick={() => updateUserStatus(mentor._id, !mentor.isActive)}
                                                                        className={`p-2 rounded-lg transition-colors ${mentor.isActive
                                                                            ? 'text-red-600 hover:bg-red-50'
                                                                            : 'text-green-600 hover:bg-green-50'
                                                                            }`}
                                                                        title={mentor.isActive ? 'Deactivate' : 'Activate'}
                                                                    >
                                                                        {mentor.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                                                    </button>
                                                                    <button
                                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                        title="View Details"
                                                                        onClick={() => { setSelectedMentor(mentor); setShowMentorModal(true); }}
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                        title="Delete Mentor"
                                                                        onClick={() => deleteMentor(mentor._id)}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </motion.tr>
                                                    ))}
                                                </tbody>
                                            </table>

                                            {mentors.length === 0 && (
                                                <div className="text-center py-12">
                                                    <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                                    <p className="text-gray-500">No mentors found</p>
                                                    <button
                                                        onClick={() => setShowMentorForm(true)}
                                                        className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                                    >
                                                        Add First Mentor
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Pagination */}
                                    {pagination.totalPages > 1 && (
                                        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                            <div className="flex-1 flex justify-between sm:hidden">
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                    disabled={!pagination.hasPrev}
                                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                                                    disabled={!pagination.hasNext}
                                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-700">
                                                        Showing <span className="font-medium">{((currentPage - 1) * 10) + 1}</span> to{' '}
                                                        <span className="font-medium">
                                                            {Math.min(currentPage * 10, pagination.totalUsers || 0)}
                                                        </span>{' '}
                                                        of <span className="font-medium">{pagination.totalUsers || 0}</span> results
                                                    </p>
                                                </div>
                                                <div>
                                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                                        <button
                                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                            disabled={!pagination.hasPrev}
                                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                        >
                                                            <ChevronLeft className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                                                            disabled={!pagination.hasNext}
                                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                        >
                                                            <ChevronRight className="h-5 w-5" />
                                                        </button>
                                                    </nav>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </motion.div>
                        </AnimatePresence>
                    )}

                    {/* Mentor Details Modal */}
                    <AnimatePresence>
                        {showMentorModal && selectedMentor && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
                            >
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.95, opacity: 0 }}
                                    className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden"
                                >
                                    <div className="flex items-center justify-between px-6 py-4 border-b">
                                        <h3 className="text-lg font-semibold text-gray-900">Mentor Details</h3>
                                        <button onClick={() => setShowMentorModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                            <X className="w-5 h-5 text-gray-600" />
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">Basic Info</h4>
                                                <div className="rounded-lg border p-3 text-sm text-gray-700">
                                                    <p><span className="font-semibold">Name:</span> {selectedMentor.name}</p>
                                                    <p><span className="font-semibold">Email:</span> {selectedMentor.email}</p>
                                                    <p><span className="font-semibold">Status:</span> {selectedMentor.isActive ? 'Active' : 'Inactive'}</p>
                                                    <p><span className="font-semibold">Joined:</span> {selectedMentor.createdAt ? new Date(selectedMentor.createdAt).toLocaleString() : '—'}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">Mentor Profile</h4>
                                                <div className="rounded-lg border p-3 text-sm text-gray-700">
                                                    <p><span className="font-semibold">Experience:</span> {selectedMentor.mentorProfile?.yearsOfExperience || 'Not specified'}</p>
                                                    {selectedMentor.mentorProfile?.expertise?.length > 0 && (
                                                        <p><span className="font-semibold">Expertise:</span> {selectedMentor.mentorProfile.expertise.join(', ')}</p>
                                                    )}
                                                    {selectedMentor.mentorProfile?.phone && (
                                                        <p><span className="font-semibold">Phone:</span> {selectedMentor.mentorProfile.phone}</p>
                                                    )}
                                                    {selectedMentor.mentorProfile?.grade && (
                                                        <p><span className="font-semibold">Grade:</span> <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${selectedMentor.mentorProfile.grade === 'A' ? 'bg-indigo-100 text-indigo-800' : 'bg-purple-100 text-purple-800'}`}>{selectedMentor.mentorProfile.grade}</span></p>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">Company Details</h4>
                                                <div className="rounded-lg border p-3 text-sm text-gray-700">
                                                    {selectedMentor.employeeProfile?.companyId ? (
                                                        <>
                                                            <p><span className="font-semibold">Company:</span> {selectedMentor.employeeProfile.companyId.company?.name || selectedMentor.employeeProfile.companyId.name || 'N/A'}</p>
                                                            {selectedMentor.employeeProfile.companyId.company?.industry && (
                                                                <p><span className="font-semibold">Industry:</span> {selectedMentor.employeeProfile.companyId.company.industry}</p>
                                                            )}
                                                            {selectedMentor.employeeProfile.companyId.company?.location && (
                                                                <p><span className="font-semibold">Location:</span> {selectedMentor.employeeProfile.companyId.company.location}</p>
                                                            )}
                                                            {selectedMentor.employeeProfile?.department && (
                                                                <p><span className="font-semibold">Department:</span> {selectedMentor.employeeProfile.department}</p>
                                                            )}
                                                            {selectedMentor.employeeProfile?.position && (
                                                                <p><span className="font-semibold">Position:</span> {selectedMentor.employeeProfile.position}</p>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <p className="text-gray-400 italic">No company assigned</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Set Grades (A/B) Modal */}
                    <AnimatePresence>
                        {showSetGradesModal && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
                            >
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.95, opacity: 0 }}
                                    className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
                                >
                                    <div className="flex items-center justify-between px-6 py-4 border-b">
                                        <h3 className="text-lg font-semibold text-gray-900">Set Company Mentor Grades (A/B)</h3>
                                        <button onClick={() => setShowSetGradesModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                            <X className="w-5 h-5 text-gray-600" />
                                        </button>
                                    </div>
                                    <form onSubmit={submitSetGrades} className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Company (optional)</label>
                                            <select
                                                value={gradeForm.companyName}
                                                onChange={(e) => setGradeForm({ ...gradeForm, companyName: e.target.value, mentorAId: '', mentorBId: '' })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            >
                                                <option value="">All Companies</option>
                                                {companies.map(c => (
                                                    <option key={c.id} value={c.name}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Mentor A</label>
                                                <select
                                                    value={gradeForm.mentorAId}
                                                    onChange={(e) => setGradeForm({ ...gradeForm, mentorAId: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                    required
                                                >
                                                    <option value="">Select Mentor A</option>
                                                    {mentors.map(m => (
                                                        <option key={m._id} value={m._id}>{m.name} — {m.email}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Mentor B</label>
                                                <select
                                                    value={gradeForm.mentorBId}
                                                    onChange={(e) => setGradeForm({ ...gradeForm, mentorBId: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                    required
                                                >
                                                    <option value="">Select Mentor B</option>
                                                    {mentors
                                                        .filter(m => m._id !== gradeForm.mentorAId)
                                                        .map(m => (
                                                            <option key={m._id} value={m._id}>{m.name} — {m.email}</option>
                                                        ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end space-x-3 pt-2">
                                            <button type="button" onClick={() => setShowSetGradesModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                                            <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Set Grades</button>
                                        </div>
                                    </form>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>




                    {/* Internal Requests Section */}
                    {activeSection === 'internal-requests' && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="internal-requests"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">Internal Staff Requests</h2>
                                        <p className="text-gray-500">Approve or reject requests for the Internal Service Team.</p>
                                    </div>
                                    <button
                                        onClick={() => fetchInternalRequests(1)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/50 border border-gray-200 rounded-lg hover:bg-white transition-all duration-200"
                                    >
                                        <RefreshCw className="w-4 h-4" /> Refresh
                                    </button>
                                </div>

                                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-gray-50/50">
                                                    <th className="px-6 py-4 font-semibold text-gray-900 border-b border-gray-100">Name</th>
                                                    <th className="px-6 py-4 font-semibold text-gray-900 border-b border-gray-100">Email</th>
                                                    <th className="px-6 py-4 font-semibold text-gray-900 border-b border-gray-100">Role</th>
                                                    <th className="px-6 py-4 font-semibold text-gray-900 border-b border-gray-100">Status</th>
                                                    <th className="px-6 py-4 font-semibold text-gray-900 border-b border-gray-100 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {internalRequests.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No requests found.</td>
                                                    </tr>
                                                ) : (
                                                    internalRequests.map((req) => (
                                                        <tr key={req._id}>
                                                            <td className="px-6 py-4 font-medium text-gray-900">{req.fullName}</td>
                                                            <td className="px-6 py-4 text-gray-600">{req.email}</td>
                                                            <td className="px-6 py-4">
                                                                <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-semibold">INTERNAL</span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                                    req.status === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                                                                    req.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                                                }`}>
                                                                    {req.status.toUpperCase()}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                {req.status === 'pending' && (
                                                                    <div className="flex justify-end gap-2">
                                                                        <button onClick={() => handleInternalRequestStatus(req._id, 'approved')} className="p-1 text-green-600 hover:bg-green-50 rounded"><UserCheck className="w-5 h-5" /></button>
                                                                        <button onClick={() => {
                                                                            const notes = prompt('Rejection reason:');
                                                                            if(notes !== null) handleInternalRequestStatus(req._id, 'rejected', notes);
                                                                        }} className="p-1 text-red-600 hover:bg-red-50 rounded"><UserX className="w-5 h-5" /></button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    )}

                    {/* Project Templates Section */}
                    {activeSection === 'project-templates' && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="project-templates"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">Project Templates</h2>
                                        <p className="text-gray-500">Manage standard project architectures and codebases.</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingProject(null);
                                            setProjectFormData({
                                                title: '', description: '', category: '', techStack: '', difficulty: 'intermediate',
                                                price: '', demoLink: '', screenshotsLink: '', zipFileLink: '', domain: '', features: ''
                                            });
                                            setShowProjectModal(true);
                                        }}
                                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                                    >
                                        <Plus className="w-5 h-5" /> Add New Template
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {projectTemplates.map((project) => (
                                        <motion.div
                                            key={project._id}
                                            whileHover={{ y: -5 }}
                                            className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100"
                                        >
                                            <div className="h-40 bg-gray-100 relative overflow-hidden">
                                                {project.screenshotsLink ? (
                                                    <img src={project.screenshotsLink} alt={project.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <FolderOpen className="w-12 h-12" />
                                                    </div>
                                                )}
                                                <div className="absolute top-2 right-2 flex gap-1">
                                                    <button onClick={() => {
                                                        setEditingProject(project);
                                                        setProjectFormData({
                                                            ...project,
                                                            techStack: project.techStack?.join(', ') || '',
                                                            features: project.features?.join('\n') || ''
                                                        });
                                                        setShowProjectModal(true);
                                                    }} className="p-2 bg-white/90 backdrop-blur rounded-lg shadow text-blue-600 hover:text-blue-700">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => deleteProjectTemplate(project._id)} className="p-2 bg-white/90 backdrop-blur rounded-lg shadow text-red-600 hover:text-red-700">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-5">
                                                <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded text-xs font-bold uppercase tracking-wider">{project.category}</span>
                                                <h3 className="text-lg font-bold text-gray-900 mt-2 line-clamp-1">{project.title}</h3>
                                                <p className="text-gray-500 text-sm mt-1 line-clamp-2">{project.description}</p>
                                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                                                    <span className="text-amber-600 font-bold">₹{project.price}</span>
                                                    <div className="flex gap-2">
                                                        {project.zipFileLink && <BadgeCheck className="w-5 h-5 text-green-500" title="Code Uploaded" />}
                                                        <span className={`text-xs px-2 py-1 rounded font-semibold ${
                                                            project.difficulty === 'beginner' ? 'bg-green-50 text-green-600' :
                                                            project.difficulty === 'intermediate' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                                                        }`}>
                                                            {project.difficulty}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    )}

                    {/* Customization Requests Section */}
                    {activeSection === 'customization-requests' && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="customization-requests"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900">Customization Requests</h2>
                                    <button onClick={() => fetchCustomizationRequests(1)} className="p-2 bg-white rounded-lg shadow-sm border"><RefreshCw className="w-5 h-5" /></button>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {customizationRequests.map((req) => (
                                        <div key={req._id} className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col md:flex-row gap-6 items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                        req.status === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                                                        req.status === 'in-progress' ? 'bg-blue-50 text-blue-600' :
                                                        req.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                                    }`}>
                                                        {req.status.toUpperCase()}
                                                    </span>
                                                    <span className="text-gray-400 text-xs">{formatDate(req.createdAt)}</span>
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900">{req.projectTemplateId?.title || 'Unknown Project'}</h3>
                                                <p className="text-gray-600 mt-2 text-sm italic">"{req.requirementDescription}"</p>
                                                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1"><User className="w-4 h-4" /> {req.studentId?.name}</span>
                                                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Deadline: {formatDate(req.deadline)}</span>
                                                </div>
                                            </div>
                                            <div className="w-full md:w-64 space-y-3">
                                                <label className="text-xs font-bold text-gray-400 uppercase">Assignment</label>
                                                {req.assignedEmployee ? (
                                                    <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                                        <p className="text-xs text-indigo-400 font-bold uppercase">Assigned To</p>
                                                        <p className="text-sm font-bold text-indigo-700">{req.assignedEmployee.name}</p>
                                                    </div>
                                                ) : (
                                                    <select
                                                        onChange={(e) => assignStaffToRequest(req._id, e.target.value)}
                                                        className="w-full p-3 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="">Assign Internal Staff</option>
                                                        {employees.map(emp => (
                                                            <option key={emp._id} value={emp._id}>{emp.name}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                {!req.assignedEmployee && (
                                                    <div className="flex gap-2">
                                                        <select
                                                            value={req.status}
                                                            onChange={(e) => updateRequestStatus(req._id, e.target.value)}
                                                            className="flex-1 p-2 bg-gray-50 border rounded-lg text-xs"
                                                        >
                                                            <option value="pending">Pending</option>
                                                            <option value="in-progress">In Progress</option>
                                                            <option value="completed">Completed</option>
                                                            <option value="rejected">Rejected</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    )}

                    {/* Project Ideas Section */}
                    {activeSection === 'project-ideas' && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="project-ideas"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900">Project Ideas (Submissions)</h2>
                                    <button onClick={() => fetchProjectIdeas(1)} className="p-2 bg-white rounded-lg shadow-sm border"><RefreshCw className="w-5 h-5" /></button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {projectIdeas.map((idea) => (
                                        <div key={idea._id} className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
                                            <div className="flex justify-between items-start mb-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                                                    idea.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                    idea.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {idea.status}
                                                </span>
                                                <span className="text-sm text-gray-400">{formatDate(idea.createdAt)}</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900">{idea.title}</h3>
                                            <p className="text-gray-500 mt-1 text-sm">{idea.category} • {idea.domain}</p>
                                            <p className="text-gray-600 mt-4 text-sm line-clamp-3">{idea.description}</p>
                                            
                                            <div className="mt-6 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                                                        {idea.studentId?.name?.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700">{idea.studentId?.name}</span>
                                                </div>
                                                {idea.status === 'pending' && (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleIdeaReview(idea._id, 'approve')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow-md shadow-green-100">Approve</button>
                                                        <button onClick={() => handleIdeaReview(idea._id, 'reject')} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold border border-red-100">Reject</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    )}

                    {/* Purchases Section */}
                    {activeSection === 'purchases' && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="purchases"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">Student Purchases & Statistics</h2>
                                        <p className="text-gray-500">Monitor payments and download activity.</p>
                                    </div>
                                    <button onClick={() => { fetchPurchases(1); fetchProjectStats(); }} className="flex items-center gap-2 px-4 py-2 bg-white/50 border border-gray-200 rounded-lg hover:bg-white transition-all duration-200">
                                        <RefreshCw className="w-4 h-4" /> Refresh
                                    </button>
                                </div>

                                {projectStats && (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg shadow-green-200">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-green-100 font-medium text-sm">Total Revenue</p>
                                                    <h3 className="text-3xl font-bold mt-1">₹{projectStats.totalRevenue?.toLocaleString()}</h3>
                                                </div>
                                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                                    <DollarSign className="w-6 h-6 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-blue-100 font-medium text-sm">Valid Purchases</p>
                                                    <h3 className="text-3xl font-bold mt-1">{projectStats.paidPurchases} <span className="text-sm font-normal text-blue-100">/ {projectStats.totalPurchases}</span></h3>
                                                </div>
                                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                                    <ShoppingCart className="w-6 h-6 text-white" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-purple-200">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-purple-100 font-medium text-sm">Total Downloads</p>
                                                    <h3 className="text-3xl font-bold mt-1">{projectStats.downloadedProjects}</h3>
                                                </div>
                                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                                    <Download className="w-6 h-6 text-white" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg shadow-amber-200">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-amber-100 font-medium text-sm">Live Templates</p>
                                                    <h3 className="text-3xl font-bold mt-1">{projectStats.totalTemplates}</h3>
                                                </div>
                                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                                    <FolderOpen className="w-6 h-6 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="px-6 py-4 font-bold text-gray-900">Student</th>
                                                <th className="px-6 py-4 font-bold text-gray-900">Project</th>
                                                <th className="px-6 py-4 font-bold text-gray-900">Price</th>
                                                <th className="px-6 py-4 font-bold text-gray-900">Status</th>
                                                <th className="px-6 py-4 font-bold text-gray-900">Download</th>
                                                <th className="px-6 py-4 font-bold text-gray-900 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {purchases.map((p) => (
                                                <tr key={p._id}>
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.studentId?.name}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{p.projectTemplateId?.title}</td>
                                                    <td className="px-6 py-4 text-sm font-bold">₹{p.paymentAmount}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                                            p.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                            {p.paymentStatus.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {p.downloadEnabled ? <BadgeCheck className="text-green-500 w-5 h-5" /> : <Clock className="text-gray-300 w-5 h-5" />}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {p.paymentStatus === 'pending' && (
                                                            <button 
                                                                onClick={() => updatePurchaseStatus(p._id, 'paid')}
                                                                className="text-xs font-bold text-blue-600 hover:underline"
                                                            >
                                                                Mark as Paid
                                                            </button>
                                                        )}
                                                        {p.paymentStatus === 'paid' && (
                                                            <button 
                                                                onClick={() => {
                                                                    if(window.confirm('Are you sure you want to revoke access?')) {
                                                                        updatePurchaseStatus(p._id, 'failed');
                                                                    }
                                                                }}
                                                                className="text-xs font-bold text-red-600 hover:underline ml-3"
                                                            >
                                                                Revoke Access
                                                            </button>
                                                        )}
                                                        {p.paymentStatus === 'failed' && (
                                                            <button 
                                                                onClick={() => updatePurchaseStatus(p._id, 'paid')}
                                                                className="text-xs font-bold text-green-600 hover:underline ml-3"
                                                            >
                                                                Restore Access
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    )}


                </div>
            </div>

            {/* Project Template Modal */}
            <AnimatePresence>
                {showProjectModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
                        >
                            <div className="sticky top-0 bg-white/80 backdrop-blur-md px-8 py-6 border-b border-gray-100 flex items-center justify-between z-10">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">{editingProject ? 'Edit Project' : 'Add New Project'}</h3>
                                    <p className="text-gray-500 text-sm">Fill in the codebase details and upload assets.</p>
                                </div>
                                <button onClick={() => setShowProjectModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleProjectSubmit} className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left Column - Basics */}
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Project Title</label>
                                            <input
                                                type="text"
                                                required
                                                value={projectFormData.title}
                                                onChange={(e) => setProjectFormData({ ...projectFormData, title: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                                placeholder="Professional Web App Template"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={projectFormData.category}
                                                    onChange={(e) => setProjectFormData({ ...projectFormData, category: e.target.value })}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 transition-all"
                                                    placeholder="E-commerce"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Domain</label>
                                                <input
                                                    type="text"
                                                    value={projectFormData.domain}
                                                    onChange={(e) => setProjectFormData({ ...projectFormData, domain: e.target.value })}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 transition-all"
                                                    placeholder="Retail"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Tech Stack (comma separated)</label>
                                            <input
                                                type="text"
                                                value={projectFormData.techStack}
                                                onChange={(e) => setProjectFormData({ ...projectFormData, techStack: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 transition-all"
                                                placeholder="React, Node.js, MongoDB"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Difficulty</label>
                                                <select
                                                    value={projectFormData.difficulty}
                                                    onChange={(e) => setProjectFormData({ ...projectFormData, difficulty: e.target.value })}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 transition-all"
                                                >
                                                    <option value="beginner">Beginner</option>
                                                    <option value="intermediate">Intermediate</option>
                                                    <option value="advanced">Advanced</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Price (₹)</label>
                                                <input
                                                    type="number"
                                                    value={projectFormData.price}
                                                    onChange={(e) => setProjectFormData({ ...projectFormData, price: e.target.value })}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 transition-all"
                                                    placeholder="999"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column - Media & Files */}
                                    <div className="space-y-6">
                                        <div
                                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                            onDragLeave={() => setDragActive(false)}
                                            onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileUpload(e, 'zip'); }}
                                            className={`relative h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${
                                                dragActive ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-400'
                                            }`}
                                        >
                                            <Upload className={`w-8 h-8 mb-2 ${projectFormData.zipFileLink ? 'text-green-500' : 'text-gray-400'}`} />
                                            <p className="text-xs font-bold text-gray-500">
                                                {projectFormData.zipFileLink ? 'Codebase Uploaded ✓' : 'Drag & Drop Project ZIP'}
                                            </p>
                                            <input type="file" onChange={(e) => handleFileUpload(e, 'zip')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        </div>

                                        <div
                                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                            onDragLeave={() => setDragActive(false)}
                                            onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileUpload(e, 'screenshot'); }}
                                            className={`relative h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${
                                                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400'
                                            }`}
                                        >
                                            <Image className={`w-8 h-8 mb-2 ${projectFormData.screenshotsLink ? 'text-green-500' : 'text-gray-400'}`} />
                                            <p className="text-xs font-bold text-gray-500">
                                                {projectFormData.screenshotsLink ? 'Screenshot Uploaded ✓' : 'Drag & Drop Main Screenshot'}
                                            </p>
                                            <input type="file" onChange={(e) => handleFileUpload(e, 'screenshot')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Live Demo URL</label>
                                            <input
                                                type="url"
                                                value={projectFormData.demoLink}
                                                onChange={(e) => setProjectFormData({ ...projectFormData, demoLink: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 transition-all"
                                                placeholder="https://demo.myapp.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Project Description</label>
                                    <textarea
                                        required
                                        rows="4"
                                        value={projectFormData.description}
                                        onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 transition-all"
                                        placeholder="Detailed explanation of what this template provides..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Key Features (One per line)</label>
                                    <textarea
                                        rows="4"
                                        value={projectFormData.features}
                                        onChange={(e) => setProjectFormData({ ...projectFormData, features: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 transition-all font-mono text-sm"
                                        placeholder="Auth System&#10;Stripe Integration&#10;Dashboard UI"
                                    />
                                </div>

                                <div className="pt-6 border-t flex justify-end gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowProjectModal(false)}
                                        className="px-8 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={uploadingFiles || loading}
                                        className="px-12 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-200 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {uploadingFiles ? 'Uploading...' : editingProject ? 'Update Template' : 'Publish Template'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Popup */}
            {showSuccessPopup && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                    >
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Success!</h3>
                            <p className="text-gray-600 mb-6">{successMessage}</p>
                            <button
                                onClick={() => setShowSuccessPopup(false)}
                                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium"
                            >
                                OK
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
};

export default AdminDashboard;