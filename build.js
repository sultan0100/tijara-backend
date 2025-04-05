import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdir, copyFile, readdir, rename, writeFile } from 'fs/promises';
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
    await mkdir('dist/src', { recursive: true });
    await mkdir('dist/src/prisma', { recursive: true });
    await mkdir('dist/src/lib', { recursive: true });

    // Generate Prisma Client with schema path
    console.log('🔄 Generating Prisma Client...');
    await execAsync('prisma generate --schema src/prisma/schema.prisma');

    // Copy Prisma client files
    console.log('📦 Copying Prisma client...');
    const srcDir = join(process.cwd(), 'src');
    const distPrismaPath = join(process.cwd(), 'dist', 'src');
    
    // Copy schema
    try {
      await copyFile(
        join(srcDir, 'prisma', 'schema.prisma'),
        join(distPrismaPath, 'prisma', 'schema.prisma')
      );
    } catch (err) {
      console.warn(`⚠️  Could not copy schema.prisma: ${err.message}`);
    }

    // Create prismaClient.js file
    try {
      const prismaClientPath = join(distPrismaPath, 'lib', 'prismaClient.js');
      await writeFile(prismaClientPath, `
        import { PrismaClient } from '@prisma/client';
        
        const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
        
        export const prisma = globalForPrisma.prisma ?? new PrismaClient();
        
        if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
      `);
    } catch (err) {
      console.warn(`⚠️  Could not create prismaClient.js: ${err.message}`);
    }

    // Copy the generated Prisma client from node_modules
    try {
      const prismaClientPath = join(process.cwd(), 'node_modules', '@prisma', 'client');
      const distPrismaClientPath = join(distPrismaPath, 'lib', 'prisma');
      await mkdir(distPrismaClientPath, { recursive: true });

      // Copy essential files
      const essentialFiles = ['index.js', 'package.json'];
      for (const file of essentialFiles) {
        try {
          await copyFile(
            join(prismaClientPath, file),
            join(distPrismaClientPath, file)
          );
        } catch (err) {
          console.warn(`⚠️  Could not copy ${file}: ${err.message}`);
        }
      }

      // Copy runtime files
      const runtimePath = join(prismaClientPath, 'runtime');
      const distRuntimePath = join(distPrismaClientPath, 'runtime');
      await mkdir(distRuntimePath, { recursive: true });

      // Copy all runtime files
      const runtimeFiles = await readdir(runtimePath);
      for (const file of runtimeFiles) {
        if (file.endsWith('.js') || file.endsWith('.d.ts')) {
          try {
            await copyFile(
              join(runtimePath, file),
              join(distRuntimePath, file)
            );
          } catch (err) {
            console.warn(`⚠️  Could not copy runtime file ${file}: ${err.message}`);
          }
        }
      }
    } catch (err) {
      console.warn(`⚠️  Could not copy Prisma client files: ${err.message}`);
    }

    // Compile TypeScript
    console.log('🔨 Compiling TypeScript...');
    await execAsync('tsc');

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
