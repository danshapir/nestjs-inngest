import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Disable for now due to Inngest type issues
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    '@nestjs/common',
    '@nestjs/core',
    '@nestjs/testing',
    'inngest',
    'reflect-metadata',
    'rxjs',
    'express'
  ],
});