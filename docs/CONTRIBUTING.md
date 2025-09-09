# Contributing Guidelines

This document provides comprehensive guidelines for contributing to the Marine Term Translations React Frontend project. Whether you're fixing bugs, adding features, or improving documentation, these guidelines will help ensure your contributions are effective and align with the project's standards.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Component Guidelines](#component-guidelines)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Code Review Guidelines](#code-review-guidelines)
- [Release Process](#release-process)

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** (version 16.x or higher)
- **npm** (version 8.x or higher)
- **Git** for version control
- **GitHub account** with access to the repository
- **Code editor** (VS Code recommended)

### Initial Setup

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/React-Front-End.git
   cd React-Front-End
   ```

2. **Add Upstream Remote**
   ```bash
   git remote add upstream https://github.com/marine-term-translations/React-Front-End.git
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Verify Setup**
   ```bash
   npm start  # Should start development server
   npm test   # Should run tests
   ```

5. **Environment Configuration**
   - Create `.env` file based on `.env.example`
   - Configure required environment variables
   - Ensure backend connectivity for full testing

---

## Development Workflow

### Branch Strategy

We use a **feature branch** workflow:

1. **Main Branch**: `main`
   - Always stable and deployable
   - Only accepts pull requests
   - Protected with required reviews

2. **Feature Branches**: `feature/description`
   ```bash
   git checkout -b feature/add-translation-export
   git checkout -b feature/improve-error-handling
   git checkout -b bugfix/fix-authentication-issue
   ```

3. **Branch Naming Conventions**
   - `feature/`: New features
   - `bugfix/`: Bug fixes
   - `docs/`: Documentation updates
   - `refactor/`: Code refactoring
   - `test/`: Test improvements

### Development Process

1. **Sync with Upstream**
   ```bash
   git checkout main
   git pull upstream main
   git push origin main
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow code standards
   - Write tests for new functionality
   - Update documentation
   - Commit frequently with clear messages

4. **Test Your Changes**
   ```bash
   npm test              # Run tests
   npm run build         # Test build process
   npm start             # Manual testing
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

### Commit Message Guidelines

Follow the **Conventional Commits** specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(translate): add export functionality for translations
fix(auth): resolve token expiration handling
docs(api): update API service documentation
refactor(components): extract common loader component
test(translate): add tests for translation validation
```

---

## Code Standards

### JavaScript/React Standards

1. **ESLint Configuration**
   - Follow existing ESLint rules
   - Run `npm run lint` before commits
   - Fix all linting errors

2. **Code Formatting**
   ```javascript
   // Use consistent formatting
   const Component = ({ prop1, prop2 }) => {
     const [state, setState] = useState(defaultValue);
     
     useEffect(() => {
       // Effect logic
     }, [dependencies]);
     
     return (
       <div className="component-wrapper">
         {/* Component content */}
       </div>
     );
   };
   ```

3. **Naming Conventions**
   - **Components**: PascalCase (`TranslateCard`)
   - **Files**: PascalCase for components (`TranslateCard.js`)
   - **Variables/Functions**: camelCase (`handleSubmit`)
   - **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
   - **CSS Classes**: kebab-case (`translate-card`)

4. **Import Organization**
   ```javascript
   // 1. External libraries
   import React, { useState, useEffect } from 'react';
   import { Button, Card } from 'react-bootstrap';
   import axios from 'axios';
   
   // 2. Internal components
   import Loader from '../components/Loader';
   import { fetchData } from '../utils/apiService';
   
   // 3. Styles
   import 'bootstrap/dist/css/bootstrap.min.css';
   import './Component.css';
   ```

### File Organization

```
src/
├── components/           # Reusable components
│   ├── ComponentName.js
│   └── ComponentName.test.js
├── pages/               # Route-level components
│   ├── PageName.js
│   └── PageName.test.js
├── hooks/               # Custom hooks
│   └── useHookName.js
├── utils/               # Utility functions
│   ├── serviceName.js
│   └── serviceName.test.js
└── assets/              # Static assets
```

---

## Component Guidelines

### Component Structure

```javascript
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './ComponentName.css';

/**
 * ComponentName - Brief description of what it does
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Title to display
 * @param {Function} props.onAction - Callback for actions
 */
const ComponentName = ({ title, onAction }) => {
  const [localState, setLocalState] = useState(null);

  useEffect(() => {
    // Side effects
  }, []);

  const handleAction = () => {
    // Event handler logic
    onAction?.();
  };

  if (!title) {
    return <div>Loading...</div>;
  }

  return (
    <div className="component-name">
      <h2>{title}</h2>
      <button onClick={handleAction}>Action</button>
    </div>
  );
};

ComponentName.propTypes = {
  title: PropTypes.string.isRequired,
  onAction: PropTypes.func,
};

ComponentName.defaultProps = {
  onAction: () => {},
};

export default ComponentName;
```

### PropTypes Requirements

All components must include PropTypes:

```javascript
import PropTypes from 'prop-types';

ComponentName.propTypes = {
  // Required props
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  
  // Optional props with types
  description: PropTypes.string,
  isActive: PropTypes.bool,
  count: PropTypes.number,
  items: PropTypes.array,
  config: PropTypes.object,
  onAction: PropTypes.func,
  
  // Complex prop types
  user: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
  }),
  
  // Array of specific type
  branches: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      lastCommit: PropTypes.string.isRequired,
    })
  ),
};
```

### State Management Guidelines

1. **Use useState for Local State**
   ```javascript
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState(null);
   const [data, setData] = useState([]);
   ```

2. **Custom Hooks for Reusable Logic**
   ```javascript
   // Custom hook for API data
   const useApiData = (endpoint) => {
     const [data, setData] = useState(null);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState(null);
     
     // Fetch logic
     
     return { data, loading, error, refetch };
   };
   ```

3. **Session Storage for Persistence**
   ```javascript
   // Only for essential app state
   sessionStorage.setItem('github_token', token);
   sessionStorage.setItem('branch', branchName);
   ```

---

## Testing Requirements

### Test Structure

Every component should have corresponding tests:

```javascript
// ComponentName.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ComponentName from './ComponentName';

