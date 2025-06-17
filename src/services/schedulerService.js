const cron = require('node-cron');
const Job = require('../models/Job');
const queueService = require('./queueService');
const logger = require('../utils/logger');
const { JOB_STATUSES, JOB_TYPES } = require('../utils/constants');
const { isValidCronExpression, calculateNextRun } = require('../utils/helpers');

const scheduledTasks = new Map();

const initializeScheduler = async () => {
  try {
    // Find all recurring jobs
    const recurringJobs = await Job.find({
      type: JOB_TYPES.RECURRING,
      status: { $in: [JOB_STATUSES.PENDING, JOB_STATUSES.ACTIVE] }
    });

    for (const job of recurringJobs) {
      await scheduleRecurringJob(job);
    }

    logger.info(`Initialized scheduler with ${recurringJobs.length} recurring jobs`);
  } catch (error) {
    logger.error('Failed to initialize scheduler:', error);
  }
};

const scheduleRecurringJob = async (job) => {
  try {
    if (!isValidCronExpression(job.cronExpression)) {
      throw new Error(`Invalid cron expression: ${job.cronExpression}`);
    }

    // Remove existing task if any
    if (scheduledTasks.has(job._id.toString())) {
      const existingTask = scheduledTasks.get(job._id.toString());
      existingTask.stop();
      scheduledTasks.delete(job._id.toString());
    }

    // Create new cron task
    const task = cron.schedule(job.cronExpression, async () => {
      try {
        logger.info(`Executing recurring job: ${job.name}`);
        
        // Create a new job instance for this execution
        const newJob = new Job({
          name: `${job.name} - ${new Date().toISOString()}`,
          description: job.description,
          type: JOB_TYPES.IMMEDIATE,
          payload: job.payload,
          priority: job.priority,
          maxRetries: job.maxRetries,
          owner: job.owner,
          tags: [...(job.tags || []), 'recurring-instance']
        });

        await newJob.save();
        await queueService.addImmediateJob(newJob);

        // Update next run time
        job.nextRunAt = calculateNextRun(job.cronExpression);
        await job.save();

      } catch (error) {
        logger.error(`Error executing recurring job ${job.name}:`, error);
      }
    }, {
      scheduled: false
    });

    task.start();
    scheduledTasks.set(job._id.toString(), task);

    logger.info(`Scheduled recurring job: ${job.name} with expression ${job.cronExpression}`);
  } catch (error) {
    logger.error(`Failed to schedule recurring job ${job.name}:`, error);
    throw error;
  }
};

const unscheduleRecurringJob = (jobId) => {
  try {
    const taskId = jobId.toString();
    if (scheduledTasks.has(taskId)) {
      const task = scheduledTasks.get(taskId);
      task.stop();
      scheduledTasks.delete(taskId);
      logger.info(`Unscheduled recurring job: ${jobId}`);
    }
  } catch (error) {
    logger.error(`Failed to unschedule recurring job ${jobId}:`, error);
  }
};

const rescheduleRecurringJob = async (job) => {
  try {
    unscheduleRecurringJob(job._id);
    await scheduleRecurringJob(job);
  } catch (error) {
    logger.error(`Failed to reschedule recurring job ${job.name}:`, error);
    throw error;
  }
};

const getScheduledTasks = () => {
  return Array.from(scheduledTasks.keys());
};

// Cleanup stale scheduled tasks
const cleanupStaleTasks = async () => {
  try {
    const activeJobIds = await Job.find({
      type: JOB_TYPES.RECURRING,
      status: { $in: [JOB_STATUSES.PENDING, JOB_STATUSES.ACTIVE] }
    }).distinct('_id');

    const activeJobIdStrings = activeJobIds.map(id => id.toString());
    
    for (const taskId of scheduledTasks.keys()) {
      if (!activeJobIdStrings.includes(taskId)) {
        const task = scheduledTasks.get(taskId);
        task.stop();
        scheduledTasks.delete(taskId);
        logger.info(`Cleaned up stale scheduled task: ${taskId}`);
      }
    }
  } catch (error) {
    logger.error('Error cleaning up stale tasks:', error);
  }
};

// Run cleanup every hour
cron.schedule('0 * * * *', cleanupStaleTasks);

module.exports = {
  initializeScheduler,
  scheduleRecurringJob,
  unscheduleRecurringJob,
  rescheduleRecurringJob,
  getScheduledTasks,
  cleanupStaleTasks
};