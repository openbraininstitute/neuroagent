/**
 * Check database connection and list threads
 * 
 * Usage: npx tsx check-database.ts
 */

import { prisma } from './src/lib/db/client';

async function main() {
  console.log('Checking database connection...\n');

  try {
    // Test connection
    await prisma.$connect();
    console.log('✓ Database connected successfully\n');

    // Count threads
    const threadCount = await prisma.thread.count();
    console.log(`Total threads in database: ${threadCount}\n`);

    if (threadCount > 0) {
      console.log('Recent threads:');
      const recentThreads = await prisma.thread.findMany({
        take: 10,
        orderBy: { creationDate: 'desc' },
        select: {
          id: true,
          title: true,
          userId: true,
          creationDate: true,
          _count: {
            select: { messages: true },
          },
        },
      });

      recentThreads.forEach((thread) => {
        console.log(`  ID: ${thread.id}`);
        console.log(`  Title: ${thread.title}`);
        console.log(`  User: ${thread.userId}`);
        console.log(`  Messages: ${thread._count.messages}`);
        console.log(`  Created: ${thread.creationDate.toISOString()}`);
        console.log('  ---');
      });
    } else {
      console.log('No threads found in database.');
      console.log('\nTo create a test thread, use:');
      console.log('  curl -X POST http://localhost:8079/api/threads \\');
      console.log('    -H "Content-Type: application/json" \\');
      console.log('    -H "Authorization: Bearer YOUR_TOKEN" \\');
      console.log('    -d \'{"title": "Test Thread"}\'');
    }

    // Check specific thread if provided
    const threadId = process.argv[2];
    if (threadId) {
      console.log(`\nChecking specific thread: ${threadId}`);
      const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        include: {
          _count: {
            select: { messages: true },
          },
        },
      });

      if (thread) {
        console.log('✓ Thread found!');
        console.log(JSON.stringify(thread, null, 2));
      } else {
        console.log('✗ Thread not found in this database');
      }
    }
  } catch (error) {
    console.error('✗ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
