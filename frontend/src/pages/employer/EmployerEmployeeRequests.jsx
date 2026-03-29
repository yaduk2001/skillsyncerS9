import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserCheck,
    RefreshCw,
    Eye,
    CheckCircle,
    X,
    ChevronLeft,
    ChevronRight,
    AlertTriangle
} from 'lucide-react';
import { employerApi } from '../../utils/api';

const EmployerEmployeeRequests = () => {
    const [employeeRequests, setEmployeeRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalRequests: 0,
        hasPrev: false,
        hasNext: false
    });
    const [filters, setFilters] = useState({ status: '' });
    const [currentPage, setCurrentPage] = useState(1);

    // Toast State
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // Modal State
    const [confirmModal, setConfirmModal] = useState({
        show: false,
        type: 'approve', // 'approve' | 'reject'
        requestId: null,
        data: null // request object
    });
    const [rejectReason, setRejectReason] = useState('');

    const fetchEmployeeRequests = async (page = 1) => {
        try {
            setLoading(true);
            const response = await employerApi.getEmployeeRequests(filters, page);

            if (response.success) {
                // Handle success/data wrapper from API
                const payload = response.data?.success ? response.data.data : response.data;

                if (payload) {
                    setEmployeeRequests(payload.requests || []);
                    setPagination(payload.pagination || {});
                    if (payload.pagination?.currentPage) {
                        setCurrentPage(payload.pagination.currentPage);
                    }
                }
            } else {
                console.error('Failed to fetch employee requests:', response.message);
            }
        } catch (error) {
            console.error('Error fetching employee requests:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployeeRequests(currentPage);
    }, [currentPage, filters]);

    // Auto-hide toast
    useEffect(() => {
        if (toast.show) {
            const timer = setTimeout(() => {
                setToast(prev => ({ ...prev, show: false }));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast.show]);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handleActionClick = (type, request) => {
        setConfirmModal({
            show: true,
            type,
            requestId: request._id,
            data: request
        });
        setRejectReason('');
    };

    const confirmAction = async () => {
        if (!confirmModal.requestId) return;

        const { type, requestId } = confirmModal;
        const notes = type === 'reject' ? rejectReason : '';

        try {
            const status = type === 'approve' ? 'approved' : 'rejected';
            const response = await employerApi.updateEmployeeRequestStatus(requestId, status, notes);

            if (response.success) {
                fetchEmployeeRequests(currentPage);
                showToast(`Request ${status} successfully`, 'success');
            } else {
                showToast(`Failed to update request: ${response.message || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            showToast('An error occurred while updating the request status', 'error');
        } finally {
            setConfirmModal({ show: false, type: 'approve', requestId: null, data: null });
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key="employee-requests"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 relative"
            >
                {/* Toast Notification */}
                {createPortal(
                    <AnimatePresence>
                        {toast.show && (
                            <div
                                style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    width: '100vw',
                                    height: '100vh',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 9999,
                                    pointerEvents: 'none'
                                }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                    className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border ${toast.type === 'success'
                                        ? 'bg-white border-green-100 text-green-800'
                                        : 'bg-white border-red-100 text-red-800'
                                        }`}
                                >
                                    <div className={`p-2 rounded-full ${toast.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                                        {toast.type === 'success' ? <CheckCircle className={`w-5 h-5 ${toast.type === 'success' ? 'text-green-600' : 'text-red-600'}`} /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                                    </div>
                                    <span className="font-medium text-gray-800">{toast.message}</span>
                                    <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 text-gray-400 hover:text-gray-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}

                {/* Employee Requests Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Employee Requests</h3>
                            <p className="text-sm text-gray-600 mt-1">Review and manage employee access requests</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <select
                                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                            >
                                <option value="">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => fetchEmployeeRequests(currentPage)}
                                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span className="font-medium">Refresh</span>
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* Employee Requests Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden"
                >
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                        </div>
                    ) : employeeRequests.length === 0 ? (
                        <div className="text-center py-12">
                            <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Employee Requests</h3>
                            <p className="text-gray-500">No employee requests found matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Applicant
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Company
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            ID Card
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Applied Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white/30 divide-y divide-gray-200">
                                    {employeeRequests.map((request) => (
                                        <motion.tr
                                            key={request._id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="hover:bg-white/50 transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{request.fullName}</div>
                                                    <div className="text-sm text-gray-500">{request.email}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{request.companyId?.name || 'N/A'}</div>
                                                <div className="text-sm text-gray-500">{request.companyId?.email || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => window.open(request.companyIdCard, '_blank')}
                                                    className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    <span className="text-sm">View ID</span>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${request.status === 'approved'
                                                    ? 'bg-green-100 text-green-800'
                                                    : request.status === 'rejected'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(request.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                {request.status === 'pending' ? (
                                                    <div className="flex space-x-2">
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => handleActionClick('approve', request)}
                                                            className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                            <span>Approve</span>
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => handleActionClick('reject', request)}
                                                            className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                            <span>Reject</span>
                                                        </motion.button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">
                                                        {request.status === 'approved' ? 'Approved' : 'Rejected'}
                                                        {request.reviewedAt && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                on {formatDate(request.reviewedAt)}
                                                            </div>
                                                        )}
                                                    </span>
                                                )}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {employeeRequests.length > 0 && pagination.totalPages > 1 && (
                        <div className="bg-white/50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={!pagination.hasPrev}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                                    disabled={!pagination.hasNext}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing{' '}
                                        <span className="font-medium">
                                            {((currentPage - 1) * 10) + 1}
                                        </span>{' '}
                                        to{' '}
                                        <span className="font-medium">
                                            {Math.min(currentPage * 10, pagination.totalRequests || 0)}
                                        </span>{' '}
                                        of <span className="font-medium">{pagination.totalRequests || 0}</span> results
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={!pagination.hasPrev}
                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                                            disabled={!pagination.hasNext}
                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <ChevronRight className="h-5 w-5" />
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Confirmation Modal */}
                <AnimatePresence>
                    {confirmModal.show && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                            />
                            {/* Modal */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-50 border border-gray-100"
                            >
                                <div className="flex flex-col items-center text-center">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${confirmModal.type === 'approve' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {confirmModal.type === 'approve' ? <CheckCircle className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        {confirmModal.type === 'approve' ? 'Approve Employee Request?' : 'Reject Employee Request?'}
                                    </h3>
                                    <p className="text-gray-500 mb-6">
                                        {confirmModal.type === 'approve'
                                            ? `Are you sure you want to approve this employee request for ${confirmModal.data?.fullName}? This will create a new employee account.`
                                            : `Are you sure you want to reject this request for ${confirmModal.data?.fullName}? This action cannot be undone.`
                                        }
                                    </p>

                                    {confirmModal.type === 'reject' && (
                                        <div className="w-full mb-6">
                                            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Rejection Reason</label>
                                            <textarea
                                                value={rejectReason}
                                                onChange={(e) => setRejectReason(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                                                rows="3"
                                                placeholder="Please provide a reason..."
                                            />
                                        </div>
                                    )}

                                    <div className="flex w-full gap-3">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                                            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                                        >
                                            Cancel
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={confirmAction}
                                            className={`flex-1 py-3 px-4 text-white font-medium rounded-xl shadow-lg transition-colors ${confirmModal.type === 'approve'
                                                ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-green-200'
                                                : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-red-200'
                                                }`}
                                        >
                                            {confirmModal.type === 'approve' ? 'Yes, Approve' : 'Reject Request'}
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
};

export default EmployerEmployeeRequests;
