#!/usr/bin/env node

/**
 * Build script for Unga Bunga User-Agent Extension
 * Handles building, linting, and packaging
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const config = {
  name: 'unga-bunga-user-agent',
  version: '1.1.0',
  sourceDir: '.',
  buildDir: 'dist',
  excludePatterns: [
    'node_modules/**',
    '.git/**',
    'dist/**',
    '*.zip',
    '*.xpi',
    '*.crx',
    '.DS_Store',
    'build.js',
    'package-lock.json',
    'yarn.lock'
  ]
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Utility functions
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logInfo(`Created directory: ${dir}`);
  }
}

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  ensureDir(destDir);
  fs.copyFileSync(src, dest);
}

function shouldExclude(filePath) {
  return config.excludePatterns.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
    return regex.test(filePath);
  });
}

function copyDirectory(src, dest) {
  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    if (shouldExclude(srcPath)) {
      continue;
    }
    
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

// Build tasks
function clean() {
  logInfo('Cleaning build directory...');
  if (fs.existsSync(config.buildDir)) {
    fs.rmSync(config.buildDir, { recursive: true, force: true });
    logSuccess('Build directory cleaned');
  }
}

function build() {
  logInfo('Building extension...');
  
  try {
    // Create build directory
    ensureDir(config.buildDir);
    
    // Copy source files
    copyDirectory(config.sourceDir, config.buildDir);
    
    logSuccess('Extension built successfully');
  } catch (error) {
    logError(`Build failed: ${error.message}`);
    process.exit(1);
  }
}

function lint() {
  logInfo('Linting code...');
  
  try {
    // Check if ESLint is available
    execSync('npx eslint --version', { stdio: 'pipe' });
    
    // Run ESLint
    execSync('npx eslint . --ext .js', { stdio: 'inherit' });
    logSuccess('Linting completed successfully');
  } catch (error) {
    if (error.status === 1) {
      logWarning('Linting found issues');
    } else {
      logInfo('ESLint not available, skipping linting');
    }
  }
}

function package() {
  logInfo('Packaging extension...');
  
  try {
    const packageName = `${config.name}-v${config.version}.zip`;
    const packagePath = path.join(config.buildDir, packageName);
    
    // Create zip file
    execSync(`cd ${config.buildDir} && zip -r ${packageName} . -x "*.zip"`, { stdio: 'inherit' });
    
    logSuccess(`Extension packaged: ${packagePath}`);
  } catch (error) {
    logError(`Packaging failed: ${error.message}`);
    process.exit(1);
  }
}

function validate() {
  logInfo('Validating extension...');
  
  try {
    const manifestPath = path.join(config.buildDir, 'manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
      throw new Error('manifest.json not found');
    }
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Basic validation
    if (manifest.manifest_version !== 3) {
      throw new Error('Manifest version must be 3');
    }
    
    if (!manifest.name || !manifest.version) {
      throw new Error('Name and version are required');
    }
    
    logSuccess('Extension validation passed');
  } catch (error) {
    logError(`Validation failed: ${error.message}`);
    process.exit(1);
  }
}

// Main execution
function main() {
  const command = process.argv[2] || 'build';
  
  log(`Building ${config.name} v${config.version}`, 'bright');
  
  switch (command) {
    case 'clean':
      clean();
      break;
    case 'build':
      clean();
      build();
      validate();
      break;
    case 'lint':
      lint();
      break;
    case 'package':
      clean();
      build();
      validate();
      package();
      break;
    case 'dev':
      clean();
      build();
      validate();
      logInfo('Development build ready');
      break;
    default:
      logError(`Unknown command: ${command}`);
      logInfo('Available commands: clean, build, lint, package, dev');
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  clean,
  build,
  lint,
  package,
  validate,
  config
};
