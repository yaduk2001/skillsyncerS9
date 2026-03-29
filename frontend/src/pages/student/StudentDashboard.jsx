import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Layers,
  Lightbulb,
  LogOut,
  GraduationCap,
  ShoppingBag,
  Settings,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Home,
  Menu,
  X,
  FolderOpen,
  Search,
  RefreshCw,
  Plus,
  ExternalLink,
  Image,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Send,
  Star,
  Tag,
  ArrowLeft,
  Zap,
  Globe,
  Code2,
  ListChecks,
  DollarSign,
  ShoppingCart,
  CreditCard,
  Lock,
  Building2,
  Monitor,
  Wallet,
  QrCode,
  Smartphone,
  ShieldCheck,
  Check,
  FileText,
  Shield
} from 'lucide-react';

import { API_BASE_URL } from '../../config/api';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'Student';
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Data state
  const [stats, setStats] = useState({ availableProjects: 0, totalRequests: 0, totalIdeas: 0, pendingRequests: 0, pendingIdeas: 0 });
  const [projectTemplates, setProjectTemplates] = useState([]);
  const [customizationRequests, setCustomizationRequests] = useState([]);
  const [projectIdeas, setProjectIdeas] = useState([]);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPrice, setFilterPrice] = useState('');

  // Form states
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestFormData, setRequestFormData] = useState({ projectTemplateId: '', customizationDetails: '' });
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [ideaFormData, setIdeaFormData] = useState({ title: '', description: '', domain: '', technologies: '' });

  // Purchases / Payment state
  const [purchases, setPurchases] = useState([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);


  // Project Details state
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDetailLoading, setProjectDetailLoading] = useState(false);
  const [projectDetailError, setProjectDetailError] = useState('');

  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    localStorage.removeItem('secondaryRoles');
    navigate('/auth');
  };

  const currentTime = new Date();
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const ui = {
    card: 'bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 p-6',
    tableWrap: 'overflow-x-auto rounded-xl border border-gray-100',
    tableHead: 'bg-gray-50/50',
    tableHeadCell: 'px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider',
    tableCell: 'px-6 py-4 whitespace-nowrap text-sm text-slate-600 border-b border-gray-50',
    btnPrimary: 'flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all duration-300 shadow-lg shadow-indigo-200 font-semibold',
    btnSecondary: 'flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-300 font-semibold'
  };

  // ============ API FUNCTIONS ============
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/student/stats`, { headers: getAuthHeaders() });
      const data = await response.json();
      if (data.success) setStats(data.data);
    } catch (error) { console.error('Error fetching stats:', error); }
  };

  const fetchProjectTemplates = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: '12' });
      if (searchTerm)       params.append('search', searchTerm);
      if (filterDifficulty) params.append('difficulty', filterDifficulty);
      if (filterCategory)   params.append('category', filterCategory);
      if (filterPrice === 'free')       { params.append('maxPrice', '0'); }
      else if (filterPrice === 'under500')  { params.append('minPrice', '1'); params.append('maxPrice', '500'); }
      else if (filterPrice === 'under1000') { params.append('minPrice', '1'); params.append('maxPrice', '1000'); }
      else if (filterPrice === '1000plus')  { params.append('minPrice', '1000'); }
      const response = await fetch(`${API_BASE_URL}/api/projects?${params}`, { headers: getAuthHeaders() });
      const data = await response.json();
      if (data.success) {
        setProjectTemplates(data.data.projects || []);
        setPagination(data.data.pagination || {});
      }
    } catch (error) { console.error('Error fetching projects:', error); }
    finally { setLoading(false); }
  };

  const fetchProjectById = async (id) => {
    try {
      setProjectDetailLoading(true);
      setProjectDetailError('');
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, { headers: getAuthHeaders() });
      const data = await response.json();
      if (data.success) {
        setSelectedProject(data.data);
        setActiveSection('project-detail');
      } else {
        setProjectDetailError(data.message || 'Project not found');
      }
    } catch (error) {
      console.error('Error fetching project detail:', error);
      setProjectDetailError('Connection error');
    } finally {
      setProjectDetailLoading(false);
    }
  };

  const fetchCustomizationRequests = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: '10' });
      const response = await fetch(`${API_BASE_URL}/api/student/customization-requests?${params}`, { headers: getAuthHeaders() });
      const data = await response.json();
      if (data.success) {
        setCustomizationRequests(data.data.requests || []);
        setPagination(data.data.pagination || {});
      }
    } catch (error) { console.error('Error fetching requests:', error); }
    finally { setLoading(false); }
  };

  const fetchPurchases = async (page = 1) => {
    try {
      setPurchasesLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: '10' });
      const response = await fetch(`${API_BASE_URL}/api/student/purchases?${params}`, { headers: getAuthHeaders() });
      const data = await response.json();
      if (data.success) {
        setPurchases(data.data.purchases || []);
        setPagination(data.data.pagination || {});
      }
    } catch (error) { console.error('Error fetching purchases:', error); }
    finally { setPurchasesLoading(false); }
  };

  const handleBuyClick = async (project) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/student/create-checkout-session`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ projectTemplateId: project._id })
      });
      const data = await response.json();
      if (data.success && data.url) {
        window.location.href = data.url; // Redirect to Stripe Checkout
      } else {
        alert(data.message || 'Error initiating checkout');
      }
    } catch (error) {
      console.error('Error with checkout:', error);
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createRealPurchase = async (projectId, sessionId) => {
    try {
      setPurchasesLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/student/purchases`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ 
          projectTemplateId: projectId,
          paymentAmount: 0, // Backend will fetch actual template price
          transactionId: sessionId
        })
      });
      const data = await response.json();
      
      if (data.success || data.message === 'You have already purchased this project.') { 
        setSuccessMessage('Payment verification successful! Your project is now available.');
        setShowSuccessPopup(true);
        setActiveSection('purchased-projects');
        fetchPurchases(); 
        fetchStats(); 
      } else {
        alert(data.message || 'Could not verify purchase.');
      }
    } catch (error) { 
      console.error('Error creating purchase:', error); 
    } finally {
      setPurchasesLoading(false);
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const submitCustomizationRequest = async () => {
    if (!requestFormData.projectTemplateId || !requestFormData.customizationDetails) {
      alert('Please select a project and enter customization details'); return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/student/customization-requests`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(requestFormData)
      });
      const data = await response.json();
      if (data.success) {
        setShowRequestForm(false);
        setRequestFormData({ projectTemplateId: '', customizationDetails: '' });
        setSuccessMessage('Customization request submitted!');
        setShowSuccessPopup(true);
        fetchCustomizationRequests(currentPage);
        fetchStats();
      } else { alert(data.message || 'Error submitting request'); }
    } catch (error) { console.error('Error submitting request:', error); alert('Error submitting request'); }
    finally { setLoading(false); }
  };

  const fetchProjectIdeas = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: '10' });
      const response = await fetch(`${API_BASE_URL}/api/student/project-ideas?${params}`, { headers: getAuthHeaders() });
      const data = await response.json();
      if (data.success) {
        setProjectIdeas(data.data.ideas || []);
        setPagination(data.data.pagination || {});
      }
    } catch (error) { console.error('Error fetching ideas:', error); }
    finally { setLoading(false); }
  };

  const submitProjectIdea = async () => {
    if (!ideaFormData.title || !ideaFormData.description) {
      alert('Please enter title and description'); return;
    }
    try {
      setLoading(true);
      const body = {
        title: ideaFormData.title,
        description: ideaFormData.description,
        domain: ideaFormData.domain,
        technologies: ideaFormData.technologies ? ideaFormData.technologies.split(',').map(s => s.trim()).filter(Boolean) : []
      };
      const response = await fetch(`${API_BASE_URL}/api/student/project-ideas`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body)
      });
      const data = await response.json();
      if (data.success) {
        setShowIdeaForm(false);
        setIdeaFormData({ title: '', description: '', domain: '', technologies: '' });
        setSuccessMessage('Project idea submitted successfully! Admin will review and provide feedback.');
        setShowSuccessPopup(true);
        fetchProjectIdeas(currentPage);
        fetchStats();
      } else { alert(data.message || 'Failed to submit idea. Please try again.'); }
    } catch (error) { console.error('Error submitting idea:', error); alert('Network error. Please check your connection and try again.'); }
    finally { setLoading(false); }
  };

  // ============ EFFECTS ============
  useEffect(() => {
    // Check URL parameters for returning from Stripe checkout
    const query = new URLSearchParams(window.location.search);
    if (query.get('payment_success') === 'true') {
      const projectId = query.get('project_id');
      const sessionId = query.get('session_id');
      if (projectId && sessionId) {
        createRealPurchase(projectId, sessionId);
      }
    } else if (query.get('payment_canceled') === 'true') {
      setSuccessMessage('Payment was canceled.');
      setShowSuccessPopup(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  useEffect(() => {
    fetchStats();
    if (activeSection === 'dashboard') {
      fetchProjectTemplates(1);
      fetchPurchases(1);
    } else if (activeSection === 'browse-projects') {
      fetchProjectTemplates(currentPage);
    } else if (activeSection === 'purchased-projects') {
      fetchPurchases(currentPage);
    } else if (activeSection === 'requests') {
      fetchCustomizationRequests(currentPage);
    } else if (activeSection === 'ideas') {
      fetchProjectIdeas(currentPage);
    }
  }, [activeSection, currentPage]);

  // Auto-hide success popup
  useEffect(() => {
    if (showSuccessPopup) {
      const timer = setTimeout(() => setShowSuccessPopup(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessPopup]);

  // Refetch templates when search or filters change
  useEffect(() => {
    if (activeSection === 'browse-projects') {
      const debounce = setTimeout(() => fetchProjectTemplates(1), 400);
      return () => clearTimeout(debounce);
    }
  }, [searchTerm, filterDifficulty, filterCategory]);

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');`}</style>
      <div className="min-h-screen bg-[#F8FAFC] flex text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* ============ FLOATING GLASS SIDEBAR ============ */}
      <aside className={`
        fixed inset-y-4 left-4 z-50 w-64 bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl transition-all duration-500 ease-spring
        ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-[280px] lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col p-6">
          {/* Logo Section */}
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Zap className="w-6 h-6 text-white fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">SkillSyncer</h1>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Student Portal</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: Home },
              { id: 'browse-projects', name: 'Browse Projects', icon: ShoppingBag },
              { id: 'purchased-projects', name: 'My Purchases', icon: BookOpen },
              { id: 'requests', name: 'Customizations', icon: Layers },
              { id: 'ideas', name: 'My Ideas', icon: Lightbulb }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveSection(item.id); setIsSidePanelOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group
                  ${activeSection === item.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.02]' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}
                `}
              >
                <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${activeSection === item.id ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`} />
                <span className="font-bold text-sm tracking-tight">{item.name}</span>
                {activeSection === item.id && (
                  <motion.div layoutId="activePill" className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
                )}
              </button>
            ))}
          </nav>

          {/* User Profile Footer */}
          <div className="mt-auto pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 px-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-indigo-600 font-black shadow-sm">
                {userName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
                <p className="text-[10px] text-slate-400 font-semibold truncate capitalize">{localStorage.getItem('userRole') || 'Student'}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-colors font-bold text-sm">
              <LogOut className="w-5 h-5" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ============ MAIN CONTENT AREA ============ */}
      <main className="flex-1 lg:ml-72 p-4 lg:p-8 min-h-screen">
        {/* Mobile Navbar */}
        <div className="lg:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
             </div>
             <span className="font-black tracking-tight text-slate-900">SkillSyncer</span>
          </div>
          <button onClick={() => setIsSidePanelOpen(true)} className="p-2 bg-slate-50 rounded-xl text-slate-600">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Dynamic Section Header */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-[0.2em] mb-2">{getGreeting()}</p>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">{userName}!</span>
            </h2>
          </motion.div>

          <div className="flex items-center gap-4">
            <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 group hover:border-indigo-200 transition-colors cursor-pointer">
              <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center"><Star className="w-4 h-4 text-amber-500 fill-current" /></div>
              <span className="text-sm font-bold text-slate-700">Premium Student</span>
            </div>
          </div>
        </header>

        {/* Dashboard Overview Content */}
        {activeSection === 'dashboard' && (
          <>
            {/* Stats Row */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {[
                { label: 'Available Projects', val: stats.availableProjects, icon: FolderOpen, color: 'indigo' },
                { label: 'Purchased Tools', val: purchases.length, icon: ShoppingBag, color: 'emerald' },
                { label: 'Custom Requests', val: customizationRequests.length, icon: Layers, color: 'rose' },
                { label: 'Submitted Ideas', val: stats.totalIdeas, icon: Lightbulb, color: 'amber' }
              ].map((stat, i) => (
                <div key={i} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:bg-${stat.color}-600 group-hover:text-white transition-colors`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">+12%</span>
                  </div>
                  <h4 className="text-3xl font-black text-slate-900 mb-1">{stat.val}</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Featured Templates Row */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <h3 className="text-xl font-black text-slate-900">Featured Templates</h3>
                 <button onClick={() => setActiveSection('browse-projects')} className="text-sm font-bold text-indigo-600 hover:underline">View All</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projectTemplates.slice(0, 3).map((project) => (
                  <div key={project._id} className="bg-white rounded-[2rem] border border-slate-100 p-6 hover:shadow-2xl transition-all group overflow-hidden relative flex flex-col">
                    {project.screenshotsLink ? (
                      <div className="h-40 -mx-6 -mt-6 mb-6 overflow-hidden relative">
                         <img src={project.screenshotsLink} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                         <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white to-transparent"></div>
                      </div>
                    ) : (
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                         <Zap className="w-32 h-32 text-indigo-600" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-4 relative z-10">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-full">{project.category}</span>
                      <span className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-black uppercase rounded-full">{project.difficulty}</span>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 mb-2 truncate">{project.title}</h4>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-6 flex-1">{project.description}</p>
                    <button onClick={() => fetchProjectById(project._id)} className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold text-xs hover:bg-indigo-600 transition-colors mt-auto flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" /> View Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ============ BROWSE PROJECTS SECTION ============ */}
        {activeSection === 'browse-projects' && (
          <AnimatePresence mode="wait">
            <motion.div key="browse" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              {/* Search & Filter Bar */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search premium templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                  />
                </div>
                <select
                  value={filterDifficulty}
                  onChange={(e) => { setFilterDifficulty(e.target.value); setCurrentPage(1); }}
                  className="px-6 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-inner"
                >
                  <option value="">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
                <select
                  value={filterCategory}
                  onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                  className="px-6 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-inner"
                >
                  <option value="">All Categories</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Mobile App">Mobile App</option>
                  <option value="Machine Learning">Machine Learning</option>
                  <option value="Data Science">Data Science</option>
                  <option value="IoT">IoT</option>
                  <option value="Blockchain">Blockchain</option>
                  <option value="Cybersecurity">Cybersecurity</option>
                  <option value="Cloud Computing">Cloud Computing</option>
                  <option value="Game Development">Game Development</option>
                  <option value="Other">Other</option>
                </select>
                <select
                  value={filterPrice}
                  onChange={(e) => { setFilterPrice(e.target.value); setCurrentPage(1); }}
                  className="px-6 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-inner"
                >
                  <option value="">All Prices</option>
                  <option value="free">Free</option>
                  <option value="under500">Under ₹500</option>
                  <option value="under1000">Under ₹1000</option>
                  <option value="1000plus">₹1000+</option>
                </select>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                  [1,2,3,4,5,6].map(i => <div key={i} className="bg-white rounded-[2rem] border border-slate-100 h-80 animate-pulse" />)
                ) : (
                  projectTemplates.map((project) => (
                    <motion.div
                      key={project._id}
                      className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group relative"
                    >
                      {project.screenshotsLink && (
                        <div className="h-48 w-full overflow-hidden relative bg-slate-100 border-b border-slate-100">
                           <img src={project.screenshotsLink} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      )}

                      <div className={`absolute ${project.screenshotsLink ? 'top-4 right-4' : 'top-6 right-6'} z-10`}>
                        <div className="px-4 py-2 bg-white/90 backdrop-blur-md text-indigo-600 font-black text-xs rounded-2xl border border-indigo-100 shadow-xl shadow-indigo-100/30">
                           {project.price > 0 ? `₹${project.price}` : 'FREE'}
                        </div>
                      </div>

                      <div className="p-8 flex flex-col flex-1 relative z-10 bg-white">
                        <div className="flex items-center gap-2 mb-4">
                           <span className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em] bg-indigo-50 px-3 py-1 rounded-full">{project.domain || 'Technology'}</span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-4 group-hover:text-indigo-600 transition-colors leading-tight">{project.title}</h3>
                        
                        <div className="flex flex-wrap gap-2 mb-8">
                          {(project.techStack || []).slice(0, 3).map((tech, i) => (
                             <span key={i} className="px-3 py-1.5 bg-slate-50 text-slate-500 text-[10px] font-black rounded-xl uppercase tracking-wider">{tech}</span>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-auto">
                          <button
                            onClick={() => fetchProjectById(project._id)}
                            className="flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-700 rounded-2xl hover:bg-slate-100 transition-all text-[10px] font-black uppercase tracking-widest border border-slate-100"
                          >
                            <Eye className="w-4 h-4" /> Details
                          </button>
                          
                          <button
                            onClick={() => handleBuyClick(project)}
                            className="flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100"
                          >
                            <ShoppingCart className="w-4 h-4" /> Buy Now
                          </button>
                        </div>

                        {project.demoLink && (
                          <a
                            href={project.demoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 mt-4 py-3 bg-white text-indigo-600 border border-indigo-100 rounded-2xl hover:bg-indigo-50 transition-all text-[10px] font-black uppercase tracking-widest"
                          >
                             <Globe className="w-4 h-4" /> Live Demo
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-3xl border border-slate-100 px-8 py-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-400">
                    Page <span className="text-slate-900">{pagination.currentPage}</span> of {pagination.totalPages}
                  </p>
                  <div className="flex gap-3">
                    <button
                      disabled={!pagination.hasPrev}
                      onClick={() => { setCurrentPage(pagination.currentPage - 1); fetchProjectTemplates(pagination.currentPage - 1); }}
                      className="p-3 border border-slate-100 rounded-2xl disabled:opacity-30 hover:bg-slate-50 transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      disabled={!pagination.hasNext}
                      onClick={() => { setCurrentPage(pagination.currentPage + 1); fetchProjectTemplates(pagination.currentPage + 1); }}
                      className="p-3 border border-slate-100 rounded-2xl disabled:opacity-30 hover:bg-slate-50 transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}        {/* ============ PROJECT DETAIL SECTION ============ */}
        {activeSection === 'project-detail' && (
          <AnimatePresence mode="wait">
            <motion.div key="project-detail" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-8">
              {projectDetailLoading ? (
                <div className="bg-white rounded-[3rem] p-24 text-center border border-slate-100 shadow-sm">
                  <RefreshCw className="w-12 h-12 text-indigo-400 mx-auto mb-6 animate-spin" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Fetching template data...</p>
                </div>
              ) : selectedProject && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                   {/* Left Details */}
                   <div className="lg:col-span-2 space-y-8">
                      <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.05]">
                           <div className="w-48 h-48 bg-indigo-600 rounded-full blur-3xl"></div>
                        </div>
                        <div className="relative z-10">
                           <button onClick={() => setActiveSection('browse-projects')} className="mb-8 flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:translate-x-[-4px] transition-transform">
                              <ArrowLeft className="w-4 h-4" /> Back to browse
                           </button>
                           <div className="flex items-center gap-3 mb-6">
                              <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-full tracking-widest">{selectedProject.difficulty}</span>
                              <span className="px-4 py-1.5 bg-slate-50 text-slate-500 text-[10px] font-black uppercase rounded-full tracking-widest">{selectedProject.domain}</span>
                           </div>
                           <h2 className="text-4xl font-black text-slate-900 mb-6 leading-tight tracking-tight">{selectedProject.title}</h2>
                           <p className="text-lg text-slate-500 leading-relaxed font-medium">{selectedProject.description}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4 flex items-center gap-2">
                               <Code2 className="w-5 h-5 text-indigo-600" /> Stack
                            </h3>
                            <div className="flex flex-wrap gap-2">
                               {(selectedProject.techStack || []).map(t => <span key={t} className="px-4 py-2 bg-slate-50 text-slate-600 text-[11px] font-bold rounded-2xl border border-slate-100 shadow-sm">{t}</span>)}
                            </div>
                         </div>
                         <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4 flex items-center gap-2">
                               <Zap className="w-5 h-5 text-indigo-600" /> Features
                            </h3>
                            <ul className="space-y-4">
                               {(selectedProject.features || []).map(f => <li key={f} className="text-xs font-bold text-slate-500 flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> {f}</li>)}
                            </ul>
                         </div>
                      </div>
                   </div>

                   {/* Right Actions */}
                   <div className="space-y-8">
                       <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-slate-200">
                          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-2 text-center">Exclusive Access</p>
                          <h4 className="text-5xl font-black text-center mb-8 tracking-tighter">₹{selectedProject.price || 500}</h4>
                          <div className="space-y-4">
                             <button onClick={() => handleBuyClick(selectedProject)} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30">Get ZIP Instantly</button>
                             {selectedProject.demoLink && (
                               <a href={selectedProject.demoLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-5 bg-white text-indigo-600 border border-indigo-100 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all">
                                  <Globe className="w-4 h-4" /> View Live Demo
                               </a>
                             )}
                             <button onClick={() => { setRequestFormData(p => ({ ...p, projectTemplateId: selectedProject._id })); setShowRequestForm(true); }} className="w-full py-5 bg-white/10 text-white border border-white/20 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-white/20 transition-all">Request Changes</button>
                          </div>
                          <div className="mt-8 pt-8 border-t border-white/10 text-center">
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Includes</p>
                             <div className="flex justify-center gap-6 opacity-60">
                                <div className="flex flex-col items-center gap-1"><FileText className="w-4 h-4" /><span className="text-[8px] font-black">DOCS</span></div>
                                <div className="flex flex-col items-center gap-1"><Monitor className="w-4 h-4" /><span className="text-[8px] font-black">DEMOS</span></div>
                                <div className="flex flex-col items-center gap-1"><Shield className="w-4 h-4" /><span className="text-[8px] font-black">SUPPORT</span></div>
                             </div>
                          </div>
                       </div>
                   </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* ============ MY PURCHASED PROJECTS SECTION ============ */}
        {activeSection === 'purchased-projects' && (
          <AnimatePresence mode="wait">
            <motion.div key="purchases" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">Purchased Templates</h3>
                <button onClick={fetchPurchases} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <RefreshCw className={`w-5 h-5 text-slate-400 ${purchasesLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Project</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {purchases.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-20 text-center">
                            <ShoppingBag className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold">No purchases found</p>
                          </td>
                        </tr>
                      ) : (
                        purchases.map((p) => (
                          <tr key={p._id} className="hover:bg-slate-50/30 transition-colors group">
                            <td className="px-6 py-5">
                              <p className="text-sm font-black text-slate-900 truncate max-w-[200px]">{p.projectTemplateId?.title || 'Unknown Project'}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {p._id.slice(-6).toUpperCase()}</p>
                            </td>
                            <td className="px-6 py-5">
                              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-full">
                                {p.projectTemplateId?.category || 'Template'}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-sm font-medium text-slate-500">
                              {formatDate(p.createdAt)}
                            </td>
                            <td className="px-6 py-5">
                              <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${
                                p.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                              }`}>
                                {p.paymentStatus}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right flex items-center justify-end gap-3">
                              {p.projectTemplateId?.demoLink && (
                                <a href={p.projectTemplateId.demoLink} target="_blank" rel="noreferrer" className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors border border-slate-100" title="View Live Demo">
                                   <Globe className="w-4 h-4" />
                                </a>
                              )}
                              {p.downloadEnabled ? (
                                <a href={p.downloadUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-xl transition-all shadow-lg shadow-emerald-50">
                                  <Download className="w-3 h-3" /> Download ZIP
                                </a>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-300 italic">Verifying Payment...</span>
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

        {/* ============ CUSTOMIZATION REQUESTS SECTION ============ */}
        {activeSection === 'requests' && (
          <AnimatePresence mode="wait">
            <motion.div key="requests" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">Custom Tracking</h3>
                <button onClick={() => setShowRequestForm(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-50">
                  <Plus className="w-4 h-4" /> New Request
                </button>
              </div>

              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Project</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Requirements</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {customizationRequests.length === 0 ? (
                         <tr>
                          <td colSpan="4" className="px-6 py-20 text-center">
                            <Layers className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold">No requests submitted</p>
                          </td>
                        </tr>
                      ) : customizationRequests.map((req) => (
                        <tr key={req._id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-5">
                            <p className="text-sm font-black text-slate-900">{req.projectTemplateId?.title || 'Personal Project'}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{req.projectTemplateId?.domain || 'Custom'}</p>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-xs text-slate-500 font-medium line-clamp-2 max-w-xs leading-relaxed">{req.customizationDetails}</p>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                               <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-white shadow-sm">M</div>
                               <span className="text-xs font-bold text-slate-700">{req.assignedEmployee?.name || 'In Queue'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${
                              req.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                              req.status === 'pending' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                   </table>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* ============ SUBMITTED IDEAS SECTION ============ */}
        {activeSection === 'ideas' && (
          <AnimatePresence mode="wait">
            <motion.div key="ideas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">Project Ideation</h3>
                <button onClick={() => setShowIdeaForm(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-50">
                  <Plus className="w-4 h-4" /> Share Idea
                </button>
              </div>

              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Idea</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Domain</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {projectIdeas.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-6 py-20 text-center">
                            <Lightbulb className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold">No ideas pitched yet</p>
                          </td>
                        </tr>
                      ) : (
                        projectIdeas.map((idea) => (
                          <tr key={idea._id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-5">
                              <p className="text-sm font-black text-slate-900 leading-tight mb-1">{idea.title}</p>
                              <p className="text-[10px] font-bold text-slate-400 line-clamp-1 max-w-[200px]">{idea.description}</p>
                            </td>
                            <td className="px-6 py-5">
                              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-full">{idea.category || 'General'}</span>
                            </td>
                            <td className="px-6 py-5">
                               <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${
                                 idea.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                                 idea.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                               }`}>
                                 {idea.status}
                               </span>
                            </td>
                            <td className="px-6 py-5">
                              <p className="text-xs text-slate-500 font-medium line-clamp-2 max-w-[200px] italic leading-relaxed">
                                 {idea.adminFeedback ? `“${idea.adminFeedback}”` : 'Mentors are reviewing...'}
                              </p>
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
      </main>



      {/* ============ CUSTOMIZATION REQUEST FORM MODAL ============ */}
      <AnimatePresence>
        {showRequestForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[3rem] max-w-xl w-full p-10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Project Customization</h3>
                <button onClick={() => setShowRequestForm(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <div className="space-y-6">
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Project Template</label>
                   <select
                     value={requestFormData.projectTemplateId}
                     onChange={(e) => setRequestFormData(p => ({...p, projectTemplateId: e.target.value}))}
                     className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all outline-none mb-4"
                   >
                     <option value="">-- Select a Project Template --</option>
                     {projectTemplates.map(pt => (
                       <option key={pt._id} value={pt._id}>{pt.title}</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Requirement Details</label>
                   <textarea
                     value={requestFormData.customizationDetails}
                     onChange={(e) => setRequestFormData(p => ({...p, customizationDetails: e.target.value}))}
                     placeholder="Describe the changes or features you want to add to this template..."
                     rows={6}
                     className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none"
                   />
                 </div>
                 <button onClick={submitCustomizationRequest} disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50">
                   {loading ? 'Submitting...' : 'Submit Request'}
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ IDEA FORM MODAL ============ */}
      <AnimatePresence>
        {showIdeaForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[3rem] max-w-2xl w-full p-10 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Share Your Idea</h3>
                <button onClick={() => setShowIdeaForm(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 <div className="md:col-span-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Project Title</label>
                   <input type="text" value={ideaFormData.title} onChange={(e) => setIdeaFormData(p => ({...p, title: e.target.value}))} className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. AI-Powered Health Tracker" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Domain</label>
                   <input type="text" value={ideaFormData.domain} onChange={(e) => setIdeaFormData(p => ({...p, domain: e.target.value}))} className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Machine Learning" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tech Stack</label>
                   <input type="text" value={ideaFormData.technologies} onChange={(e) => setIdeaFormData(p => ({...p, technologies: e.target.value}))} className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. React, Python" />
                 </div>
                 <div className="md:col-span-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Concept Description</label>
                   <textarea value={ideaFormData.description} onChange={(e) => setIdeaFormData(p => ({...p, description: e.target.value}))} rows={4} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none" placeholder="Explain your vision..." />
                 </div>
              </div>

              <button onClick={submitProjectIdea} disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                {loading ? 'Pitching...' : 'Submit Proposal'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccessPopup && (
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="fixed bottom-10 right-10 z-[100] bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-white/10"
          >
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
               <Check className="w-5 h-5 text-white stroke-[3px]" />
            </div>
            <span className="font-bold text-sm tracking-tight">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
};

export default StudentDashboard;
