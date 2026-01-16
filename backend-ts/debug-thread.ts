/**
 * Debug script to check thread in database
 * 
 * Usage: npx tsx debug-thread.ts <thread_id>
 */

import { prisma } from './src/lib/db/client';

async function main() {
  const threadId = process.argv[2];
  
  if (!threadId) {
    console.error('Usage: npx tsx debug-thread.ts <thread_id>');
    process.exit(1);
  }

  console.log(`Looking for thread: ${threadId}`);
  console.log('');

  // Try to find the thread
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
  });

  if (thread) {
    console.log('✓ Thread found!');
    console.log(JSON.stringify(thread, null, 2));
  } else {
    console.log('✗ Thread not found');
    console.log('');
    console.log('Listing all threads in database:');
    
    const allThreads = await prisma.thread.findMany({
      take: 10,
      orderBy: { creationDate: 'desc' },
    });
    
    if (allThreads.length === 0) {
      console.log('  No threads in database');
    } else {
      allThreads.forEach((t) => {
        console.log(`  - ${t.id} | ${t.title} | User: ${t.userId}`);
      });
    }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
