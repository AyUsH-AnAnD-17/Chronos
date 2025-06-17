const Job = require('../models/Job');
const JobLog = require('../models/JobLog');
const queueService = require('../services/queueService');
const schedulerService = require('../services/schedulerService');
const logger = require('../utils/logger');
const { JOB_STATUSES, JOB_TYPES } = require('../utils/constants');

const createJob = async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      owner: req.user.id
    };

    // Create job in database
    const job = await Job.create(jobData);

    // Add to queue based on type
    let bullJob;
    switch (job.type) {
      case JOB_TYPES.IMMEDIATE:
        bullJob = await queueService.addImmediateJob(job);
        break;
      case JOB_TYPES.SCHEDULED:
        bullJob = await queueService.addScheduledJob(job);
        break;
      case JOB_TYPES.RECURRING:
        bullJob = await queueService.addRecurringJob(job);
        break;
      case JOB_TYPES.DELAYED:
        bullJob = await queueService.addDelayedJob(job);
        break;
    }

    // Update job with Bull job ID
    job.bullJobId = bullJob.id;
    await job.save();

    // Update user's job count
    await req.user.incrementJobsCount();

    logger.info(`Job created: ${job.name} by user ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: { job }
    });
  } catch (error) {
    logger.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job'
    });
  }
};

const getJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    const query = { owner: req.user.id };

    // Add filters
    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: {
        path: 'owner',
        select: 'username email'
      }
    };

    const jobs = await Job.paginate(query, options);

    res.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    logger.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs'
    });
  }
};

const getJob = async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      owner: req.user.id
    }).populate('owner', 'username email');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: { job }
    });
  } catch (error) {
    logger.error('Get job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job'
    });
  }
};

const updateJob = async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if job can be updated
    if ([JOB_STATUSES.ACTIVE, JOB_STATUSES.COMPLETED].includes(job.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update job in current status'
      });
    }

    // Update job
    Object.assign(job, req.body);
    await job.save();

    // Update in queue if needed
    if (job.bullJobId) {
      await queueService.updateJob(job);
    }

    logger.info(`Job updated: ${job.name} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Job updated successfully',
      data: { job }
    });
  } catch (error) {
    logger.error('Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job'
    });
  }
};

const cancelJob = async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if job can be cancelled
    if ([JOB_STATUSES.COMPLETED, JOB_STATUSES.CANCELLED].includes(job.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel job in current status'
      });
    }

    // Cancel in queue
    if (job.bullJobId) {
      await queueService.cancelJob(job.bullJobId);
    }

    // Update job status
    await job.updateStatus(JOB_STATUSES.CANCELLED);

    logger.info(`Job cancelled: ${job.name} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Job cancelled successfully',
      data: { job }
    });
  } catch (error) {
    logger.error('Cancel job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel job'
    });
  }
};

const retryJob = async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if job can be retried
    if (job.status !== JOB_STATUSES.FAILED) {
      return res.status(400).json({
        success: false,
        message: 'Only failed jobs can be retried'
      });
    }

    if (job.currentRetries >= job.maxRetries) {
      return res.status(400).json({
        success: false,
        message: 'Job has exceeded maximum retry attempts'
      });
    }

    // Reset job status and add back to queue
    job.status = JOB_STATUSES.PENDING;
    job.error = null;
    job.failedAt = null;
    await job.save();

    // Add back to queue
    const bullJob = await queueService.retryJob(job);
    job.bullJobId = bullJob.id;
    await job.save();

    logger.info(`Job retried: ${job.name} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Job retry initiated successfully',
      data: { job }
    });
  } catch (error) {
    logger.error('Retry job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry job'
    });
  }
};

const getJobLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, level } = req.query;

    // Check if user owns the job
    const job = await Job.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const query = { jobId: req.params.id };
    if (level) query.level = level;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const logs = await JobLog.paginate(query, options);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Get job logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job logs'
    });
  }
};

module.exports = {
  createJob,
  getJobs,
  getJob,
  updateJob,
  cancelJob,
  retryJob,
  getJobLogs
};