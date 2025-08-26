# Label-Level Approval Workflow Implementation

This document describes the enhanced reviewer workflow system implemented to address issue #8, providing label-level approval capabilities with enhanced security and navigation features.

## Overview

The reviewer workflow enables authorized users to review and approve individual translation labels within files during the translation process. The system operates at a granular label level rather than file level, providing precise control over the approval process.

## Key Features

### 1. Reviewer Eligibility Verification
- Automatically verifies if the current GitHub user is authorized to review files
- Checks against the `reviewers.json` file in the main branch via backend API  
- Reviewer mode toggle only appears for users listed as eligible reviewers
- Prevents unauthorized access to reviewer functions

### 2. Label-Level Approval System
- **Individual Label Tracking**: Each label within a file can be approved independently
- **Granular Status**: Tracks `approvedLabels` and `unapprovedLabels` arrays for each file
- **Language-Specific Approval**: Supports approving specific language translations of labels
- **Real-Time Updates**: Approval status updates immediately after successful approval

### 3. Enhanced File Navigation
- **Interactive File List**: Clickable file names in the reviewer status bar
- **Label Review Modal**: Clicking a file opens a dedicated interface for reviewing individual labels
- **Progress Indicators**: Shows "Labels: X/Y approved" progress for each file
- **Visual Status**: Color-coded badges and progress information

### 4. Reviewer Interface Components

#### Status Bar
- Displays file-level progress with label counts
- Shows approved vs pending labels for each file
- Provides navigation to individual file review interfaces

#### Label Review Modal
- Opens when file names are clicked in reviewer mode
- Lists all labels requiring approval with their translations
- Provides individual approval buttons for each language
- Shows completion status when all labels are approved

#### Individual Card View
- Shows label-specific approval status ("Label Approved" vs "Label Pending Review")
- Provides "Approve Label" button for precise approval actions
- Updated visual indicators for approved/pending labels

## Backend API Integration

The implementation uses the following verified backend endpoints:

### File Approval Status Check
```
GET /api/github/pr/:prNumber/file/:filePath/approved?repo=:repo&branch=:branch
```
**Response:**
```json
{
  "approved": boolean,
  "unapprovedLabels": ["label1", "label2"],
  "approvedLabels": ["label3", "label4"]
}
```

### Label Approval Submission
```
POST /api/github/pr/:prNumber/file/:filePath/approve
```
**Body:**
```json
{
  "repo": "repository-name",
  "sha": "commit-sha",
  "lang": "language-code", 
  "label_name": "label-to-approve"
}
```

### User Authentication
```
GET https://api.github.com/user
```
Returns current GitHub user information for eligibility checking.

### Reviewer List
```
GET /api/github/reviewers?repo=:repo
```
Returns array of eligible reviewer usernames from `reviewers.json`.

## Implementation Details

### State Management
- `fileApprovalStatus`: Stores approval status with label-level granularity
- `reviewerMode`: Boolean flag for reviewer interface activation
- `isEligibleReviewer`: Determines if current user can access reviewer features
- `showLabelReviewModal`: Controls label review modal visibility
- `selectedFileForReview`: Tracks which file is being reviewed

### Key Functions

#### `checkFileApprovalStatus(prNumber, filePath)`
Fetches approval status for a file including approved and unapproved label arrays.

#### `handleFileApproval(filename, lang, labelName)`
Submits approval for a specific label in a specific language.

#### `navigateToFile(filename)`
- In reviewer mode: Opens label review modal
- In standard mode: Navigates to first translation card for the file

## Security Features

- **Eligibility Verification**: Only users in `reviewers.json` can access reviewer mode
- **Authentication Required**: All API calls require valid GitHub token
- **Permission Checks**: Backend validates reviewer permissions before allowing approval actions

## User Experience

### For Reviewers
1. Sign in with GitHub account listed in `reviewers.json`
2. Toggle "Enter Reviewer Mode" when available
3. View file-level progress in reviewer status bar
4. Click file names to open detailed label review interface
5. Approve individual labels using dedicated buttons
6. Track progress with real-time status updates

### For Translators
- No impact on existing translation workflow
- Can see approval status indicators when in reviewer mode
- Continue using standard translation features without changes

## Completion Conditions

The system provides clear indicators for completion:
- **Individual Labels**: Show approved status when approved
- **File Level**: Display completion when all labels approved
- **Overall Progress**: Show "All files have been reviewed and approved!" when complete

## Backward Compatibility

The implementation maintains full backward compatibility:
- Existing translation functionality remains unchanged
- Non-reviewer users see no changes to their workflow
- All previous features continue to work as expected

This comprehensive reviewer workflow provides a robust, secure, and user-friendly system for managing translation approvals at the individual label level while maintaining the integrity of the existing translation process.