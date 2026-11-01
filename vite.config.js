import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const promotionCurveFiles = [
  'outputs/Uplift_Curve/display_qini_curve.csv',
  'outputs/Uplift_Curve/mailer_qini_curve.csv',
  'outputs/model_training/display_qini_curve.csv',
  'outputs/model_training/mailer_qini_curve.csv',
]

function includePromotionCurves() {
  return {
    name: 'include-promotion-curve-csvs',
    apply: 'build',
    generateBundle() {
      promotionCurveFiles.forEach((fileName) => {
        const sourcePath = resolve(projectRoot, fileName)
        if (!existsSync(sourcePath)) return

        this.emitFile({
          type: 'asset',
          fileName,
          source: readFileSync(sourcePath),
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), includePromotionCurves()],
})
