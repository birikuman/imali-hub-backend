import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the .env file from the root folder (Imali Hub/.env)
dotenv.config({ path: path.join(__dirname, '../../.env') });
