import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Building,
  Shield,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Home,
  Calendar,
  CheckCircle,
  Target,
  Briefcase,
  Activity,
  ChevronRight,
  ArrowRight,
  BarChart3,
  Star,
  Rocket,
  Sparkles,
  BadgeCheck,
  Heart,
  Eye,
  RefreshCw,
  Clock
} from 'lucide-react';

// Animations removed for static dashboard

import { employerApi, apiRequest, authApi, jobseekerApi } from '../utils/api';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState({ name: '', email: '' });
  const [companyName, setCompanyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [companyData, setCompanyData] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  
  // Applications state (read-only view for employee)
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [applicationFilters, setApplicationFilters] = useState({
    status: '',
    internshipId: '',
    search: ''
  });
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [error, setError] = useState(null);
  const [secondaryRoles, setSecondaryRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  
  // Customization Tasks State
  const [customizationTasks, setCustomizationTasks] = useState([]);
  const [loadingCustomizationTasks, setLoadingCustomizationTasks] = useState(false);

  useEffect(() => {
    const init = () => {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('userRole');
      const name = localStorage.getItem('userName');
      const email = localStorage.getItem('userEmail');

      if (!token) {
        navigate('/auth');
        return;
      }
      
      // Check if user has employee role (primary or secondary)
      const storedSecondaryRoles = localStorage.getItem('secondaryRoles');
      const secondaryRoles = storedSecondaryRoles ? JSON.parse(storedSecondaryRoles) : [];
      const hasEmployeeRole = role === 'employee' || secondaryRoles.includes('employee');
      
      
      
      if (!hasEmployeeRole) {
        navigate('/auth');
        return;
      }
      setUser({ name: name || 'Employee', email: email || '' });
      setSecondaryRoles(secondaryRoles);
    };

    init();
    // Add small delay to ensure component is mounted before fetching data
    setTimeout(() => {
      fetchUserData(); // Fetch updated user data including secondary roles
    }, 100);

    // Stop live time updates to keep dashboard static
    return () => {};
  }, [navigate]);

  // Load applications when Applications section is active
  useEffect(() => {
    if (activeSection === 'applications') {
      loadApplications();
    }
  }, [activeSection, applicationFilters]);

  // Load company data automatically when user data is loaded
  useEffect(() => {
    // Auto-fetch company data if user has companyId and company data not yet loaded
    if (user.email && !companyData) {
      fetchUserData();
    }
  }, [user.email]);

  // Load company data when Company section is active (fallback)
  useEffect(() => {
    if (activeSection === 'company' && !companyData && user.email) {
      // Re-fetch user data to get companyId if not already loaded
      fetchUserData();
    }
  }, [activeSection, user.email]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    localStorage.removeItem('secondaryRoles');
    navigate('/auth');
  };

  const handleRoleSwitch = (role) => {
    if (role === 'mentor') {
      navigate('/mentor-dashboard');
    }
    // Add other role switches as needed
  };

  // Fetch user data to get updated secondary roles and company information
  const fetchUserData = async () => {
    try {
      const response = await authApi.getMe();
      const data = response.data;
      if (data.success) {
        // Update secondary roles from server response
        if (data.data.user.secondaryRoles && data.data.user.secondaryRoles.length > 0) {
          setSecondaryRoles(data.data.user.secondaryRoles);
          localStorage.setItem('secondaryRoles', JSON.stringify(data.data.user.secondaryRoles));
        }
        const u = data.data.user || {};
        setUser({ name: u.name || 'Employee', email: u.email || '' });
        // Prefer explicit employee profile phone, fallback to general profile.phone
        setPhoneNumber((u.profile && u.profile.phone) || '');
        // Company name best-effort: employer/company account's name or cached
        const cachedCompany = localStorage.getItem('companyName');
        setCompanyName(u.company?.name || cachedCompany || 'Linked Company');
        if (u.company?.name) localStorage.setItem('companyName', u.company.name);
        
        // Automatically fetch company details if employee has companyId
        if (u.employeeProfile?.companyId) {
          console.log('Auto-fetching company data for companyId:', u.employeeProfile.companyId);
          fetchCompanyData(u.employeeProfile.companyId);
        } else {
          console.log('No companyId found in employee profile');
          // Clear company data if no companyId is assigned
          setCompanyData(null);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Clear company data on error
      setCompanyData(null);
    }
  };

  // Fetch company data for employee
  const fetchCompanyData = async (companyId) => {
    if (!companyId) {
      console.log('No companyId provided, clearing company data');
      setCompanyData(null);
      return;
    }
    
    console.log('Fetching company data for ID:', companyId);
    setLoadingCompany(true);
    
    try {
      const response = await jobseekerApi.getEmployeeCompany(companyId);
      const data = response.data;
      
      if (data.success && data.data?.company) {
        console.log('Company data fetched successfully:', data.data.company);
        setCompanyData(data.data.company);
        // Cache company data
        localStorage.setItem('cachedCompanyData', JSON.stringify(data.data.company));
      } else {
        console.warn('Failed to fetch company data:', data.message || 'No company data returned');
        // Try to load cached data as fallback
        const cachedData = localStorage.getItem('cachedCompanyData');
        if (cachedData) {
          console.log('Using cached company data');
          setCompanyData(JSON.parse(cachedData));
        } else {
          setCompanyData(null);
        }
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
      // Try to load cached data as fallback
      const cachedData = localStorage.getItem('cachedCompanyData');
      if (cachedData) {
        console.log('Using cached company data due to error');
        setCompanyData(JSON.parse(cachedData));
      } else {
        setCompanyData(null);
      }
    } finally {
      setLoadingCompany(false);
    }
  };

  // Load applications from employer API (employee allowed by backend)
  const loadApplications = async () => {
    setLoadingApplications(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setLoadingApplications(false);
        return;
      }
      const response = await employerApi.getDetailedApplications(applicationFilters);
      if (response.success && response.data) {
        const payload = response.data.success ? response.data.data : response.data;
        const applicationsArray = Array.isArray(payload?.applications) ? payload.applications : (Array.isArray(payload) ? payload : []);
        setApplications(applicationsArray);
      } else {
        setError(`Failed to load applications: ${response.data?.message || response.message || 'No data received'}`);
        setApplications([]);
      }
    } catch (e) {
      setError(`Error loading applications: ${e.message || 'Network error'}`);
      setApplications([]);
    } finally {
      setLoadingApplications(false);
    }
  };

  const formatTime = (date) =>
    date.toLocaleString('en-US', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  // Mocked computed profile completion for visual ring (replace with real value when backend wired)
  const profileCompletion = 72;
  const ringStyle = useMemo(() => ({
    backgroundImage: `conic-gradient(#0ea5e9 ${profileCompletion}%, #e5e7eb 0)`
  }), [profileCompletion]);

  const menu = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'customization-tasks', label: 'Customization Tasks', icon: Rocket },
    { id: 'applications', label: 'Applications', icon: Briefcase },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'company', label: 'Company', icon: Building },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Preferences', icon: Settings },
  ];

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm ring-1 ring-blue-200">
          <Home className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-[11px] text-gray-500">SkillSyncer</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">Employee</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Approved</span>
          </div>
        </div>
      </div>
      <div className="px-4"><div className="h-px w-full bg-gray-200" /></div>
      <nav className="mt-4 px-2 space-y-1">
        {menu.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
              className={`group w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition
                ${isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
              `}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-700'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive ? (
                <span className="text-[10px] uppercase tracking-wider text-blue-600">Active</span>
              ) : (
                <ChevronRight className="h-4 w-4 opacity-50" />
              )}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto p-3">
        <div className="rounded-2xl bg-white border border-gray-200 p-3">
          <p className="text-[11px] text-gray-500">Signed in as</p>
          <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 text-white px-3 py-2 text-sm font-medium hover:bg-black"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    </div>
  );

  const TopBar = () => (
    <div className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5 text-gray-700" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-900 text-white">Employee</span>
            </div>
            <p className="text-xs text-gray-500">{formatTime(currentTime)}</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              placeholder="Search..."
              className="bg-transparent outline-none text-sm text-gray-700 w-48"
            />
          </div>
          
          {/* Role Switcher */}
          {secondaryRoles.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-600 text-xs font-medium">Current Role</p>
                  <p className="text-gray-900 text-sm font-semibold">Employee</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs">Switch to:</span>
                  {secondaryRoles.map((role) => (
                    <button
                      key={role}
                      onClick={() => handleRoleSwitch(role)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-gray-700 text-xs font-medium hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 border border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-md"
                    >
                      {role === 'mentor' && <User className="h-3.5 w-3.5" />}
                      {role === 'employee' && <Briefcase className="h-3.5 w-3.5" />}
                      {role.charAt(0).toUpperCase() + role.slice(1)} Dashboard
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <button className="relative p-2 rounded-lg hover:bg-gray-100" title="Notifications">
            <Bell className="h-5 w-5 text-gray-700" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm hover:bg-black"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    </div>
  );

  const Overview = () => {
    // Mock data for demonstration - replace with actual API data
    const stats = [
      { label: 'Active Projects', value: '3', change: '+1', trend: 'up', icon: Target },
      { label: 'Tasks Completed', value: '12', change: '+4', trend: 'up', icon: CheckCircle },
      { label: 'Pending Tasks', value: '5', change: '-2', trend: 'down', icon: Clock },
      { label: 'Upcoming Meetings', value: '2', change: '0', trend: 'neutral', icon: Calendar }
    ];
    
    const quickActions = [
      { title: 'Update Profile', desc: 'Keep your information current', icon: User, action: () => setActiveSection('profile'), color: 'from-blue-500 to-blue-600' },
      { title: 'View Company Info', desc: 'See your organization details', icon: Building, action: () => setActiveSection('company'), color: 'from-green-500 to-green-600' },
      { title: 'Check Applications', desc: 'Review your submissions', icon: Briefcase, action: () => setActiveSection('applications'), color: 'from-purple-500 to-purple-600' },
      { title: 'Security Settings', desc: 'Manage your account safety', icon: Shield, action: () => setActiveSection('security'), color: 'from-amber-500 to-amber-600' }
    ];
    
    return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 sm:p-8 text-white shadow-lg">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Welcome Back</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 17 ? 'Afternoon' : 'Evening'}, {user.name.split(' ')[0] || 'Employee'}!
                </h1>
                <p className="text-blue-100 max-w-2xl mb-4">
                  Ready to advance your career today? Track your progress, manage tasks, and stay connected with your team.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => setActiveSection('profile')}
                    className="inline-flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-all shadow-sm"
                  >
                    <User className="h-4 w-4" /> Update Profile
                  </button>
                  <button 
                    onClick={() => setActiveSection('company')}
                    className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all border border-white/30"
                  >
                    <Building className="h-4 w-4" /> Company Info
                  </button>
                </div>
              </div>
              
              <div className="lg:w-80">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Profile Completion</span>
                    <span className="text-lg font-bold">{profileCompletion}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-white h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${profileCompletion}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-blue-100 mt-2">{profileCompletion >= 80 ? 'Great job! Your profile is complete.' : 'Complete your profile to unlock more features.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                {stat.change !== '0' && (
                  <div className={`flex items-center mt-3 text-sm ${stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                    <span>{stat.trend === 'up' ? '↗' : stat.trend === 'down' ? '↘' : '→'}</span>
                    <span className="ml-1">{stat.change} from last week</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Content Panels */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Activity className="h-5 w-5 text-gray-700" /> Recent Activity</h3>
              <button className="text-sm text-gray-600 hover:text-gray-900">View all</button>
            </div>
            <div className="space-y-3">
              {[{t:'Account verified by admin',i:BadgeCheck,c:'text-blue-600 bg-blue-50'}, {t:'Password changed',i:Shield,c:'text-emerald-600 bg-emerald-50'}, {t:'Profile updated',i:User,c:'text-purple-600 bg-purple-50'}, {t:'Joined company workspace',i:Building,c:'text-amber-600 bg-amber-50'}].map((item, i) => {
                const Icon = item.i;
                return (
                  <div key={i} className="flex items-center justify-between rounded-xl border p-4 hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg ${item.c.split(' ')[1]} flex items-center justify-center`}>
                        <Icon className={`h-4 w-4 ${item.c.split(' ')[0]}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.t}</p>
                        <p className="text-xs text-gray-500">Just now</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-gray-700" /> Security Tips
            </h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5" /> Change your password after the first login.</li>
              <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5" /> Enable email alerts for suspicious activity.</li>
              <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5" /> Keep your profile details up to date.</li>
            </ul>
            <button onClick={() => setActiveSection('security')} className="mt-4 inline-flex items-center gap-2 text-sm text-gray-900 font-medium hover:underline">
              Review security settings <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button 
                key={index}
                onClick={action.action}
                className="group text-left"
              >
                <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${action.color} p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{action.title}</h3>
                      <p className="text-white/80 text-sm">{action.desc}</p>
                    </div>
                    <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <span className="text-xs text-white/70 flex items-center">
                      Click to access <ArrowRight className="h-3 w-3 ml-1" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const Profile = () => {
    const [profileData, setProfileData] = useState({
      name: user.name,
      phone: phoneNumber,
      position: '',
      department: '',
      employeeId: ''
    });
    
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileError, setProfileError] = useState('');
    
    useEffect(() => {
      setProfileData(prev => ({
        ...prev,
        name: user.name,
        phone: phoneNumber
      }));
    }, [user.name, phoneNumber]);
    
    const handleSaveProfile = async () => {
      try {
        setSavingProfile(true);
        setProfileError('');
        
        const res = await jobseekerApi.updateEmployeeProfile(profileData);
        
        if (res.success) {
          setUser(prev => ({ ...prev, name: profileData.name }));
          setPhoneNumber(profileData.phone);
          // Refresh user data to get updated information
          fetchUserData();
        } else {
          setProfileError(res.data?.message || 'Failed to save profile');
        }
      } catch (e) {
        setProfileError(e.message || 'Network error');
      } finally {
        setSavingProfile(false);
      }
    };
    
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
          <p className="text-sm text-gray-500 mb-4">Keep your personal details accurate and up to date.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Full Name *</label>
              <input 
                className="w-full rounded-lg border px-3 py-2 text-sm" 
                value={profileData.name} 
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input 
                className="w-full rounded-lg border px-3 py-2 text-sm bg-gray-50" 
                value={user.email} 
                disabled 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Phone Number</label>
              <input 
                className="w-full rounded-lg border px-3 py-2 text-sm" 
                value={profileData.phone}
                onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter your phone number"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Company</label>
              <input 
                className="w-full rounded-lg border px-3 py-2 text-sm bg-gray-50" 
                value={companyName} 
                disabled 
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3 items-center">
            <button
              disabled={savingProfile}
              onClick={handleSaveProfile}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
            <button 
              className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
              onClick={() => setProfileData({
                name: user.name,
                phone: phoneNumber,
                position: '',
                department: '',
                employeeId: ''
              })}
            >
              Cancel
            </button>
            {profileError && <span className="text-sm text-rose-600">{profileError}</span>}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900">Work Information</h3>
          <p className="text-sm text-gray-500 mb-4">Your company-related details.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Position</label>
              <input 
                className="w-full rounded-lg border px-3 py-2 text-sm" 
                value={profileData.position}
                onChange={(e) => setProfileData(prev => ({ ...prev, position: e.target.value }))}
                placeholder="Your position"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Department</label>
              <input 
                className="w-full rounded-lg border px-3 py-2 text-sm" 
                value={profileData.department}
                onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                placeholder="Your department"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Employee ID</label>
              <input 
                className="w-full rounded-lg border px-3 py-2 text-sm" 
                value={profileData.employeeId}
                onChange={(e) => setProfileData(prev => ({ ...prev, employeeId: e.target.value }))}
                placeholder="Your employee ID"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3 items-center">
            <button
              disabled={savingProfile}
              onClick={handleSaveProfile}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save Work Info'}
            </button>
            {profileError && <span className="text-sm text-rose-600">{profileError}</span>}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900">Preferences</h3>
          <p className="text-sm text-gray-500 mb-4">Customize your dashboard experience.</p>
          <div className="space-y-3 text-sm text-gray-700">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4" defaultChecked /> 
              Show tips and guidance on dashboard
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4" /> 
              Enable compact layout on small screens
            </label>
          </div>
        </div>
      </div>
    );
  };

  const Company = () => {
    // Auto-fetch company data when component mounts and no data exists
    useEffect(() => {
      if (!companyData && !loadingCompany && user.email) {
        console.log('Auto-fetching company data in Company component');
        fetchUserData();
      }
    }, [user.email]);
    
    if (loadingCompany) {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading company information...</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    if (!companyData) {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
            <div className="text-center py-12">
              <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">No company information available</p>
              <p className="text-gray-500 text-sm mt-2">
                Your company details will appear here once linked to your account.
              </p>
              <button 
                onClick={() => fetchUserData()}
                className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
              <p className="text-sm text-gray-500">Your linked company details</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Basic Info */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Company Details</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Company Name</span>
                    <span className="text-sm font-medium text-gray-900">{companyData.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Industry</span>
                    <span className="text-sm font-medium text-gray-900">
                      {companyData.industry || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Email</span>
                    <span className="text-sm font-medium text-gray-900">{companyData.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Phone</span>
                    <span className="text-sm font-medium text-gray-900">{companyData.company?.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Location</span>
                    <span className="text-sm font-medium text-gray-900">{companyData.company?.location || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Additional Company Info */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Online Presence</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600 block mb-1">Website</span>
                    {companyData.company?.website ? (
                      <a 
                        href={companyData.company.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {companyData.company.website}
                      </a>
                    ) : (
                      <span className="text-sm text-gray-500">Not provided</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Security = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900">Password</h3>
        <p className="text-sm text-gray-500 mb-4">Change your password regularly to keep your account secure.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input type="password" className="rounded-lg border px-3 py-2 text-sm" placeholder="Current password" />
          <input type="password" className="rounded-lg border px-3 py-2 text-sm" placeholder="New password" />
          <input type="password" className="rounded-lg border px-3 py-2 text-sm" placeholder="Confirm new password" />
        </div>
        <button className="mt-4 inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm hover:bg-black">Update Password</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900">Security Controls</h3>
        <div className="mt-3 space-y-3 text-sm text-gray-700">
          <label className="flex items-center gap-3"><input type="checkbox" className="h-4 w-4" defaultChecked /> Email me about new device logins</label>
          <label className="flex items-center gap-3"><input type="checkbox" className="h-4 w-4" /> Email me about password changes</label>
        </div>
      </div>
    </div>
  );

  const NotificationsPanel = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
        <p className="text-sm text-gray-500 mb-4">Control how you receive updates and alerts.</p>
        <div className="space-y-3 text-sm text-gray-700">
          <label className="flex items-center justify-between gap-3"><span>Email notifications</span><input type="checkbox" className="h-4 w-4" defaultChecked /></label>
          <label className="flex items-center justify-between gap-3"><span>Security alerts</span><input type="checkbox" className="h-4 w-4" defaultChecked /></label>
          <label className="flex items-center justify-between gap-3"><span>Product updates</span><input type="checkbox" className="h-4 w-4" /></label>
        </div>
      </div>
    </div>
  );

  const CustomizationTasks = () => {
    useEffect(() => { fetchCustomizationTasks(); }, []);

    const fetchCustomizationTasks = async () => {
      try {
        setLoadingCustomizationTasks(true);
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5003/api/employee/customization-requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          setCustomizationTasks(data.data.requests || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCustomizationTasks(false);
      }
    };

    const handleUpdateStatus = async (id, status) => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5003/api/employee/customization-requests/${id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
        });
        const data = await response.json();
        if (data.success) {
          fetchCustomizationTasks();
        } else {
          alert(data.message || 'Error updating status');
        }
      } catch (err) {
        console.error(err);
        alert('Network error updating status');
      }
    };

    return (
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Rocket className="h-5 w-5 text-gray-700" /> Customization Tasks</h3>
        </div>
        {loadingCustomizationTasks ? (
          <div className="text-sm text-gray-600">Loading tasks...</div>
        ) : customizationTasks.length === 0 ? (
          <div className="text-sm text-gray-600">No customization tasks assigned to you right now.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {customizationTasks.map((task) => (
              <div key={task._id} className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-lg text-gray-900">{task.projectTemplateId?.title || 'Unknown Project'}</h4>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      task.status === 'completed' ? 'bg-green-100 text-green-700' :
                      task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {task.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Student: {task.studentId?.name || 'Unknown'}</p>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 mb-4 h-24 overflow-y-auto">
                    {task.customizationDetails}
                  </div>
                </div>
                <div className="flex gap-2">
                  {task.status !== 'completed' && (
                    <button onClick={() => handleUpdateStatus(task._id, 'completed')} className="flex-1 bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-green-700 transition">Mark Completed</button>
                  )}
                  {task.status === 'pending' && (
                    <button onClick={() => handleUpdateStatus(task._id, 'in-progress')} className="flex-1 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-700 transition">Start Working</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Layout */}
      <div className="flex min-h-screen">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside
            className="fixed z-50 inset-y-0 left-0 w-72 bg-white text-gray-900 border-r border-gray-200 p-2 rounded-r-2xl shadow-2xl lg:hidden"
          >
            <div className="flex items-center justify-between p-2">
              <span className="text-sm font-medium text-gray-700">Navigation</span>
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar />
          </aside>
        )}

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:w-72 bg-white text-gray-900 border-r border-gray-200 p-2">
          <Sidebar />
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="px-4 sm:px-6 lg:px-8 py-6">
            {activeSection === 'overview' && <Overview />}
            {activeSection === 'applications' && (
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Briefcase className="h-5 w-5 text-gray-700" /> Applications</h3>
                  <div className="flex items-center gap-2">
                    <select
                      className="border rounded-lg px-2 py-1 text-sm"
                      value={applicationFilters.status}
                      onChange={(e) => setApplicationFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="rejected">Rejected</option>
                      <option value="accepted">Accepted</option>
                    </select>
                  </div>
                </div>
                {error && (
                  <div className="mb-3 rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">{error}</div>
                )}
                {loadingApplications ? (
                  <div className="text-sm text-gray-600">Loading applications...</div>
                ) : applications.length === 0 ? (
                  <div className="text-sm text-gray-600">No applications found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-gray-700">
                          <th className="py-2 pl-3 pr-4 w-16">Sl. No</th>
                          <th className="py-2 pr-4">Candidate</th>
                          <th className="py-2 pr-4">Email</th>
                          <th className="py-2 pr-4">Internship</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 pr-4">Applied</th>
                          <th className="py-2 pr-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {applications.map((app, idx) => (
                          <tr key={app._id}>
                            <td className="py-2 pl-3 pr-4">{idx + 1}</td>
                            <td className="py-2 pr-4">{app.jobseeker?.name || app.jobseekerId?.name || 'N/A'}</td>
                            <td className="py-2 pr-4">{app.jobseeker?.email || app.jobseekerId?.email || 'N/A'}</td>
                            <td className="py-2 pr-4">{app.internship?.title || app.internshipId?.title || 'N/A'}</td>
                            <td className="py-2 pr-4">
                              {(() => {
                                const s = (app.status || '').toLowerCase();
                                const cls = s === 'shortlisted'
                                  ? 'bg-emerald-700 text-white border-emerald-700'
                                  : s === 'rejected'
                                  ? 'bg-rose-700 text-white border-rose-700'
                                  : 'bg-gray-700 text-white border-gray-700';
                                return (
                                  <span className={`px-2 py-0.5 rounded text-xs border ${cls}`}>{app.status}</span>
                                );
                              })()}
                            </td>
                            <td className="py-2 pr-4">{new Date(app.appliedAt || app.createdAt).toLocaleDateString()}</td>
                            <td className="py-2 pr-4">
                              <button
                                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                onClick={async () => {
                                  try {
                                    const res = await employerApi.getApplicationDetails(app._id);
                                    const payload = res.success && res.data?.success ? res.data.data : res.data;
                                    setSelectedApplication(payload || app);
                                  } catch {
                                    setSelectedApplication(app);
                                  } finally {
                                    setShowApplicationModal(true);
                                  }
                                }}
                              >
                                <Eye className="h-4 w-4" /> View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Details Modal */}
                {showApplicationModal && selectedApplication && (
                  <div
                    className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
                  >
                    <div
                      className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border p-6"
                    >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-semibold text-gray-900">Application Details</h4>
                          <button className="rounded-lg p-2 hover:bg-gray-100" onClick={() => setShowApplicationModal(false)}>
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="space-y-3 text-sm text-gray-700">
                          <p><strong>Candidate:</strong> {(selectedApplication.jobseeker?.name || selectedApplication.jobseekerId?.name) || 'N/A'} ({selectedApplication.jobseeker?.email || selectedApplication.jobseekerId?.email || 'N/A'})</p>
                          <p><strong>Internship:</strong> {(selectedApplication.internship?.title || selectedApplication.internshipId?.title) || 'N/A'} — {(selectedApplication.internship?.companyName || selectedApplication.internshipId?.companyName) || 'N/A'}</p>
                          <p>
                            <strong>Status:</strong>{' '}
                            {(() => {
                              const s = (selectedApplication.status || '').toLowerCase();
                              const cls = s === 'shortlisted'
                                ? 'bg-emerald-700 text-white border-emerald-700'
                                : s === 'rejected'
                                ? 'bg-rose-700 text-white border-rose-700'
                                : 'bg-gray-700 text-white border-gray-700';
                              return (
                                <span className={`ml-1 px-2 py-0.5 rounded text-xs border align-middle ${cls}`}>{selectedApplication.status}</span>
                              );
                            })()}
                          </p>
                          {selectedApplication.employerNotes && (
                            <p><strong>Employer Notes:</strong> {selectedApplication.employerNotes}</p>
                          )}
                          {(selectedApplication.additionalInfo?.resumeUrl || selectedApplication.resumeUrl) && (
                            <p><a className="text-blue-600 hover:underline" target="_blank" rel="noreferrer" href={selectedApplication.additionalInfo?.resumeUrl || selectedApplication.resumeUrl}>View Resume</a></p>
                          )}
                        </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeSection === 'customization-tasks' && <CustomizationTasks />}
            {activeSection === 'profile' && <Profile />}
            {activeSection === 'company' && <Company />}
            {activeSection === 'security' && <Security />}
            {activeSection === 'notifications' && <NotificationsPanel />}
            {activeSection === 'settings' && (
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900">Preferences</h3>
                <p className="text-sm text-gray-500">Adjust your experience and appearance.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;