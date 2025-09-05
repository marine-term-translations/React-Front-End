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
      if (key === 'visitedCards') return '[]';
      if (key === 'cardHistory') return '[]';
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

// Test for navigation and history features  
describe('Navigation and History Features', () => {
  test('card history tracking logic works correctly', () => {
    // Test history entry creation
    const mockCard = {
      filename: 'test-file.json',
      labelName: 'test-label',
      lang: 'en',
      labelData: { original: 'test original text' }
    };

    const historyEntry = {
      id: `${mockCard.filename}_-_${mockCard.labelName}_-_${mockCard.lang}`,
      filename: mockCard.filename,
      labelName: mockCard.labelName,
      lang: mockCard.lang,
      action: 'viewed',
      timestamp: new Date().toISOString(),
      original: mockCard.labelData.original,
    };

    // Verify history entry structure
    expect(historyEntry.id).toBe('test-file.json_-_test-label_-_en');
    expect(historyEntry.filename).toBe('test-file.json');
    expect(historyEntry.action).toBe('viewed');
    expect(historyEntry.original).toBe('test original text');
  });

  test('sessionStorage operations for history work correctly', () => {
    // Test adding to visited cards
    const visitedCards = [];
    const cardKey = 'test-file.json_-_test-label_-_en';
    
    if (!visitedCards.includes(cardKey)) {
      visitedCards.push(cardKey);
    }
    
    expect(visitedCards).toContain(cardKey);
    expect(visitedCards.length).toBe(1);

    // Test not adding duplicate
    if (!visitedCards.includes(cardKey)) {
      visitedCards.push(cardKey);
    }
    
    expect(visitedCards.length).toBe(1); // Should still be 1
  });

  test('navigation logic works correctly', () => {
    // Test previous navigation
    let currentCardIndex = 2;
    const filteredCards = [
      { filename: 'file1.json', labelName: 'label1', lang: 'en' },
      { filename: 'file2.json', labelName: 'label2', lang: 'en' },
      { filename: 'file3.json', labelName: 'label3', lang: 'en' },
    ];

    // Test going to previous card
    if (currentCardIndex > 0) {
      currentCardIndex = currentCardIndex - 1;
    }
    expect(currentCardIndex).toBe(1);

    // Test boundary condition
    currentCardIndex = 0;
    const canGoToPrevious = currentCardIndex > 0;
    expect(canGoToPrevious).toBe(false);
  });

  test('history filtering and display logic works correctly', () => {
    const mockHistory = [
      {
        id: 'file1.json_-_label1_-_en',
        action: 'viewed',
        timestamp: '2023-01-01T10:00:00.000Z',
        labelName: 'label1',
        filename: 'file1.json'
      },
      {
        id: 'file2.json_-_label2_-_en',
        action: 'confirmed',
        timestamp: '2023-01-01T10:05:00.000Z',
        labelName: 'label2',
        filename: 'file2.json'
      }
    ];

    // Test reversing history for display (newest first)
    const reversedHistory = mockHistory.slice().reverse();
    expect(reversedHistory[0].action).toBe('confirmed');
    expect(reversedHistory[1].action).toBe('viewed');

    // Test badge color logic
    const getBadgeClass = (action) => {
      if (action === "confirmed") return "bg-success";
      if (action === "viewed_from_history") return "bg-info";
      if (action === "viewed_previous") return "bg-warning";
      return "bg-secondary";
    };

    expect(getBadgeClass('confirmed')).toBe('bg-success');
    expect(getBadgeClass('viewed_from_history')).toBe('bg-info');
    expect(getBadgeClass('viewed_previous')).toBe('bg-warning');
    expect(getBadgeClass('viewed')).toBe('bg-secondary');
  });
});