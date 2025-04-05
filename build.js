import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdir, copyFile } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

async function build() {
  try {
    // Clean dist directory
    console.log('🧹 Cleaning dist directory...');
    await execAsync('rimraf dist');

    // Create necessary directories
    console.log('📁 Creating directories...');
    await mkdir('dist', { recursive: true });
    await mkdir('dist/prisma', { recursive: true });

    // Generate Prisma Client
    console.log('🔄 Generating Prisma Client...');
    await execAsync('prisma generate');

    // Compile TypeScript
    console.log('🔨 Compiling TypeScript...');
    await execAsync('tsc');

    // Copy Prisma schema to dist
    console.log('📋 Copying Prisma schema...');
    await copyFile(
      join(process.cwd(), 'prisma/schema.prisma'),
      join(process.cwd(), 'dist/prisma/schema.prisma')
    );

    console.log('✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
