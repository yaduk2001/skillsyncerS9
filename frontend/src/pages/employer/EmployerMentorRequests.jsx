import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, RefreshCw, Plus, Filter, Search } from 'lucide-react';

const EmployerMentorRequests = ({
  mentorRequests,
  loadingMentorRequests,
  mentorRequestFilters,
  setMentorRequestFilters,
  loadMentorRequests,
  setShowMentorRequestForm
}) => {
  const totalRequests = mentorRequests.length;
  const pendingRequests = mentorRequests.filter(req => req.status === 'pending').length;
  const approvedRequests = mentorRequests.filter(req => req.status === 'approved').length;
  const rejectedRequests = mentorRequests.filter(req => req.status === 'rejected').length;

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const formatDate = (d) => {
    try {
      return d ? new Date(d).toLocaleString() : '-';
    } catch (e) {
      return '-';
    }
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <UserCheck className="w-6 h-6 mr-3 text-indigo-600" />
            Mentor Requests
            <span className="ml-3 inline-flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700">{totalRequests} total</span>
              {pendingRequests > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">{pendingRequests} pending</span>
              )}
            </span>
          </h2>
          <div className="flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={loadMentorRequests}
              disabled={loadingMentorRequests}
              className="bg-white text-gray-700 px-4 py-2 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 inline mr-2 ${loadingMentorRequests ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMentorRequestForm(true)}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="w-5 h-5" />
              <span>Submit Mentor Request</span>
            </motion.button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Request Employee as Mentor</h3>
              <p className="text-blue-700 text-sm">
                Submit a request to assign one of your employees as a mentor. The admin will review and approve the request.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={mentorRequestFilters.status}
              onChange={(e) => setMentorRequestFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by employee name or email..."
                className="border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400"
                value={mentorRequestFilters.search}
                onChange={(e) => setMentorRequestFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {loadingMentorRequests ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading requests...</p>
          </div>
        ) : mentorRequests.length === 0 ? (
          <div className="text-center py-12 text-gray-600">No mentor requests found.</div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mentor Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mentorRequests.map((req) => (
                  <tr key={req._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{req.employeeName || 'Employee'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{req.employeeEmail || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{req.employeeDepartment || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{req.employeePosition || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        req.status === 'approved' ? 'bg-green-100 text-green-800' :
                        req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(req.createdAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {req.employeeMentorGrade ? (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${req.employeeMentorGrade === 'A' ? 'bg-indigo-100 text-indigo-800' : 'bg-purple-100 text-purple-800'}`}>
                        Grade {req.employeeMentorGrade}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <button
                        onClick={() => { setSelectedRequest(req); setShowDetails(true); }}
                        className="px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Details Modal */}
      {showDetails && selectedRequest && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-100 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Mentor Request Details</h3>
              <button
                onClick={() => { setShowDetails(false); setSelectedRequest(null); }}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Employee Name</div>
                <div className="text-sm font-medium text-gray-900">{selectedRequest.employeeName || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Employee Email</div>
                <div className="text-sm text-gray-900">{selectedRequest.employeeEmail || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Phone</div>
                <div className="text-sm text-gray-900">{selectedRequest.employeePhone || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Department</div>
                <div className="text-sm text-gray-900">{selectedRequest.employeeDepartment || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Position</div>
                <div className="text-sm text-gray-900">{selectedRequest.employeePosition || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Years of Experience</div>
                <div className="text-sm text-gray-900">{selectedRequest.yearsOfExperience || '-'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-gray-500">Expertise</div>
                <div className="text-sm text-gray-900">
                  {Array.isArray(selectedRequest.expertise) && selectedRequest.expertise.length > 0
                    ? selectedRequest.expertise.join(', ')
                    : '-'}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-gray-500">Justification</div>
                <div className="text-sm text-gray-900 whitespace-pre-wrap">{selectedRequest.justification || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Status</div>
                <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-semibold ${
                  selectedRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                  selectedRequest.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedRequest.status}
                </span>
              </div>
              <div>
                <div className="text-xs text-gray-500">Submitted</div>
                <div className="text-sm text-gray-900">{formatDate(selectedRequest.createdAt)}</div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
              <button
                onClick={() => { setShowDetails(false); setSelectedRequest(null); }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default EmployerMentorRequests;

