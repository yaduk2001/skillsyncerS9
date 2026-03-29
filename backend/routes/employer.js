const express = require('express');
const router = express.Router();
const InternshipPosting = require('../models/InternshipPosting');
const User = require('../models/User');
const EmployeeRequest = require('../models/EmployeeRequest');
const { protect } = require('../middleware/auth');
const {
  sendShortlistEmail,
  sendRejectionEmail,
  sendEmployeeCredentials,
  sendRequestRejectionEmail
} = require('../utils/emailService');

// Test route without auth to check if the issue is with auth middleware
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Employer routes are working'
  });
});

// Get employees for the logged-in company/employer
router.get('/employees', protect, async (req, res) => {
  try {
    if (req.user.role !== 'employer' && req.user.role !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only employers can access this resource.'
      });
    }

    // Employees have employeeProfile.companyId referencing the company user id
    const employees = await User.find({
      role: 'employee',
      'employeeProfile.companyId': req.user._id
    })
      .select('name email isActive createdAt employeeProfile.position employeeProfile.department lastLogin')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('Error fetching employees for employer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching employees'
    });
  }
});

// @desc    Get employee requests for the company
// @route   GET /api/employer/employee-requests
// @access  Private (Employer/Company only)
router.get('/employee-requests', protect, async (req, res) => {
  try {
    if (req.user.role !== 'employer' && req.user.role !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only employers can access this resource.'
      });
    }

    const { status, page = 1, limit = 10 } = req.query;

    // Build filter object - ONLY for this company
    const filter = { companyId: req.user._id };
    if (status) filter.status = status;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch employee requests with pagination
    const requests = await EmployeeRequest.find(filter)
      // .populate('companyId', 'name email') // Company is self, but for completeness or if expanded
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalRequests = await EmployeeRequest.countDocuments(filter);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRequests / limit),
          totalRequests,
          hasNext: page * limit < totalRequests,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching employee requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employee requests',
      error: error.message
    });
  }
});

// @desc    Update employee request status (Approve/Reject)
// @route   PATCH /api/employer/employee-requests/:requestId/status
// @access  Private (Employer/Company only)
router.patch('/employee-requests/:requestId/status', protect, async (req, res) => {
  try {
    if (req.user.role !== 'employer' && req.user.role !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only employers can perform this action.'
      });
    }

    const { requestId } = req.params;
    const { status, adminNotes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either approved or rejected'
      });
    }

    // Find the request and ensure it belongs to this company
    const existingRequest = await EmployeeRequest.findOne({
      _id: requestId,
      companyId: req.user._id
    });

    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Employee request not found or does not belong to your company'
      });
    }

    const request = await EmployeeRequest.findByIdAndUpdate(
      requestId,
      {
        status,
        adminNotes: adminNotes || '',
        reviewedBy: req.user._id,
        reviewedAt: new Date()
      },
      { new: true }
    ).populate('companyId', 'name email');

    // If approved, create employee user account
    if (status === 'approved') {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: request.email });

        if (!existingUser) {
          // Generate password: first 3 letters of name + first 3 letters of company + 4 random digits
          const generateEmployeePassword = (name, companyName) => {
            const namePart = (name || '').replace(/\s+/g, '').substring(0, 3).toLowerCase();
            const companyPart = (companyName || '').replace(/\s+/g, '').substring(0, 3).toLowerCase();
            const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
            return `${namePart}${companyPart}${randomDigits}`;
          };

          const companyName = request.companyId?.name || (req.user.company?.name || req.user.name);
          const autoGeneratedPassword = generateEmployeePassword(request.fullName, companyName);

          // Create employee user
          await User.create({
            name: request.fullName,
            email: request.email,
            password: autoGeneratedPassword,
            role: 'employee',
            isActive: true,
            isEmailVerified: true,
            employeeProfile: {
              companyId: request.companyId._id,
              joinDate: new Date()
            }
          });

          // Send credentials email to employee
          try {
            await sendEmployeeCredentials(
              request.email,
              request.fullName,
              autoGeneratedPassword,
              companyName
            );
          } catch (emailError) {
            console.error('Error sending employee credentials email:', emailError);
          }
        } else {
          // If user already exists, maybe just link them? 
          // Admin logic didn't handle linking specifically, it just skipped creation.
          // We'll follow the same pattern but log it.
          console.log('User already exists, skipping creation for approved request:', request.email);
        }
      } catch (userCreationError) {
        console.error('Error creating employee user:', userCreationError);
        // Don't fail the approval if user creation fails
      }
    } else {
      // Status is REJECTED -> Send rejection email
      try {
        const companyName = request.companyId?.name || (req.user.company?.name || req.user.name);
        await sendRequestRejectionEmail(
          request.email,
          request.fullName,
          'Employee',
          companyName,
          adminNotes
        );
      } catch (emailError) {
        console.error('Error sending rejection notification email:', emailError);
      }
    }

    res.json({
      success: true,
      message: `Employee request ${status} successfully`,
      data: request
    });
  } catch (error) {
    console.error('Error updating employee request status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating employee request status',
      error: error.message
    });
  }
});

