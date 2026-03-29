import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';

const AIFinder = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState({});
  const [analyzedProfile, setAnalyzedProfile] = useState(null);

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');
    setAnalyzedProfile(null);
    try {
      const response = await axios.get(`${API_URL}/jobseeker/ai-recommendations`, config);
      if (response.data?.success) {
        setResults(response.data.data);
        setAnalyzedProfile(response.data.analysis || null);
        setShowResults(true);
      } else {
        setError(response.data.message || 'Failed to fetch recommendations.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error communicating with AI service. Is Python AI service running?');
    } finally {
      setLoading(false);
    }
  };

  const sendFeedback = async (internshipId, action) => {
    const key = `${internshipId}_${action}`;
    if (feedbackSent[key]) return;
    try {
      await axios.post(`${API_URL}/jobseeker/ai-feedback`, { internshipId, action }, config);
      setFeedbackSent(prev => ({ ...prev, [key]: true }));
    } catch (_) { /* silent fail */ }
  };

  const ScoreBar = ({ label, value, colorClass }) => (
    <div className={`p-2 rounded ${colorClass.bg}`}>
      <p className={`text-xs mb-1 font-medium ${colorClass.text}`}>{label}</p>
      <div className={`w-full ${colorClass.track} rounded-full h-1.5`}>
        <div className={`${colorClass.fill} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${Math.min(value, 100)}%` }}></div>
      </div>
      <p className={`text-right text-xs mt-1 font-bold ${colorClass.text}`}>{value}%</p>
    </div>
  );

  const scoreColors = {
    cbf:  { bg: 'bg-blue-50',   text: 'text-blue-700',   track: 'bg-blue-200',   fill: 'bg-blue-600'   },
    cf:   { bg: 'bg-orange-50', text: 'text-orange-700', track: 'bg-orange-200', fill: 'bg-orange-500' },
    kg:   { bg: 'bg-purple-50', text: 'text-purple-700', track: 'bg-purple-200', fill: 'bg-purple-600' },
    pref: { bg: 'bg-teal-50',   text: 'text-teal-700',   track: 'bg-teal-200',   fill: 'bg-teal-600'   },
  };

  const renderMatchCard = (item) => {
    const { internship, scores } = item;
    const isPriority = scores.final_score >= 55;
    const internshipId = internship._id;

    return (
      <div key={internshipId} className={`border rounded-xl p-4 hover:shadow-lg transition-all duration-300 bg-white ${isPriority ? 'border-green-200' : 'border-gray-200'}`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <h4 className="font-bold text-base text-gray-900 truncate">{internship.title}</h4>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
              </svg>
              <span className="truncate">{internship.companyName || 'Unknown Company'}</span>
            </p>
          </div>
          <div className={`text-center flex-shrink-0 px-3 py-1.5 rounded-xl border shadow-sm ${isPriority ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
            <p className="text-[10px] uppercase tracking-wider font-semibold">Match</p>
            <p className="text-lg font-bold leading-none mt-0.5">{scores.final_score}%</p>
          </div>
        </div>

        {/* Formula badge */}
        <div className="mb-3 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-[10px] text-indigo-600 font-mono text-center">
          R = 0.45·CBF + 0.15·CF + 0.25·KG + 0.15·Pref
        </div>

        {/* 4-Component Score Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <ScoreBar label="CBF — Semantic (Matches resume context)" value={scores.cbf_score ?? scores.semantic_score} colorClass={scoreColors.cbf} />
          <ScoreBar label="CF — Collaborative (Similar students applied)" value={scores.cf_score ?? 0} colorClass={scoreColors.cf} />
          <ScoreBar label="KG — Knowledge Graph (Discovers implied skills)" value={scores.kg_score ?? scores.skill_score} colorClass={scoreColors.kg} />
          <ScoreBar label="Pref — Preference (Matches location & bio)" value={scores.pref_score ?? 0} colorClass={scoreColors.pref} />
        </div>

        {/* Skills Analysis */}
        {scores.job_skills && scores.job_skills.length > 0 && (
          <div className="mb-4 bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Skill Analysis</p>
            <div className="flex flex-wrap gap-1.5">
              {/* Matched Skills */}
              {scores.job_skills.filter(s => (scores.expanded_candidate_skills || scores.candidate_skills || []).includes(s)).map((skill, idx) => (
                <span key={`match-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded textxs font-medium bg-green-100 text-green-800 border border-green-200" title="You have this skill">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  {skill}
                </span>
              ))}
              {/* Missing Skills */}
              {scores.job_skills.filter(s => !(scores.expanded_candidate_skills || scores.candidate_skills || []).includes(s)).map((skill, idx) => (
                <span key={`miss-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-100" title="Missing skill">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Buttons */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => sendFeedback(internshipId, 'bookmark')}
            className={`flex-1 text-xs py-1.5 px-2 rounded-lg border font-medium transition-colors ${feedbackSent[`${internshipId}_bookmark`] ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-white hover:bg-yellow-50 text-gray-600 border-gray-200'}`}
          >
            {feedbackSent[`${internshipId}_bookmark`] ? '★ Saved' : '☆ Save'}
          </button>
          <button
            onClick={() => sendFeedback(internshipId, 'apply')}
            className={`flex-1 text-xs py-1.5 px-2 rounded-lg border font-medium transition-colors ${feedbackSent[`${internshipId}_apply`] ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white hover:bg-green-50 text-gray-600 border-gray-200'}`}
          >
            {feedbackSent[`${internshipId}_apply`] ? '✓ Applied' : '→ Apply'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 my-6 border border-indigo-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-indigo-600 bg-indigo-50 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            AI Internship Finder
          </h2>
          <p className="text-gray-500 mt-1 text-sm">Hybrid model: Semantic · Collaborative · Knowledge Graph · Preference</p>
        </div>
        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing…
            </>
          ) : '⚡ Find Best Matches'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-4 mb-4 text-sm">{error}</div>
      )}

      {showResults && !loading && (
        <div className="space-y-6">
          {/* AI Profile Analysis Section */}
          {analyzedProfile?.skills && analyzedProfile.skills.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-2">
              <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2 mb-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                AI Profile Analysis Complete
              </h3>
              <p className="text-xs text-indigo-700 mb-3">
                Extracted the following skills from your profile and resume text to find your best matches:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {analyzedProfile.skills.map((skill, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-white text-indigo-800 text-xs font-semibold rounded-lg border border-indigo-200 shadow-sm capitalize">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {results.length === 0 ? (
            <p className="text-gray-500 py-6 text-center text-sm">No matching internships found. Update your profile with more skills to get recommendations.</p>
          ) : (
            <>
              {(() => {
                const priorityMatches   = results.filter(i => i.scores.final_score >= 55);
                const secondaryMatches  = results.filter(i => i.scores.final_score <  55);
                return (
                  <>
                    {priorityMatches.length > 0 && (
                      <div>
                        <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <span className="text-green-500 text-lg">🌟</span> Priority Matches
                          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{priorityMatches.length} found · ≥55%</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {priorityMatches.map(renderMatchCard)}
                        </div>
                      </div>
                    )}
                    {secondaryMatches.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-base font-semibold text-gray-500 mb-3 flex items-center gap-2">
                          <span className="text-gray-400 text-lg">📊</span> Less Priority Matches
                          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{secondaryMatches.length} found · &lt;55%</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-80">
                          {secondaryMatches.map(renderMatchCard)}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AIFinder;