// Mock external dependencies
jest.mock('../utils/apiService');

const renderComponent = (props = {}) => {
  const defaultProps = {
    title: 'Test Title',
    onAction: jest.fn(),
  };
  
  return render(
    <BrowserRouter>
      <ComponentName {...defaultProps} {...props} />
    </BrowserRouter>
  );
};

describe('ComponentName', () => {
  test('renders with required props', () => {
    renderComponent();
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  test('calls onAction when button clicked', () => {
    const mockOnAction = jest.fn();
    renderComponent({ onAction: mockOnAction });
    
    fireEvent.click(screen.getByText('Action'));
    expect(mockOnAction).toHaveBeenCalledTimes(1);
  });

  test('shows loading state appropriately', () => {
    renderComponent({ title: null });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

### Test Categories

1. **Unit Tests**: Individual component functionality
2. **Integration Tests**: Component interactions
3. **API Tests**: Service function testing

### Test Coverage Goals

- **Components**: 80%+ test coverage
- **Utilities**: 90%+ test coverage
- **API Services**: Mock all external calls

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test ComponentName.test.js

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

---

## Documentation Standards

### Component Documentation

Every component should have:

1. **JSDoc Comments**
   ```javascript
   /**
    * TranslateCard - Displays translation data with editing capabilities
    * 
    * @param {Object} props - Component props
    * @param {Object} props.translation - Translation data object
    * @param {string} props.language - Target language code
    * @param {Function} props.onSave - Callback when translation is saved
    * @param {boolean} props.isReviewer - Whether user has reviewer permissions
    */
   ```

2. **README Updates**
   - Update relevant documentation
   - Add usage examples
   - Document any breaking changes

3. **Type Documentation**
   - PropTypes with descriptions
   - Return type documentation
   - Parameter validation

### API Documentation

New API functions should include:

```javascript
/**
 * Fetches translation suggestions from the AI service
 * 
 * @param {string} text - The text to translate
 * @param {string} targetLang - Target language code (e.g., 'es', 'fr')
 * @returns {Promise<string>} Promise resolving to suggested translation
 * @throws {Error} When API call fails or parameters are invalid
 * 
 * @example
 * const suggestion = await fetchSuggestions('marine ecosystem', 'es');
 * console.log(suggestion); // "ecosistema marino"
 */
export const fetchSuggestions = async (text, targetLang) => {
  // Implementation
};
```

---

## Pull Request Process

### Before Creating a PR

1. **Code Quality Checklist**
   - [ ] All tests pass
   - [ ] No linting errors
   - [ ] Code follows style guidelines
   - [ ] PropTypes added for new components
   - [ ] Documentation updated

2. **Testing Checklist**
   - [ ] Manual testing completed
   - [ ] New features have tests
   - [ ] Edge cases considered
   - [ ] Error handling tested

3. **Documentation Checklist**
   - [ ] Code comments added
   - [ ] README updated if needed
   - [ ] API documentation updated
   - [ ] Breaking changes documented

### PR Template

```markdown
## Description
Brief description of the changes and their purpose.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Tests pass locally

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added to complex code
- [ ] Documentation updated
- [ ] No breaking changes (or breaking changes documented)

## Screenshots (if applicable)
Add screenshots for UI changes.
```

### Review Process

1. **Automated Checks**
   - CI/CD pipeline must pass
   - All tests must pass
   - No linting errors

2. **Human Review**
   - At least one approving review required
   - Code quality assessment
   - Documentation review

3. **Merge Requirements**
   - All conversations resolved
   - Up-to-date with main branch
   - Squash and merge preferred

---

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
**Bug Description**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
A clear description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
- OS: [e.g. macOS, Windows]
- Browser: [e.g. chrome, safari]
- Version: [e.g. 22]

**Additional Context**
Add any other context about the problem here.
```

### Feature Requests

```markdown
**Feature Description**
A clear and concise description of what you want to happen.

**Problem Statement**
Describe the problem this feature would solve.

**Proposed Solution**
Describe the solution you'd like.

**Alternatives Considered**
Describe any alternative solutions or features you've considered.

**Additional Context**
Add any other context or screenshots about the feature request.
```

---

## Code Review Guidelines

### For Authors

1. **Self-Review First**
   - Review your own code before requesting review
   - Check for typos, unused imports, console.logs
   - Ensure tests are meaningful

2. **Clear Descriptions**
   - Explain the what and why in PR description
   - Link to relevant issues
   - Highlight areas needing special attention

3. **Respond to Feedback**
   - Address all review comments
   - Ask for clarification if needed
   - Update code based on feedback

### For Reviewers

1. **Review Criteria**
   - Code quality and readability
   - Test coverage and quality
   - Documentation completeness
   - Performance implications

2. **Constructive Feedback**
   - Be specific and actionable
   - Suggest improvements, don't just point out problems
   - Consider the author's learning and growth

3. **Focus Areas**
   - Security implications
   - Breaking changes
   - Performance impact
   - Accessibility compliance

---

## Release Process

### Version Management

We use semantic versioning (SemVer):
- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features, backwards compatible
- **Patch** (0.0.X): Bug fixes, backwards compatible

### Release Steps

1. **Prepare Release**
   - Update version in `package.json`
   - Update CHANGELOG.md
   - Create release branch

2. **Testing**
   - Run full test suite
   - Manual testing on staging
   - Performance testing

3. **Deployment**
   - Merge to main
   - Create GitHub release
   - Deploy to production

### Hotfix Process

For critical issues:
1. Create hotfix branch from main
2. Fix the issue
3. Test thoroughly
4. Fast-track review process
5. Deploy immediately

---

## Getting Help

### Resources

- **Documentation**: Check the `docs/` directory
- **Examples**: Look at existing components
- **Issues**: Search existing issues on GitHub
- **Discussions**: Use GitHub Discussions for questions

### Communication

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and ideas
- **Pull Request Comments**: For code-specific discussions

### Best Practices for Getting Help

1. **Search First**: Check if your question has been asked before
2. **Be Specific**: Provide context and examples
3. **Include Details**: OS, browser, error messages, steps to reproduce
4. **Follow Up**: Close issues when resolved, update with solutions

---

## Conclusion

Thank you for contributing to the Marine Term Translations project! These guidelines help ensure code quality, maintainability, and a positive collaborative experience. When in doubt, look at existing code for examples or ask questions through GitHub issues or discussions.

Remember:
- Quality over quantity
- Test your changes thoroughly
- Document your work
- Be respectful and collaborative
- Have fun and learn something new!

Your contributions help make marine term translations more accessible and accurate for researchers and practitioners worldwide.