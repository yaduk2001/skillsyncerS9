const express = require('express');
const router = express.Router();
const ProjectTemplate = require('../models/ProjectTemplate');
const CustomizationRequest = require('../models/CustomizationRequest');
const ProjectIdea = require('../models/ProjectIdea');
const Purchase = require('../models/Purchase');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadToCloudinary } = require('../utils/cloudinary');

// Admin auth middleware
const adminAuth = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ============================================================
// PROJECT TEMPLATES
// ============================================================

// GET all project templates (paginated)
router.get('/project-templates', [protect, adminAuth], async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const skip = (page - 1) * limit;
    const templates = await ProjectTemplate.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ProjectTemplate.countDocuments(filter);

    res.json({
      success: true,
      data: {
        templates,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalTemplates: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching project templates:', error);
    res.status(500).json({ success: false, message: 'Error fetching project templates', error: error.message });
  }
});

// POST create project template
router.post('/project-templates', [protect, adminAuth], async (req, res) => {
  try {
    const { title, description, category, techStack, difficulty, demoLink, screenshotsLink, zipFileLink, domain, features, price } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ success: false, message: 'Title, description, and category are required' });
    }

    const template = await ProjectTemplate.create({
      title,
      description,
      category,
      techStack: techStack || [],
      difficulty: difficulty || 'intermediate',
      demoLink: demoLink || '',
      screenshotsLink: screenshotsLink || '',
      zipFileLink: zipFileLink || '',
      domain: domain || '',
      features: features || [],
      price: price || 0,
      createdBy: req.user._id
    });

    const populated = await ProjectTemplate.findById(template._id).populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Project template created successfully',
      data: populated
    });
  } catch (error) {
    console.error('Error creating project template:', error);
    res.status(500).json({ success: false, message: 'Error creating project template', error: error.message });
  }
});

// PUT update project template
router.put('/project-templates/:id', [protect, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const template = await ProjectTemplate.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      .populate('createdBy', 'name email');

    if (!template) {
      return res.status(404).json({ success: false, message: 'Project template not found' });
    }

    res.json({
      success: true,
      message: 'Project template updated successfully',
      data: template
    });
  } catch (error) {
    console.error('Error updating project template:', error);
    res.status(500).json({ success: false, message: 'Error updating project template', error: error.message });
  }
});

// DELETE project template
router.delete('/project-templates/:id', [protect, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;
    const template = await ProjectTemplate.findByIdAndDelete(id);

    if (!template) {
      return res.status(404).json({ success: false, message: 'Project template not found' });
    }

    res.json({ success: true, message: 'Project template deleted successfully' });
  } catch (error) {
    console.error('Error deleting project template:', error);
    res.status(500).json({ success: false, message: 'Error deleting project template', error: error.message });
  }
});

// ============================================================
// PROJECT FILE UPLOADS
// ============================================================

// POST upload project files to Cloudinary
router.post('/upload-project-files', [protect, adminAuth, upload.fields([
  { name: 'zipFile', maxCount: 1 },
  { name: 'screenshot', maxCount: 1 }
])], async (req, res) => {
  try {
    const results = {};
    
    // Upload ZIP file if provided
    if (req.files && req.files.zipFile) {
      const zipFile = req.files.zipFile[0];
      const uploadResult = await uploadToCloudinary(zipFile.buffer, 'project-zips', null, 'raw');
      
      if (uploadResult.success) {
        results.zipFileLink = uploadResult.url;
      } else {
        return res.status(500).json({ 
          success: false, 
          message: 'ZIP upload failed', 
          error: uploadResult.error 
        });
      }
    }
    
    // Upload screenshot if provided
    if (req.files && req.files.screenshot) {
      const screenshot = req.files.screenshot[0];
      const uploadResult = await uploadToCloudinary(screenshot.buffer, 'project-screenshots', null, 'image');
      
      if (uploadResult.success) {
        results.screenshotsLink = uploadResult.url;
      } else {
        return res.status(500).json({ 
          success: false, 
          message: 'Screenshot upload failed', 
          error: uploadResult.error 
        });
      }
    }
    
    if (Object.keys(results).length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No files were uploaded' 
      });
    }

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      data: results
    });
  } catch (error) {
    console.error('Error uploading project files:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error uploading files', 
      error: error.message 
    });
  }
});

// ============================================================
// CUSTOMIZATION REQUESTS
// ============================================================

// GET all customization requests (paginated)
router.get('/customization-requests', [protect, adminAuth], async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const requests = await CustomizationRequest.find(filter)
      .populate('studentId', 'name email')
      .populate('projectTemplateId', 'title category')
      .populate('assignedEmployee', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CustomizationRequest.countDocuments(filter);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalRequests: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching customization requests:', error);
    res.status(500).json({ success: false, message: 'Error fetching customization requests', error: error.message });
  }
});

// PATCH assign employee to customization request
router.patch('/customization-requests/:id/assign', [protect, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }

    // Verify employee exists
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      return res.status(400).json({ success: false, message: 'Invalid employee' });
    }

    const request = await CustomizationRequest.findByIdAndUpdate(
      id,
      { assignedEmployee: employeeId, status: 'in-progress' },
      { new: true }
    )
      .populate('studentId', 'name email')
      .populate('projectTemplateId', 'title category')
      .populate('assignedEmployee', 'name email');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Customization request not found' });
    }

    res.json({
      success: true,
      message: 'Employee assigned successfully',
      data: request
    });
  } catch (error) {
    console.error('Error assigning employee:', error);
    res.status(500).json({ success: false, message: 'Error assigning employee', error: error.message });
  }
});

