# API Services Documentation

This document provides comprehensive documentation for all API services, utilities, and helper functions used throughout the application.

## Table of Contents

- [API Services](#api-services)
  - [apiService.js](#apiservicejs)
  - [SuggestionService.js](#suggestionservicejs)
- [Utility Functions](#utility-functions)
  - [linkedDataUtils.js](#linkeddatautilsjs)
  - [dateUtils.js](#dateutilsjs)
  - [stringUtils.js](#stringutilsjs)
- [Error Handling](#error-handling)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Testing API Services](#testing-api-services)

---

## API Services

### apiService.js

**Location**: `src/utils/apiService.js`

Central service for all GitHub API interactions. Handles authentication, data fetching, and repository operations.

#### Configuration
```javascript
const API_BASE_URL = process.env.REACT_APP_BACK_URL;
const REPO = process.env.REACT_APP_REPO;
```

#### Authentication Functions

##### `fetchBranches(token)`
Retrieves list of available branches from the repository.

**Parameters:**
- `token` (string): GitHub access token

**Returns:** 
- `Promise<Array>`: Array of branch objects

**Usage:**
```javascript
import { fetchBranches } from '../utils/apiService';

const branches = await fetchBranches(sessionStorage.getItem('github_token'));
```

**Response Format:**
```javascript
[
  {
    name: "main",
    lastCommit: "2024-01-15T10:30:00Z",
    sha: "abc123def456",
    // ... additional branch properties
  }
]
```

##### `fetchBranchDiff(token, branch, extra_headers)`
Fetches diff data for a specific branch compared to main.

**Parameters:**
- `token` (string): GitHub access token
- `branch` (string): Branch name
- `extra_headers` (object, optional): Additional HTTP headers

**Returns:**
- `Promise<Array>`: Array of file diff objects

**Usage:**
```javascript
const diffData = await fetchBranchDiff(
  token, 
  'feature-branch',
  { 'Cache-Control': 'no-cache' }
);
```

#### Content Management Functions

##### `sendUpdateRequest(beforeValue, afterValue)`
Sends auto-update request for translation changes.

**Parameters:**
- `beforeValue` (string): Original translation value
- `afterValue` (string): New translation value

**Returns:**
- `Promise<void>`

**Usage:**
```javascript
await sendUpdateRequest("original text", "updated text");
```

##### `fetchContent(path)`
Retrieves content from a specific file path in the repository.

**Parameters:**
- `path` (string): File path in repository

**Returns:**
- `Promise<Object>`: File content response

**Usage:**
```javascript
const fileContent = await fetchContent('translations/terms.ttl');
```

##### `sendUpdateFile(filename, translation)`
Updates a specific file with new translation data.

**Parameters:**
- `filename` (string): Target file name
- `translation` (object): Translation data object

**Returns:**
- `Promise<void>`

**Usage:**
```javascript
await sendUpdateFile('terms.ttl', {
  label: 'marine_term',
  translations: { en: 'Marine Term', es: 'Término Marino' }
});
```

#### Diff and Change Management

##### `fetchDiffChanged()`
Retrieves diff data for changed files in current branch.

**Returns:**
- `Promise<Object>`: Response object containing diffs and metadata

**Response Format:**
```javascript
{
  diffsData: [
    {
      filename: "terms.ttl",
      content: { /* file content */ },
      additions: 5,
      deletions: 2
    }
  ],
  commentsData: [ /* PR comments */ ],
  pullNumber: 123
}
```

##### `fetchCommits()`
Retrieves commit history for the current branch.

**Returns:**
- `Promise<Object>`: Response with commit data

**Usage:**
```javascript
const commits = await fetchCommits();
console.log(commits.data[0].sha); // Latest commit SHA
```

#### User Management Functions

##### `getCurrentUser()`
Retrieves current GitHub user information.

**Returns:**
- `Promise<Object>`: User data object

**Response Format:**
```javascript
{
  login: "username",
  id: 12345,
  avatar_url: "https://avatars.githubusercontent.com/u/12345",
  name: "User Name",
  email: "user@example.com"
}
```

##### `getReviewers()`
Retrieves list of reviewers for the current repository.

**Returns:**
- `Promise<Array>`: Array of reviewer objects

**Usage:**
```javascript
const reviewers = await getReviewers();
```

#### Review and Approval Functions

##### `checkFileApprovalStatus(prNumber, filePath)`
Checks the approval status of a specific file in a pull request.

**Parameters:**
- `prNumber` (number): Pull request number
- `filePath` (string): File path to check

**Returns:**
- `Promise<Object>`: Approval status object

**Response Format:**
```javascript
{
  approved: true,
  approvedLabels: ["term1", "term2"],
  unapprovedLabels: ["term3"],
  rawApprovedLabels: [
    {
      label: "term1",
      reviewer: "reviewer_username",
      timestamp: "2024-01-15T10:30:00Z"
    }
  ]
}
```

##### `approveFile(prNumber, filePath, sha, lang, labelName)`
Approves a specific label in a file for a pull request.

**Parameters:**
- `prNumber` (number): Pull request number
- `filePath` (string): File path
- `sha` (string): Commit SHA
- `lang` (string): Language code
- `labelName` (string): Label to approve

**Returns:**
- `Promise<Object>`: Approval response

**Usage:**
```javascript
await approveFile(123, 'terms.ttl', 'abc123', 'en', 'marine_term');
```

##### `getPRComments(prNumber)`
Retrieves all comments for a specific pull request.

**Parameters:**
- `prNumber` (number): Pull request number

**Returns:**
- `Promise<Array>`: Array of comment objects

---

### SuggestionService.js

**Location**: `src/utils/SuggestionService.js`

Service for AI-powered translation suggestions.

#### Configuration
```javascript
const REACT_APP_BACK_URL = process.env.REACT_APP_BACK_URL || "";
```

##### `fetchSuggestions(text, targetLang)`
Fetches AI translation suggestions for given text.

**Parameters:**
- `text` (string): Text to translate
- `targetLang` (string): Target language code (e.g., 'es', 'fr', 'de')

**Returns:**
- `Promise<string>`: Suggested translation

**Usage:**
```javascript
import { fetchSuggestions } from '../utils/SuggestionService';

try {
  const suggestion = await fetchSuggestions('marine ecosystem', 'es');
  console.log(suggestion); // "ecosistema marino"
} catch (error) {
  console.error('Suggestion failed:', error);
}
```

**Error Handling:**
- Validates required parameters
- Handles API failures gracefully
- Returns empty string on error
- Logs errors for debugging

**API Request Format:**
```javascript
{
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "source text",
    target: "target_language_code"
  })
}
```

---

## Utility Functions

### linkedDataUtils.js

**Location**: `src/utils/linkedDataUtils.js`

Utilities for processing RDF/SKOS semantic data and linked data operations.

#### Dependencies
- **N3**: RDF parsing and manipulation
- **Comunica**: SPARQL query engine
- **JSONLd**: JSON-LD processing

#### Core Functions

##### `createEmptyStore()`
Creates an empty N3 RDF store.

**Returns:**
- `Store`: Empty N3 store instance

**Usage:**
```javascript
import { createEmptyStore } from '../utils/linkedDataUtils';

const store = createEmptyStore();
```

##### `getLinkedDataNQuads(uri, store)`
Fetches and parses linked data from a URI into an RDF store.

**Parameters:**
- `uri` (string): URI to fetch data from
- `store` (Store): N3 store to populate

**Returns:**
- `Promise<Store>`: Populated RDF store

**Supported Formats:**
- `text/turtle`
- `application/ld+json`
- `application/vnd.schemaorg.ld+json`
- `text/html` (with embedded linked data)

**Usage:**
```javascript
const store = createEmptyStore();
const populatedStore = await getLinkedDataNQuads('https://example.com/term', store);
```

##### `extractSkosPrefLabel(store, uri)`
Extracts SKOS prefLabel from an RDF store for a given URI.

**Parameters:**
- `store` (Store): N3 RDF store
- `uri` (string): URI to extract label for

**Returns:**
- `string | null`: Preferred label or null if not found

**Usage:**
```javascript
const prefLabel = extractSkosPrefLabel(store, 'https://example.com/term');
```

##### `comunicaQuery(query, sources)`
Executes SPARQL queries using the Comunica engine.

**Parameters:**
- `query` (string): SPARQL query
- `sources` (string): Data source URI

**Returns:**
- `Promise<BindingsStream>`: Query results stream

**Usage:**
```javascript
const query = `
  SELECT ?label WHERE {
    ?subject skos:prefLabel ?label .
  }
`;
const results = await comunicaQuery(query, 'https://example.com/data');
```

#### Helper Functions

##### `getSignpostedDataFromHtml(html)`
Extracts embedded linked data from HTML content.

**Parameters:**
- `html` (string): HTML content

**Returns:**
- `Promise<Object | null>`: Extracted data object or null

**Extraction Methods:**
- `<script rel="describedby">` tags
- `<script type="application/ld+json">` tags

##### `getData(uri, formats)`
Attempts to fetch data from URI using content negotiation.

**Parameters:**
- `uri` (string): URI to fetch
- `formats` (Array): Preferred content types

**Returns:**
- `Promise<Object>`: Response with format and data

---

### dateUtils.js

**Location**: `src/utils/dateUtils.js`

Utility functions for date formatting and timezone handling.

##### `formatDate(date, timeZone, format)`
Formats a date string according to timezone and format specification.

**Parameters:**
- `date` (string): ISO date string
- `timeZone` (string): Target timezone
- `format` (string, optional): Date format pattern (default: "dd/MM/yyyy HH:mm:ss")

**Returns:**
- `string`: Formatted date string

**Usage:**
```javascript
import { formatDate } from '../utils/dateUtils';

const formatted = formatDate(
  '2024-01-15T10:30:00Z',
  'Europe/Brussels',
  'dd/MM/yyyy HH:mm'
);
// Output: "15/01/2024 11:30"
```

**Supported Format Patterns:**
- `dd/MM/yyyy`: Day/Month/Year
- `HH:mm:ss`: 24-hour time
- `yyyy-MM-dd`: ISO date format
- Custom patterns using date-fns format tokens

---

### stringUtils.js

**Location**: `src/utils/stringUtils.js`

String manipulation utilities for translation data processing.

##### `isEmpty(str)`
Checks if a string is empty or contains placeholder text.

**Parameters:**
- `str` (string): String to check

**Returns:**
- `boolean`: True if empty or placeholder

**Usage:**
```javascript
import { isEmpty } from '../utils/stringUtils';

console.log(isEmpty(""));                    // true
console.log(isEmpty("to be filled in"));     // true
console.log(isEmpty("actual translation"));  // false
```

**Placeholder Detection:**
- Empty strings
- Null/undefined values
- "to be filled in" placeholder text

---

## Error Handling

### API Error Patterns

All API services implement consistent error handling:

```javascript
try {
  const result = await apiCall();
  return result;
} catch (error) {
  if (error.response) {
    // API responded with error status
    console.error('API Error:', error.response.data.message);
    throw new Error(error.response.data.message);
  } else if (error.request) {
    // Network error
    console.error('Network Error:', error.message);
    throw new Error('Network error. Please check your connection.');
  } else {
    // Other error
    console.error('Error:', error.message);
    throw error;
  }
}
```

### Error Types

1. **Authentication Errors**
   - Invalid or expired tokens
   - Missing authentication headers
   - OAuth callback failures

2. **Network Errors**
   - Connection timeouts
   - DNS resolution failures
   - Server unavailable

3. **API Errors**
   - Invalid request parameters
   - Resource not found (404)
   - Rate limiting (429)
   - Server errors (500+)

4. **Data Validation Errors**
   - Invalid file formats
   - Missing required fields
   - Type mismatches

### Error Recovery Strategies

1. **Retry Logic**
   ```javascript
   const retryApiCall = async (apiCall, maxRetries = 3) => {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await apiCall();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
       }
     }
   };
   ```

2. **Fallback Data**
   ```javascript
   const getDataWithFallback = async () => {
     try {
       return await primaryAPI();
     } catch (error) {
       console.warn('Primary API failed, using cached data');
       return getCachedData();
     }
   };
   ```

---

## Authentication

### Token Management

All API calls use GitHub access tokens stored in sessionStorage:

```javascript
const token = sessionStorage.getItem('github_token');
const headers = { Authorization: token };
```

### Token Lifecycle

1. **Acquisition**: OAuth callback stores token
2. **Usage**: Included in all API requests
3. **Validation**: Checked before each API call
4. **Expiration**: Handled with redirect to login

### Security Considerations

- Tokens stored in sessionStorage (not localStorage)
- Automatic cleanup on tab close
- No token persistence across sessions
- HTTPS required for production

---

## Rate Limiting

### GitHub API Limits

- **Authenticated**: 5,000 requests per hour
- **Search API**: 30 requests per minute
- **GraphQL**: 5,000 points per hour

### Handling Rate Limits

```javascript
const handleRateLimit = (error) => {
  if (error.response?.status === 429) {
    const resetTime = error.response.headers['x-ratelimit-reset'];
    const waitTime = (resetTime * 1000) - Date.now();
    console.warn(`Rate limited. Retry after ${waitTime}ms`);
    return waitTime;
  }
  return 0;
};
```

---

## Testing API Services

### Mock Implementation

```javascript
// __mocks__/apiService.js
export const fetchBranches = jest.fn(() => 
  Promise.resolve([
    { name: 'main', lastCommit: '2024-01-01T00:00:00Z' }
  ])
);

export const sendUpdateFile = jest.fn(() => Promise.resolve());
```

### Test Examples

```javascript
import { fetchBranches } from '../utils/apiService';

describe('apiService', () => {
  test('fetchBranches returns branch list', async () => {
    const branches = await fetchBranches('mock-token');
    expect(branches).toHaveLength(1);
    expect(branches[0].name).toBe('main');
  });
});
```

### Integration Testing

```javascript
test('complete translation workflow', async () => {
  // Setup
  const token = 'test-token';
  const branch = 'test-branch';
  
  // Test sequence
  const branches = await fetchBranches(token);
  const diff = await fetchBranchDiff(token, branch);
  await sendUpdateFile('test.ttl', mockTranslation);
  
  // Assertions
  expect(branches).toBeDefined();
  expect(diff).toBeDefined();
});
```

This API documentation provides a complete reference for all services and utilities used in the application. For implementation details and usage examples, refer to the component documentation and the actual source files.