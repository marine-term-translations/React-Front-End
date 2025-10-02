import React from 'react';
import { render, screen } from '@testing-library/react';
import NavBarTranslate from './NavBarTranslate';

describe('NavBarTranslate Component', () => {
  beforeEach(() => {
    // Clear session storage before each test
    sessionStorage.clear();
  });

  test('renders navbar with brand name', () => {
    render(<NavBarTranslate />);
    expect(screen.getByText('Marine_Translate_Term')).toBeInTheDocument();
  });

  test('shows navigation items when branch is set', () => {
    sessionStorage.setItem('branch', 'test-branch');
    render(<NavBarTranslate />);
    
    expect(screen.getByText(/Actual Branch: test-branch/)).toBeInTheDocument();
    expect(screen.getByText('Branches')).toBeInTheDocument();
    expect(screen.getByText('Translate')).toBeInTheDocument();
    expect(screen.getByText('Changed')).toBeInTheDocument();
  });

  test('does not show navigation items when no branch is set', () => {
    render(<NavBarTranslate />);
    
    expect(screen.queryByText('Branches')).not.toBeInTheDocument();
    expect(screen.queryByText('Translate')).not.toBeInTheDocument();
    expect(screen.queryByText('Changed')).not.toBeInTheDocument();
  });

  test('renders Report Issue link with correct attributes when branch is set', () => {
    sessionStorage.setItem('branch', 'test-branch');
    render(<NavBarTranslate />);
    
    const reportIssueLink = screen.getByText('Report Issue');
    expect(reportIssueLink).toBeInTheDocument();
    expect(reportIssueLink).toHaveAttribute('href', 'https://github.com/marine-term-translations/React-Front-End/issues/new');
    expect(reportIssueLink).toHaveAttribute('target', '_blank');
    expect(reportIssueLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('does not render Report Issue link when no branch is set', () => {
    render(<NavBarTranslate />);
    
    expect(screen.queryByText('Report Issue')).not.toBeInTheDocument();
  });
});
