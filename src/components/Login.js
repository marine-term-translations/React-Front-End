import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Container, Card, Button, Spinner, Alert, Modal } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

const Login = () => {
  const navigate = useNavigate();
  const [gitHubLink, setGitHubLink] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGuidanceModal, setShowGuidanceModal] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("github_token")) {
      navigate("/branches");
    }
    const fetchGitHubLink = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BACK_URL}/api/github/oauth/link`
        );
        const path =
          window.location.protocol +
          "//" +
          window.location.host +
          window.location.pathname;
        console.log(path);
        const { client_id, scope } = response.data;
        const AUTH_URL = `https://github.com/login/oauth/authorize?client_id=${client_id}&scope=${scope}&redirect_uri=${path}#callback`;
        setGitHubLink(AUTH_URL);
      } catch (error) {
        let errorMessage = "";
        if (error.response) {
          errorMessage = `Server Error: ${error.response.data.message || "Unable to connect to the authentication service"}`;
        } else if (error.request) {
          errorMessage = "Connection failed. This might be due to network issues or browser security settings blocking the request.";
        } else {
          errorMessage = `Configuration Error: ${error.message}`;
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchGitHubLink();
  }, [navigate]);

  // Handle direct OAuth redirect when regular login fails
  const handleDirectOAuthRedirect = () => {
    if (!process.env.REACT_APP_BACK_URL) {
      setError("Configuration Error: Backend URL is not configured. Please contact the administrator.");
      return;
    }
    
    setShowGuidanceModal(true);
  };

  // Handle the actual redirect from modal
  const handleModalRedirect = () => {
    setLoginAttempted(true);
    setShowGuidanceModal(false);
    window.location.href = `${process.env.REACT_APP_BACK_URL}/api/github/oauth/link`;
  };

  // Handle successful OAuth completion message
  const handleOAuthSuccess = () => {
    return (
      <Alert variant="success" className="mt-3">
        <Alert.Heading>🎉 Authentication Successful!</Alert.Heading>
        <p>
          You have successfully authenticated with GitHub. Please reload this page to continue using the application with your authenticated session.
        </p>
        <hr />
        <div className="d-flex justify-content-end">
          <Button variant="success" onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      </Alert>
    );
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "85vh" }}
      >
        <Spinner animation="border" />
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Container
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: "85vh" }}
        >
          <Card
            className="p-4 rounded-3 shadow"
            style={{ width: "100%", maxWidth: "500px" }}
          >
            <Card.Body className="text-center">
              <Card.Title className="mb-4">Login Issue Detected</Card.Title>
              
              <Alert variant="warning" className="text-start">
                <strong>Why login might not work:</strong>
                <ul className="mt-2 mb-2">
                  <li>Browser security settings blocking requests</li>
                  <li>Network connectivity issues</li>
                  <li>Server temporarily unavailable</li>
                  <li>Authentication service configuration problems</li>
                </ul>
              </Alert>

              <Alert variant="danger" className="text-start mb-3">
                {error}
              </Alert>

              <div className="d-grid gap-2">
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={handleDirectOAuthRedirect}
                  disabled={loginAttempted}
                >
                  Try Alternative Login Method
                </Button>
                
                <Button 
                  variant="outline-secondary" 
                  onClick={() => window.location.reload()}
                >
                  Retry Original Login
                </Button>
              </div>

              {/* Show success message if coming back from OAuth */}
              {window.location.search.includes('oauth_success') && handleOAuthSuccess()}
            </Card.Body>
          </Card>
        </Container>

        {/* Browser Security Guidance Modal */}
        <Modal 
          show={showGuidanceModal} 
          onHide={() => setShowGuidanceModal(false)}
          centered
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>🔐 Browser Security Guidance</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="info">
              <strong>You're being redirected to a secure GitHub authentication page.</strong>
            </Alert>
            
            <p><strong>If your browser shows a security warning, please follow these steps:</strong></p>
            
            <div className="border rounded p-3 mb-3" style={{ backgroundColor: "#f8f9fa" }}>
              <h6>Chrome/Edge Users:</h6>
              <ol>
                <li>Look for an <strong>"Advanced"</strong> button or link</li>
                <li>Click <strong>"Advanced"</strong></li>
                <li>Click <strong>"Proceed to [domain]"</strong> or <strong>"Continue anyway"</strong></li>
              </ol>
            </div>
            
            <div className="border rounded p-3 mb-3" style={{ backgroundColor: "#f8f9fa" }}>
              <h6>Firefox Users:</h6>
              <ol>
                <li>Click <strong>"Advanced..."</strong></li>
                <li>Click <strong>"Accept the Risk and Continue"</strong></li>
              </ol>
            </div>
            
            <div className="border rounded p-3 mb-3" style={{ backgroundColor: "#f8f9fa" }}>
              <h6>Safari Users:</h6>
              <ol>
                <li>Click <strong>"Show Details"</strong></li>
                <li>Click <strong>"Visit this website"</strong></li>
              </ol>
            </div>

            <Alert variant="success" className="mt-3">
              <strong>After completing authentication:</strong> You'll reach a working GitHub page. 
              Please return to this tab and reload the page to continue with your authenticated session.
            </Alert>

            <p className="text-muted small">
              <strong>Why does this happen?</strong> Some browsers show security warnings when redirecting 
              between different domains, even for legitimate authentication services. This is normal and safe to proceed.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowGuidanceModal(false)}>
              Close
            </Button>
            <Button 
              variant="primary" 
              onClick={handleModalRedirect}
            >
              Continue to GitHub Authentication
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }

  return (
    <>
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "85vh" }}
      >
        <Card
          className="p-4 rounded-3 shadow"
          style={{ width: "100%", maxWidth: "400px", minHeight: "50vh" }}
        >
          <Card.Body className="d-flex flex-column justify-content-center text-center">
            <Card.Title className="mb-4 mt-auto">Login with GitHub</Card.Title>
            {gitHubLink ? (
              <Button
                href={gitHubLink}
                variant="primary"
                className="m-auto mt-2 w-50"
              >
                Login
              </Button>
            ) : (
              <Card.Text>Failed to load GitHub login link.</Card.Text>
            )}
            
            {/* Show success message if coming back from OAuth */}
            {window.location.search.includes('oauth_success') && handleOAuthSuccess()}
          </Card.Body>
        </Card>
      </Container>

      {/* Browser Security Guidance Modal */}
      <Modal 
        show={showGuidanceModal} 
        onHide={() => setShowGuidanceModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>🔐 Browser Security Guidance</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <strong>You're being redirected to a secure GitHub authentication page.</strong>
          </Alert>
          
          <p><strong>If your browser shows a security warning, please follow these steps:</strong></p>
          
          <div className="border rounded p-3 mb-3" style={{ backgroundColor: "#f8f9fa" }}>
            <h6>Chrome/Edge Users:</h6>
            <ol>
              <li>Look for an <strong>"Advanced"</strong> button or link</li>
              <li>Click <strong>"Advanced"</strong></li>
              <li>Click <strong>"Proceed to [domain]"</strong> or <strong>"Continue anyway"</strong></li>
            </ol>
          </div>
          
          <div className="border rounded p-3 mb-3" style={{ backgroundColor: "#f8f9fa" }}>
            <h6>Firefox Users:</h6>
            <ol>
              <li>Click <strong>"Advanced..."</strong></li>
              <li>Click <strong>"Accept the Risk and Continue"</strong></li>
            </ol>
          </div>
          
          <div className="border rounded p-3 mb-3" style={{ backgroundColor: "#f8f9fa" }}>
            <h6>Safari Users:</h6>
            <ol>
              <li>Click <strong>"Show Details"</strong></li>
              <li>Click <strong>"Visit this website"</strong></li>
            </ol>
          </div>

          <Alert variant="success" className="mt-3">
            <strong>After completing authentication:</strong> You'll reach a working GitHub page. 
            Please return to this tab and reload the page to continue with your authenticated session.
          </Alert>

          <p className="text-muted small">
            <strong>Why does this happen?</strong> Some browsers show security warnings when redirecting 
            between different domains, even for legitimate authentication services. This is normal and safe to proceed.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGuidanceModal(false)}>
            Close
          </Button>
          <Button 
            variant="primary" 
            onClick={handleModalRedirect}
          >
            Continue to GitHub Authentication
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Login;
