const mongoose = require('mongoose');

const JobseekerFeedbackSchema = new mongoose.Schema({
    // References
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InternshipApplication',
        required: true,
        unique: true // One feedback per application
    },
    jobseekerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    internshipId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InternshipPosting',
        required: true
    },
    mentorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    // Internship snapshot (read-only context stored at feedback time)
    internshipSnapshot: {
        title: { type: String, required: true },
        companyName: { type: String, required: true },
        mentorName: { type: String, default: 'N/A' },
        duration: { type: String, default: 'N/A' },
        completionDate: { type: Date, default: null }
    },

    // Star ratings (1–5)
    ratings: {
        overallExperience: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        mentorSupport: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        learningOutcome: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        taskRelevance: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        platformExperience: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        }
    },

    // Text feedback
    feedback: {
        whatWentWell: {
            type: String,
            required: true,
            trim: true,
            minlength: [10, 'Please provide at least 10 characters'],
            maxlength: [1000, 'Cannot exceed 1000 characters']
        },
        areasOfImprovement: {
            type: String,
            required: true,
            trim: true,
            minlength: [10, 'Please provide at least 10 characters'],
            maxlength: [1000, 'Cannot exceed 1000 characters']
        },
        additionalComments: {
            type: String,
            trim: true,
            maxlength: [1000, 'Cannot exceed 1000 characters'],
            default: ''
        }
    },

    // Recommendation
    wouldRecommend: {
        type: Boolean,
        required: true
    },

    // Declaration
    declarationAccepted: {
        type: Boolean,
        required: true,
        validate: {
            validator: function (v) { return v === true; },
            message: 'You must accept the declaration to submit feedback'
        }
    }
}, {
    timestamps: true
});

// Indexes
JobseekerFeedbackSchema.index({ jobseekerId: 1 });
JobseekerFeedbackSchema.index({ applicationId: 1 }, { unique: true });
JobseekerFeedbackSchema.index({ internshipId: 1 });

module.exports = mongoose.model('JobseekerFeedback', JobseekerFeedbackSchema);
