# Project Structure

This document provides a comprehensive overview of the project's file and folder organization.

## Root Directory

```
React-Front-End/
├── public/                 # Static assets and HTML template
├── src/                   # Source code
├── Information/           # Documentation and screenshots
├── docs/                  # Comprehensive documentation
├── package.json           # Dependencies and scripts
├── package-lock.json      # Exact dependency versions
├── .env                   # Environment variables (local)
├── .env.production        # Production environment variables
├── .gitignore             # Git ignore rules
├── README.md              # Main project README
└── deploy.js              # Deployment script
```

## Source Code Structure (`src/`)

```
src/
├── components/            # Reusable React components
│   ├── BranchCard.js     # Individual branch display card
│   ├── BranchChart.js    # Translation progress charts
│   ├── Callback.js       # GitHub OAuth callback handler
│   ├── Changed.js        # Diff viewer and conflict resolution
│   ├── Loader.js         # Loading spinner component
│   ├── Login.js          # GitHub authentication component
│   └── NavBar/           # Navigation bar components
├── pages/                # Main page components (routes)
│   ├── Branches.js       # Branch selection page
│   ├── Translate.js      # Main translation interface
│   └── Translate.test.js # Tests for translation page
├── hooks/                # Custom React hooks
│   └── useBranches.js    # Hook for branch data management
├── utils/                # Utility functions and services
│   ├── apiService.js     # GitHub API interactions
│   ├── SuggestionService.js # AI translation suggestions
│   ├── dateUtils.js      # Date formatting utilities
│   ├── linkedDataUtils.js # RDF/SKOS data processing
│   └── stringUtils.js    # String manipulation utilities
├── assets/               # Static assets (images, icons)
├── App.js                # Main application component
├── App.css               # Global application styles
├── App.test.js           # Application tests
├── index.js              # Application entry point
├── index.css             # Global styles
└── setupTests.js         # Test configuration
```

## Component Organization

### Pages (`src/pages/`)
Contains route-level components that represent full pages:
- **Branches.js**: Landing page for branch selection
- **Translate.js**: Main translation workspace

### Components (`src/components/`)
Contains reusable UI components:
- **Navigation**: NavBar components for site navigation
- **Data Display**: BranchCard, BranchChart for data visualization
- **Authentication**: Login, Callback for GitHub OAuth
- **Content Management**: Changed for diff viewing and conflict resolution
- **UI Elements**: Loader for loading states

### Hooks (`src/hooks/`)
Custom React hooks for state management and side effects:
- **useBranches.js**: Manages branch data fetching and state

### Utils (`src/utils/`)
Service functions and utilities:
- **apiService.js**: Centralized GitHub API calls
- **SuggestionService.js**: AI-powered translation suggestions
- **dateUtils.js**: Date formatting and timezone handling
- **linkedDataUtils.js**: RDF/SKOS semantic data processing
- **stringUtils.js**: String manipulation helpers

## Configuration Files

### `package.json`
Defines project metadata, dependencies, and scripts:
- **Dependencies**: React 18, React Router, Bootstrap, Axios, RDF libraries
- **Scripts**: start, build, test, deploy
- **Configuration**: ESLint, Browserslist

### Environment Variables
- **`.env`**: Local development environment variables
- **`.env.production`**: Production environment variables
- **Required Variables**:
  - `REACT_APP_BACK_URL`: Backend API URL
  - `REACT_APP_REPO`: GitHub repository identifier

### Deployment
- **`deploy.js`**: GitHub Pages deployment script
- **`gh-pages`**: Automated deployment to GitHub Pages

## Documentation Structure (`docs/`)

```
docs/
├── PROJECT_STRUCTURE.md  # This file
├── COMPONENTS.md         # Component documentation
├── SETUP.md             # Development setup guide
├── API.md               # API service documentation
├── ROUTING.md           # Navigation and routing
├── STATE_MANAGEMENT.md  # State patterns and data flow
├── CONTRIBUTING.md      # Contribution guidelines
└── ARCHITECTURE.md      # System architecture overview
```

## Information Directory

The `Information/` directory contains:
- **Usage.md**: User guide with screenshots
- **Image/**: Screenshots and visual documentation

## Key Architectural Patterns

1. **Component-Based Architecture**: Modular React components with clear separation of concerns
2. **Service Layer**: Centralized API calls in `apiService.js`
3. **Custom Hooks**: State management abstraction with `useBranches.js`
4. **Route-Based Code Splitting**: Page-level components for major routes
5. **Environment-Based Configuration**: Separate configs for development and production
6. **OAuth Integration**: GitHub-based authentication flow
7. **Real-time Data**: Session storage for state persistence
8. **Responsive Design**: Bootstrap-based responsive UI

## Dependencies Overview

### Core Framework
- **React 18**: UI framework with hooks and functional components
- **React Router**: Client-side routing
- **React Bootstrap**: UI component library

### Data & API
- **Axios**: HTTP client for API calls
- **RDF Libraries**: Semantic data processing (N3, JSONLd, RDFlib)
- **Comunica**: SPARQL query engine

### Development & Build
- **React Scripts**: Build tooling and development server
- **Jest**: Testing framework
- **ESLint**: Code linting

### UI & Visualization
- **Bootstrap**: CSS framework
- **React Icons**: Icon library
- **Chart.js**: Data visualization
- **React Diff Viewer**: Code diff visualization

This structure promotes maintainability, scalability, and clear separation of concerns throughout the application.