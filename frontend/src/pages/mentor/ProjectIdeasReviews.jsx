import React, { useState, useEffect } from 'react';
import { Target, CheckCircle, XCircle, Search, Edit } from 'lucide-react';

const ProjectIdeasReviews = () => {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  
  // Review Modal State
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [adminFeedback, setAdminFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchIdeas();
  }, [statusFilter]);

  const fetchIdeas = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5003/api/mentor/project-ideas?status=${statusFilter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setIdeas(data.data?.ideas || []);
      } else {
        setError(data.message || 'Failed to fetch project ideas');
      }
    } catch (err) {
      console.error(err);
      setError('Network error fetching project ideas');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIdea) return;
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5003/api/mentor/project-ideas/${selectedIdea._id}/review`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: reviewStatus,
          adminFeedback
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setSelectedIdea(null);
        fetchIdeas(); // refresh list
      } else {
        alert(data.message || 'Error submitting review');
      }
    } catch (err) {
      console.error(err);
      alert('Network error submitting review');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Approved</span>;
      case 'rejected': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">Rejected</span>;
      default: return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">Pending</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
            <Target className="w-6 h-6 text-indigo-600" />
            Project Ideas Reviews
          </h2>
          <p className="text-gray-500 text-sm mt-1">Review student project ideas, provide feedback, and approve concepts.</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            className="border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Ideas</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No project ideas found</h3>
          <p className="text-gray-500 text-sm mt-1">There are currently no student project ideas matching this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ideas.map((idea) => (
            <div key={idea._id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition bg-gray-50 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-gray-900 text-lg line-clamp-2">{idea.title}</h3>
                  {getStatusBadge(idea.status)}
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  <p><strong>Student:</strong> {idea.studentId?.name || 'Unknown'}</p>
                  <p><strong>Category:</strong> {idea.category || 'N/A'}</p>
                  {idea.techStack && idea.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {idea.techStack.map((tech, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded border">{tech}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-white p-3 rounded-lg border text-sm text-gray-700 h-24 overflow-y-auto mb-4">
                  {idea.description}
                </div>
                
                {idea.adminFeedback && (
                  <div className="mb-4 text-sm bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <p className="font-semibold text-blue-800 mb-1">Feedback:</p>
                    <p className="text-blue-700">{idea.adminFeedback}</p>
                    {idea.reviewedBy && <p className="text-xs text-blue-500 mt-1">By: {idea.reviewedBy.name}</p>}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => {
                  setSelectedIdea(idea);
                  setReviewStatus(idea.status === 'pending' ? 'approved' : idea.status);
                  setAdminFeedback(idea.adminFeedback || '');
                }}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
              >
                <Edit className="w-4 h-4" />
                {idea.status === 'pending' ? 'Review & Decide' : 'Update Feedback'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedIdea && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Review Project Idea</h3>
              <button 
                onClick={() => setSelectedIdea(null)}
                className="hover:bg-white/20 p-1 rounded transition"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 border-b pb-2 mb-2">{selectedIdea.title}</h4>
                <p className="text-sm text-gray-600 max-h-32 overflow-y-auto">{selectedIdea.description}</p>
              </div>
              
              <form onSubmit={handleReviewSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Decision</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status"
                        value="approved"
                        checked={reviewStatus === 'approved'}
                        onChange={(e) => setReviewStatus(e.target.value)}
                        className="text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm font-medium text-green-700 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Approve</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status"
                        value="rejected"
                        checked={reviewStatus === 'rejected'}
                        onChange={(e) => setReviewStatus(e.target.value)}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-red-700 flex items-center gap-1"><XCircle className="w-4 h-4" /> Reject</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status"
                        value="pending"
                        checked={reviewStatus === 'pending'}
                        onChange={(e) => setReviewStatus(e.target.value)}
                        className="text-yellow-600 focus:ring-yellow-500"
                      />
                      <span className="text-sm font-medium text-yellow-700 flex items-center gap-1">Leave Pending</span>
                    </label>
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mentor Feedback / Notes
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    rows="4"
                    placeholder="Provide constructive feedback, reasons for rejection, or suggestions for improvement..."
                    value={adminFeedback}
                    onChange={(e) => setAdminFeedback(e.target.value)}
                    required={reviewStatus === 'rejected'}
                  ></textarea>
                  {reviewStatus === 'rejected' && <p className="text-xs text-red-500 mt-1">Feedback is highly recommended when rejecting an idea.</p>}
                </div>
                
                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedIdea(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Save Decision'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectIdeasReviews;
