// Load .env.local before running tests
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root      = resolve(__dirname, '..')

if (existsSync(resolve(root, '.env')))       config({ path: resolve(root, '.env') })
if (existsSync(resolve(root, '.env.local'))) config({ path: resolve(root, '.env.local'), override: true })