// @desc    Delete employee request
// @route   DELETE /api/employer/employee-requests/:requestId
// @access  Private (Employer/Company only)
router.delete('/employee-requests/:requestId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'employer' && req.user.role !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only employers can perform this action.'
      });
    }

    const { requestId } = req.params;

    // Find and ensure ownership
    const request = await EmployeeRequest.findOne({
      _id: requestId,
      companyId: req.user._id
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Employee request not found or does not belong to your company'
      });
    }

    await EmployeeRequest.findByIdAndDelete(requestId);

    res.json({
      success: true,
      message: 'Employee request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting employee request:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting employee request',
      error: error.message
    });
  }
});

// Get all internship postings for employer
router.get('/internships', protect, async (req, res) => {
  try {
    if (req.user.role !== 'employer' && req.user.role !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only employers can access this resource.'
      });
    }

    const internships = await InternshipPosting.find({ employerId: req.user._id })
      .populate('applications.jobseekerId', 'name email profile.avatar')
      .sort({ postedAt: -1 });

    res.json({
      success: true,
      data: internships
    });
  } catch (error) {
    console.error('Error fetching internships:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching internships'
    });
  }
});

// Create new internship posting
router.post('/internships', protect, async (req, res) => {
  try {
    if (req.user.role !== 'employer' && req.user.role !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only employers can create internship postings.'
      });
    }

    const employer = await User.findById(req.user._id);
    const companyName = employer.company?.name || employer.name;

    const internshipData = {
      ...req.body,
      employerId: req.user._id,
      companyName: companyName,
      availableSeats: req.body.totalSeats
    };

    const internship = new InternshipPosting(internshipData);
    await internship.save();

    res.status(201).json({
      success: true,
      message: 'Internship posting created successfully',
      data: internship
    });
  } catch (error) {
    console.error('Error creating internship:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating internship posting'
    });
  }
});

// Update internship posting
router.put('/internships/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'employer' && req.user.role !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only employers can update internship postings.'
      });
    }

    const internship = await InternshipPosting.findOne({
      _id: req.params.id,
      employerId: req.user._id
    });

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship posting not found'
      });
    }

    Object.keys(req.body).forEach(key => {
      if (key !== 'employerId' && key !== 'companyName') {
        internship[key] = req.body[key];
      }
    });

    await internship.save();

    res.json({
      success: true,
      message: 'Internship posting updated successfully',
      data: internship
    });
  } catch (error) {
    console.error('Error updating internship:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating internship posting'
    });
  }
});

// Delete internship posting
router.delete('/internships/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'employer' && req.user.role !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only employers can delete internship postings.'
      });
    }

    const internship = await InternshipPosting.findOne({
      _id: req.params.id,
      employerId: req.user._id
    });

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship posting not found'
      });
    }

    await InternshipPosting.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Internship posting deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting internship:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting internship posting'
    });
  }
});

