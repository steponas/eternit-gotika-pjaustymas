import {
  defineConfig,
  minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...preset,
    maskable: {
      ...preset.maskable,
      // Safe zone padding for maskable icons (~20% recommended)
      padding: 0.2,
    },
  },
  images: ['public/icon.svg'],
})
