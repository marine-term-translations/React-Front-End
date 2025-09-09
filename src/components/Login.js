import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Container, Card, Button, Spinner, Alert } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

const Login = () => {
  const navigate = useNavigate();
  const [gitHubLink, setGitHubLink] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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
        if (error.response) {
          setError(`Error: ${error.response.data.message || "Server Error"}`);
        } else if (error.request) {
          setError("No response from the server. Please check your network.");
        } else {
          setError(`Request error: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGitHubLink();
  }, [navigate]);

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
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "85vh" }}
      >
        <Alert variant="danger">{error}</Alert>
      </div>
    );
  }

  return (
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
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Login;
