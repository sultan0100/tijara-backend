import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdir, copyFile, readdir, rename } from 'fs/promises';
import { join, extname } from 'path';

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
    await mkdir('dist/src/lib', { recursive: true });

    // Generate Prisma Client
    console.log('🔄 Generating Prisma Client...');
    await execAsync('prisma generate');

    // Copy Prisma client to dist
    console.log('📦 Copying Prisma client...');
    const prismaClientPath = join(process.cwd(), 'node_modules', '@prisma', 'client');
    const distPrismaPath = join(process.cwd(), 'dist', 'src', 'lib');
    
    // Copy all files from prisma client directory
    const files = await readdir(prismaClientPath);
    for (const file of files) {
      const srcPath = join(prismaClientPath, file);
      const destPath = join(distPrismaPath, file);
      await copyFile(srcPath, destPath);
    }

    // Compile TypeScript
    console.log('🔨 Compiling TypeScript...');
    await execAsync('tsc');

    // Copy Prisma schema to dist
    console.log('📋 Copying Prisma schema...');
    await copyFile(
      join(process.cwd(), 'prisma/schema.prisma'),
      join(process.cwd(), 'dist/prisma/schema.prisma')
    );

    // Rename .ts files to .js in dist directory
    console.log('🔄 Renaming .ts files to .js...');
    const distFiles = await readdir('dist', { recursive: true });
    for (const file of distFiles) {
      const filePath = join('dist', file);
      if (extname(filePath) === '.ts') {
        const newFilePath = filePath.replace(/\.ts$/, '.js');
        await rename(filePath, newFilePath);
      }
    }

    console.log('✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
