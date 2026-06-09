import { defineConfig, build as viteBuild } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs'

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

function extensionAssets(outDir, browser) {
  return {
    name: 'extension-assets',
    closeBundle() {
      const manifest = JSON.parse(readFileSync('manifest.json', 'utf-8'))
      if (browser === 'firefox') {
        delete manifest.background.service_worker
        manifest.background.scripts = ['src/background/index.js']
      }
      writeFileSync(resolve(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
      if (existsSync('icons')) copyDir('icons', resolve(outDir, 'icons'))
    },
  }
}

function buildSingleFile(outDir, entry, outFile, iifeExport) {
  return {
    name: `build-single-${outFile}`,
    async closeBundle() {
      await viteBuild({
        configFile: false,
        plugins: [vue()],
        define: { 'process.env.NODE_ENV': '"production"' },
        build: {
          outDir,
          emptyOutDir: false,
          lib: {
            entry: resolve(__dirname, entry),
            formats: ['iife'],
            name: iifeExport,
          },
          rollupOptions: {
            output: {
              entryFileNames: outFile,
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
      buildSingleFile(outDir, 'src/content/index.js', 'src/content/index.js', 'SpacedReviewContent'),
      buildSingleFile(outDir, 'src/background/index.js', 'src/background/index.js', 'SpacedReviewBackground'),
      extensionAssets(outDir, mode === 'firefox' ? 'firefox' : 'chrome'),
    ],
    base: '',
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup/index.html'),
        },
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  }
})
