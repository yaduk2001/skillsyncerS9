const DOMAIN_KEYWORDS = {
  ecommerce: ['e-commerce', 'ecommerce', 'shopify', 'woocommerce', 'magento', 'cart', 'checkout'],
  finance: ['fintech', 'banking', 'payments', 'ledger', 'kYC', 'kyc', 'aml', 'loan', 'credit', 'debit'],
  marketing: ['seo', 'sem', 'campaign', 'social media', 'content marketing', 'brand'],
  technology: ['software', 'saas', 'cloud', 'microservices', 'api', 'devops', 'kubernetes', 'docker'],
  education: ['edtech', 'learning', 'course', 'student', 'teacher', 'classroom'],
  healthcare: ['healthcare', 'medical', 'patient', 'clinical', 'hospital', 'diagnostic'],
  other: []
};

const SKILL_REGEX = /\b(java|javascript|typescript|python|react|node(?:\.js)?|express|mongodb|sql|postgres|mysql|html|css|tailwind|next(?:\.js)?|angular|vue|redux|docker|kubernetes|aws|gcp|azure|git|figma|photoshop|illustrator|nlp|ml|ai|data(?:\s*science)?|rest|graphql)\b/gi;

function extractPostingCriteria(internship) {
  const description = (internship.description || '').toLowerCase();
  const title = (internship.title || '').toLowerCase();
  const tags = Array.isArray(internship.tags) ? internship.tags.map((t) => String(t).toLowerCase()) : [];

  // Visible skills
  const visibleSkills = (internship.skillsRequired || []).map((s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim());

  // Hidden/implied skills from description/title/tags
  const hiddenSkills = new Set();
  const scanText = [description, title, tags.join(' ')].join(' ');
  (scanText.match(SKILL_REGEX) || []).forEach((m) => hiddenSkills.add(m.toLowerCase()));

  // Domain detection
  let domain = internship.industry || 'Other';
  const domainHits = [];
  Object.entries(DOMAIN_KEYWORDS).forEach(([key, words]) => {
    const hits = words.filter((w) => scanText.includes(w));
    if (hits.length) domainHits.push({ key, hits: hits.length });
  });
  if (domainHits.length) {
    domainHits.sort((a, b) => b.hits - a.hits);
    domain = domainHits[0].key;
  }

  // Qualifications/preferences heuristics
  const qualifications = [];
  if (/b\.?tech|bachelor|be\b/i.test(scanText)) qualifications.push('bachelor');
  if (/m\.?tech|master|me|mca\b/i.test(scanText)) qualifications.push('master');
  if (/fresher|freshers only/i.test(scanText)) qualifications.push('freshers');
  if (/experience|experienced/i.test(scanText)) qualifications.push('experienced');

  return {
    skills: Array.from(new Set([...visibleSkills, ...Array.from(hiddenSkills)])),
    certifications: (internship.certifications || []).map(c => String(c).toLowerCase()),
    domain,
    qualifications,
    mode: (internship.mode || '').toLowerCase(),
    location: (internship.location || '').toLowerCase(),
    eligibilityText: (internship.eligibility || '').toLowerCase()
  };
}

function extractApplicant(profile, user = null, applicationData = null) {
  const skills = new Set();
  (profile?.nlp?.extracted?.skills || []).forEach((s) => skills.add(String(s).toLowerCase().replace(/\s+/g, ' ').trim()));
  (profile?.skills || []).forEach((s) => skills.add(String(s).toLowerCase().replace(/\s+/g, ' ').trim()));

  // Extract from User profile
  if (user?.profile?.skills) {
    user.profile.skills.forEach((s) => skills.add(String(s).toLowerCase().replace(/\s+/g, ' ').trim()));
  }

  // Extract from Application Data
  if (applicationData?.skills) {
    if (Array.isArray(applicationData.skills)) {
      // Direct array
      applicationData.skills.forEach((s) => skills.add(String(s).toLowerCase().replace(/\s+/g, ' ').trim()));
    } else if (applicationData.skills.technicalSkills && Array.isArray(applicationData.skills.technicalSkills)) {
      // Nested technicalSkills
      applicationData.skills.technicalSkills.forEach((s) => skills.add(String(s).toLowerCase().replace(/\s+/g, ' ').trim()));
    }
  }

  // Combine education from multiple sources
  const educationStrings = [];

  // From JobseekerProfile
  (profile?.education || []).forEach((e) => {
    educationStrings.push(`${e.degree || ''} ${e.specialization || ''}`.trim().toLowerCase());
  });

  // From User profile
  if (user?.profile?.education && Array.isArray(user.profile.education)) {
    user.profile.education.forEach((e) => {
      educationStrings.push(`${e.degree || ''} ${e.field || ''}`.trim().toLowerCase());
    });
  }

  // From Application Data
  if (applicationData?.educationDetails) {
    const ed = applicationData.educationDetails;
    educationStrings.push(`${ed.highestQualification || ''} ${ed.institutionName || ''}`.trim().toLowerCase());
  }

  // Extract certifications from profile
  const certifications = new Set();
  (profile?.certifications || []).forEach(c => {
    if (c.name) certifications.add(c.name.trim().toLowerCase());
  });

  // From User profile
  if (user?.profile?.certifications && Array.isArray(user.profile.certifications)) {
    user.profile.certifications.forEach((c) => {
      if (c.name) certifications.add(c.name.trim().toLowerCase());
    });
  }

  // From Application Data
  // Assuming applicationData might have a certifications array or similar structure if detailed apply is used
  // Or it might be in 'additionalInfo' if not structured. 
  // For now checking explicit certifications if structure matches
  if (applicationData?.certifications && Array.isArray(applicationData.certifications)) {
    applicationData.certifications.forEach(c => certifications.add(String(c).toLowerCase()));
  }


  // Domain guess from resume text keywords
  const resumeText = (profile?.nlp?.parsedText || '').toLowerCase();
  let domain = 'other';
  const domainHits = [];
  Object.entries(DOMAIN_KEYWORDS).forEach(([key, words]) => {
    const hits = words.filter((w) => resumeText.includes(w)).length;
    if (hits) domainHits.push({ key, hits });
  });
  if (domainHits.length) {
    domainHits.sort((a, b) => b.hits - a.hits);
    domain = domainHits[0].key;
  }

  // Extract contact information from multiple sources
  // Priority: applicationData > user > profile
  let email = '';
  let contactNumber = '';
  let linkedin = '';
  let github = '';

  // From application data (if available)
  if (applicationData?.personalDetails) {
    email = applicationData.personalDetails.emailAddress || '';
    contactNumber = applicationData.personalDetails.contactNumber || '';
    linkedin = applicationData.personalDetails.linkedinProfile || '';
    github = applicationData.personalDetails.githubPortfolio || '';
  }

  // From user object (if available and not already set)
  if (user) {
    if (!email && user.email) email = user.email;
    if (!contactNumber && user.phone) contactNumber = user.phone;
    if (!linkedin && user.profile?.socialLinks?.linkedin) linkedin = user.profile.socialLinks.linkedin;
    if (!github && user.profile?.socialLinks?.github) github = user.profile.socialLinks.github;
  }

  // Also check resume text for LinkedIn/GitHub URLs
  if (resumeText) {
    const linkedinMatch = resumeText.match(/(?:linkedin\.com\/in\/|linkedin\.com\/profile\/)([a-zA-Z0-9-]+)/i);
    if (!linkedin && linkedinMatch) {
      linkedin = `https://linkedin.com/in/${linkedinMatch[1]}`;
    }
    const githubMatch = resumeText.match(/(?:github\.com\/)([a-zA-Z0-9-]+)/i);
    if (!github && githubMatch) {
      github = `https://github.com/${githubMatch[1]}`;
    }
    const emailMatch = resumeText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (!email && emailMatch) {
      email = emailMatch[1];
    }
    const phoneMatch = resumeText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (!contactNumber && phoneMatch) {
      contactNumber = phoneMatch[0];
    }
  }

  return {
    skills: Array.from(skills),
    certifications: Array.from(certifications),
    educationStrings,
    domain,
    contactInfo: {
      email: email.trim(),
      contactNumber: contactNumber.trim(),
      linkedin: linkedin.trim(),
      github: github.trim()
    }
  };
}

function computeMatchScore(criteria, applicant) {
  const matched = [];
  const unmatched = [];

  // 1. Skill overlap (50%) - REDUCED FROM 60%
  // 1. Skill overlap (50%)
  const requiredSkills = criteria.skills || [];
  const applicantSkills = Array.from(new Set(applicant.skills || [])); // Convert to array for iteration
  let skillMatches = 0;

  requiredSkills.forEach((reqSkill) => {
    // Loose match: check if reqSkill is inside any applicantSkill OR vice versa
    const isMatch = applicantSkills.some(appSkill =>
      appSkill.includes(reqSkill) || reqSkill.includes(appSkill)
    );

    if (isMatch) {
      matched.push(`skill:${reqSkill}`);
      skillMatches++;
    } else {
      unmatched.push(`skill:${reqSkill}`);
    }
  });
  const skillScore = requiredSkills.length ? (skillMatches / requiredSkills.length) : 0;

  // 2. Certification Match (10%) - NEW
  const requiredCerts = criteria.certifications || [];
  const applicantCerts = new Set(applicant.certifications || []);
  let certMatches = 0;
  requiredCerts.forEach(c => {
    // Soft match check (substring) since names might vary slightly
    const hasCert = Array.from(applicantCerts).some(ac => ac.includes(c) || c.includes(ac));
    if (hasCert) {
      matched.push(`cert:${c}`);
      certMatches++;
    } else {
      unmatched.push(`cert:${c}`);
    }
  });
  // If no certs required, give full score for this section to avoid penalizing? 
  // For simplicity: If no certs required, score = 1 (don't penalize).
  const certScore = requiredCerts.length ? (certMatches / requiredCerts.length) : 1;

  // 3. Domain relevance (20%)
  const domainScore = criteria.domain && applicant.domain && criteria.domain.toLowerCase() === applicant.domain.toLowerCase() ? 1 : 0;
  if (domainScore) matched.push(`domain:${criteria.domain}`); else unmatched.push(`domain:${criteria.domain}`);

  // 4. Qualification hint match (10%)
  const qualText = applicant.educationStrings.join(' ');
  let qualHit = 0;
  if (criteria.qualifications?.includes('master') && /master|m\.tech|me|mca\b/i.test(qualText)) qualHit = 1;
  else if (criteria.qualifications?.includes('bachelor') && /bachelor|b\.tech|be\b/i.test(qualText)) qualHit = 1;
  const qualScore = qualHit;
  if (qualScore) matched.push('qualification'); else if ((criteria.qualifications || []).length) unmatched.push('qualification');

  // 5. Contact information completeness (10%)
  // Score based on presence of email, contact number, LinkedIn, and GitHub
  const contactInfo = applicant.contactInfo || {};
  let contactScore = 0;
  const contactFields = [
    { key: 'email', value: contactInfo.email, weight: 0.25 },
    { key: 'contactNumber', value: contactInfo.contactNumber, weight: 0.25 },
    { key: 'linkedin', value: contactInfo.linkedin, weight: 0.25 },
    { key: 'github', value: contactInfo.github, weight: 0.25 }
  ];

  contactFields.forEach((field) => {
    const isValid = field.value &&
      field.value.trim() !== '' &&
      field.value.toLowerCase() !== 'na' &&
      field.value.toLowerCase() !== 'n/a';

    if (isValid) {
      // Additional validation for URLs
      if (field.key === 'linkedin' || field.key === 'github') {
        if (field.value.includes('linkedin.com') || field.value.includes('github.com')) {
          contactScore += field.weight;
          matched.push(`contact:${field.key}`);
        } else {
          unmatched.push(`contact:${field.key}`);
        }
      } else if (field.key === 'email') {
        // Basic email validation
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
          contactScore += field.weight;
          matched.push(`contact:${field.key}`);
        } else {
          unmatched.push(`contact:${field.key}`);
        }
      } else if (field.key === 'contactNumber') {
        // Basic phone validation (at least 10 digits)
        const digitsOnly = field.value.replace(/\D/g, '');
        if (digitsOnly.length >= 10) {
          contactScore += field.weight;
          matched.push(`contact:${field.key}`);
        } else {
          unmatched.push(`contact:${field.key}`);
        }
      } else {
        unmatched.push(`contact:${field.key}`);
      }
    } else {
      unmatched.push(`contact:${field.key}`);
    }
  });

  const total = Math.round((0.5 * skillScore + 0.1 * certScore + 0.2 * domainScore + 0.1 * qualScore + 0.1 * contactScore) * 100);
  return { score: total, matched, unmatched };
}

function decideAction(score, threshold = 55) {
  return score >= threshold ? 'Proceed to Recruiter' : 'Auto-Rejected';
}

function buildSummary(applicantName, score, matched, unmatched) {
  const topMatched = matched.filter((m) => m.startsWith('skill:')).slice(0, 5).map((m) => m.replace('skill:', ''));
  const topMissing = unmatched.filter((m) => m.startsWith('skill:')).slice(0, 5).map((m) => m.replace('skill:', ''));
  return `${applicantName || 'Applicant'} match score ${score}%. Matched: ${topMatched.join(', ') || 'none'}. Missing: ${topMissing.join(', ') || 'none'}.`;
}

module.exports = {
  extractPostingCriteria,
  extractApplicant,
  computeMatchScore,
  decideAction,
  buildSummary
};


