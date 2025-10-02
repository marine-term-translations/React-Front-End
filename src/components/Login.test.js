import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock environment variables
const originalEnv = process.env;

describe('Login Component', () => {
  const axios = require('axios');

  beforeEach(() => {
    jest.resetAllMocks();
    // Clear session storage
    sessionStorage.clear();
    // Reset environment variables
    process.env = { 
      ...originalEnv, 
      REACT_APP_BACK_URL: 'https://test-backend.com' 
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const renderLogin = () => {
    return render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
  };

  test('renders login component with loading state initially', () => {
    axios.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    renderLogin();
    expect(document.querySelector('.spinner-border')).toBeInTheDocument(); // Check for spinner class
  });

  test('displays login button when OAuth link is successfully fetched', async () => {
    axios.get.mockResolvedValueOnce({
      data: { client_id: 'test_client_id', scope: 'read:user' }
    });

    renderLogin();

    await waitFor(() => {
      expect(screen.getByText('Login with GitHub')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });
  });

  test('displays enhanced error message and guidance when API call fails', async () => {
    axios.get.mockRejectedValueOnce({
      request: {}
    });

    renderLogin();

    await waitFor(() => {
      expect(screen.getByText('Login Issue Detected')).toBeInTheDocument();
      expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
      expect(screen.getByText(/Why login might not work:/)).toBeInTheDocument();
      expect(screen.getByText(/Browser security settings blocking requests/)).toBeInTheDocument();
    });
  });

  test('shows alternative login button in error state', async () => {
    axios.get.mockRejectedValueOnce({
      request: {}
    });

    renderLogin();

    await waitFor(() => {
      expect(screen.getByText('Try Alternative Login Method')).toBeInTheDocument();
      expect(screen.getByText('Retry Original Login')).toBeInTheDocument();
    });
  });

  test('opens guidance modal when alternative login is clicked', async () => {
    axios.get.mockRejectedValueOnce({
      request: {}
    });

    renderLogin();

    await waitFor(() => {
      const altLoginButton = screen.getByText('Try Alternative Login Method');
      fireEvent.click(altLoginButton);
    });

    await waitFor(() => {
      expect(screen.getByText('🔐 Browser Security Guidance')).toBeInTheDocument();
      expect(screen.getByText(/Chrome\/Edge Users:/)).toBeInTheDocument();
      expect(screen.getByText(/Firefox Users:/)).toBeInTheDocument();
      expect(screen.getByText(/Safari Users:/)).toBeInTheDocument();
    });
  });

  test('shows configuration error when REACT_APP_BACK_URL is not set', async () => {
    delete process.env.REACT_APP_BACK_URL;
    axios.get.mockRejectedValueOnce({
      request: {}
    });

    renderLogin();

    await waitFor(() => {
      const altLoginButton = screen.getByText('Try Alternative Login Method');
      fireEvent.click(altLoginButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Configuration Error: Backend URL is not configured/)).toBeInTheDocument();
    });
  });

  test('redirects to branches when user is already authenticated', () => {
    sessionStorage.setItem('github_token', 'test_token');
    renderLogin();
    expect(mockNavigate).toHaveBeenCalledWith('/branches');
  });

  test('displays success message when oauth_success parameter is present', async () => {
    // Mock window.location.search
    delete window.location;
    window.location = { search: '?oauth_success=true' };
    
    axios.get.mockResolvedValueOnce({
      data: { client_id: 'test_client_id', scope: 'read:user' }
    });

    renderLogin();

    await waitFor(() => {
      expect(screen.getByText('🎉 Authentication Successful!')).toBeInTheDocument();
      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });
  });

  test('opens alternative login in new tab when modal redirect button is clicked', async () => {
    const mockWindowOpen = jest.fn();
    window.open = mockWindowOpen;
    
    axios.get.mockRejectedValueOnce({
      request: {}
    });

    renderLogin();

    await waitFor(() => {
      const altLoginButton = screen.getByText('Try Alternative Login Method');
      fireEvent.click(altLoginButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Continue to GitHub Authentication')).toBeInTheDocument();
    });

    const continueButton = screen.getByText('Continue to GitHub Authentication');
    fireEvent.click(continueButton);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://test-backend.com/api/github/oauth/link',
      '_blank',
      'noopener,noreferrer'
    );
  });
});