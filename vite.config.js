import { defineConfig, build as viteBuild } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs'

const __dirname = new URL('.', import.meta.url).pathname.replace(/\/$/, '')

function copyDir(src, dest) {
  if (!existsSync(src)) return
  mkdirSync(dest, { recursive: true })
  for (const file of readdirSync(src)) {
    const srcPath = resolve(src, file)
    const destPath = resolve(dest, file)
    if (statSync(srcPath).isDirectory()) copyDir(srcPath, destPath)
    else copyFileSync(srcPath, destPath)
  }
}

function extensionAssets(outDir) {
  return {
    name: 'extension-assets',
    closeBundle() {
      copyFileSync('manifest.json', resolve(outDir, 'manifest.json'))
      if (existsSync('icons')) copyDir('icons', resolve(outDir, 'icons'))
    },
  }
}

function buildContentIIFE(outDir) {
  return {
    name: 'build-content-iife',
    async closeBundle() {
      await viteBuild({
        configFile: false,
        plugins: [vue()],
        define: { 'process.env.NODE_ENV': '"production"' },
        build: {
          outDir,
          emptyOutDir: false,
          lib: {
            entry: resolve(__dirname, 'src/content/index.js'),
            formats: ['iife'],
            name: 'SpacedReviewContent',
          },
          rollupOptions: {
            output: {
              entryFileNames: 'src/content/index.js',
              assetFileNames: 'assets/[name][extname]',
            },
          },
        },
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const outDir = mode === 'firefox' ? 'dist-firefox' : 'dist-chrome'

  return {
    plugins: [
      vue(),
      buildContentIIFE(outDir),
      extensionAssets(outDir),
    ],
    base: '',
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup/index.html'),
          background: resolve(__dirname, 'src/background/index.js'),
        },
        output: {
          entryFileNames: (chunk) => {
            if (chunk.name === 'background') return 'src/background/index.js'
            return 'assets/[name]-[hash].js'
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  }
})
