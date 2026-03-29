// Robust API utility with error handling and retry logic

// Use shared API base config with Vite env override
import { API_BASE_URL as CONFIG_API_BASE_URL } from '../config/api';

// Simplified API URL getter - honor env/config
const getApiUrl = () => {
  return CONFIG_API_BASE_URL;
};

// Enhanced fetch function with retry logic
export const apiRequest = async (endpoint, options = {}) => {
  const maxRetries = 3;
  let lastError;

  // Get the correct API URL
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${endpoint}`;

  // Default options
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  // If sending FormData, let the browser set the correct multipart boundary
  if (options.isFormData || (typeof FormData !== 'undefined' && defaultOptions.body instanceof FormData)) {
    if (defaultOptions.headers && defaultOptions.headers['Content-Type']) {
      delete defaultOptions.headers['Content-Type'];
    }
  }

  // Add auth token if available
  const token = localStorage.getItem('token');
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 API Request (attempt ${attempt}): ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        ...defaultOptions,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

      if (response.ok) {
        console.log(`✅ API Success:`, data);
        return { success: true, data, status: response.status };
      } else {
        console.log(`❌ API Error:`, data);
        return { success: false, data, status: response.status };
      }

    } catch (error) {
      lastError = error;
      console.log(`❌ Network error (attempt ${attempt}/${maxRetries}):`, error.message);

      // Don't retry on abort errors (timeout)
      if (error.name === 'AbortError') {
        break;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts failed
  console.log('💥 All API attempts failed');
  throw new Error(`Network error: ${lastError.message}. Please check if the server is running.`);
};

// Specific API functions
export const authApi = {
  login: (credentials) => apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  register: (userData) => apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  getMe: () => apiRequest('/api/auth/me'),
};

export const dashboardApi = {
  getJobseekerDashboard: () => apiRequest('/api/jobseeker/dashboard'),
};

export const jobseekerApi = {
  // Internship browsing and applications
  getInternships: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    const url = `/api/jobseeker/internships${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest(url);
  },

  getInternshipDetails: (id) => apiRequest(`/api/jobseeker/internships/${id}`),

  applyForInternship: (id, coverLetter = '') => apiRequest(`/api/jobseeker/internships/${id}/apply`, {
    method: 'POST',
    body: JSON.stringify({ coverLetter }),
  }),

  applyForInternshipDetailed: (id, applicationData) => apiRequest(`/api/jobseeker/internships/${id}/apply-detailed`, {
    method: 'POST',
    body: JSON.stringify(applicationData),
  }),

  getApplications: () => apiRequest('/api/jobseeker/applications'),

  getDetailedApplications: () => apiRequest('/api/jobseeker/applications-detailed'),
  deleteApplication: (applicationId) => apiRequest(`/api/jobseeker/applications/${encodeURIComponent(applicationId)}`, { method: 'DELETE' }),
  getTestDetails: (applicationId) => apiRequest(`/api/jobseeker/applications/${applicationId}/test-details`),

  // Status sync for tests and selections
  getStatus: () => apiRequest('/api/jobseekers/status'),

  // Profile management
  getProfile: () => apiRequest('/api/jobseeker/profile'),
  updateProfile: (profileData) => apiRequest('/api/jobseeker/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  }),

  // Resume upload
  uploadResume: (formData) => apiRequest('/api/jobseeker/upload-resume', {
    method: 'POST',
    body: formData,
    isFormData: true,
  }),

  // ATS scoring
  getATSScore: () => apiRequest('/api/jobseeker/ats-score'),
  getATSNLP: (jobDescription = '') => apiRequest('/api/jobseeker/ats-nlp', {
    method: 'POST',
    body: JSON.stringify({ jobDescription }),
  }),

  // Mentor assignment
  getMyMentor: (applicationId) => apiRequest(`/api/mentor-assignment/my-mentor${applicationId ? `?applicationId=${encodeURIComponent(applicationId)}` : ''}`),
  getMentorInfo: () => apiRequest('/api/mentor-assignment/statistics'),
  getMyMentees: () => apiRequest('/api/mentor-assignment/my-mentees'),

  // Course-related (Tasks / Meetings / Resources)
  getCourseTasks: () => apiRequest('/api/jobseeker/course/tasks'),
  submitCourseTask: (taskId, payload) => apiRequest(`/api/jobseeker/course/tasks/${encodeURIComponent(taskId)}/submit`, {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  }),

  submitCourseTaskFile: (taskId, formData) => apiRequest(`/api/jobseeker/course/tasks/${encodeURIComponent(taskId)}/submit-file`, {
    method: 'POST',
    body: formData,
    isFormData: true,
  }),
  resubmitTask: (taskId, formData) => apiRequest(`/api/jobseeker/course/tasks/${encodeURIComponent(taskId)}/resubmit`, {
    method: 'POST',
    body: formData,
    isFormData: true,
  }),
  getMilestoneFeedbacks: () => apiRequest('/api/jobseeker/course/milestones'),
  getSubmissionHistory: (submissionId) => apiRequest(`/api/jobseeker/course/submissions/${encodeURIComponent(submissionId)}/history`),
  getCourseMeetings: () => apiRequest('/api/jobseeker/course/meetings'),
  getCourseResources: () => apiRequest('/api/jobseeker/course/resources'),

  // Notifications (feedback alerts)
  getNotifications: () => apiRequest('/api/jobseeker/notifications'),

  // Feedback & Certificate
  checkFeedbackStatus: (applicationId) => apiRequest(`/api/jobseeker/feedback/${encodeURIComponent(applicationId)}`),
  submitFeedback: (feedbackData) => apiRequest('/api/jobseeker/feedback', {
    method: 'POST',
    body: JSON.stringify(feedbackData),
  }),
  downloadCertificate: async (applicationId) => {
    const response = await apiRequest(`/api/jobseeker/certificate/${encodeURIComponent(applicationId)}`);
    const data = response?.data || response;
    if (!data?.success || !data?.html) {
      throw new Error(data?.message || 'Failed to generate certificate');
    }
    const html2pdf = (await import('html2pdf.js')).default;
    const rawHTML = data.html;

    // 1. Extract <style> content from the HTML
    const styleMatch = rawHTML.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const cssText = styleMatch ? styleMatch[1] : '';

    // 2. Extract <body> content from the HTML
    const bodyMatch = rawHTML.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : rawHTML;

    // 3. Inject the CSS into the main document head (scoped with a unique wrapper)
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-cert-styles', 'true');
    // Scope all CSS rules inside our container to avoid conflicts
    const scopedCSS = cssText
      .replace(/body\s*\{/g, '#cert-pdf-container {')
      .replace(/@media print[\s\S]*?\{[\s\S]*?\}/g, ''); // Remove print media queries
    styleEl.textContent = scopedCSS;
    document.head.appendChild(styleEl);

    // 4. Load the Google Font
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap';
    fontLink.setAttribute('data-cert-font', 'true');
    document.head.appendChild(fontLink);

    // 5. Create an offscreen container and inject the body content
    const container = document.createElement('div');
    container.id = 'cert-pdf-container';
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1100px;background:#f0f0f0;display:flex;justify-content:center;align-items:center;padding:20px;font-family:Inter,sans-serif;';
    container.innerHTML = bodyContent;
    // Remove the print button from the certificate
    const printBtn = container.querySelector('.print-btn');
    if (printBtn) printBtn.remove();
    document.body.appendChild(container);

    // 6. Wait for fonts to fully load + render buffer
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 1000));

    // 7. Find the certificate wrapper and generate PDF
    const certEl = container.querySelector('.certificate-wrapper');
    if (!certEl) {
      // Cleanup
      document.body.removeChild(container);
      document.head.removeChild(styleEl);
      document.head.removeChild(fontLink);
      throw new Error('Certificate content not found');
    }

    try {
      await html2pdf()
        .set({
          margin: 0,
          filename: `${data.fileName || 'Certificate'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 1.5,
            useCORS: true,
            letterRendering: true,
            backgroundColor: '#ffffff',
            width: certEl.scrollWidth,
            height: certEl.scrollHeight
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
          pagebreak: { mode: ['avoid-all'] }
        })
        .from(certEl)
        .save();
    } finally {
      // 8. Cleanup — remove injected elements
      document.body.removeChild(container);
      document.head.removeChild(styleEl);
      document.head.removeChild(fontLink);
    }
  },

  // Employee-specific APIs
  getEmployeeProfile: () => apiRequest('/api/employee/profile'),
  updateEmployeeProfile: (profileData) => apiRequest('/api/employee/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  }),
  getEmployeeCompany: (companyId) => apiRequest(`/api/employee/company/${encodeURIComponent(companyId)}`),
};

export const mentorApi = {
  // Mentor mentees (available backend route)
  getMentees: () => apiRequest('/api/mentor/mentees'),

  // Mentor Internships & Projects - Domains
  getIPDomains: () => apiRequest('/api/mentor/internships-projects/domains'),

  // Mentor Internships & Projects - Submissions
  getIPSubmissions: () => apiRequest('/api/mentor/internships-projects/submissions'),
  markIPSubmissionViewed: (submissionId) => apiRequest(`/api/mentor/internships-projects/submissions/${encodeURIComponent(submissionId)}/view`, {
    method: 'PATCH',
  }),
  approveSubmission: (submissionId, data) => apiRequest(`/api/mentor/internships-projects/submissions/${encodeURIComponent(submissionId)}/approve`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  rejectSubmission: (submissionId, data) => apiRequest(`/api/mentor/internships-projects/submissions/${encodeURIComponent(submissionId)}/reject`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getMenteeProgress: (menteeId, domain) => apiRequest(`/api/mentor/internships-projects/mentees/${encodeURIComponent(menteeId)}/progress?domain=${encodeURIComponent(domain)}`),
  getSubmissionHistory: (submissionId) => apiRequest(`/api/mentor/internships-projects/submissions/${encodeURIComponent(submissionId)}/history`),
  submitMilestoneFeedback: (data) => apiRequest('/api/mentor/internships-projects/milestones/feedback', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getMilestoneFeedbacks: (menteeId, domain) => {
    let url = '/api/mentor/internships-projects/milestones?';
    if (menteeId) url += `menteeId=${encodeURIComponent(menteeId)}&`;
    if (domain) url += `domain=${encodeURIComponent(domain)}`;
    return apiRequest(url);
  },

  // Mentor Internships & Projects - Meetings
  getIPMeetings: () => apiRequest('/api/mentor/internships-projects/meetings'),
  createIPMeeting: (data) => apiRequest('/api/mentor/internships-projects/meetings', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Mentor Internships & Projects - Resources
  getIPResources: () => apiRequest('/api/mentor/internships-projects/resources'),
  createIPResource: (data) => apiRequest('/api/mentor/internships-projects/resources', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Mentor Internships & Projects - Tasks
  getIPTasks: (domain) => {
    const params = domain ? `?domain=${encodeURIComponent(domain)}` : '';
    return apiRequest(`/api/mentor/internships-projects/tasks${params}`);
  },
  createIPTask: (data) => apiRequest('/api/mentor/internships-projects/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Mentor Internships & Projects - Mentees by domain
  getIPMenteesByDomain: (domain) => apiRequest(`/api/mentor/internships-projects/mentees?domain=${encodeURIComponent(domain)}`),
};

export const employerApi = {
  // Internship posting management
  getInternships: () => apiRequest('/api/employer/internships'),
  createInternship: (internshipData) => apiRequest('/api/employer/internships', {
    method: 'POST',
    body: JSON.stringify(internshipData),
  }),
  updateInternship: (id, internshipData) => apiRequest(`/api/employer/internships/${id}`, {
    method: 'PUT',
    body: JSON.stringify(internshipData),
  }),
  deleteInternship: (id) => apiRequest(`/api/employer/internships/${id}`, {
    method: 'DELETE',
  }),

  // Application management
  getDetailedApplications: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    const url = `/api/employer/applications-detailed${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest(url);
  },

  getApplicationDetails: (id) => apiRequest(`/api/employer/applications-detailed/${id}`),

  updateApplicationStatus: (id, status, notes = '') => apiRequest(`/api/employer/applications-detailed/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  }),

  // Assign online test to shortlisted application
  assignTest: (applicationId, expiresInHours = 24) => apiRequest('/api/tests/assign', {
    method: 'POST',
    body: JSON.stringify({ applicationId, expiresInHours }),
  }),

  resetTest: (applicationId) => apiRequest('/api/tests/reset', {
    method: 'POST',
    body: JSON.stringify({ applicationId }),
  }),

  // Dropdown data
  getInternshipTitles: (industry) => apiRequest(`/api/employer/internship-titles${industry ? `?industry=${encodeURIComponent(industry)}` : ''}`),
  getIndiaLocations: () => apiRequest('/api/employer/india-locations'),

  // Mentor request management
  getMentorRequests: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    const url = `/api/mentor/requests${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest(url);
  },

  submitMentorRequest: (requestData) => apiRequest('/api/mentor/request', {
    method: 'POST',
    body: JSON.stringify(requestData),
  }),

  // Company mentors with mentees and progress
  getMentors: () => apiRequest('/api/employer/mentors'),

  // Employee requests management
  getEmployeeRequests: (filters = {}, page = 1) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    const url = `/api/employer/employee-requests?${params.toString()}`;
    return apiRequest(url);
  },

  updateEmployeeRequestStatus: (requestId, status, adminNotes = '') => apiRequest(`/api/employer/employee-requests/${requestId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, adminNotes }),
  }),

  deleteEmployeeRequest: (requestId) => apiRequest(`/api/employer/employee-requests/${requestId}`, {
    method: 'DELETE',
  }),
};

export const healthCheck = () => apiRequest('/api/health');

// Tests API (for client-side submission flows if needed)
export const testsApi = {
  get: (token) => apiRequest(`/api/tests/${encodeURIComponent(token)}`),
  submit: (token, answers) => apiRequest('/api/tests/submit', {
    method: 'POST',
    body: JSON.stringify({ token, answers })
  }),
  preview: (title, skills = [], model, provider = 'gemini') => apiRequest('/api/tests/preview', {
    method: 'POST',
    body: JSON.stringify({ title, skills, model, provider })
  })
};