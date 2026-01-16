/**
 * List all threads in the database
 * 
 * Usage: npx tsx list-threads.ts [user_id]
 */

import { prisma } from './src/lib/db/client';

async function main() {
  const userId = process.argv[2];

  console.log('Fetching threads from database...\n');

  const where = userId ? { userId } : {};
  
  const threads = await prisma.thread.findMany({
    where,
    orderBy: { creationDate: 'desc' },
    take: 20,
  });

  if (threads.length === 0) {
    console.log('No threads found.');
    if (userId) {
      console.log(`\nTried filtering by user_id: ${userId}`);
      console.log('Try without user_id to see all threads.');
    }
  } else {
    console.log(`Found ${threads.length} thread(s):\n`);
    threads.forEach((thread, index) => {
      console.log(`${index + 1}. Thread ID: ${thread.id}`);
      console.log(`   Title: ${thread.title}`);
      console.log(`   User ID: ${thread.userId}`);
      console.log(`   Created: ${thread.creationDate.toISOString()}`);
      console.log(`   VLab ID: ${thread.vlabId || 'null'}`);
      console.log(`   Project ID: ${thread.projectId || 'null'}`);
      console.log('');
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
