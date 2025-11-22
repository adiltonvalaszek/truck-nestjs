#!/usr/bin/env node

/**
 * Database Seeding Script
 * Creates initial demo user
 */

const { DataSource } = require('typeorm');
const bcrypt = require('bcrypt');

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: ['dist/**/*.entity.js'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('🌱 Database connected for seeding');

    const userRepository = dataSource.getRepository('User');

    const demoEmail = 'demo@truck.com';
    const existingUser = await userRepository.findOne({ where: { email: demoEmail } });

    if (!existingUser) {
      console.log('🌱 Creating demo user...');
      const hashedPassword = await bcrypt.hash('demo123', 10);
      const user = userRepository.create({
        name: 'Demo User',
        email: demoEmail,
        password: hashedPassword,
      });
      await userRepository.save(user);
      console.log('✅ Demo user created');
    } else {
      console.log('ℹ️  Demo user already exists');
    }

    console.log('✅ Seeding complete');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

seed();
