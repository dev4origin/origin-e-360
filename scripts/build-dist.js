#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Building Origin.e 360° for Netlify deployment...');

// Create .env.local with embedded environment variables
const envContent = `NEXT_PUBLIC_SUPABASE_URL=https://rqfikgnlgxfjbatkrzhy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxZmlrZ25sZ3hmamJhdGtyemh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MzAwMzMsImV4cCI6MjA3NTIwNjAzM30.w36canqA8OAcF7vqkoZVvNOviHaQZbgOaWmeARnQPp8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxZmlrZ25sZ3hmamJhdGtyemh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYzMDAzMywiZXhwIjoyMDc1MjA2MDMzfQ.1ccMAIZnEmnAOLiR1CLMoyzxTXxJAnfkmRRiRfh5H-g
`;

fs.writeFileSync('.env.local', envContent);
console.log('✅ Environment variables set');

// Clean previous build
try {
  if (fs.existsSync('.next')) {
    fs.rmSync('.next', { recursive: true, force: true });
  }
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  console.log('🧹 Cleaned previous builds');
} catch (error) {
  console.log('⚠️  Could not clean previous builds, continuing...');
}

// Build the Next.js application
console.log('🔨 Building Next.js application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Next.js build completed');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Create dist directory with all necessary files
console.log('📦 Creating dist directory...');
fs.mkdirSync('dist');

// Copy .next directory (the built application)
if (fs.existsSync('.next')) {
  fs.cpSync('.next', 'dist/.next', { recursive: true });
}

// Copy public directory if it exists
if (fs.existsSync('public')) {
  fs.cpSync('public', 'dist/public', { recursive: true });
}

// Copy package.json for deployment info
fs.copyFileSync('package.json', 'dist/package.json');

// Copy next.config.mjs
fs.copyFileSync('next.config.mjs', 'dist/next.config.mjs');

// Create a simple server.js for Netlify Functions (optional)
const serverContent = `const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});
`;

fs.writeFileSync('dist/server.js', serverContent);

// Copy netlify.toml to dist
fs.copyFileSync('netlify.toml', 'dist/netlify.toml');

console.log('✅ Dist directory created successfully!');
console.log('📁 Contents of dist/:');
const distContents = fs.readdirSync('dist');
distContents.forEach(item => {
  const stats = fs.statSync(path.join('dist', item));
  console.log(`  ${stats.isDirectory() ? '📁' : '📄'} ${item}`);
});

console.log('\n🎉 Build completed! Deploy the "dist" folder to Netlify.');
console.log('💡 Make sure to set the publish directory to "dist/.next" in Netlify settings.');