// PATCH update customization request status
router.patch('/customization-requests/:id/status', [protect, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!['pending', 'in-progress', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updates = { status };
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;

    const request = await CustomizationRequest.findByIdAndUpdate(id, updates, { new: true })
      .populate('studentId', 'name email')
      .populate('projectTemplateId', 'title category')
      .populate('assignedEmployee', 'name email');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Customization request not found' });
    }

    res.json({
      success: true,
      message: `Request status updated to ${status}`,
      data: request
    });
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ success: false, message: 'Error updating request status', error: error.message });
  }
});

// ============================================================
// PROJECT IDEAS
// ============================================================

// GET all project ideas (paginated)
router.get('/project-ideas', [protect, adminAuth], async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const ideas = await ProjectIdea.find(filter)
      .populate('studentId', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ProjectIdea.countDocuments(filter);

    res.json({
      success: true,
      data: {
        ideas,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalIdeas: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching project ideas:', error);
    res.status(500).json({ success: false, message: 'Error fetching project ideas', error: error.message });
  }
});

// PATCH approve project idea
router.patch('/project-ideas/:id/approve', [protect, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;
    const { adminFeedback } = req.body;

    const idea = await ProjectIdea.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        adminFeedback: adminFeedback || '',
        reviewedBy: req.user._id,
        reviewedAt: new Date()
      },
      { new: true }
    )
      .populate('studentId', 'name email')
      .populate('reviewedBy', 'name email');

    if (!idea) {
      return res.status(404).json({ success: false, message: 'Project idea not found' });
    }

    res.json({
      success: true,
      message: 'Project idea approved successfully',
      data: idea
    });
  } catch (error) {
    console.error('Error approving project idea:', error);
    res.status(500).json({ success: false, message: 'Error approving project idea', error: error.message });
  }
});

// PATCH reject project idea
router.patch('/project-ideas/:id/reject', [protect, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;
    const { adminFeedback } = req.body;

    if (!adminFeedback) {
      return res.status(400).json({ success: false, message: 'Feedback is required when rejecting an idea' });
    }

    const idea = await ProjectIdea.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        adminFeedback,
        reviewedBy: req.user._id,
        reviewedAt: new Date()
      },
      { new: true }
    )
      .populate('studentId', 'name email')
      .populate('reviewedBy', 'name email');

    if (!idea) {
      return res.status(404).json({ success: false, message: 'Project idea not found' });
    }

    res.json({
      success: true,
      message: 'Project idea rejected',
      data: idea
    });
  } catch (error) {
    console.error('Error rejecting project idea:', error);
    res.status(500).json({ success: false, message: 'Error rejecting project idea', error: error.message });
  }
});

// ============================================================
// STUDENT PURCHASES
// ============================================================

// GET all purchases (paginated)
router.get('/purchases', [protect, adminAuth], async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.paymentStatus = status;

    const skip = (page - 1) * limit;
    const purchases = await Purchase.find(filter)
      .populate('studentId', 'name email phone')
      .populate('projectTemplateId', 'title category price domain')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Purchase.countDocuments(filter);

    res.json({
      success: true,
      data: {
        purchases,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalPurchases: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ success: false, message: 'Error fetching purchases', error: error.message });
  }
});

// PATCH update purchase status
router.patch('/purchases/:id/status', [protect, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!['pending', 'paid', 'failed'].includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status' });
    }

    const updates = { 
      paymentStatus,
      // Automatically enable download if marked exactly as 'paid'
      downloadEnabled: paymentStatus === 'paid' 
    };

    const purchase = await Purchase.findByIdAndUpdate(id, updates, { new: true })
      .populate('studentId', 'name email')
      .populate('projectTemplateId', 'title category price zipFileLink');

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase record not found' });
    }

    // Optionally update the downloadUrl depending on whether it's paid
    if (purchase.downloadEnabled && purchase.projectTemplateId) {
      purchase.downloadUrl = purchase.projectTemplateId.zipFileLink;
      await purchase.save();
    } else if (!purchase.downloadEnabled) {
      purchase.downloadUrl = '';
      await purchase.save();
    }

    res.json({
      success: true,
      message: `Purchase marked as ${paymentStatus}`,
      data: purchase
    });
  } catch (error) {
    console.error('Error updating purchase status:', error);
    res.status(500).json({ success: false, message: 'Error updating purchase status', error: error.message });
  }
});

// ============================================================
// STATISTICS
// ============================================================

// GET project finder statistics
router.get('/statistics', [protect, adminAuth], async (req, res) => {
  try {
    const totalTemplates = await ProjectTemplate.countDocuments();
    
    // Aggregate purchases
    const purchaseStats = await Purchase.aggregate([
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: 1 },
          totalRevenue: { 
            $sum: { 
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$paymentAmount", 0] 
            } 
          },
          paidPurchases: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0]
            }
          },
          downloadedProjects: {
            $sum: {
              $cond: [{ $eq: ["$downloadEnabled", true] }, 1, 0]
            }
          }
        }
      }
    ]);

    const stats = purchaseStats.length > 0 ? purchaseStats[0] : {
      totalPurchases: 0,
      totalRevenue: 0,
      paidPurchases: 0,
      downloadedProjects: 0
    };

    res.json({
      success: true,
      data: {
        totalTemplates,
        totalPurchases: stats.totalPurchases,
        totalRevenue: stats.totalRevenue,
        paidPurchases: stats.paidPurchases,
        downloadedProjects: stats.downloadedProjects
      }
    });

  } catch (error) {
    console.error('Error fetching project statistics:', error);
    res.status(500).json({ success: false, message: 'Error fetching project statistics', error: error.message });
  }
});

module.exports = router;