// Get internship titles for dropdown
router.get('/internship-titles', protect, async (req, res) => {
  try {
    if (req.user.role !== 'employer' && req.user.role !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only employers can access this resource.'
      });
    }

    const { industry } = req.query;

    const internshipTitles = {
      'IT/Technology': [
        'Software Developer',
        'Full Stack Developer',
        'Frontend Developer',
        'Backend Developer',
        'Mobile App Developer',
        'React Developer',
        'Node.js Developer',
        'Python Developer',
        'Java Developer',
        'DevOps Engineer',
        'Data Scientist',
        'Machine Learning Engineer',
        'AI/ML Engineer',
        'Cloud Engineer',
        'Cybersecurity Analyst',
        'UI/UX Designer',
        'Product Manager',
        'Quality Assurance Engineer',
        'Database Administrator',
        'System Administrator',
        'Network Engineer',
        'Blockchain Developer',
        'Game Developer',
        'IoT Developer',
        'Embedded Systems Engineer'
      ],
      'Banking': [
        'Investment Banking Analyst',
        'Commercial Banking Officer',
        'Retail Banking Specialist',
        'Risk Management Analyst',
        'Financial Analyst',
        'Credit Analyst',
        'Treasury Analyst',
        'Compliance Officer',
        'Audit Associate',
        'Operations Analyst',
        'Digital Banking Specialist',
        'Fintech Developer',
        'Wealth Management Advisor',
        'Insurance Underwriter',
        'Corporate Finance Analyst',
        'Business Analyst',
        'Data Analyst',
        'Customer Service Representative',
        'Marketing Specialist',
        'HR Coordinator'
      ],
      'Healthcare': [
        'Clinical Research Associate',
        'Medical Device Engineer',
        'Healthcare IT Specialist',
        'Pharmaceutical Analyst',
        'Public Health Coordinator',
        'Healthcare Administrator',
        'Nursing Assistant',
        'Medical Laboratory Technician',
        'Health Informatics Specialist',
        'Biotechnology Researcher',
        'Patient Care Coordinator',
        'Medical Writer',
        'Healthcare Data Analyst',
        'Quality Assurance Specialist',
        'Regulatory Affairs Specialist'
      ],
    };

    let titles = [];
    if (industry && internshipTitles[industry]) {
      titles = internshipTitles[industry];
    } else {
      Object.values(internshipTitles).forEach(industryTitles => {
        titles = titles.concat(industryTitles);
      });
    }

    res.json({
      success: true,
      data: titles
    });
  } catch (error) {
    console.error('Error fetching internship titles:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching internship titles'
    });
  }
});

