const express = require('express'); // Force restart timestamp: 5
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables first
dotenv.config();

// Prefer IPv4 to avoid IPv6 connectivity issues with MongoDB SRV
try {
  const dns = require('dns');
  if (dns && typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
    console.log('🌐 DNS resolution order set to ipv4first');
  }
} catch (e) {
  console.log('🌐 DNS default order not set:', e.message);
}

console.log('🔄 Starting SkillSyncer Server...');

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200
};

// Basic middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint (before database connection)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SkillSyncer API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Gemini startup probe
(async () => {
  try {
    const { healthCheck } = require('./utils/gemini');
    const result = await healthCheck();
    if (result.ok) {
      console.log('✅ Gemini API configured successfully.', result.sample);
    } else {
      console.warn('⚠️ Gemini API health check failed:', result.error || 'Unknown error');
    }
  } catch (e) {
    console.warn('⚠️ Gemini health check not executed:', e.message);
  }
})();

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('URI:', process.env.MONGODB_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Modern driver options (remove deprecated flags)
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4, // force IPv4 for connections
      // tls/ssl is automatically used for SRV URIs on Atlas; no need to set explicitly
    });

    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🌐 Host: ${conn.connection.host}`);

    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // Don't exit, allow server to run without database for testing
    return false;
  }
};

// Initialize database connection
connectDB();

// Initialize scheduler for mentor assignments
try {
  const { initializeScheduler } = require('./utils/scheduler');
  initializeScheduler();
} catch (error) {
  console.error('❌ Error initializing scheduler:', error.message);
}

// Import routes after ensuring modules are loaded
let authRoutes, jobseekerRoutes, adminRoutes, adminProjectRoutes, employerRoutes, companiesRoutes, mentorRoutes, mentorInternshipsProjectsRoutes, mentorAssignmentRoutes, mentorReassignRoutes, mentorCleanupRoutes, mentorFixRoutes, testsRoutes, internshipApplicationsRoutes, jobseekerStatusRoutes, chatRoutes, employeeRoutes, projectRoutes;

try {
  authRoutes = require('./routes/auth');
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
}

try {
  jobseekerRoutes = require('./routes/jobseeker');
  console.log('✅ Jobseeker routes loaded');
} catch (error) {
  console.error('❌ Error loading jobseeker routes:', error.message);
}

try {
  adminRoutes = require('./routes/admin');
  console.log('✅ Admin routes loaded');
} catch (error) {
  console.error('❌ Error loading admin routes:', error.message);
}

try {
  employerRoutes = require('./routes/employer');
  console.log('✅ Employer routes loaded');
} catch (error) {
  console.error('❌ Error loading employer routes:', error.message);
}

try {
  testsRoutes = require('./routes/tests');
  console.log('✅ Tests routes loaded');
} catch (error) {
  console.error('❌ Error loading tests routes:', error.message);
}

try {
  internshipApplicationsRoutes = require('./routes/internshipapplications');
  console.log('✅ InternshipApplications routes loaded');
} catch (error) {
  console.error('❌ Error loading internshipapplications routes:', error.message);
}

try {
  jobseekerStatusRoutes = require('./routes/jobseeker_status');
  console.log('✅ Jobseeker status routes loaded');
} catch (error) {
  console.error('❌ Error loading jobseeker status routes:', error.message);
}

try {
  companiesRoutes = require('./routes/companies');
  console.log('✅ Companies routes loaded');
} catch (error) {
  console.error('❌ Error loading companies routes:', error.message);
}

try {
  mentorRoutes = require('./routes/mentor');
  console.log('✅ Mentor routes loaded');
} catch (error) {
  console.error('❌ Error loading mentor routes:', error.message);
}

try {
  mentorInternshipsProjectsRoutes = require('./routes/mentor-internships-projects');
  console.log('✅ Mentor internships/projects routes loaded');
} catch (error) {
  console.error('❌ Error loading mentor internships/projects routes:', error.message);
}

try {
  mentorAssignmentRoutes = require('./routes/mentorAssignment');
  console.log('✅ Mentor assignment routes loaded');
} catch (error) {
  console.error('❌ Error loading mentor assignment routes:', error.message);
}

try {
  mentorReassignRoutes = require('./routes/mentor-reassign');
  console.log('✅ Mentor reassign routes loaded');
} catch (error) {
  console.error('❌ Error loading mentor reassign routes:', error.message);
}

try {
  mentorCleanupRoutes = require('./routes/mentor-cleanup');
  console.log('✅ Mentor cleanup routes loaded');
} catch (error) {
  console.error('❌ Error loading mentor cleanup routes:', error.message);
}

try {
  mentorFixRoutes = require('./routes/mentor-fix');
  console.log('✅ Mentor fix routes loaded');
} catch (error) {
  console.error('❌ Error loading mentor fix routes:', error.message);
}

try {
  chatRoutes = require('./routes/chat');
  console.log('✅ Chat routes loaded');
} catch (error) {
  console.error('❌ Error loading chat routes:', error.message);
}

try {
  employeeRoutes = require('./routes/employee');
  console.log('✅ Employee routes loaded');
} catch (error) {
  console.error('❌ Error loading employee routes:', error.message);
}

let adminProjectRoutes2;
try {
  adminProjectRoutes = require('./routes/adminProjects');
  console.log('✅ Admin project routes loaded');
} catch (error) {
  console.error('❌ Error loading admin project routes:', error.message);
}

let studentProjectRoutes;
try {
  studentProjectRoutes = require('./routes/studentProjects');
  console.log('✅ Student project routes loaded');
} catch (error) {
  console.error('❌ Error loading student project routes:', error.message);
}

let emailTestRoutes;
try {
  emailTestRoutes = require('./routes/emailTest');
  console.log('✅ Email test routes loaded');
} catch (error) {
  console.error('❌ Error loading email test routes:', error.message);
}

try {
  projectRoutes = require('./routes/projects');
  console.log('✅ Projects routes loaded');
} catch (error) {
  console.error('❌ Error loading projects routes:', error.message);
}

// Routes
if (authRoutes) {
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes registered');
} else {
  console.log('⚠️  Auth routes not available');
}

if (jobseekerRoutes) {
  app.use('/api/jobseeker', jobseekerRoutes);
  console.log('✅ Jobseeker routes registered');
} else {
  console.log('⚠️  Jobseeker routes not available');
}

if (adminRoutes) {
  app.use('/api/admin', adminRoutes);
  console.log('✅ Admin routes registered');
} else {
  console.log('⚠️  Admin routes not available');
}

if (adminProjectRoutes) {
  app.use('/api/admin', adminProjectRoutes);
  console.log('✅ Admin project routes registered');
} else {
  console.log('⚠️  Admin project routes not available');
}

if (studentProjectRoutes) {
  app.use('/api/student', studentProjectRoutes);
  console.log('✅ Student project routes registered');
} else {
  console.log('⚠️  Student project routes not available');
}

if (employerRoutes) {
  app.use('/api/employer', employerRoutes);
  console.log('✅ Employer routes registered');
} else {
  console.log('⚠️  Employer routes not available');
}

if (testsRoutes) {
  app.use('/api/tests', testsRoutes);
  console.log('✅ Tests routes registered');
} else {
  console.log('⚠️  Tests routes not available');
}

if (internshipApplicationsRoutes) {
  app.use('/api/internshipapplications', internshipApplicationsRoutes);
  console.log('✅ InternshipApplications routes registered');
} else {
  console.log('⚠️  InternshipApplications routes not available');
}

if (jobseekerStatusRoutes) {
  app.use('/api/jobseekers', jobseekerStatusRoutes);
  console.log('✅ Jobseeker status routes registered');
} else {
  console.log('⚠️  Jobseeker status routes not available');
}

if (companiesRoutes) {
  app.use('/api/companies', companiesRoutes);
  app.use('/api/employee-requests', companiesRoutes);
  console.log('✅ Companies routes registered');
} else {
  console.log('⚠️  Companies routes not available');
}

if (mentorRoutes) {
  app.use('/api/mentor', mentorRoutes);
  console.log('✅ Mentor routes registered');
} else {
  console.log('⚠️  Mentor routes not available');
}

if (mentorInternshipsProjectsRoutes) {
  app.use('/api/mentor/internships-projects', mentorInternshipsProjectsRoutes);
  console.log('✅ Mentor internships/projects routes registered');
} else {
  console.log('⚠️  Mentor internships/projects routes not available');
}

if (mentorAssignmentRoutes) {
  app.use('/api/mentor-assignment', mentorAssignmentRoutes);
  console.log('✅ Mentor assignment routes registered');
} else {
  console.log('⚠️  Mentor assignment routes not available');
}

if (mentorReassignRoutes) {
  app.use('/api/mentor-reassign', mentorReassignRoutes);
  console.log('✅ Mentor reassign routes registered');
} else {
  console.log('⚠️  Mentor reassign routes not available');
}

if (mentorCleanupRoutes) {
  app.use('/api/mentor-cleanup', mentorCleanupRoutes);
  console.log('✅ Mentor cleanup routes registered');
} else {
  console.log('⚠️  Mentor cleanup routes not available');
}

if (mentorFixRoutes) {
  app.use('/api/mentor-fix', mentorFixRoutes);
  console.log('✅ Mentor fix routes registered');
} else {
  console.log('⚠️  Mentor fix routes not available');
}

if (chatRoutes) {
  app.use('/api/chat', chatRoutes);
  console.log('✅ Chat routes registered');
} else {
  console.log('⚠️  Chat routes not available');
}

if (employeeRoutes) {
  app.use('/api/employee', employeeRoutes);
  console.log('✅ Employee routes registered');
} else {
  console.log('⚠️  Employee routes not available');
}

if (emailTestRoutes) {
  app.use('/api/email', emailTestRoutes);
  console.log('✅ Email test routes registered');
} else {
  console.log('⚠️  Email test routes not available');
}

if (projectRoutes) {
  app.use('/api/projects', projectRoutes);
  console.log('✅ Projects routes registered');
} else {
  console.log('⚠️  Projects routes not available');
}

// Short-path alias routes for student API (without /student/ prefix)
if (studentProjectRoutes) {
  // POST /api/customization-request → same handler as /api/student/customization-requests
  app.post('/api/customization-request', (req, res, next) => {
    req.url = '/customization-requests';
    studentProjectRoutes(req, res, next);
  });
  // POST /api/project-idea → same handler as /api/student/project-ideas
  app.post('/api/project-idea', (req, res, next) => {
    req.url = '/project-ideas';
    studentProjectRoutes(req, res, next);
  });
  // GET /api/student/project-ideas alias
  console.log('✅ Short-path alias routes registered (/api/customization-request, /api/project-idea)');
}

// Test route that doesn't require auth
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString(),
    routes: {
      auth: !!authRoutes,
      jobseeker: !!jobseekerRoutes,
      admin: !!adminRoutes,
      employer: !!employerRoutes,
      employee: !!employeeRoutes
    }
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method,
    availableRoutes: ['/api/health', '/api/test', '/api/auth/*', '/api/jobseeker/*', '/api/admin/*', '/api/employer/*', '/api/mentor/*', '/api/employee/*']
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method
  });

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5003; // Use different port to avoid conflict

const server = app.listen(PORT, () => {
  console.log('');
  console.log('🚀 Susu`s SkillSyncer Server is running!');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
  console.log('');
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  console.log('🔄 Shutting down server due to unhandled promise rejection...');
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;