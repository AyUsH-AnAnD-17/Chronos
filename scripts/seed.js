const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/user');
const Job = require('../src/models/Job');
const { JOB_TYPES } = require('../src/utils/constants');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Job.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin'
    });

    // Create regular user
    const regularUser = await User.create({
      username: 'testuser',
      email: 'user@example.com',
      password: 'user123',
      role: 'user'
    });

    console.log('Created users');

    // Create sample jobs
    const sampleJobs = [
      {
        name: 'Welcome Email Job',
        description: 'Send welcome email to new users',
        type: JOB_TYPES.IMMEDIATE,
        payload: {
          type: 'email',
          recipient: 'user@example.com',
          subject: 'Welcome!',
          template: 'welcome'
        },
        owner: regularUser._id,
        tags: ['email', 'welcome']
      },
      {
        name: 'Daily Report',
        description: 'Generate daily analytics report',
        type: JOB_TYPES.RECURRING,
        cronExpression: '0 9 * * *', // Daily at 9 AM
        payload: {
          type: 'data_processing',
          reportType: 'daily',
          recipients: ['admin@example.com']
        },
        owner: adminUser._id,
        tags: ['report', 'analytics']
      },
      {
        name: 'Scheduled Maintenance',
        description: 'System maintenance task',
        type: JOB_TYPES.SCHEDULED,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        payload: {
          type: 'cleanup',
          location: '/tmp',
          olderThan: '7d'
        },
        owner: adminUser._id,
        tags: ['maintenance', 'cleanup']
      }
    ];

    await Job.create(sampleJobs);
    console.log('Created sample jobs');

    console.log('Database seeded successfully!');
    console.log('Admin user: admin@example.com / admin123');
    console.log('Regular user: user@example.com / user123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
  }
};

seedDatabase();