// Get India locations for dropdown
router.get('/india-locations', protect, async (req, res) => {
  try {
    if (req.user.role !== 'employer' && req.user.role !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only employers can access this resource.'
      });
    }

    const indiaLocations = [
      'Mumbai, Maharashtra',
      'Delhi, Delhi',
      'Bangalore, Karnataka',
      'Hyderabad, Telangana',
      'Chennai, Tamil Nadu',
      'Kolkata, West Bengal',
      'Pune, Maharashtra',
      'Ahmedabad, Gujarat',
      'Jaipur, Rajasthan',
      'Surat, Gujarat',
      'Lucknow, Uttar Pradesh',
      'Kanpur, Uttar Pradesh',
      'Nagpur, Maharashtra',
      'Indore, Madhya Pradesh',
      'Thane, Maharashtra',
      'Bhopal, Madhya Pradesh',
      'Visakhapatnam, Andhra Pradesh',
      'Patna, Bihar',
      'Vadodara, Gujarat',
      'Ghaziabad, Uttar Pradesh',
      'Ludhiana, Punjab',
      'Agra, Uttar Pradesh',
      'Nashik, Maharashtra',
      'Faridabad, Haryana',
      'Meerut, Uttar Pradesh',
      'Rajkot, Gujarat',
      'Varanasi, Uttar Pradesh',
      'Srinagar, Jammu and Kashmir',
      'Aurangabad, Maharashtra',
      'Dhanbad, Jharkhand',
      'Amritsar, Punjab',
      'Allahabad, Uttar Pradesh',
      'Ranchi, Jharkhand',
      'Howrah, West Bengal',
      'Coimbatore, Tamil Nadu',
      'Jabalpur, Madhya Pradesh',
      'Gwalior, Madhya Pradesh',
      'Vijayawada, Andhra Pradesh',
      'Jodhpur, Rajasthan',
      'Madurai, Tamil Nadu',
      'Raipur, Chhattisgarh',
      'Kota, Rajasthan',
      'Guwahati, Assam',
      'Chandigarh, Chandigarh',
      'Solapur, Maharashtra',
      'Hubli-Dharwad, Karnataka',
      'Bareilly, Uttar Pradesh',
      'Moradabad, Uttar Pradesh',
      'Mysore, Karnataka',
      'Gurgaon, Haryana',
      'Aligarh, Uttar Pradesh',
      'Jalandhar, Punjab',
      'Tiruchirappalli, Tamil Nadu',
      'Bhubaneswar, Odisha',
      'Salem, Tamil Nadu',
      'Warangal, Telangana',
      'Guntur, Andhra Pradesh',
      'Bhiwandi, Maharashtra',
      'Saharanpur, Uttar Pradesh',
      'Gorakhpur, Uttar Pradesh',
      'Bikaner, Rajasthan',
      'Amravati, Maharashtra',
      'Noida, Uttar Pradesh',
      'Jamshedpur, Jharkhand',
      'Bhilai, Chhattisgarh',
      'Cuttack, Odisha',
      'Firozabad, Uttar Pradesh',
      'Kochi, Kerala',
      'Bhavnagar, Gujarat',
      'Dehradun, Uttarakhand',
      'Durgapur, West Bengal',
      'Asansol, West Bengal',
      'Rourkela, Odisha',
      'Nanded, Maharashtra',
      'Kolhapur, Maharashtra',
      'Ajmer, Rajasthan',
      'Akola, Maharashtra',
      'Gulbarga, Karnataka',
      'Jamnagar, Gujarat',
      'Ujjain, Madhya Pradesh',
      'Loni, Uttar Pradesh',
      'Siliguri, West Bengal',
      'Jhansi, Uttar Pradesh',
      'Ulhasnagar, Maharashtra',
      'Nellore, Andhra Pradesh',
      'Jammu, Jammu and Kashmir',
      'Sangli-Miraj & Kupwad, Maharashtra',
      'Belgaum, Karnataka',
      'Mangalore, Karnataka',
      'Ambattur, Tamil Nadu',
      'Tirunelveli, Tamil Nadu',
      'Malegaon, Maharashtra',
      'Gaya, Bihar',
      'Jalgaon, Maharashtra',
      'Udaipur, Rajasthan',
      'Maheshtala, West Bengal',
      'Tirupur, Tamil Nadu',
      'Davanagere, Karnataka',
      'Kozhikode, Kerala',
      'Akbarpur, Uttar Pradesh',
      'Kurnool, Andhra Pradesh',
      'Bokaro Steel City, Jharkhand',
      'Rajahmundry, Andhra Pradesh',
      'Ballari, Karnataka',
      'Agartala, Tripura',
      'Bhagalpur, Bihar',
      'Latur, Maharashtra',
      'Dhule, Maharashtra',
      'Korba, Chhattisgarh',
      'Bhilwara, Rajasthan',
      'Brahmapur, Odisha',
      'Muzaffarpur, Bihar',
      'Ahmednagar, Maharashtra',
      'Mathura, Uttar Pradesh',
      'Kollam, Kerala',
      'Avadi, Tamil Nadu',
      'Kadapa, Andhra Pradesh',
      'Anantapur, Andhra Pradesh',
      'Tiruvottiyur, Tamil Nadu',
      'Karnal, Haryana',
      'Bathinda, Punjab',
      'Rampur, Uttar Pradesh',
      'Shivamogga, Karnataka',
      'Ratlam, Madhya Pradesh',
      'Modinagar, Uttar Pradesh',
      'Durg, Chhattisgarh',
      'Shillong, Meghalaya',
      'Imphal, Manipur',
      'Hapur, Uttar Pradesh',
      'Ranipet, Tamil Nadu',
      'Anand, Gujarat',
      'Bhind, Madhya Pradesh',
      'Bhalswa Jahangir Pur, Delhi',
      'Madhyamgram, West Bengal',
      'Bhiwani, Haryana',
      'Berhampore, West Bengal',
      'Ambala, Haryana',
      'Mori Gate, Delhi',
      'South Extension, Delhi',
      'Dwarka, Delhi',
      'Rohini, Delhi',
      'Pitampura, Delhi',
      'Janakpuri, Delhi',
      'Rajouri Garden, Delhi',
      'Lajpat Nagar, Delhi',
      'Saket, Delhi',
      'Vasant Vihar, Delhi',
      'Hauz Khas, Delhi',
      'Green Park, Delhi',
      'Kalkaji, Delhi',
      'Greater Kailash, Delhi',
      'Defence Colony, Delhi',
      'Malviya Nagar, Delhi',
      'Kailash Colony, Delhi',
      'Nehru Place, Delhi',
      'Okhla, Delhi',
      'Sangam Vihar, Delhi',
      'Tughlakabad, Delhi',
      'Badarpur, Delhi',
      'Jaitpur, Delhi',
      'Khanpur, Delhi',
      'Mehrauli, Delhi',
      'Vasant Kunj, Delhi',
      'Munirka, Delhi',
      'R K Puram, Delhi',
      'Chanakyapuri, Delhi',
      'Connaught Place, Delhi',
      'Karol Bagh, Delhi',
      'Paharganj, Delhi',
      'Old Delhi, Delhi',
      'Shahdara, Delhi',
      'Seelampur, Delhi',
      'Gandhi Nagar, Delhi',
      'Krishna Nagar, Delhi',
      'Preet Vihar, Delhi',
      'Vivek Vihar, Delhi',
      'Dilshad Garden, Delhi',
      'Shahdara, Delhi',
      'Welcome, Delhi',
      'Seemapuri, Delhi',
      'Gokulpuri, Delhi',
      'Maujpur, Delhi',
      'Jaffrabad, Delhi',
      'Mustafabad, Delhi',
      'Babarpur, Delhi',
      'Gokalpuri, Delhi',
      'Bhajanpura, Delhi',
      'Yamuna Vihar, Delhi',
      'Vishwas Nagar, Delhi',
      'Krishna Nagar, Delhi',
      'Gandhi Nagar, Delhi',
      'Preet Vihar, Delhi',
      'Vivek Vihar, Delhi',
      'Dilshad Garden, Delhi',
      'Geeta Colony, Delhi',
      'Shahdara, Delhi',
      'Welcome, Delhi',
      'Seemapuri, Delhi',
      'Gokulpuri, Delhi',
      'Maujpur, Delhi',
      'Jaffrabad, Delhi',
      'Mustafabad, Delhi',
      'Babarpur, Delhi',
      'Gokalpuri, Delhi',
      'Bhajanpura, Delhi',
      'Yamuna Vihar, Delhi',
      'Vishwas Nagar, Delhi',
      'Krishna Nagar, Delhi',
      'Gandhi Nagar, Delhi',
      'Preet Vihar, Delhi',
      'Vivek Vihar, Delhi',
      'Dilshad Garden, Delhi',
      'Geeta Colony, Delhi'
    ];

    res.json({
      success: true,
      data: indiaLocations
    });
  } catch (error) {
    console.error('Error fetching India locations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching India locations'
    });
  }
});

