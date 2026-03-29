const express = require('express');
const router = express.Router();
const ProjectTemplate = require('../models/ProjectTemplate');
const { protect } = require('../middleware/auth');

// ============================================================
// GET /api/projects  — list all active project templates
// Supports: ?search=&category=&difficulty=&page=&limit=
// ============================================================
router.get('/', protect, async (req, res) => {
  try {
    const { search, category, difficulty, minPrice, maxPrice, page = 1, limit = 12 } = req.query;

    const filter = { status: 'active' };

    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) {
      filter.$or = [
        { title:       { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category:    { $regex: search, $options: 'i' } },
        { domain:      { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [projects, total] = await Promise.all([
      ProjectTemplate.find(filter)
        .select('title description category domain techStack difficulty price demoLink screenshotsLink zipFileLink features createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ProjectTemplate.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          currentPage:    parseInt(page),
          totalPages:     Math.ceil(total / parseInt(limit)),
          totalProjects:  total,
          hasNext:        parseInt(page) * parseInt(limit) < total,
          hasPrev:        parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ success: false, message: 'Error fetching projects', error: error.message });
  }
});

// ============================================================
// GET /api/projects/:id  — single project details
// ============================================================
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await ProjectTemplate.findOne({ _id: req.params.id, status: 'active' })
      .select('title description category domain techStack difficulty price demoLink screenshotsLink zipFileLink features createdAt');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ success: false, message: 'Error fetching project', error: error.message });
  }
});

module.exports = router;
