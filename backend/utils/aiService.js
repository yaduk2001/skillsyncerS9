const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Extracts normalized skills from the given text using the AI service.
 */
async function extractSkills(text) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/extract-skills`, { text });
    return response.data.skills || [];
  } catch (error) {
    console.error('AI Service | Error extracting skills:', error.message);
    return [];
  }
}

/**
 * Computes the full hybrid recommendation score for a candidate-internship pair.
 *
 * Formula: R(c,j) = α·CBF + β·CF + γ·KG + δ·Pref
 *
 * @param {string} resumeText - Candidate's resume/profile text
 * @param {string} jobDescription - Internship description text
 * @param {Object} options - Optional extra context for the hybrid engine
 * @param {string[]} options.candidateSkills - Pre-extracted candidate skills
 * @param {string}   options.internshipId    - Internship ID for CF lookup
 * @param {Object}   options.candidatePrefs  - Candidate preferences: { location, domain }
 * @param {Object}   options.jobData         - Job metadata: { title, location, domain }
 */
async function matchCandidateToJob(resumeText, jobDescription, options = {}) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/match`, {
      resume_text:       resumeText,
      job_description:   jobDescription,
      candidate_skills:  options.candidateSkills  || null,
      internship_id:     options.internshipId     || null,
      candidate_prefs:   options.candidatePrefs   || null,
      job_data:          options.jobData          || null,
    });
    return response.data;
  } catch (error) {
    console.error('AI Service | Error matching candidate to job:', error.message);
    return { cbf_score: 0, cf_score: 0, kg_score: 0, pref_score: 0, semantic_score: 0, skill_score: 0, final_score: 0 };
  }
}

/**
 * Records a candidate feedback signal to improve collaborative filtering.
 *
 * @param {string[]} candidateSkills - Skill list of the candidate
 * @param {string}   internshipId    - ID of the internship acted upon
 * @param {string}   action          - 'apply' | 'bookmark' | 'view' | 'interview'
 */
async function recordFeedback(candidateSkills, internshipId, action) {
  try {
    await axios.post(`${AI_SERVICE_URL}/feedback`, {
      candidate_skills: candidateSkills,
      internship_id:    internshipId,
      action,
    });
  } catch (error) {
    console.error('AI Service | Error recording feedback:', error.message);
  }
}

module.exports = {
  extractSkills,
  matchCandidateToJob,
  recordFeedback,
};
