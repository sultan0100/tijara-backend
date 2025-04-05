import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function build() {
  try {
    // Clean dist directory
    console.log('🧹 Cleaning dist directory...');
    await execAsync('rimraf dist');

    // Generate Prisma Client
    console.log('🔄 Generating Prisma Client...');
    await execAsync('prisma generate');

    // Compile TypeScript
    console.log('🔨 Compiling TypeScript...');
    await execAsync('tsc');

    // Copy Prisma schema to dist
    console.log('📋 Copying Prisma schema...');
    await execAsync('cp prisma/schema.prisma dist/prisma/');

    console.log('✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