// @desc    Get detailed applications for employer's internships
// @route   GET /api/employer/applications-detailed
// @access  Private (Employer only)
router.get('/applications-detailed', protect, async (req, res) => {
  try {
    if (req.user.role !== 'employer' && req.user.role !== 'company' && req.user.role !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only employers or employees can access this resource.'
      });
    }

    const InternshipApplication = require('../models/InternshipApplication');

    const { status, internshipId, page = 1, limit = 10 } = req.query;

    // Determine the effective employer/company id for fetching applications
    let effectiveEmployerId = req.user._id;
    if (req.user.role === 'employee') {
      const companyId = req.user.employeeProfile?.companyId;
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Employee is not associated with a company.'
        });
      }
      effectiveEmployerId = companyId;
    }

    let applications = await InternshipApplication.getApplicationsForEmployer(
      effectiveEmployerId,
      { status, internshipId }
    );

    // Normalize legacy statuses before returning
    applications = applications.map(app => {
      if (app.status === 'reviewed' && app.decision === 'Proceed to Recruiter') {
        app.status = 'shortlisted';
      }
      return app;
    });

    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedApplications = applications.slice(startIndex, endIndex);

    // Attach rich details for recruiter dashboard rendering
    const withSummaries = paginatedApplications.map((app) => ({
      _id: app._id,
      status: app.status,
      matchScore: app.matchScore,
      decision: app.decision,
      summary: app.summary,
      appliedAt: app.appliedAt,
      createdAt: app.createdAt,
      // Test fields for recruiter visibility
      answers: Array.isArray(app.answers) ? app.answers : [],
      score: typeof app.score === 'number' ? app.score : null,
      result: app.result || null,
      reason: app.reason || null,
      personalDetails: app.personalDetails,
      educationDetails: app.educationDetails,
      workExperience: app.workExperience,
      additionalInfo: app.additionalInfo,
      internshipDetails: app.internshipDetails,
      jobseeker: app.jobseekerId ? {
        _id: app.jobseekerId._id || app.jobseekerId,
        name: app.jobseekerId.name,
        email: app.jobseekerId.email,
        profilePicture: app.jobseekerId.profile?.profilePicture
      } : null,
      internship: app.internshipId ? {
        _id: app.internshipId._id || app.internshipId,
        title: app.internshipId.title,
        companyName: app.internshipId.companyName,
        startDate: app.internshipId.startDate,
        duration: app.internshipId.duration
      } : null
    }));

    res.json({
      success: true,
      data: {
        applications: withSummaries,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(applications.length / limit),
          totalItems: applications.length,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching detailed applications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching applications'
    });
  }
});

