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

    // Create necessary directories for Prisma client
    const distPrismaPath = join(process.cwd(), 'dist', 'src');
    const prismaClientPath = join(distPrismaPath, 'lib');
    await mkdir(prismaClientPath, { recursive: true });

    // Create prismaClient.js file
    try {
      const clientFile = join(prismaClientPath, 'prismaClient.js');
      await writeFile(clientFile, `
        import { PrismaClient } from '@prisma/client';
        
        const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
        
        export const prisma = globalForPrisma.prisma ?? new PrismaClient();
        
        if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
      `);
    } catch (err) {
      console.error(`❌ Failed to create prismaClient.js: ${err.message}`);
      throw err;
    }

     // Copy the generated Prisma client files
     try {
       const srcPrismaPath = join(process.cwd(), 'node_modules', '@prisma', 'client');
       const files = await readdir(srcPrismaPath);
       
       // Only copy essential files
       const essentialFiles = ['index.js', 'package.json'];
       
       for (const file of essentialFiles) {
         const srcPath = join(srcPrismaPath, file);
         const destPath = join(prismaClientPath, file);
         try {
           await copyFile(srcPath, destPath);
         } catch (err) {
           console.warn(`⚠️  Could not copy ${file}: ${err.message}`);
         }
       }
       
       // Copy runtime files
       const runtimePath = join(srcPrismaPath, 'runtime');
       const destRuntimePath = join(prismaClientPath, 'runtime');
       await mkdir(destRuntimePath, { recursive: true });
       
       const runtimeFiles = await readdir(runtimePath);
       for (const file of runtimeFiles) {
         if (file.endsWith('.js') || file.endsWith('.d.ts')) {
           const srcPath = join(runtimePath, file);
           const destPath = join(destRuntimePath, file);
           try {
             await copyFile(srcPath, destPath);
           } catch (err) {
             console.warn(`⚠️  Could not copy runtime file ${file}: ${err.message}`);
           }
         }
       }
     } catch (err) {
       console.error(`❌ Failed to copy Prisma client files: ${err.message}`);
       throw err;
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
