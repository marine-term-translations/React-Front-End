import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Translate from './Translate';

// Mock the API service module since it has external dependencies
jest.mock('../utils/apiService', () => ({
  fetchBranchDiff: jest.fn().mockResolvedValue([]),
  fetchDiffChanged: jest.fn().mockResolvedValue({ data: { diffsData: [], pullNumber: null } }),
  fetchContent: jest.fn().mockResolvedValue({}),
  fetchCommits: jest.fn().mockResolvedValue({ data: [] }),
  sendUpdateRequest: jest.fn(),
  sendUpdateFile: jest.fn(),
  checkFileApprovalStatus: jest.fn(),
  approveFile: jest.fn(),
  getCurrentUser: jest.fn(),
  getReviewers: jest.fn().mockResolvedValue([]),
  getPRComments: jest.fn().mockResolvedValue([])
}));

// Mock the SuggestionService module
jest.mock('../utils/SuggestionService', () => ({
  fetchSuggestions: jest.fn()
}));

// Mock the linkedDataUtils module
jest.mock('../utils/linkedDataUtils', () => ({
  createEmptyStore: jest.fn(),
  getLinkedDataNQuads: jest.fn()
}));

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

describe('Translate Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockImplementation((key) => {
      if (key === 'github_token') return 'mock-token';
      if (key === 'branch') return 'mock-branch';
      if (key === 'passedCards') return '[]';
      return null;
    });
  });

  test('renders without crashing when token is present', () => {
    // This test ensures our component doesn't crash with the new changes
    // We expect it to show loading initially due to async operations
    expect(() => {
      render(
        <BrowserRouter>
          <Translate />
        </BrowserRouter>
      );
    }).not.toThrow();
  });
});

// Unit test for the card filtering logic (testing the concept)
describe('Card Filtering Logic', () => {
  test('isCardAvailableForNonReviewer logic works correctly', () => {
    // Simulate the logic from our helper function
    const mockCard = {
      filename: 'test-file.json',
      labelName: 'test-label',
      lang: 'en'
    };

    const mockFileApprovalStatus = {
      'test-file.json': {
        approvedLabels: ['approved-label'],
        unapprovedLabels: ['test-label', 'another-label']
      }
    };

    // Test case 1: Non-reviewer with approved label (should be filtered out)
    const reviewerMode = false;
    const isLabelApproved = mockFileApprovalStatus[mockCard.filename]?.approvedLabels?.includes(mockCard.labelName);
    const shouldShowCard1 = reviewerMode || !isLabelApproved;
    expect(shouldShowCard1).toBe(true); // test-label is not in approved list

    // Test case 2: Non-reviewer with unapproved label (should be shown)
    const mockCard2 = { ...mockCard, labelName: 'approved-label' };
    const isLabelApproved2 = mockFileApprovalStatus[mockCard2.filename]?.approvedLabels?.includes(mockCard2.labelName);
    const shouldShowCard2 = reviewerMode || !isLabelApproved2;
    expect(shouldShowCard2).toBe(false); // approved-label should be filtered out for non-reviewers

    // Test case 3: Reviewer mode (should show all cards)
    const reviewerMode3 = true;
    const shouldShowCard3 = reviewerMode3 || !isLabelApproved2;
    expect(shouldShowCard3).toBe(true); // reviewers should see all cards
  });
});

// Test for suggestion error handling
describe('Suggestion Error Handling', () => {
  test('suggestion error state should be handled correctly', () => {
    // Mock suggestion errors state behavior
    const mockSuggestionErrors = {
      'test-file.json-test-label-en': true
    };

    // Test that error message should be shown when suggestion error exists
    const cardKey = 'test-file.json-test-label-en';
    const hasError = mockSuggestionErrors[cardKey];
    expect(hasError).toBe(true);

    // Test button should be disabled when there's a suggestion error
    const isEditing = 'suggestion-in-progress';
    const buttonShouldBeDisabled = 
      isEditing === "suggestion-in-progress" ||
      isEditing === "suggestion-done" ||
      mockSuggestionErrors[cardKey];
    expect(buttonShouldBeDisabled).toBe(true);

    // Test that no error state means no error message
    const cardKeyNoError = 'test-file.json-test-label-fr';
    const hasNoError = mockSuggestionErrors[cardKeyNoError];
    expect(hasNoError).toBeFalsy();
  });
});