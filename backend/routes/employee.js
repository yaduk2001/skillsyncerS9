const express = require('express');
const router = express.Router();
const User = require('../models/User');
const CustomizationRequest = require('../models/CustomizationRequest');
const { protect } = require('../middleware/auth');

// @desc    Get employee profile
// @route   GET /api/employee/profile
// @access  Private (Employee only)
router.get('/profile', protect, async (req, res) => {
  try {
    // Check if user is employee
    if (req.user.role !== 'employee' && !req.user.secondaryRoles?.includes('employee')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Employee access required.'
      });
    }

    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('employeeProfile.companyId', 'name email company');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          secondaryRoles: user.secondaryRoles,
          profile: user.profile,
          employeeProfile: user.employeeProfile,
          company: user.company
        }
      }
    });

  } catch (error) {
    console.error('Get employee profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching employee profile'
    });
  }
});

// @desc    Update employee profile
// @route   PUT /api/employee/profile
// @access  Private (Employee only)
router.put('/profile', protect, async (req, res) => {
  try {
    // Check if user is employee
    if (req.user.role !== 'employee' && !req.user.secondaryRoles?.includes('employee')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Employee access required.'
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const { name, phone, position, department, employeeId } = req.body;

    // Update basic user info
    if (name) user.name = name;
    
    // Update profile phone
    if (phone) {
      if (!user.profile) user.profile = {};
      user.profile.phone = phone;
    }
    
    // Update employee profile
    if (!user.employeeProfile) user.employeeProfile = {};
    
    if (position !== undefined) user.employeeProfile.position = position;
    if (department !== undefined) user.employeeProfile.department = department;
    if (employeeId !== undefined) user.employeeProfile.employeeId = employeeId;

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('employeeProfile.companyId', 'name email company');

    res.json({
      success: true,
      message: 'Employee profile updated successfully',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Update employee profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating employee profile'
    });
  }
});

// @desc    Get company information by ID for employee
// @route   GET /api/employee/company/:companyId
// @access  Private (Employee only)
router.get('/company/:companyId', protect, async (req, res) => {
  try {
    // Check if user is employee
    if (req.user.role !== 'employee' && !req.user.secondaryRoles?.includes('employee')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Employee access required.'
      });
    }

    const { companyId } = req.params;
    
    // Verify that this employee belongs to this company
    if (!req.user.employeeProfile?.companyId || 
        req.user.employeeProfile.companyId.toString() !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this company information.'
      });
    }

    const company = await User.findById(companyId)
      .select('name email company role')
      .lean();

    if (!company || company.role !== 'company') {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: {
        company: {
          _id: company._id,
          name: company.name,
          email: company.email,
          company: company.company,
          role: company.role
        }
      }
    });

  } catch (error) {
    console.error('Get company info error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching company information'
    });
  }
});

// @desc    Get employee's company details with full information
// @route   GET /api/employee/my-company
// @access  Private (Employee only)
router.get('/my-company', protect, async (req, res) => {
  try {
    // Check if user is employee
    if (req.user.role !== 'employee' && !req.user.secondaryRoles?.includes('employee')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Employee access required.'
      });
    }

    // Check if employee has a company assigned
    if (!req.user.employeeProfile?.companyId) {
      return res.status(404).json({
        success: false,
        message: 'No company assigned to this employee'
      });
    }

    const company = await User.findById(req.user.employeeProfile.companyId)
      .select('name email company role')
      .lean();

    if (!company || company.role !== 'company') {
      return res.status(404).json({
        success: false,
        message: 'Assigned company not found'
      });
    }

    res.json({
      success: true,
      data: {
        company: {
          _id: company._id,
          name: company.name,
          email: company.email,
          company: company.company,
          role: company.role
        }
      }
    });

  } catch (error) {
    console.error('Get my company error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching company information'
    });
  }
});

// @desc    Get customization requests assigned to the employee
// @route   GET /api/employee/customization-requests
// @access  Private (Employee only)
router.get('/customization-requests', protect, async (req, res) => {
  try {
    if (req.user.role !== 'employee' && !req.user.secondaryRoles?.includes('employee')) {
      return res.status(403).json({ success: false, message: 'Access denied. Employee access required.' });
    }

    const { status, page = 1, limit = 10 } = req.query;
    const filter = { assignedEmployee: req.user._id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [requests, total] = await Promise.all([
      CustomizationRequest.find(filter)
        .populate('projectTemplateId', 'title category domain')
        .populate('studentId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CustomizationRequest.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalRequests: total,
          hasNext: parseInt(page) * parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching employee customization requests:', error);
    res.status(500).json({ success: false, message: 'Error fetching requests', error: error.message });
  }
});

// @desc    Update customization request status
// @route   PATCH /api/employee/customization-requests/:id/status
// @access  Private (Employee only)
router.patch('/customization-requests/:id/status', protect, async (req, res) => {
  try {
    if (req.user.role !== 'employee' && !req.user.secondaryRoles?.includes('employee')) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { status } = req.body;
    if (!['in-progress', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const request = await CustomizationRequest.findOne({ 
      _id: req.params.id, 
      assignedEmployee: req.user._id 
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found or not assigned to you' });
    }

    request.status = status;
    await request.save();

    res.json({
      success: true,
      message: `Request marked as ${status}`,
      data: request
    });
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ success: false, message: 'Error updating request', error: error.message });
  }
});

module.exports = router;