import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { Container, Row, Col, Card, Spinner, Alert } from "react-bootstrap";
import { Doughnut } from "react-chartjs-2";
import "bootstrap/dist/css/bootstrap.min.css";
import Chart from "chart.js/auto";

const Branches = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [emptyField, setEmptyField] = useState({});
  const [totalFieldsCount, setTotalFieldsCount] = useState({});
  const navigate = useNavigate();

  const isEmpty = (str) => !str || str === "to be filled in";

  useEffect(() => {
    const fetchBranches = async () => {
      const token = sessionStorage.getItem("github_token");
      if (!token) {
        setError(
          "Authorization token is missing or invalid. Redirecting to home..."
        );
        setLoading(false);
        setTimeout(() => navigate("/"), 3000);
        return;
      }

      const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}${window.location.hash}`;
      window.history.replaceState(null, "", newUrl);

      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BACK_URL}/api/github/branches`,
          {
            params: { repo: process.env.REACT_APP_REPO },
            headers: { Authorization: token },
          }
        );

        const branchesData = response.data;
        setBranches(branchesData);
        setLoading(false);
        setError(null);

        const totalFieldsCount = {};
        const translationCounts = {};
        branchesData.forEach(async (branchData) => {
          const branch = branchData.name;
          const response = await axios.get(
            `${process.env.REACT_APP_BACK_URL}/api/github/diff`,
            {
              params: { repo: process.env.REACT_APP_REPO, branch },
              headers: { Authorization: token },
            }
          );

          let contents = response.data;

          contents = contents.filter((file) => file.filename.includes("http"));

          totalFieldsCount[branch] = {};
          translationCounts[branch] = {};

          contents.forEach((file) => {
            file.content.labels.forEach((label) => {
              label.translations.forEach((translation) => {
                Object.entries(translation).forEach(([lang, value]) => {
                  if (!translationCounts[branch][lang]) {
                    translationCounts[branch][lang] = 0;
                  }
                  if (!totalFieldsCount[branch][lang]) {
                    totalFieldsCount[branch][lang] = 0;
                  }

                  totalFieldsCount[branch][lang]++;

                  if (!isEmpty(value)) {
                    translationCounts[branch][lang]++;
                  }
                });
              });
            });
          });

          setEmptyField((prev) => ({
            ...prev,
            [branch]: translationCounts[branch],
          }));
          setTotalFieldsCount((prev) => ({
            ...prev,
            [branch]: totalFieldsCount[branch],
          }));
        });
      } catch (error) {
        const errorMessage = error.response?.data?.message
          ? error.response.data.message
          : error.request
          ? "Network error. Please check your connection and try again."
          : "An unexpected error occurred. Please try again.";
        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchBranches();
  }, [navigate]);

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <>
      <Container className="d-flex flex-column align-items-center">
        {loading ? (
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: "85vh" }}
          >
            <Spinner animation="border" />
          </div>
        ) : error ? (
          <Alert variant="danger">
            <p>{error}</p>
          </Alert>
        ) : (
          <Row className="g-4">
            {branches.map((branch, index) => {
              const formattedDate = formatInTimeZone(
                branch.lastCommit,
                userTimeZone,
                "dd/MM/yyyy HH:mm:ss"
              );
              const emptyFieldCounts = emptyField[branch.name];
              const totalFields = totalFieldsCount[branch.name];
              return (
                <Col key={branch.name} xxl={4} xl={4} lg={6} md={6} sm={12}>
                  <Card
                    as="a"
                    href={`?branch=${branch.name}#/translate`}
                    style={{ cursor: "pointer" }}
                  >
                    <Card.Body>
                      <Row>
                        <Col md={6}>
                          <Card.Title>
                            <strong>{branch.name}</strong>
                          </Card.Title>
                          <Card.Subtitle className="mb-2 text-muted">
                            {formattedDate}
                          </Card.Subtitle>
                        </Col>
                        <Col md={6}>
                          {emptyFieldCounts ? (
                            <Doughnut
                              data={{
                                labels: Object.keys(emptyFieldCounts).map(
                                  (lang) =>
                                    `${lang} (${
                                      totalFields[lang] - emptyFieldCounts[lang]
                                    })`
                                ),
                                datasets: [
                                  {
                                    data: Object.entries(emptyFieldCounts)
                                      .map(([lang, count]) => [
                                        totalFields[lang] - count,
                                        count,
                                      ])
                                      .flat(),
                                    backgroundColor: Object.entries(
                                      emptyFieldCounts
                                    )
                                      .map(([lang, count], index) => [
                                        `rgba(255, 99, 132, ${
                                          1 - index * 0.1
                                        })`,
                                        `rgba(75, 192, 192, ${
                                          1 - index * 0.1
                                        })`,
                                      ])
                                      .flat(),
                                  },
                                ],
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    display: false,
                                  },
                                },
                              }}
                            />
                          ) : (
                            <Spinner animation="border" size="sm" />
                          )}
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Container>
    </>
  );
};

export default Branches;
