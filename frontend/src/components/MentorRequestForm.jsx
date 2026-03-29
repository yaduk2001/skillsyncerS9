import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config/api';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building,
  FileText,
  Award,
  Clock,
  CheckCircle,
  X,
  Send,
  UserCheck,
  AlertCircle
} from 'lucide-react';

const MentorRequestForm = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employeeName: '',
    employeeEmail: '',
    employeePhone: '',
    employeePosition: '',
    employeeDepartment: '',
    justification: '',
    expertise: '',
    yearsOfExperience: ''
  });
  const [companyIndustry, setCompanyIndustry] = useState('');
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [positionOptions, setPositionOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  // Map backend industry to categories used by titles endpoint
  const industryToCategory = useMemo(() => ({
    technology: 'IT/Technology',
    finance: 'Banking',
    healthcare: 'Healthcare',
    education: 'Education'
  }), []);

  // Department suggestions per industry
  const getDepartmentsForIndustry = (industry) => {
    switch (industry) {
      case 'technology':
        return ['Engineering', 'Product', 'Quality Assurance', 'DevOps', 'Data Science', 'IT Support', 'Sales', 'Marketing', 'Human Resources', 'Finance', 'Customer Success'];
      case 'finance':
        return ['Finance', 'Risk Management', 'Compliance', 'Operations', 'Information Technology', 'Sales', 'Marketing', 'Human Resources', 'Customer Service'];
      case 'healthcare':
        return ['Clinical', 'Research & Development', 'Healthcare IT', 'Administration', 'Operations', 'Human Resources', 'Finance'];
      case 'education':
        return ['Teaching', 'Curriculum', 'Student Affairs', 'Administration', 'IT', 'Library', 'Career Services', 'Marketing', 'Human Resources'];
      case 'retail':
      case 'manufacturing':
      case 'consulting':
      case 'media':
      case 'real-estate':
      case 'transportation':
      case 'other':
      default:
        return ['Operations', 'Sales', 'Marketing', 'Information Technology', 'Human Resources', 'Finance', 'Customer Support'];
    }
  };

  // Load current company (employer) details for industry
  useEffect(() => {
    const loadCompany = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const resp = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await resp.json();
        if (data?.success && data.data?.user) {
          const industry = data.data.user.company?.industry || '';
          setCompanyIndustry(industry);
          setDepartmentOptions(getDepartmentsForIndustry(industry));
        }
      } catch (e) {
        // non-fatal
      }
    };
    loadCompany();
  }, []);

  // Load position options based on industry category
  useEffect(() => {
    const loadPositions = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const category = industryToCategory[companyIndustry] || '';
        const qs = category ? `?industry=${encodeURIComponent(category)}` : '';
        const resp = await fetch(`${API_BASE_URL}/api/employer/internship-titles${qs}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await resp.json();
        if (data?.success && Array.isArray(data.data)) {
          setPositionOptions(data.data);
        }
      } catch (e) {
        // non-fatal
      }
    };
    loadPositions();
  }, [companyIndustry, industryToCategory]);

  // ---------- Validation helpers ----------
  const sanitizeString = (value) => (value ?? '').toString();
  const trimToNull = (value) => {
    const v = sanitizeString(value).trim();
    return v.length === 0 ? '' : v;
  };
  const isValidEmail = (email) => {
    const value = sanitizeString(email).trim();
    // RFC5322-lite, practical production regex
    const re = /^(?:[a-zA-Z0-9_'^&\/+-])+(?:\.(?:[a-zA-Z0-9_'^&\/+-])+)*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    return re.test(value) && value.length <= 254;
  };
  const normalizePhone = (phone) => sanitizeString(phone).replace(/[^0-9]/g, '');
  const isValidPhone = (phone) => {
    const normalized = normalizePhone(phone);
    // India format: exactly 10 digits, starting with 6,7,8,9
    return /^[6-9]\d{9}$/.test(normalized);
  };
  const isValidName = (name) => {
    const n = sanitizeString(name).trim();
    if (n.length < 2 || n.length > 100) return false;
    // Only letters and spaces
    return /^[\p{L}\s]+$/u.test(n);
  };
  const allowedExperience = new Set(['0-1', '1-3', '3-5', '5-10', '10+']);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Live validate specific field
    setErrors(prev => {
      const next = { ...prev };
      const v = sanitizeString(value);
      switch (field) {
        case 'employeeName':
          next.employeeName = isValidName(v) ? '' : 'Only characters and spaces are allowed';
          break;
        case 'employeeEmail':
          next.employeeEmail = isValidEmail(v) ? '' : 'Enter valid email id';
          break;
        case 'employeePhone': {
          const norm = normalizePhone(v);
          next.employeePhone = isValidPhone(v) ? '' : 'Enter a valid 10-digit phone starting with 6/7/8/9';
          // also reflect normalized characters only if user pasted
          if (/[^0-9]/.test(v)) {
            // do not forcibly replace user's input here; just validate
          }
          break;
        }
        case 'employeePosition':
          next.employeePosition = (!v.trim()) ? 'Employee position is required' : (positionOptions.length > 0 && !positionOptions.includes(v) ? 'Select a position from the list' : '');
          break;
        case 'employeeDepartment':
          next.employeeDepartment = (!v.trim()) ? 'Employee department is required' : (departmentOptions.length > 0 && !departmentOptions.includes(v) ? 'Select a department from the list' : '');
          break;
        case 'justification': {
          const t = v.trim();
          if (!t) {
            next.justification = 'Justification is required';
          } else if (t.length > 1000) {
            next.justification = 'Justification cannot exceed 1000 characters';
          } else {
            next.justification = '';
          }
          break;
        }
        case 'yearsOfExperience':
          next.yearsOfExperience = allowedExperience.has(v) ? '' : 'Select a valid experience band';
          break;
        case 'expertise': {
          const tokens = sanitizeString(v).split(',').map(s => s.trim()).filter(Boolean);
          next.expertise = tokens.length > 20
            ? 'Limit expertise to 20 items maximum'
            : (tokens.some(t => t.length > 30) ? 'Each expertise item must be 30 characters or less' : '');
          break;
        }
        default:
          break;
      }
      return next;
    });
  };

  const validateForm = () => {
    const newErrors = {};

    // Name
    const name = trimToNull(formData.employeeName);
    if (!name) {
      newErrors.employeeName = 'Employee name is required';
    } else if (!isValidName(name)) {
      newErrors.employeeName = 'Only characters and spaces are allowed';
    }

    // Email
    const email = trimToNull(formData.employeeEmail);
    if (!email) {
      newErrors.employeeEmail = 'Employee email is required';
    } else if (!isValidEmail(email)) {
      newErrors.employeeEmail = 'Enter valid email id';
    }

    // Phone
    const phone = trimToNull(formData.employeePhone);
    if (!phone) {
      newErrors.employeePhone = 'Employee phone is required';
    } else {
      const normalized = normalizePhone(phone);
      if (!normalized || !isValidPhone(phone)) {
        newErrors.employeePhone = 'Enter a valid 10-digit Indian phone number (starting with 6, 7, 8, or 9)';
      }
    }

    // Position (must be chosen)
    const pos = trimToNull(formData.employeePosition);
    if (!pos) {
      newErrors.employeePosition = 'Employee position is required';
    } else if (positionOptions.length > 0 && !positionOptions.includes(pos)) {
      newErrors.employeePosition = 'Select a position from the list';
    }

    // Department (must be chosen)
    const dept = trimToNull(formData.employeeDepartment);
    if (!dept) {
      newErrors.employeeDepartment = 'Employee department is required';
    } else if (departmentOptions.length > 0 && !departmentOptions.includes(dept)) {
      newErrors.employeeDepartment = 'Select a department from the list';
    }

    // Justification
    const just = trimToNull(formData.justification);
    if (!just) {
      newErrors.justification = 'Justification is required';
    } else if (just.length > 1000) {
      newErrors.justification = 'Justification cannot exceed 1000 characters';
    }

    // Years of experience
    if (!formData.yearsOfExperience) {
      newErrors.yearsOfExperience = 'Years of experience is required';
    } else if (!allowedExperience.has(formData.yearsOfExperience)) {
      newErrors.yearsOfExperience = 'Select a valid experience band';
    }

    // Expertise tokens (optional constraints)
    if (sanitizeString(formData.expertise).trim()) {
      const tokens = sanitizeString(formData.expertise)
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      if (tokens.length > 20) {
        newErrors.expertise = 'Limit expertise to 20 items maximum';
      } else if (tokens.some(t => t.length > 30)) {
        newErrors.expertise = 'Each expertise item must be 30 characters or less';
      }
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form first - this will set errors state
    const validationErrors = {};

    // Name
    const name = trimToNull(formData.employeeName);
    if (!name) {
      validationErrors.employeeName = 'Employee name is required';
    } else if (!isValidName(name)) {
      validationErrors.employeeName = 'Only characters and spaces are allowed';
    }

    // Email
    const email = trimToNull(formData.employeeEmail);
    if (!email) {
      validationErrors.employeeEmail = 'Employee email is required';
    } else if (!isValidEmail(email)) {
      validationErrors.employeeEmail = 'Enter valid email id';
    }

    // Phone
    const phone = trimToNull(formData.employeePhone);
    if (!phone) {
      validationErrors.employeePhone = 'Employee phone is required';
    } else {
      const normalized = normalizePhone(phone);
      if (!normalized || !isValidPhone(phone)) {
        validationErrors.employeePhone = 'Enter a valid 10-digit Indian phone number (starting with 6, 7, 8, or 9)';
      }
    }

    // Position
    const pos = trimToNull(formData.employeePosition);
    if (!pos) {
      validationErrors.employeePosition = 'Employee position is required';
    } else if (positionOptions.length > 0 && !positionOptions.includes(pos)) {
      validationErrors.employeePosition = 'Select a position from the list';
    }

    // Department
    const dept = trimToNull(formData.employeeDepartment);
    if (!dept) {
      validationErrors.employeeDepartment = 'Employee department is required';
    } else if (departmentOptions.length > 0 && !departmentOptions.includes(dept)) {
      validationErrors.employeeDepartment = 'Select a department from the list';
    }

    // Justification
    const just = trimToNull(formData.justification);
    if (!just) {
      validationErrors.justification = 'Justification is required';
    } else if (just.length > 1000) {
      validationErrors.justification = 'Justification cannot exceed 1000 characters';
    }

    // Years of experience
    if (!formData.yearsOfExperience) {
      validationErrors.yearsOfExperience = 'Years of experience is required';
    } else if (!allowedExperience.has(formData.yearsOfExperience)) {
      validationErrors.yearsOfExperience = 'Select a valid experience band';
    }

    // Expertise tokens (optional constraints)
    if (sanitizeString(formData.expertise).trim()) {
      const tokens = sanitizeString(formData.expertise)
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      if (tokens.length > 20) {
        validationErrors.expertise = 'Limit expertise to 20 items maximum';
      } else if (tokens.some(t => t.length > 30)) {
        validationErrors.expertise = 'Each expertise item must be 30 characters or less';
      }
    }

    // Set errors and check if valid
    setErrors(validationErrors);
    const isValid = Object.keys(validationErrors).length === 0;

    if (!isValid) {
      // Scroll to first error
      setTimeout(() => {
        const firstErrorField = Object.keys(validationErrors)[0];
        if (firstErrorField) {
          const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            errorElement.focus();
          }
        }
      }, 100);
      return;
    }

    setLoading(true);
    setErrors({}); // Clear previous errors

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        const errorMsg = 'Authentication required. Please log in again.';
        setPopupMessage(errorMsg);
        setShowErrorPopup(true);
        setErrors({ submit: errorMsg });
        setLoading(false);
        return;
      }

      // Prepare sanitized payload
      const normalizedPhone = normalizePhone(formData.employeePhone);
      if (!normalizedPhone || normalizedPhone.length === 0) {
        const errorMsg = 'Invalid phone number. Please enter a valid 10-digit phone number.';
        setPopupMessage(errorMsg);
        setShowErrorPopup(true);
        setErrors({ submit: errorMsg });
        setLoading(false);
        return;
      }

      const payload = {
        employeeName: trimToNull(formData.employeeName),
        employeeEmail: trimToNull(formData.employeeEmail),
        employeePhone: normalizedPhone,
        employeePosition: trimToNull(formData.employeePosition),
        employeeDepartment: trimToNull(formData.employeeDepartment),
        justification: trimToNull(formData.justification),
        yearsOfExperience: formData.yearsOfExperience,
        expertise: sanitizeString(formData.expertise)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .slice(0, 20)
      };

      // Validate payload before sending
      if (!payload.employeeName || !payload.employeeEmail || !payload.employeePhone ||
        !payload.employeePosition || !payload.employeeDepartment || !payload.justification ||
        !payload.yearsOfExperience) {
        const errorMsg = 'All required fields must be filled.';
        setPopupMessage(errorMsg);
        setShowErrorPopup(true);
        setErrors({ submit: errorMsg });
        setLoading(false);
        return;
      }

      console.log('Submitting mentor request with payload:', { ...payload, justification: payload.justification.substring(0, 50) + '...' });

      const response = await fetch(`${API_BASE_URL}/api/mentor/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        // Try to parse error response
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `Server error: ${response.status} ${response.statusText}` };
        }
        console.error('API Error Response:', errorData);
        const errorMsg = errorData.message || errorData.error || `Failed to submit mentor request (${response.status})`;
        setPopupMessage(errorMsg);
        setShowErrorPopup(true);
        setErrors({ submit: errorMsg });
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (data.success) {
        setLoading(false);
        setPopupMessage('Mentor request submitted successfully! Please wait for admin verification. You will be notified once it is reviewed.');
        setShowSuccessPopup(true);
        // Call onSuccess callback after showing popup
        setTimeout(() => {
          onSuccess && onSuccess(data.data);
        }, 100);
      } else {
        console.error('Submission failed:', data);
        const errorMsg = data.message || data.error || 'Failed to submit mentor request. Please try again.';
        setPopupMessage(errorMsg);
        setShowErrorPopup(true);
        setErrors({ submit: errorMsg });
        setLoading(false);
      }
    } catch (error) {
      console.error('Error submitting mentor request:', error);
      const errorMsg = error.message || 'Network error. Please check your connection and try again.';
      setPopupMessage(errorMsg);
      setShowErrorPopup(true);
      setErrors({ submit: errorMsg });
      setLoading(false);
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-100"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white/80 backdrop-blur-sm z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Submit Mentor Request</h3>
              <p className="text-sm text-gray-600 mt-1">Request to assign an employee as a mentor</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Information Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Assign Employee as Mentor</h3>
                <p className="text-blue-700 text-sm">
                  You can request to assign any employee as a mentor, whether they're already registered on the platform or not. Existing employees will be notified of their new mentor role.
                </p>
              </div>
            </div>
          </div>

          {/* Employee Information */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-indigo-600" />
              Employee Information
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.employeeName}
                  onChange={(e) => handleInputChange('employeeName', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.employeeName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Enter employee's full name"
                />
                {errors.employeeName && (
                  <p className="text-red-500 text-sm mt-1">{errors.employeeName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="employeeEmail"
                  value={formData.employeeEmail}
                  onChange={(e) => handleInputChange('employeeEmail', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.employeeEmail ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Enter employee's email"
                />
                {errors.employeeEmail && (
                  <p className="text-red-500 text-sm mt-1">{errors.employeeEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="employeePhone"
                  value={formData.employeePhone}
                  onChange={(e) => handleInputChange('employeePhone', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.employeePhone ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Enter phone number (e.g., 9876543210)"
                />
                {errors.employeePhone && (
                  <p className="text-red-500 text-sm mt-1">{errors.employeePhone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position *
                </label>
                <select
                  name="employeePosition"
                  value={formData.employeePosition}
                  onChange={(e) => handleInputChange('employeePosition', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.employeePosition ? 'border-red-300' : 'border-gray-300'
                    }`}
                >
                  <option value="">Select position</option>
                  {positionOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {errors.employeePosition && (
                  <p className="text-red-500 text-sm mt-1">{errors.employeePosition}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department *
                </label>
                <select
                  name="employeeDepartment"
                  value={formData.employeeDepartment}
                  onChange={(e) => handleInputChange('employeeDepartment', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.employeeDepartment ? 'border-red-300' : 'border-gray-300'
                    }`}
                >
                  <option value="">Select department</option>
                  {departmentOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {errors.employeeDepartment && (
                  <p className="text-red-500 text-sm mt-1">{errors.employeeDepartment}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience *
                </label>
                <select
                  name="yearsOfExperience"
                  value={formData.yearsOfExperience}
                  onChange={(e) => handleInputChange('yearsOfExperience', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.yearsOfExperience ? 'border-red-300' : 'border-gray-300'
                    }`}
                >
                  <option value="">Select experience level</option>
                  <option value="0-1">0-1 years</option>
                  <option value="1-3">1-3 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="5-10">5-10 years</option>
                  <option value="10+">10+ years</option>
                </select>
                {errors.yearsOfExperience && (
                  <p className="text-red-500 text-sm mt-1">{errors.yearsOfExperience}</p>
                )}
              </div>
            </div>
          </div>

          {/* Expertise and Justification */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2 text-indigo-600" />
              Expertise & Justification
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Areas of Expertise
                </label>
                <input
                  type="text"
                  value={formData.expertise}
                  onChange={(e) => handleInputChange('expertise', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., React, Node.js, Python, Machine Learning (comma-separated)"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple areas with commas</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Justification for Mentorship *
                </label>
                <textarea
                  name="justification"
                  value={formData.justification}
                  onChange={(e) => handleInputChange('justification', e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors.justification ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Explain why this employee should be assigned as a mentor. Include their qualifications, experience, and how they can help guide others..."
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.justification && (
                    <p className="text-red-500 text-sm">{errors.justification}</p>
                  )}
                  <p className="text-xs text-gray-500 ml-auto">
                    {formData.justification.length}/1000 characters
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border-2 border-red-300 rounded-lg p-4"
            >
              <p className="text-red-700 text-sm font-medium flex items-center">
                <X className="w-4 h-4 mr-2" />
                {errors.submit}
              </p>
            </motion.div>
          )}

          {/* Validation Summary */}
          {Object.keys(errors).filter(key => key !== 'submit').length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
            >
              <p className="text-yellow-800 text-sm font-medium mb-2">
                Please fix the following errors:
              </p>
              <ul className="list-disc list-inside text-yellow-700 text-sm space-y-1">
                {Object.entries(errors)
                  .filter(([key]) => key !== 'submit')
                  .map(([key, value]) => (
                    <li key={key}>{value}</li>
                  ))}
              </ul>
            </motion.div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.05 }}
              whileTap={{ scale: loading ? 1 : 0.95 }}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Request</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>

      {/* Success Popup */}
      <AnimatePresence>
        {showSuccessPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => {
              setShowSuccessPopup(false);
              onClose();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", bounce: 0.4 }}
                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-8 h-8 text-green-600" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Success!</h3>
              <p className="text-gray-600 mb-6">
                {popupMessage}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowSuccessPopup(false);
                  onClose();
                }}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-medium"
              >
                OK
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Popup */}
      <AnimatePresence>
        {showErrorPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => setShowErrorPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", bounce: 0.4 }}
                className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <AlertCircle className="w-8 h-8 text-red-600" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Submission Failed</h3>
              <p className="text-gray-600 mb-6">
                {popupMessage}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowErrorPopup(false)}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 font-medium"
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MentorRequestForm;
