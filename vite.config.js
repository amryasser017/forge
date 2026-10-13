import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// json.stringify: large JSON (the exercise library) is embedded as a JSON.parse string, which parses faster.
// test: unit tests for the pure library code (TRIO FIT in trio-fit/ has its own test setup).
export default defineConfig({
  plugins: [react()],
  json: { stringify: true },
  test: { include: ['tests/**/*.test.js'], environment: 'node' },
});
