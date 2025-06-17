const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { jobLimiter } = require('../middleware/rateLimiter');
const { createJobSchema, updateJobSchema } = require('../validators/jobValidator');
const {
  createJob,
  getJobs,
  getJob,
  updateJob,
  cancelJob,
  retryJob,
  getJobLogs
} = require('../controllers/jobController');

const router = express.Router();

// All job routes require authentication
router.use(authenticate);

// @route   POST /api/jobs
// @desc    Create a new job
// @access  Private
router.post('/', jobLimiter, validate(createJobSchema), createJob);

// @route   GET /api/jobs
// @desc    Get user's jobs with pagination and filters
// @access  Private
router.get('/', getJobs);

// @route   GET /api/jobs/:id
// @desc    Get a specific job
// @access  Private
router.get('/:id', getJob);

// @route   PUT /api/jobs/:id
// @desc    Update a job
// @access  Private
router.put('/:id', validate(updateJobSchema), updateJob);

// @route   POST /api/jobs/:id/cancel
// @desc    Cancel a job
// @access  Private
router.post('/:id/cancel', cancelJob);

// @route   POST /api/jobs/:id/retry
// @desc    Retry a failed job
// @access  Private
router.post('/:id/retry', retryJob);

// @route   GET /api/jobs/:id/logs
// @desc    Get job execution logs
// @access  Private
router.get('/:id/logs', getJobLogs);

module.exports = router;