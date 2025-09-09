# Component Documentation

This document provides comprehensive documentation for all React components in the application, including their props, state management, hooks, and usage examples.

## Table of Contents

- [Pages](#pages)
  - [Branches](#branches)
  - [Translate](#translate)
- [Components](#components)
  - [BranchCard](#branchcard)
  - [BranchChart](#branchchart)
  - [Callback](#callback)
  - [Changed](#changed)
  - [Loader](#loader)
  - [Login](#login)
  - [NavBarTranslate](#navbartranslate)
- [Custom Hooks](#custom-hooks)
  - [useBranches](#usebranches)

---

## Pages

### Branches

**Location**: `src/pages/Branches.js`

Main landing page for branch selection with translation progress overview.

#### Props
- None (uses custom hook for data management)

#### State Management
Uses the `useBranches` custom hook for:
- `error`: Error messages from API calls
- `loading`: Loading state during data fetching
- `branches`: Array of available branches
- `emptyField`: Translation progress data per branch/language
- `totalFieldsCount`: Total fields count per branch/language

#### Key Features
- Displays available branches in a responsive grid
- Shows translation progress with visual charts
- Handles timezone-based date formatting
- Automatic redirection for unauthenticated users

#### Dependencies
- `useBranches` hook
- `BranchCard` component
- `Loader` component
- `formatDate` utility

#### Usage Example
```jsx
import Branches from './pages/Branches';

// Used in routing
<Route path="/branches" element={<Branches />} />
```

#### PropTypes Validation
```javascript
Branches.propTypes = {
  error: PropTypes.string,
  loading: PropTypes.bool,
  branches: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      lastCommit: PropTypes.string.isRequired,
    })
  ),
  emptyField: PropTypes.object,
  totalFieldsCount: PropTypes.object,
};
```

---

### Translate

**Location**: `src/pages/Translate.js`

Main translation workspace with comprehensive translation management features.

#### State Variables

**Core State**:
- `error`: Error messages
- `loading`: Loading states
- `contents`: Translation file contents
- `selectedLanguage`: Currently selected language
- `suggestions`: AI translation suggestions
- `translations`: Modified translations

**Authentication & Navigation**:
- `navigate`: React Router navigation hook

**UI State**:
- `modalShow`: Modal visibility
- `showToast`: Toast notifications
- `showHistoryModal`: History modal visibility

**Review & Approval**:
- `reviewerMode`: Current user reviewer status
- `isReviewer`: Boolean reviewer check
- `approvalDetails`: File approval status
- `prNumber`: Pull request number

**Linked Data & Suggestions**:
- `preLabels`: SKOS prefLabel data
- `suggestionErrors`: Suggestion API errors
- `disabledButtons`: Button disable states

#### Key Features

1. **Translation Management**
   - Language selection
   - Real-time translation editing
   - Auto-save functionality
   - Bulk save operations

2. **AI Suggestions**
   - Automatic translation suggestions
   - Manual suggestion requests
   - Error handling for suggestion failures

3. **Review System**
   - File approval workflow
   - Reviewer mode detection
   - Per-label approval tracking

4. **Linked Data Integration**
   - SKOS prefLabel extraction
   - RDF data processing
   - Semantic data enhancement

5. **History Tracking**
   - Session-based history storage
   - Navigation breadcrumbs
   - Undo functionality

#### Side Effects (useEffect)

1. **Authentication Check**: Redirects unauthenticated users
2. **Branch Validation**: Ensures valid branch selection
3. **Content Loading**: Fetches translation data
4. **History Management**: Loads/saves navigation history
5. **Beforeunload Warning**: Prevents data loss

#### Major Functions

- `updateField()`: Updates individual translation fields
- `handleSave()`: Saves translations for a single file
- `handleSaveAll()`: Bulk save all modifications
- `handleFileApproval()`: Approves translation files
- `fetchSuggestion()`: Gets AI translation suggestions
- `calculateModifiedCounts()`: Tracks unsaved changes

---

## Components

### BranchCard

**Location**: `src/components/BranchCard.js`

Displays individual branch information with navigation and progress visualization.

#### Props
```javascript
{
  branch: {
    name: string,          // Branch name
    // ... other branch properties
  },
  formattedDate: string,   // Formatted last commit date
  emptyFieldCounts: object, // Empty fields per language
  totalFields: object      // Total fields per language
}
```

#### Features
- Clickable navigation to branch translation page
- Integration with BranchChart for progress visualization
- Responsive grid layout (Bootstrap responsive columns)
- Date display with timezone formatting

#### Usage Example
```jsx
<BranchCard
  branch={branch}
  formattedDate="01/12/2024 14:30:15"
  emptyFieldCounts={{ "en": 5, "es": 3 }}
  totalFields={{ "en": 50, "es": 40 }}
/>
```

---

### BranchChart

**Location**: `src/components/BranchChart.js`

Doughnut chart visualization for translation progress per language.

#### Props
```javascript
{
  emptyFieldCounts: object, // Empty fields count per language
  totalFields: object       // Total fields count per language
}
```

#### Chart Configuration
- **Type**: Doughnut chart (Chart.js)
- **Data**: Completed vs incomplete translations
- **Colors**: Dynamic color generation with opacity variations
- **Responsive**: Maintains aspect ratio across devices

#### Features
- Loading state with spinner
- Dynamic label generation with completion counts
- Color-coded visualization for different languages
- No legend display for clean appearance

#### Usage Example
```jsx
<BranchChart
  emptyFieldCounts={{ "en": 10, "es": 5 }}
  totalFields={{ "en": 100, "es": 50 }}
/>
```

---

### Callback

**Location**: `src/components/Callback.js`

Handles GitHub OAuth callback and token exchange.

#### State Variables
- `error`: Error messages during token exchange
- `loading`: Loading state during API calls

#### Process Flow
1. Extracts authorization code from URL parameters
2. Exchanges code for access token via backend API
3. Stores token in sessionStorage
4. Redirects to branches page
5. Handles errors with user feedback and auto-redirect

#### Error Handling
- Network errors
- API response errors
- Missing authorization code
- Auto-redirect to login after 5 seconds on error

#### Side Effects
- Token exchange on component mount
- Automatic navigation based on success/failure

---

### Changed

**Location**: `src/components/Changed.js`

Complex component for viewing diffs, resolving conflicts, and managing pull requests.

#### State Variables

**Core Data**:
- `diffs`: File differences data
- `comments`: PR comments
- `conflicts`: Merge conflicts
- `modal`: Modal content
- `error`: Error messages
- `loading`: Loading states

**Conflict Resolution**:
- `overwrite`: Conflict resolution choices
- `upToDate`: Branch status
- `emptyField`: Empty field counts
- `emptyFieldFile`: Files with empty fields

**Review System**:
- `prNumber`: Pull request number
- `allValuesApproved`: Approval status
- `currentUser`: GitHub user data
- `reviewers`: List of reviewers

#### Key Features

1. **Diff Visualization**
   - Side-by-side diff viewer
   - Syntax highlighting
   - File-by-file comparison

2. **Conflict Resolution**
   - Interactive conflict selection
   - Bulk conflict resolution
   - Preview before applying changes

3. **Review Management**
   - File approval tracking
   - Reviewer permissions
   - Progress monitoring

4. **Merge Operations**
   - Branch merging capabilities
   - Safety checks before merging
   - Automatic cleanup

#### Major Functions
- `handleFileSelection()`: Manages file selection for viewing
- `overwritefun()`: Processes conflict resolutions
- `merge()`: Handles branch merging
- `emptyCounts()`: Calculates empty field statistics

---

### Loader

**Location**: `src/components/Loader.js`

Reusable loading spinner component with customizable styling.

#### Props
```javascript
{
  size?: string,     // Spinner animation type (default: "border")
  style?: object,    // Custom inline styles
  className?: string // Additional CSS classes
}
```

#### Features
- Centered loading display
- Customizable spinner animation
- Flexible styling options
- Consistent minimum height for layout stability

#### Usage Examples
```jsx
// Basic usage
<Loader />

// Custom styling
<Loader 
  size="grow" 
  style={{ minHeight: "200px" }}
  className="my-custom-loader"
/>
```

---

### Login

**Location**: `src/components/Login.js`

GitHub OAuth login interface with error handling and loading states.

#### State Variables
- `gitHubLink`: Generated OAuth URL
- `error`: Error messages
- `loading`: Loading state during link generation

#### Process Flow
1. Checks for existing authentication token
2. Fetches OAuth configuration from backend
3. Constructs GitHub authorization URL
4. Provides login button with generated URL
5. Handles errors with user-friendly messages

#### Error Handling
- Backend API errors
- Network connectivity issues
- OAuth configuration problems

#### Side Effects
- Authentication check on mount
- OAuth link generation
- Automatic redirect for authenticated users

---

### NavBarTranslate

**Location**: `src/components/NavBar/NavBarTranslate.js`

Dynamic navigation bar that adapts based on authentication and branch selection.

#### State Variables
- `isBranch`: Boolean indicating if a branch is selected
- `pathToHostSite`: Dynamically generated host path

#### Features

1. **Conditional Navigation**
   - Shows different items based on branch selection
   - Dynamic branch name display

2. **Responsive Design**
   - Bootstrap responsive navigation
   - Collapsible menu for mobile devices

3. **Active State Management**
   - Current branch indication
   - Disabled state for current branch display

#### Navigation Items (when branch selected)
- **Marine_Translate_Term**: Link to main site
- **Actual Branch**: Displays current branch (disabled)
- **Branches**: Return to branch selection
- **Translate**: Go to translation interface
- **Changed**: View changes and conflicts

#### Side Effects
- Branch detection on component mount
- Dynamic path generation

---

## Custom Hooks

### useBranches

**Location**: `src/hooks/useBranches.js`

Custom hook for managing branch data, translation statistics, and authentication.

#### Return Values
```javascript
{
  error: string | null,          // Error messages
  loading: boolean,              // Loading state
  branches: Array,               // Branch data array
  emptyField: object,            // Empty field counts per branch/language
  totalFieldsCount: object       // Total field counts per branch/language
}
```

#### Features

1. **Authentication Management**
   - Token validation
   - Automatic redirect for unauthenticated users
   - Error handling with timeout

2. **Data Fetching**
   - Branch list retrieval
   - Translation statistics calculation
   - Parallel data processing

3. **Statistics Calculation**
   - Per-branch, per-language statistics
   - Empty field counting
   - Total field counting
   - Progress tracking

#### Side Effects
- Data fetching on mount
- Authentication validation
- Error handling with user feedback

#### Dependencies
- `fetchBranches` from apiService
- `fetchBranchDiff` from apiService
- React Router's `useNavigate`

#### Usage Example
```jsx
import useBranches from '../hooks/useBranches';

const MyComponent = () => {
  const { error, loading, branches, emptyField, totalFieldsCount } = useBranches();
  
  if (loading) return <Loader />;
  if (error) return <Alert variant="danger">{error}</Alert>;
  
  return (
    <div>
      {branches.map(branch => (
        <BranchCard 
          key={branch.name}
          branch={branch}
          emptyFieldCounts={emptyField[branch.name]}
          totalFields={totalFieldsCount[branch.name]}
        />
      ))}
    </div>
  );
};
```

---

## Common Patterns

### Error Handling
All components follow consistent error handling patterns:
- Try-catch blocks for async operations
- User-friendly error messages
- Fallback UI states
- Automatic recovery where possible

### Loading States
Components implement loading states using:
- Boolean loading flags
- Spinner components
- Skeleton screens where appropriate
- Progressive loading for better UX

### Authentication Flow
Authentication is handled consistently across components:
- Session storage for token persistence
- Automatic redirects for unauthenticated users
- Token validation before API calls
- Graceful error handling for auth failures

### State Management
State management follows React best practices:
- useState for local component state
- useEffect for side effects
- Custom hooks for shared logic
- PropTypes for type validation

### Accessibility
Components implement accessibility features:
- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support
- Screen reader compatibility

This component documentation provides the foundation for understanding and contributing to the React frontend codebase.