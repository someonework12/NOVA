import { writeFileSync, mkdirSync } from 'fs'
const apiUrl = process.env.VITE_API_URL
if (!apiUrl) { console.warn('VITE_API_URL not set - API calls will fail'); process.exit(0) }
mkdirSync('public', { recursive: true })
writeFileSync('public/_redirects', `/api/*  ${apiUrl}/api/:splat  200\n/*  /index.html  200\n`)
console.log('_redirects generated with:', apiUrl)
