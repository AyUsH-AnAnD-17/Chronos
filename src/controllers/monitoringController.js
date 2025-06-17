const Job = require('../models/Job');
const User = require('../models/user');
const JobLog = require('../models/JobLog');
const { getJobQueue } = require('../config/queue');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');
const { JOB_STATUSES } = require('../utils/constants');

const getSystemHealth = async (req, res) => {
  try {
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected',
      redis: 'connected',
      queue: 'active'
    };

    // Check database connection
    try {
      await Job.findOne().limit(1);
    } catch (error) {
      health.database = 'disconnected';
      health.status = 'DEGRADED';
    }

    // Check Redis connection
    try {
      const redisClient = getRedisClient();
      await redisClient.ping();
    } catch (error) {
      health.redis = 'disconnected';
      health.status = 'DEGRADED';
    }

    // Check queue status
    try {
      const queue = getJobQueue();
      const waiting = await queue.getWaiting();
      health.queueStats = {
        waiting: waiting.length,
        active: (await queue.getActive()).length,
        completed: (await queue.getCompleted()).length,
        failed: (await queue.getFailed()).length
      };
    } catch (error) {
      health.queue = 'inactive';
      health.status = 'DEGRADED';
    }

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      data: {
        status: 'ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }
};

const getSystemStats = async (req, res) => {
  try {
    const stats = {};

    // Job statistics
    const jobStats = await Job.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    stats.jobs = {};
    Object.values(JOB_STATUSES).forEach(status => {
      stats.jobs[status] = 0;
    });

    jobStats.forEach(stat => {
      stats.jobs[stat._id] = stat.count;
    });

    stats.jobs.total = Object.values(stats.jobs).reduce((sum, count) => sum + count, 0);

    // User statistics
    stats.users = {
      total: await User.countDocuments(),
      active: await User.countDocuments({ active: true }),
      admin: await User.countDocuments({ role: 'admin' })
    };

    // Recent activity (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    stats.recent = {
      jobsCreated: await Job.countDocuments({ createdAt: { $gte: last24Hours } }),
      jobsCompleted: await Job.countDocuments({ 
        completedAt: { $gte: last24Hours } 
      }),
      jobsFailed: await Job.countDocuments({ 
        failedAt: { $gte: last24Hours } 
      })
    };

    // Performance metrics
    const avgExecutionTime = await Job.aggregate([
      {
        $match: { 
          executionTime: { $exists: true, $ne: null },
          completedAt: { $gte: last24Hours }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$executionTime' },
          minTime: { $min: '$executionTime' },
          maxTime: { $max: '$executionTime' }
        }
      }
    ]);

    stats.performance = avgExecutionTime[0] || {
      avgTime: 0,
      minTime: 0,
      maxTime: 0
    };

    // Queue statistics
    try {
      const queue = getJobQueue();
      stats.queue = {
        waiting: (await queue.getWaiting()).length,
        active: (await queue.getActive()).length,
        completed: (await queue.getCompleted()).length,
        failed: (await queue.getFailed()).length,
        delayed: (await queue.getDelayed()).length
      };
    } catch (error) {
      stats.queue = { error: 'Queue not available' };
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system statistics'
    });
  }
};

const getJobMetrics = async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let startDate;
    switch (period) {
      case '1h':
        startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '1d':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // Job metrics over time
    const metrics = await Job.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Success rate over time
    const successRate = await Job.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: [JOB_STATUSES.COMPLETED, JOB_STATUSES.FAILED] }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          successful: {
            $sum: {
              $cond: [{ $eq: ['$status', JOB_STATUSES.COMPLETED] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          date: '$_id',
          successRate: {
            $multiply: [{ $divide: ['$successful', '$total'] }, 100]
          }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        metrics,
        successRate
      }
    });
  } catch (error) {
    logger.error('Get job metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job metrics'
    });
  }
};

module.exports = {
  getSystemHealth,
  getSystemStats,
  getJobMetrics
};