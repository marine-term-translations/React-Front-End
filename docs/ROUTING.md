# Routing and Navigation Documentation

This document provides comprehensive documentation for the application's routing system, navigation patterns, and URL structure.

## Table of Contents

- [Overview](#overview)
- [Router Configuration](#router-configuration)
- [Route Definitions](#route-definitions)
- [Navigation Components](#navigation-components)
- [URL Parameters](#url-parameters)
- [Navigation Patterns](#navigation-patterns)
- [Authentication Guards](#authentication-guards)
- [Deep Linking](#deep-linking)
- [Navigation State Management](#navigation-state-management)

---

## Overview

The application uses **React Router DOM v6** with a **HashRouter** configuration for client-side routing. This choice enables GitHub Pages deployment while maintaining proper routing functionality.

### Router Type: HashRouter

```javascript
import { HashRouter } from "react-router-dom";

const App = () => {
  return (
    <HashRouter>
      {/* Route configuration */}
    </HashRouter>
  );
};
```

**Why HashRouter?**
- **GitHub Pages Compatibility**: Supports deployment on static hosting
- **Client-Side Routing**: No server configuration required
- **URL Structure**: Uses hash fragment for routes (e.g., `#/translate`)

---

## Router Configuration

### Main Router Setup

**Location**: `src/App.js`

```javascript
import { Routes, Route, HashRouter } from "react-router-dom";
import NavBarTranslate from "./components/NavBar/NavBarTranslate";

const App = () => {
  return (
    <HashRouter>
      <NavBarTranslate />
      <br />
      <div className="App container">
        <div className="row justify-content-center">
          <Routes>
            <Route path="/callback" element={<Callback />} />
            <Route path="/branches" element={<Branches />} />
            <Route path="/translate" element={<Translate />} />
            <Route path="/changed" element={<Changed />} />
            <Route path="/" element={<Login />} />
          </Routes>
        </div>
      </div>
    </HashRouter>
  );
};
```

### Router Features Used

- **Nested Routing**: Single-level route structure
- **Route Elements**: Modern component-based route definitions
- **Default Route**: Fallback to login page
- **Programmatic Navigation**: useNavigate hook throughout components

---

## Route Definitions

### Primary Routes

#### 1. Root Route (`/`)
- **Component**: `Login`
- **Purpose**: GitHub OAuth authentication
- **Access**: Public
- **Redirect**: Redirects to `/branches` if already authenticated

**Features:**
- OAuth link generation
- Authentication token check
- Error handling for OAuth failures

#### 2. OAuth Callback (`/callback`)
- **Component**: `Callback`
- **Purpose**: Handle GitHub OAuth callback
- **Access**: Public (OAuth flow)
- **Redirect**: Redirects to `/branches` on success, `/` on failure

**URL Parameters:**
- `?code=`: OAuth authorization code (query parameter)

**Process Flow:**
1. Extract authorization code from URL
2. Exchange code for access token
3. Store token in sessionStorage
4. Redirect to branches page

#### 3. Branches (`/branches`)
- **Component**: `Branches`
- **Purpose**: Branch selection and overview
- **Access**: Requires authentication
- **Features**: Branch listing, translation progress, navigation to translate

**Data Display:**
- Available branches list
- Last commit dates
- Translation progress per language
- Empty field statistics

#### 4. Translate (`/translate`)
- **Component**: `Translate`
- **Purpose**: Main translation workspace
- **Access**: Requires authentication and branch selection
- **URL Parameters**: `?branch=branch-name` (optional, can use session storage)

**Features:**
- Language selection
- Translation editing
- AI suggestions
- File saving
- Review and approval

#### 5. Changed (`/changed`)
- **Component**: `Changed`
- **Purpose**: Diff viewing and conflict resolution
- **Access**: Requires authentication and branch selection
- **Features**: File diffs, conflict resolution, merge operations

---

## Navigation Components

### NavBarTranslate

**Location**: `src/components/NavBar/NavBarTranslate.js`

Dynamic navigation bar that adapts based on application state.

#### Navigation States

##### Unauthenticated State
```javascript
// When no user is logged in
<Navbar.Brand href={pathToHostSite}>Marine_Translate_Term</Navbar.Brand>
// No additional navigation items
```

##### Authenticated State (No Branch)
```javascript
// When user is logged in but no branch selected
<Navbar.Brand href={pathToHostSite}>Marine_Translate_Term</Navbar.Brand>
// User can navigate to branches page
```

##### Authenticated State (Branch Selected)
```javascript
// When user is logged in and branch is selected
<Nav className="m-auto">
  <Nav.Item>
    <Nav.Link disabled>Actual Branch: {sessionStorage.getItem('branch')}</Nav.Link>
  </Nav.Item>
  <Nav.Item>
    <Nav.Link href="#branches">Branches</Nav.Link>
  </Nav.Item>
  <Nav.Item>
    <Nav.Link href="#translate">Translate</Nav.Link>
  </Nav.Item>
  <Nav.Item>
    <Nav.Link href="#changed">Changed</Nav.Link>
  </Nav.Item>
</Nav>
```

#### Navigation State Detection

```javascript
const [isBranch, setIsBranch] = useState(false);

useEffect(() => {
  const branchExists = sessionStorage.getItem('branch');
  if (branchExists) {
    setIsBranch(true);
  }
}, []);
```

---

## URL Parameters

### Query Parameters

#### Branch Selection
The application uses both URL parameters and session storage for branch management:

**URL Parameter Method:**
```
#/translate?branch=feature-branch
```

**Session Storage Method:**
```javascript
sessionStorage.setItem('branch', 'feature-branch');
```

#### Parameter Processing

**In Translate Component:**
```javascript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const branch = params.get('branch');
  const branchExists = sessionStorage.getItem('branch');
  
  if (!branch && !branchExists) {
    navigate('/branches');
  }
  
  if (!branchExists || branchExists !== branch) {
    if (branch) {
      sessionStorage.setItem('branch', branch);
      window.location.reload();
    }
  }
  
  // Clean URL after processing
  const newUrl = window.location.protocol + "//" + 
                 window.location.host + 
                 window.location.pathname + 
                 window.location.hash;
  window.history.replaceState(null, "", newUrl);
}, []);
```

---

## Navigation Patterns

### Programmatic Navigation

The application uses React Router's `useNavigate` hook for programmatic navigation:

```javascript
import { useNavigate } from "react-router-dom";

const Component = () => {
  const navigate = useNavigate();
  
  // Navigate to different routes
  const goToBranches = () => navigate('/branches');
  const goToTranslate = () => navigate('/translate');
  const goToChanged = () => navigate('/changed');
  const goHome = () => navigate('/');
};
```

### Navigation with State

#### Branch Selection Navigation
From BranchCard component:
```javascript
<Card
  as="a"
  href={`?branch=${branch.name}#/translate`}
  style={{ cursor: "pointer" }}
>
```

This pattern:
1. Sets branch parameter in URL
2. Navigates to translate route
3. Translate component processes branch parameter
4. Stores branch in session storage

### Conditional Navigation

#### Authentication-Based Navigation
```javascript
useEffect(() => {
  if (!sessionStorage.getItem("github_token")) {
    navigate("/");
  }
}, [navigate]);
```

#### Branch-Based Navigation
```javascript
useEffect(() => {
  const branch = sessionStorage.getItem("branch");
  if (!branch) {
    navigate("/branches");
  }
}, [navigate]);
```

---

## Authentication Guards

### Token-Based Protection

All protected routes implement authentication checks:

```javascript
// Pattern used across components
useEffect(() => {
  if (!sessionStorage.getItem("github_token")) {
    navigate("/");
  }
}, [navigate]);
```

### Route Protection Levels

1. **Public Routes**
   - `/` (Login)
   - `/callback` (OAuth callback)

2. **Authenticated Routes**
   - `/branches` (requires valid token)
   - `/translate` (requires token + branch)
   - `/changed` (requires token + branch)

### Protection Implementation

```javascript
// In protected components
const ProtectedComponent = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check authentication
    if (!sessionStorage.getItem("github_token")) {
      navigate("/");
      return;
    }
    
    // Check branch requirement (for translate/changed)
    const branch = sessionStorage.getItem("branch");
    if (!branch) {
      navigate("/branches");
      return;
    }
  }, [navigate]);
  
  // Component content
};
```

---

## Deep Linking

### Branch-Specific Deep Links

The application supports deep linking to specific branches:

```
https://your-domain.com/#/translate?branch=feature-branch
```

**Processing Flow:**
1. User clicks or navigates to deep link
2. Translate component loads
3. URL parameters are processed
4. Branch is set in session storage
5. Page reloads with branch context
6. URL is cleaned for better UX

### State Restoration

After authentication, users are redirected to their intended destination:

```javascript
// In Callback component
try {
  const response = await axios.post(tokenEndpoint, { code });
  const { access_token } = response.data;
  sessionStorage.setItem('github_token', access_token);
  navigate('/branches'); // Could be enhanced to restore intended route
} catch (error) {
  // Handle error
}
```

---

## Navigation State Management

### Session Storage Usage

The application uses session storage for navigation state persistence:

```javascript
// Branch persistence
sessionStorage.setItem('branch', branchName);
sessionStorage.getItem('branch');

// Authentication persistence
sessionStorage.setItem('github_token', token);
sessionStorage.getItem('github_token');

// History tracking
sessionStorage.setItem('cardHistory', JSON.stringify(history));
sessionStorage.getItem('cardHistory');
```

### URL State Management

#### Query Parameter Handling
```javascript
// Extract parameters
const params = new URLSearchParams(window.location.search);
const branch = params.get('branch');

// Clean URL after processing
const newUrl = window.location.protocol + "//" + 
               window.location.host + 
               window.location.pathname + 
               window.location.hash;
window.history.replaceState(null, "", newUrl);
```

#### Browser History Management
```javascript
// Prevent data loss on navigation
useEffect(() => {
  const handleBeforeUnload = (event) => {
    if (calculateModifiedCounts().modifiedFields > 0) {
      event.preventDefault();
      event.returnValue = "";
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}, []);
```

---

## Navigation Flow Examples

### Complete User Journey

1. **Initial Visit**
   ```
   User visits: https://domain.com/
   Redirects to: https://domain.com/#/
   Component: Login
   ```

2. **Authentication**
   ```
   User clicks Login → GitHub OAuth
   Redirects to: https://domain.com/#/callback?code=xyz
   Component: Callback
   Token stored → Redirects to: https://domain.com/#/branches
   ```

3. **Branch Selection**
   ```
   User on: https://domain.com/#/branches
   Clicks branch card
   Navigates to: https://domain.com/#/translate?branch=feature
   ```

4. **Translation Work**
   ```
   User on: https://domain.com/#/translate
   URL cleaned to: https://domain.com/#/translate
   Branch stored in session
   ```

5. **View Changes**
   ```
   User clicks "Changed" in navbar
   Navigates to: https://domain.com/#/changed
   ```

### Error Scenarios

1. **Unauthenticated Access**
   ```
   User visits: https://domain.com/#/translate
   Redirects to: https://domain.com/#/
   ```

2. **No Branch Selected**
   ```
   Authenticated user visits: https://domain.com/#/translate
   Redirects to: https://domain.com/#/branches
   ```

3. **OAuth Error**
   ```
   User on: https://domain.com/#/callback
   Error occurs
   Shows error → Auto-redirect to: https://domain.com/#/
   ```

---

## Best Practices

### Navigation Implementation

1. **Always Use useNavigate**
   ```javascript
   // Preferred
   const navigate = useNavigate();
   navigate('/path');
   
   // Avoid direct window.location changes
   ```

2. **Implement Route Guards**
   ```javascript
   // Check authentication on component mount
   useEffect(() => {
     if (!sessionStorage.getItem("github_token")) {
       navigate("/");
     }
   }, [navigate]);
   ```

3. **Handle Loading States**
   ```javascript
   // Show loading while determining navigation
   if (loading) return <Loader />;
   ```

4. **Clean URLs for UX**
   ```javascript
   // Remove query parameters after processing
   window.history.replaceState(null, "", cleanUrl);
   ```

### Performance Considerations

1. **Route-Level Code Splitting**
   ```javascript
   // Future enhancement opportunity
   const Translate = lazy(() => import('./pages/Translate'));
   ```

2. **Prevent Unnecessary Redirects**
   ```javascript
   // Check conditions before redirecting
   if (!token && !loading) {
     navigate('/');
   }
   ```

This routing documentation provides a complete reference for understanding and working with the application's navigation system. The HashRouter-based setup ensures compatibility with static hosting while maintaining a smooth user experience.