# Setup and Development Guide

This guide provides comprehensive instructions for setting up the development environment, running the application, and contributing to the project.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Development Workflow](#development-workflow)
- [Build Process](#build-process)
- [Deployment](#deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting development, ensure you have the following installed:

### Required Software
- **Node.js** (version 16.x or higher)
- **npm** (version 8.x or higher) or **yarn**
- **Git** (for version control)
- **Modern Browser** (Chrome, Firefox, Safari, or Edge)

### Optional Tools
- **VS Code** (recommended IDE with React extensions)
- **React Developer Tools** (browser extension)
- **Postman** (for API testing)

### Verify Installation
```bash
node --version   # Should output v16.x or higher
npm --version    # Should output 8.x or higher
git --version    # Should output git version info
```

## Environment Setup

### 1. Clone the Repository
```bash
git clone https://github.com/marine-term-translations/React-Front-End.git
cd React-Front-End
```

### 2. Check Repository Structure
```bash
ls -la
# Should show: src/, public/, docs/, package.json, etc.
```

## Installation

### Install Dependencies
```bash
# Using npm
npm install

# Or using yarn
yarn install
```

### Dependency Overview
The installation will add the following key dependencies:

**Core Framework:**
- React 18.x
- React DOM 18.x
- React Router DOM 6.x

**UI Libraries:**
- React Bootstrap 2.x
- Bootstrap 5.x
- React Icons 5.x

**Data & API:**
- Axios 1.x
- Chart.js 4.x
- React Chart.js 2

**RDF & Semantic Data:**
- N3 1.x
- JSONLd 8.x
- RDFlib 2.x
- Comunica Query SPARQL 3.x

**Development Tools:**
- React Scripts 5.x
- Testing Library (Jest, React)
- ESLint

## Configuration

### Environment Variables

The application requires environment variables for proper functionality.

#### Development Environment
Create or modify `.env` in the project root:

```bash
# Backend API URL
REACT_APP_BACK_URL=https://your-backend-api.com

# GitHub Repository Identifier
REACT_APP_REPO=your-repo-name
```

#### Production Environment
Create or modify `.env.production`:

```bash
# Production Backend API URL
REACT_APP_BACK_URL=https://your-production-api.com

# Production GitHub Repository
REACT_APP_REPO=your-production-repo
```

#### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_BACK_URL` | Backend API base URL | `https://api.example.com` |
| `REACT_APP_REPO` | GitHub repository identifier | `my-translation-repo` |

### Backend Integration

This frontend requires a compatible backend service that provides:

1. **GitHub OAuth Integration**
   - OAuth app registration
   - Token exchange endpoints
   - User authentication

2. **GitHub API Proxy**
   - Branch management
   - File operations
   - Pull request handling

3. **Translation Services**
   - AI suggestion endpoints
   - Translation validation
   - Progress tracking

### GitHub OAuth Setup

For development, you'll need to configure GitHub OAuth:

1. **Create GitHub OAuth App**
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create a new OAuth App
   - Set Authorization callback URL to your local development URL

2. **Configure Backend**
   - Provide OAuth app credentials to your backend service
   - Ensure backend handles token exchange

## Running the Application

### Development Server
```bash
# Start development server
npm start

# Or with yarn
yarn start
```

The application will be available at:
- **URL**: http://localhost:3000
- **Hot Reload**: Enabled by default
- **Error Overlay**: Shows compilation errors in browser

### Development Features
- **Hot Module Replacement**: Changes reflect immediately
- **Error Boundaries**: Graceful error handling
- **DevTools Integration**: React and Redux DevTools support
- **Source Maps**: Debug with original source code

### Network Access
To access the development server from other devices on your network:

```bash
# Find your local IP
ipconfig getifaddr en0  # macOS
hostname -I            # Linux
ipconfig              # Windows

# Access via http://YOUR_IP:3000
```

## Development Workflow

### Recommended Development Process

1. **Start Development Server**
   ```bash
   npm start
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Edit source files in `src/`
   - Changes auto-reload in browser
   - Use React DevTools for debugging

4. **Test Changes**
   ```bash
   npm test
   ```

5. **Build and Verify**
   ```bash
   npm run build
   ```

### Code Organization

Follow these patterns when developing:

```
src/
├── components/        # Reusable UI components
│   ├── ComponentName.js
│   └── ComponentName.test.js
├── pages/            # Route-level components
│   ├── PageName.js
│   └── PageName.test.js
├── hooks/            # Custom React hooks
│   └── useHookName.js
├── utils/            # Utility functions
│   ├── serviceName.js
│   └── helperName.js
└── assets/           # Static assets
```

### File Naming Conventions
- **Components**: PascalCase (e.g., `BranchCard.js`)
- **Hooks**: camelCase with "use" prefix (e.g., `useBranches.js`)
- **Utils**: camelCase (e.g., `apiService.js`)
- **Tests**: Match component name with `.test.js` suffix

### Import Organization
```javascript
// External libraries
import React, { useState, useEffect } from 'react';
import { Button, Card } from 'react-bootstrap';
import axios from 'axios';

// Internal components
import Loader from '../components/Loader';
import { fetchBranches } from '../utils/apiService';

// Styles
import 'bootstrap/dist/css/bootstrap.min.css';
import './ComponentName.css';
```

## Build Process

### Development Build
```bash
npm run build
```

### Build Output
The build process creates an optimized production build:

```
build/
├── static/
│   ├── css/          # Minified CSS files
│   ├── js/           # Minified JavaScript bundles
│   └── media/        # Optimized images and assets
├── index.html        # Main HTML file
└── manifest.json     # PWA manifest
```

### Build Optimizations
- **Code Splitting**: Automatic bundle splitting
- **Tree Shaking**: Dead code elimination
- **Minification**: CSS and JavaScript minification
- **Asset Optimization**: Image compression and optimization

### Build Analysis
To analyze bundle size:

```bash
# Install analyzer
npm install -g source-map-explorer

# Build and analyze
npm run build
npx source-map-explorer 'build/static/js/*.js'
```

## Deployment

### GitHub Pages Deployment

The project includes an automated deployment script for GitHub Pages.

#### Using the Deploy Script
```bash
# Deploy to GitHub Pages
node deploy.js your-repository-name
```

#### Manual Deployment
```bash
# Build the project
npm run build

# Deploy using gh-pages
npm install -g gh-pages
gh-pages -d build
```

#### Deployment Process
The deployment script automatically:

1. Updates `package.json` homepage field
2. Updates `.env.production` with repository name
3. Builds the React application
4. Deploys to GitHub Pages `gh-pages` branch
5. Makes the site available at the configured URL

### Alternative Deployment Options

#### Vercel
```bash
npm install -g vercel
vercel --prod
```

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=build
```

#### Traditional Web Server
```bash
# Build the project
npm run build

# Upload the build/ directory to your web server
# Configure server to serve index.html for all routes (SPA routing)
```

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode (default)
npm test -- --watch

# Run tests once (CI mode)
npm test -- --watchAll=false

# Run specific test file
npm test ComponentName.test.js

# Run tests with coverage
npm test -- --coverage
```

### Test Structure
```
src/
├── components/
│   ├── Component.js
│   └── Component.test.js
├── pages/
│   ├── Page.js
│   └── Page.test.js
└── utils/
    ├── utility.js
    └── utility.test.js
```

### Writing Tests
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ComponentName from './ComponentName';

test('renders component correctly', () => {
  render(
    <BrowserRouter>
      <ComponentName />
    </BrowserRouter>
  );
  
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

### Test Categories
- **Unit Tests**: Individual component functionality
- **Integration Tests**: Component interaction
- **E2E Tests**: Full user workflows (if implemented)

## Troubleshooting

### Common Issues

#### 1. Installation Problems
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 2. Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000

# Or start on different port
PORT=3001 npm start
```

#### 3. Environment Variables Not Loading
- Ensure `.env` file is in project root
- Restart development server after changes
- Check for typos in variable names
- Ensure variables start with `REACT_APP_`

#### 4. API Connection Issues
- Verify backend service is running
- Check `REACT_APP_BACK_URL` in environment variables
- Ensure CORS is configured on backend
- Check network connectivity

#### 5. Login Authentication Issues
If you encounter login problems, the application provides enhanced guidance:
- **Failed Login Links**: The app detects when login attempts fail and provides explanations
- **Browser Security Warnings**: A guidance modal helps users navigate browser security prompts
- **Alternative Login Method**: Direct access to the OAuth endpoint when normal login fails
- **Clear Instructions**: Step-by-step guidance for Chrome/Edge, Firefox, and Safari browsers

For persistent login issues:
- Ensure `REACT_APP_BACK_URL` is correctly configured
- Check that the backend OAuth service is accessible
- Verify network connectivity and browser security settings

#### 5. Build Failures
```bash
# Clear build cache
rm -rf build

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try building again
npm run build
```

#### 6. OAuth Authentication Issues
- Verify GitHub OAuth app configuration
- Check redirect URLs match your setup
- Ensure backend OAuth integration is working
- Clear browser storage and cookies

### Debug Mode

Enable debug logging:
```bash
# Start with debug logging
REACT_APP_DEBUG=true npm start
```

### Performance Issues
- Use React DevTools Profiler
- Check bundle size with source-map-explorer
- Monitor network requests in browser DevTools
- Consider code splitting for large components

### Getting Help

1. **Check Console**: Browser developer tools console for errors
2. **React DevTools**: Install browser extension for component inspection
3. **Network Tab**: Monitor API calls and responses
4. **Documentation**: Refer to this documentation and component docs
5. **Issues**: Create GitHub issues for bugs or feature requests

### Development Best Practices

1. **Code Quality**
   - Follow ESLint configuration
   - Use PropTypes for component validation
   - Write meaningful commit messages
   - Keep components small and focused

2. **Performance**
   - Use React.memo for expensive components
   - Implement proper key props for lists
   - Avoid unnecessary re-renders
   - Optimize images and assets

3. **Accessibility**
   - Use semantic HTML elements
   - Provide alt text for images
   - Ensure keyboard navigation
   - Test with screen readers

4. **Security**
   - Never commit sensitive data
   - Validate user inputs
   - Use HTTPS in production
   - Keep dependencies updated

This setup guide should help you get started with development quickly and efficiently. For more specific information about components and architecture, refer to the other documentation files in the `docs/` directory.