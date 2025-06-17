const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getSystemHealth,
  getSystemStats,
  getJobMetrics
} = require('../controllers/monitoringController');

const router = express.Router();

// @route   GET /api/monitoring/health
// @desc    Get system health status
// @access  Public
router.get('/health', getSystemHealth);

// @route   GET /api/monitoring/stats
// @desc    Get system statistics
// @access  Private (Admin only)
router.get('/stats', authenticate, authorize('admin'), getSystemStats);

// @route   GET /api/monitoring/metrics
// @desc    Get job metrics and analytics
// @access  Private (Admin only)
router.get('/metrics', authenticate, authorize('admin'), getJobMetrics);

module.exports = router;