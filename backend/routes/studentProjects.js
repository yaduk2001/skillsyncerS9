const express = require('express');
const router = express.Router();
const ProjectTemplate = require('../models/ProjectTemplate');
const CustomizationRequest = require('../models/CustomizationRequest');
const ProjectIdea = require('../models/ProjectIdea');
const Purchase = require('../models/Purchase');
const { protect } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Student auth middleware — accepts primary role 'student' OR secondaryRoles includes 'student'
const studentAuth = async (req, res, next) => {
  try {
    const user = req.user;
    const isStudent =
      user.role === 'student' ||
      (Array.isArray(user.secondaryRoles) && user.secondaryRoles.includes('student'));
    if (!isStudent) {
      return res.status(403).json({ success: false, message: 'Access denied. Student privileges required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};



// ============================================================
// BROWSE PROJECT TEMPLATES (student can view active templates)
// ============================================================

// GET single project template by ID
router.get('/projects/:id', [protect, studentAuth], async (req, res) => {
  try {
    const { id } = req.params;
    const template = await ProjectTemplate.findOne({ _id: id, status: 'active' });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error fetching project template:', error);
    res.status(500).json({ success: false, message: 'Error fetching project', error: error.message });
  }
});

router.get('/project-templates', [protect, studentAuth], async (req, res) => {
  try {
    const { category, difficulty, search, page = 1, limit = 10 } = req.query;
    const filter = { status: 'active' };
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const templates = await ProjectTemplate.find(filter)
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

// ============================================================
// MY PURCHASES  (/api/student/purchases)
// ============================================================

// GET my purchased projects
router.get('/purchases', [protect, studentAuth], async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [purchases, total] = await Promise.all([
      Purchase.find({ studentId: req.user._id })
        .populate('projectTemplateId', 'title description category domain techStack difficulty price zipFileLink demoLink')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Purchase.countDocuments({ studentId: req.user._id })
    ]);

    res.json({
      success: true,
      data: {
        purchases,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalPurchases: total,
          hasNext: parseInt(page) * parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ success: false, message: 'Error fetching purchases', error: error.message });
  }
});

// POST create Stripe checkout session
router.post('/create-checkout-session', [protect, studentAuth], async (req, res) => {
  try {
    const { projectTemplateId } = req.body;
    const template = await ProjectTemplate.findOne({ _id: projectTemplateId, status: 'active' });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Project template not found' });
    }

    // Check if already purchased
    const existing = await Purchase.findOne({ studentId: req.user._id, projectTemplateId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already purchased this project.' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: template.title,
              description: template.description ? template.description.substring(0, 200) : 'Academic Project Template',
            },
            unit_amount: (template.price || 500) * 100, // Stripe expects amount in paise
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/student-dashboard?payment_success=true&project_id=${template._id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/student-dashboard?payment_canceled=true`,
      client_reference_id: req.user._id.toString(),
      metadata: {
        projectTemplateId: template._id.toString(),
        studentId: req.user._id.toString()
      }
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('Stripe session creation error:', error);
    res.status(500).json({ success: false, message: 'Error creating checkout session', error: error.message });
  }
});

// POST create a purchase record (called after successful payment)
router.post('/purchases', [protect, studentAuth], async (req, res) => {
  try {
    const { projectTemplateId, paymentAmount, transactionId } = req.body;

    if (!projectTemplateId) {
      return res.status(400).json({ success: false, message: 'Project template ID is required' });
    }

    const template = await ProjectTemplate.findOne({ _id: projectTemplateId, status: 'active' });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Project template not found' });
    }

    // Check if already purchased
    const existing = await Purchase.findOne({ studentId: req.user._id, projectTemplateId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already purchased this project.' });
    }

    // If transactionId is provided, it means Stripe payment was successful
    const isFree = !template.price || template.price === 0;
    const isPaid = isFree || !!transactionId;
    
    const purchase = await Purchase.create({
      studentId: req.user._id,
      projectTemplateId,
      paymentStatus: isPaid ? 'paid' : 'pending',
      paymentAmount: paymentAmount || template.price || 0,
      transactionId: transactionId || '',
      downloadEnabled: isPaid,
      downloadUrl: isPaid ? (template.zipFileLink || '') : ''
    });

    const populated = await Purchase.findById(purchase._id)
      .populate('projectTemplateId', 'title description category domain techStack difficulty price zipFileLink demoLink');

    res.status(201).json({
      success: true,
      message: isFree ? 'Project downloaded successfully!' : 'Purchase request submitted! You will receive access after payment verification.',
      data: populated
    });
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ success: false, message: 'Error processing purchase', error: error.message });
  }
});

// ============================================================
// MY CUSTOMIZATION REQUESTS  (/api/student/customization-requests)
// ============================================================

// GET all my customization requests
router.get('/customization-requests', [protect, studentAuth], async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { studentId: req.user._id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [requests, total] = await Promise.all([
      CustomizationRequest.find(filter)
        .populate('projectTemplateId', 'title category domain')
        .populate('assignedEmployee', 'name email')
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
    console.error('Error fetching customization requests:', error);
    res.status(500).json({ success: false, message: 'Error fetching requests', error: error.message });
  }
});

// Legacy alias for backward compat
router.get('/my-customization-requests', [protect, studentAuth], async (req, res) => {
  req.url = '/customization-requests';
  return router.handle(req, res, () => {});
});

// POST submit a new customization request  (/api/student/customization-requests)
router.post('/customization-requests', [protect, studentAuth], async (req, res) => {
  try {
    const { projectTemplateId, projectName, customizationDetails } = req.body;

    if (!customizationDetails) {
      return res.status(400).json({ success: false, message: 'Customization details are required' });
    }

    // If projectTemplateId is not given, try to look up by projectName
    let templateId = projectTemplateId;
    if (!templateId && projectName) {
      const found = await ProjectTemplate.findOne({ title: { $regex: projectName, $options: 'i' }, status: 'active' });
      if (found) templateId = found._id;
    }

    if (!templateId) {
      return res.status(400).json({ success: false, message: 'Project template is required. Select a project or enter a valid project name.' });
    }

    const template = await ProjectTemplate.findById(templateId);
    if (!template || template.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Invalid or inactive project template' });
    }

    const request = await CustomizationRequest.create({
      studentId: req.user._id,
      projectTemplateId: templateId,
      customizationDetails,
      status: 'pending'
    });

    const populated = await CustomizationRequest.findById(request._id)
      .populate('projectTemplateId', 'title category domain')
      .populate('assignedEmployee', 'name email');

    res.status(201).json({
      success: true,
      message: 'Customization request submitted successfully',
      data: populated
    });
  } catch (error) {
    console.error('Error submitting customization request:', error);
    res.status(500).json({ success: false, message: 'Error submitting request', error: error.message });
  }
});

// ============================================================
// MY PROJECT IDEAS  (/api/student/project-ideas  and  /api/student/my-ideas)
// ============================================================

// GET my ideas
router.get('/project-ideas', [protect, studentAuth], async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { studentId: req.user._id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [ideas, total] = await Promise.all([
      ProjectIdea.find(filter)
        .populate('reviewedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ProjectIdea.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        ideas,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalIdeas: total,
          hasNext: parseInt(page) * parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching project ideas:', error);
    res.status(500).json({ success: false, message: 'Error fetching ideas', error: error.message });
  }
});

// Legacy alias
router.get('/my-ideas', [protect, studentAuth], async (req, res) => {
  req.url = '/project-ideas';
  return router.handle(req, res, () => {});
});

// POST submit a new project idea  (/api/student/ideas  or  /api/student/project-ideas)
const _submitIdea = async (req, res) => {
  try {
    const { title, description, domain, category, technologies, techStack } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required' });
    }

    // Support both `technologies` (new) and `techStack` (old) field names
    const stack = technologies
      ? (Array.isArray(technologies) ? technologies : technologies.split(',').map(s => s.trim()).filter(Boolean))
      : (Array.isArray(techStack) ? techStack : (techStack || '').split(',').map(s => s.trim()).filter(Boolean));

    const idea = await ProjectIdea.create({
      studentId: req.user._id,
      title,
      description,
      category: domain || category || '',
      techStack: stack,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Project idea submitted successfully',
      data: idea
    });
  } catch (error) {
    console.error('Error submitting project idea:', error);
    res.status(500).json({ success: false, message: 'Error submitting idea', error: error.message });
  }
};

router.post('/ideas', [protect, studentAuth], _submitIdea);
router.post('/project-ideas', [protect, studentAuth], _submitIdea);

// ============================================================
// MY STATS (for dashboard overview)
// ============================================================
router.get('/stats', [protect, studentAuth], async (req, res) => {
  try {
    const studentId = req.user._id;
    const [requestsCount, ideasCount, pendingRequests, pendingIdeas, purchasesCount] = await Promise.all([
      CustomizationRequest.countDocuments({ studentId }),
      ProjectIdea.countDocuments({ studentId }),
      CustomizationRequest.countDocuments({ studentId, status: 'pending' }),
      ProjectIdea.countDocuments({ studentId, status: 'pending' }),
      Purchase.countDocuments({ studentId })
    ]);

    const templatesCount = await ProjectTemplate.countDocuments({ status: 'active' });

    res.json({
      success: true,
      data: {
        availableProjects: templatesCount,
        totalRequests: requestsCount,
        totalIdeas: ideasCount,
        pendingRequests,
        pendingIdeas,
        totalPurchases: purchasesCount
      }
    });
  } catch (error) {
    console.error('Error fetching student stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching stats', error: error.message });
  }
});

module.exports = router;
