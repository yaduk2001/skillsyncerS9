import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { testsApi } from '../utils/api';

const TestScreen = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [solutions, setSolutions] = useState([]);
  // Render all questions on a single page; no index-based navigation
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [correctness, setCorrectness] = useState([]);
  // New state for grade and mentor assignment
  const [grade, setGrade] = useState(null);
  const [percentage, setPercentage] = useState(null);
  const [mentorAssignment, setMentorAssignment] = useState(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await testsApi.get(token);
        if (res.success && res.data?.success) {
          const t = res.data.data;
          if (t.submittedAt) {
            setResult({ score: t.score, result: t.result });
            if (Array.isArray(t.solutions)) setSolutions(t.solutions);
            if (Array.isArray(t.answers)) setAnswers(t.answers);
            if (Array.isArray(t.correctness)) setCorrectness(t.correctness);
          }
          setTest(t);
          setAnswers(new Array((t.questions || []).length).fill(''));
          setTotalQuestions((t.questions || []).length);
        } else {
          setError(res.data?.message || 'Invalid or expired test link');
        }
      } catch (e) {
        setError(e.message || 'Failed to load test');
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!test || test.expired) return;
    try {
      setSubmitting(true);
      const resp = await testsApi.submit(token, answers);
      if (resp.success && resp.data?.success) {
        const data = resp.data.data;
        setResult({
          score: data.correctAnswers || data.score,
          result: data.result,
          percentage: data.percentage,
          grade: data.grade
        });
        setPercentage(data.percentage);
        setGrade(data.grade);
        setTotalQuestions(data.totalQuestions || test.questions?.length || 0);
        setSolutions(data.solutions || []);
        setAnswers(data.answers || answers);
        setCorrectness(data.correctness || []);
        if (data.mentorAssignment) {
          setMentorAssignment(data.mentorAssignment);
        }
      } else {
        setSubmitError(resp.data?.message || 'Failed to submit test');
      }
    } catch (e) {
      setSubmitError(e.message || 'Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-8 max-w-lg w-full text-center border border-white/30">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Assessment Unavailable</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/jobseeker-dashboard')}
            className="px-5 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!test) return null;

  const questions = test.questions || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-6 sm:p-8 border border-white/30">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Assessment{test.internshipTitle ? ` • ${test.internshipTitle}` : ''}</h1>
            <p className="text-sm text-gray-600">Deadline: {new Date(test.expiresAt).toLocaleString()}</p>
            {test.expired && (
              <p className="mt-2 text-sm text-red-600">This test link has expired.</p>
            )}
            {result && (
              <div className={`mt-4 rounded-2xl border-2 overflow-hidden ${result.result === 'Passed' ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50' : 'border-red-300 bg-gradient-to-br from-red-50 to-rose-50'}`}>
                {/* Result Header */}
                <div className={`px-6 py-4 ${result.result === 'Passed' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-rose-600'} text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{result.result === 'Passed' ? '🎉' : '😔'}</div>
                      <div>
                        <h2 className="text-xl font-bold">{result.result === 'Passed' ? 'Congratulations!' : 'Not Passed'}</h2>
                        <p className="text-sm opacity-90">{result.result === 'Passed' ? 'You have successfully passed the assessment' : 'Keep practicing and try again'}</p>
                      </div>
                    </div>
                    {result.grade && (
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black shadow-lg ${result.grade === 'A' ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-yellow-900' : 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white'}`}>
                        {result.grade}
                      </div>
                    )}
                  </div>
                </div>

                {/* Score Details */}
                <div className="px-6 py-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    {/* Percentage Score */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Percentage</p>
                      <p className={`text-3xl font-black ${result.result === 'Passed' ? 'text-green-600' : 'text-red-600'}`}>
                        {percentage !== null ? percentage : Math.round((result.score / 80) * 100)}%
                      </p>
                    </div>

                    {/* Score (out of 100) */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Score (out of 100)</p>
                      <p className="text-3xl font-black text-gray-800">
                        {percentage !== null ? percentage : Math.round((result.score / 80) * 100)} <span className="text-lg text-gray-400">/ 100</span>
                      </p>
                    </div>

                    {/* Grade */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Grade</p>
                      {result.grade ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-3xl font-black ${result.grade === 'A' ? 'text-amber-500' : 'text-indigo-500'}`}>
                            Grade {result.grade}
                          </span>
                          <span className="text-lg">
                            {result.grade === 'A' ? '⭐' : '✨'}
                          </span>
                        </div>
                      ) : (
                        <p className="text-2xl font-bold text-gray-400">—</p>
                      )}
                    </div>
                  </div>

                  {/* Grade Criteria Info */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">📊 Grade Criteria:</p>
                    <div className="flex gap-4 flex-wrap text-sm">
                      <span className={`px-3 py-1 rounded-full ${result.grade === 'A' ? 'bg-amber-100 text-amber-700 font-semibold ring-2 ring-amber-300' : 'bg-gray-100 text-gray-600'}`}>
                        Grade A: 80% and above
                      </span>
                      <span className={`px-3 py-1 rounded-full ${result.grade === 'B' ? 'bg-indigo-100 text-indigo-700 font-semibold ring-2 ring-indigo-300' : 'bg-gray-100 text-gray-600'}`}>
                        Grade B: 60% - 79%
                      </span>
                      <span className={`px-3 py-1 rounded-full ${!result.grade && result.result === 'Passed' ? 'bg-gray-200 text-gray-700 font-semibold' : 'bg-gray-100 text-gray-600'}`}>
                        Below 60%: No grade assigned
                      </span>
                    </div>
                  </div>

                  {/* Mentor Assignment Status */}
                  {mentorAssignment && (
                    <div className={`rounded-xl p-4 mb-4 ${mentorAssignment.mentorAssigned ? 'bg-gradient-to-r from-purple-50 to-violet-50 border-2 border-purple-200' : 'bg-blue-50 border border-blue-200'}`}>
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{mentorAssignment.mentorAssigned ? '👨‍🏫' : '⏳'}</div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 mb-1">
                            {mentorAssignment.mentorAssigned ? 'Mentor Assigned!' : 'Mentor Assignment Status'}
                          </p>
                          {mentorAssignment.mentorAssigned && mentorAssignment.mentor ? (
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                              <p className="text-sm text-gray-600 mb-1">Your mentor from the internship company:</p>
                              <p className="font-bold text-purple-700">{mentorAssignment.mentor.name}</p>
                              <p className="text-sm text-gray-500">{mentorAssignment.mentor.email}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${mentorAssignment.grade === 'A' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                  Grade {mentorAssignment.grade} Mentor
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-blue-700">{mentorAssignment.message || 'A mentor will be assigned to you soon based on your grade and the internship company.'}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/jobseeker-dashboard')}
                      className={`px-6 py-3 rounded-xl font-semibold shadow-lg transition-all transform hover:scale-105 ${result.result === 'Passed' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700' : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'}`}
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={idx} className="p-4 border rounded-xl">
                    <div className="font-medium text-gray-900 mb-2">Q{idx + 1}. {q.q || q.question || 'Question'}</div>
                    {q.type === 'mcq' && (
                      <div className="space-y-2">
                        {(q.options || []).map((opt, oidx) => (
                          <label key={oidx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`q-${idx}`}
                              disabled={!!result || test.expired}
                              checked={(answers[idx] || '') === opt}
                              onChange={() => {
                                const next = answers.slice();
                                next[idx] = opt;
                                setAnswers(next);
                              }}
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {q.type === 'oneword' && (
                      <input
                        type="text"
                        disabled={!!result || test.expired}
                        value={answers[idx] || ''}
                        onChange={(e) => {
                          const next = answers.slice();
                          next[idx] = e.target.value;
                          setAnswers(next);
                        }}
                        className="w-full border border-gray-300 rounded-lg p-3"
                        placeholder="Your one-word answer"
                      />
                    )}
                    {(q.type === 'text' || q.type === 'code' || !q.type) && (
                      <>
                        {q.type === 'code' && q.starterCode && (
                          <pre className="bg-gray-50 border rounded p-3 text-sm overflow-auto mb-2"><code>{q.starterCode}</code></pre>
                        )}
                        {q.type === 'code' && q.buggyCode && (
                          <div className="mb-2">
                            <p className="text-sm font-semibold text-red-600 mb-1">Buggy Code:</p>
                            <pre className="bg-red-50 border border-red-100 rounded p-3 text-sm overflow-auto"><code>{q.buggyCode}</code></pre>
                          </div>
                        )}
                        <textarea
                          disabled={!!result || test.expired}
                          value={answers[idx] || ''}
                          onChange={(e) => {
                            const next = answers.slice();
                            next[idx] = e.target.value;
                            setAnswers(next);
                          }}
                          rows={q.type === 'code' ? 8 : 4}
                          className="w-full border border-gray-300 rounded-lg p-3 font-mono"
                          placeholder={q.type === 'code' ? 'Paste your code solution here' : 'Type your answer here...'}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>

              {submitError && (
                <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                  {submitError}
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate('/jobseeker-dashboard')}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Back to Dashboard
                </button>
                {!result && !test.expired && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Test'}
                  </button>
                )}
              </div>
            </form>
          ) : null}

          {result && (
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">Full Question Paper</h2>
              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={idx} className="p-4 border rounded-xl">
                    <div className="font-medium text-gray-900 mb-2">Q{idx + 1}. {q.q || q.question || 'Question'}</div>
                    {q.type === 'code' && q.starterCode && (
                      <pre className="bg-gray-50 border rounded p-3 text-sm overflow-auto mb-2"><code>{q.starterCode}</code></pre>
                    )}
                    <div className={`p-3 rounded-lg text-sm mb-2 ${correctness[idx] ? 'bg-green-50 border border-green-100 text-green-800' : 'bg-red-50 border border-red-100 text-red-800'}`}>
                      <strong>Your Answer:</strong> {String(answers[idx] || '').trim() || '—'}
                    </div>
                    {solutions[idx] && solutions[idx].correctAnswer && (
                      <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800">
                        <strong>Correct Answer:</strong> {String(solutions[idx].correctAnswer)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestScreen;


