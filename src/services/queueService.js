const { getJobQueue } = require('../config/queue');
const logger = require('../utils/logger');
const { JOB_TYPES } = require('../utils/constants');

const addImmediateJob = async (job) => {
  try {
    const queue = getJobQueue();
    const bullJob = await queue.add(
      'immediate',
      {
        id: job._id,
        type: job.type,
        payload: job.payload
      },
      {
        priority: job.priority,
        attempts: job.maxRetries,
        removeOnComplete: 100,
        removeOnFail: 50
      }
    );

    logger.info(`Immediate job added to queue: ${job._id}`);
    return bullJob;
  } catch (error) {
    logger.error('Failed to add immediate job to queue:', error);
    throw error;
  }
};

const addScheduledJob = async (job) => {
  try {
    const queue = getJobQueue();
    const delay = new Date(job.scheduledAt) - new Date();
    
    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    const bullJob = await queue.add(
      'scheduled',
      {
        id: job._id,
        type: job.type,
        payload: job.payload
      },
      {
        delay,
        priority: job.priority,
        attempts: job.maxRetries,
        removeOnComplete: 100,
        removeOnFail: 50
      }
    );

    logger.info(`Scheduled job added to queue: ${job._id} for ${job.scheduledAt}`);
    return bullJob;
  } catch (error) {
    logger.error('Failed to add scheduled job to queue:', error);
    throw error;
  }
};

const addRecurringJob = async (job) => {
  try {
    const queue = getJobQueue();
    const bullJob = await queue.add(
      'recurring',
      {
        id: job._id,
        type: job.type,
        payload: job.payload
      },
      {
        repeat: { cron: job.cronExpression },
        priority: job.priority,
        attempts: job.maxRetries,
        removeOnComplete: 100,
        removeOnFail: 50
      }
    );

    logger.info(`Recurring job added to queue: ${job._id} with cron ${job.cronExpression}`);
    return bullJob;
  } catch (error) {
    logger.error('Failed to add recurring job to queue:', error);
    throw error;
  }
};

const addDelayedJob = async (job) => {
  try {
    const queue = getJobQueue();
    const bullJob = await queue.add(
      'delayed',
      {
        id: job._id,
        type: job.type,
        payload: job.payload
      },
      {
        delay: job.delay,
        priority: job.priority,
        attempts: job.maxRetries,
        removeOnComplete: 100,
        removeOnFail: 50
      }
    );

    logger.info(`Delayed job added to queue: ${job._id} with delay ${job.delay}ms`);
    return bullJob;
  } catch (error) {
    logger.error('Failed to add delayed job to queue:', error);
    throw error;
  }
};

const cancelJob = async (bullJobId) => {
  try {
    const queue = getJobQueue();
    const job = await queue.getJob(bullJobId);
    
    if (job) {
      await job.remove();
      logger.info(`Job removed from queue: ${bullJobId}`);
    }
  } catch (error) {
    logger.error('Failed to cancel job in queue:', error);
    throw error;
  }
};

const updateJob = async (job) => {
  try {
    // Remove old job from queue
    if (job.bullJobId) {
      await cancelJob(job.bullJobId);
    }

    // Add updated job based on type
    let bullJob;
    switch (job.type) {
      case JOB_TYPES.IMMEDIATE:
        bullJob = await addImmediateJob(job);
        break;
      case JOB_TYPES.SCHEDULED:
        bullJob = await addScheduledJob(job);
        break;
      case JOB_TYPES.RECURRING:
        bullJob = await addRecurringJob(job);
        break;
      case JOB_TYPES.DELAYED:
        bullJob = await addDelayedJob(job);
        break;
    }

    return bullJob;
  } catch (error) {
    logger.error('Failed to update job in queue:', error);
    throw error;
  }
};

const retryJob = async (job) => {
  try {
    return await addImmediateJob(job);
  } catch (error) {
    logger.error('Failed to retry job:', error);
    throw error;
  }
};

const getQueueStats = async () => {
  try {
    const queue = getJobQueue();
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total: waiting.length + active.length + completed.length + failed.length + delayed.length
    };
  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    throw error;
  }
};

module.exports = {
  addImmediateJob,
  addScheduledJob,
  addRecurringJob,
  addDelayedJob,
  cancelJob,
  updateJob,
  retryJob,
  getQueueStats
};