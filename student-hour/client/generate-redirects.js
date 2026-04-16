// This runs at build time to bake VITE_API_URL into _redirects
import { writeFileSync } from 'fs'

const apiUrl = process.env.VITE_API_URL
if (!apiUrl) {
  console.warn('WARNING: VITE_API_URL not set — API calls will fail on Netlify')
  process.exit(0)
}

const content = `/api/*  ${apiUrl}/api/:splat  200\n/*  /index.html  200\n`
writeFileSync('public/_redirects', content)
console.log('Generated _redirects with API URL:', apiUrl)