// @desc    Get single detailed application
// @route   GET /api/employer/applications-detailed/:id
// @access  Private (Employer only)
router.get('/applications-detailed/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'employer' && req.user.role !== 'company' && req.user.role !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only employers or employees can access this resource.'
      });
    }

    const InternshipApplication = require('../models/InternshipApplication');

    // Determine the effective employer/company id for fetching application
    let effectiveEmployerId = req.user._id;
    if (req.user.role === 'employee') {
      const companyId = req.user.employeeProfile?.companyId;
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Employee is not associated with a company.'
        });
      }
      effectiveEmployerId = companyId;
    }

    const application = await InternshipApplication.findOne({
      _id: req.params.id,
      employerId: effectiveEmployerId
    })
      .populate('jobseekerId', 'name email profile.profilePicture createdAt')
      .populate('internshipId', 'title companyName startDate duration location mode');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Normalize legacy status for single fetch as well
    if (application.status === 'reviewed' && application.decision === 'Proceed to Recruiter') {
      application.status = 'shortlisted';
    }

    res.json({
      success: true,
      data: application
    });

  } catch (error) {
    console.error('Error fetching application details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching application details'
    });
  }
});

// @desc    Update application status
// @route   PATCH /api/employer/applications-detailed/:id/status
// @access  Private (Employer only)
router.patch('/applications-detailed/:id/status', protect, async (req, res) => {
  try {
    if (req.user.role !== 'employer' && req.user.role !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only employers can access this resource.'
      });
    }

    const InternshipApplication = require('../models/InternshipApplication');
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const application = await InternshipApplication.findOne({
      _id: req.params.id,
      employerId: req.user._id
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    await application.updateStatus(status, req.user._id, notes);

    // Also update the status in the internship's applications array for backward compatibility
    const internship = await InternshipPosting.findById(application.internshipId);
    if (internship) {
      const appIndex = internship.applications.findIndex(
        app => app.jobseekerId.toString() === application.jobseekerId.toString()
      );
      if (appIndex !== -1) {
        internship.applications[appIndex].status = status;
        await internship.save();
      }
    }

    // If shortlisted, send a professional email to the jobseeker
    if (status === 'shortlisted') {
      try {
        const jobseeker = await User.findById(application.jobseekerId);
        const companyName = internship?.companyName || 'Our Company';
        const internshipTitle = internship?.title || 'Internship';
        const nextSteps = notes || '';
        if (jobseeker?.email) {
          await sendShortlistEmail(jobseeker.email, jobseeker.name || 'Candidate', companyName, internshipTitle, nextSteps);
        }
      } catch (emailErr) {
        console.error('Error sending shortlist email:', emailErr);
      }
    }

    // If rejected, send a professional rejection email
    if (status === 'rejected') {
      try {
        const jobseeker = await User.findById(application.jobseekerId);
        const companyName = internship?.companyName || 'Our Company';
        const internshipTitle = internship?.title || 'Internship';
        const reason = notes || '';
        if (jobseeker?.email) {
          await sendRejectionEmail(jobseeker.email, jobseeker.name || 'Candidate', companyName, internshipTitle, reason);
        }
      } catch (emailErr) {
        console.error('Error sending rejection email:', emailErr);
      }
    }

    res.json({
      success: true,
      message: 'Application status updated successfully',
      data: {
        applicationId: application._id,
        status: application.status,
        updatedAt: application.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating application status'
    });
  }
});

// @desc    Get all mentors belonging to this company with their mentees and progress
// @route   GET /api/employer/mentors
// @access  Private (Employer/Company only)
router.get('/mentors', protect, async (req, res) => {
  try {
    if (req.user.role !== 'employer' && req.user.role !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only employers can access this resource.'
      });
    }

    const InternshipApplication = require('../models/InternshipApplication');
    const MentorTask = require('../models/MentorTask');
    const MentorSubmission = require('../models/MentorSubmission');

    // 1. Find all mentors linked to this company
    const mentors = await User.find({
      $or: [{ role: 'mentor' }, { secondaryRoles: 'mentor' }],
      'employeeProfile.companyId': req.user._id,
      isActive: true
    }).select('name email mentorProfile employeeProfile createdAt lastLogin');

    // 2. For each mentor, fetch mentees (from InternshipApplication) and progress
    const mentorsWithMentees = await Promise.all(
      mentors.map(async (mentor) => {
        // Get all applications assigned to this mentor
        const menteeApplications = await InternshipApplication.find({
          mentorId: mentor._id,
          status: { $in: ['selected', 'internship-started', 'active', 'completed'] }
        })
          .populate('jobseekerId', 'name email profile.grade profile.avatar')
          .populate('internshipId', 'title duration startDate')
          .lean();

        // For each mentee, compute task progress
        const menteesWithProgress = await Promise.all(
          menteeApplications.map(async (app) => {
            const menteeId = app.jobseekerId?._id;
            if (!menteeId) return null;

            // Total tasks assigned to this mentee by this mentor
            const totalTasks = await MentorTask.countDocuments({
              mentorId: mentor._id,
              assignedTo: menteeId,
              status: 'active'
            });

            // Submissions by this mentee for this mentor
            const totalSubmissions = await MentorSubmission.countDocuments({
              mentorId: mentor._id,
              menteeId: menteeId
            });

            const approvedSubmissions = await MentorSubmission.countDocuments({
              mentorId: mentor._id,
              menteeId: menteeId,
              reviewStatus: 'approved'
            });

            const pendingSubmissions = await MentorSubmission.countDocuments({
              mentorId: mentor._id,
              menteeId: menteeId,
              reviewStatus: 'pending'
            });

            const rejectedSubmissions = await MentorSubmission.countDocuments({
              mentorId: mentor._id,
              menteeId: menteeId,
              reviewStatus: 'rejected'
            });

            const progressPercent = totalTasks > 0
              ? Math.round((approvedSubmissions / totalTasks) * 100)
              : 0;

            return {
              _id: menteeId,
              name: app.jobseekerId?.name || 'Unknown',
              email: app.jobseekerId?.email || '',
              grade: app.jobseekerId?.profile?.grade || null,
              internshipTitle: app.internshipDetails?.title || app.internshipId?.title || 'N/A',
              internshipDuration: app.internshipDetails?.duration || app.internshipId?.duration || '',
              applicationStatus: app.status,
              applicationId: app._id,
              progress: {
                totalTasks,
                totalSubmissions,
                approvedSubmissions,
                pendingSubmissions,
                rejectedSubmissions,
                progressPercent
              }
            };
          })
        );

        return {
          _id: mentor._id,
          name: mentor.name,
          email: mentor.email,
          grade: mentor.mentorProfile?.grade || 'B',
          expertise: mentor.mentorProfile?.expertise || [],
          yearsOfExperience: mentor.mentorProfile?.yearsOfExperience || '0-1',
          currentMentees: mentor.mentorProfile?.currentMentees || 0,
          maxMentees: mentor.mentorProfile?.maxMentees || 5,
          department: mentor.employeeProfile?.department || '',
          position: mentor.employeeProfile?.position || '',
          lastLogin: mentor.lastLogin,
          mentees: menteesWithProgress.filter(Boolean)
        };
      })
    );

    res.json({
      success: true,
      data: {
        mentors: mentorsWithMentees,
        totalMentors: mentorsWithMentees.length,
        totalMenteesAcrossAll: mentorsWithMentees.reduce((sum, m) => sum + m.mentees.length, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching company mentors:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching mentors',
      error: error.message
    });
  }
});

module.exports = router;
