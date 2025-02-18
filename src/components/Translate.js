import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Spinner,
  Alert,
  Modal,
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaGithub } from "react-icons/fa";

const Translate = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState(null);
  const [modalShow, setModalShow] = useState(false);
  const [editableTerm, setEditableTerm] = useState({});
  const [translations, setTranslations] = useState([]);

  useEffect(() => {
    if (!sessionStorage.getItem("github_token")) {
      navigate("/");
    }
    const fetchToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const branch = params.get("branch");
      const branchExists = sessionStorage.getItem("branch");
      if (!branch && !branchExists) {
        navigate("/branches");
      }
      if (!branchExists || branchExists !== branch) {
        if (branch) {
          console.log(`sessionStorage.setItem('branch', ${branch});`);
          sessionStorage.setItem("branch", branch);
          window.location.reload();
          setError(null);
        }
      }
      const newUrl =
        window.location.protocol +
        "//" +
        window.location.host +
        window.location.pathname +
        window.location.hash;
      window.history.replaceState(null, "", newUrl);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BACK_URL}/api/github/diff`,
          {
            params: {
              repo: process.env.REACT_APP_REPO,
              branch: sessionStorage.getItem("branch"),
            },
            headers: {
              Authorization: sessionStorage.getItem("github_token"),
            },
          }
        );
        const contents = response.data;

        const filteredContents = contents.filter((file) =>
          file.filename.includes("http")
        );
        setContents(filteredContents);

        const responseConfig = await axios.get(
          `${process.env.REACT_APP_BACK_URL}/api/github/content`,
          {
            params: {
              repo: process.env.REACT_APP_REPO,
              path: "config.yml",
            },
            headers: {
              Authorization: sessionStorage.getItem("github_token"),
            },
          }
        );
        const content = responseConfig.data;
        setConfig(content);
        setLoading(false);
        setError(null);
      } catch (error) {
        console.error("Error fetching content:", error);
        setLoading(false);
        setError("Failed to fetch content from the server.");
      }
    };
    fetchToken();
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
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Alert variant="danger">Error: {error}</Alert>
      </div>
    );
  }

  if (!contents) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Alert variant="danger">Error loading content.</Alert>
      </div>
    );
  }

  const transformedData = contents.map((item) => {
    const uri = item.content.uri;
    const labels = item.content.labels.reduce((acc, label) => {
      acc[label.name] = {
        original: label.original,
        ...label.translations.reduce((transAcc, translation) => {
          Object.keys(translation).forEach((lang) => {
            transAcc[lang] =
              translation[lang] === "to be filled in" ? "" : translation[lang];
          });
          return transAcc;
        }, {}),
      };
      return acc;
    }, {});

    return {
      filename: item.filename,
      uri: uri,
      label: [labels],
    };
  });

  const handleEditClick = (filename, labelName, key, term) => {
    setEditableTerm((prev) => ({
      ...prev,
      [`${filename}-${labelName}-${key}`]: true,
    }));

    setTranslations((prev) => ({
      ...prev,
      [filename]: {
        ...(prev[filename] || {}),
        [labelName]: {
          ...(prev[filename]?.[labelName] || {}),
          [key]: prev[filename]?.[labelName]?.[key] || term,
        },
      },
    }));
  };

  const handleInputChange = (event, filename, labelName, lang) => {
    const { value } = event.target;
    setTranslations((prev) => ({
      ...prev,
      [filename]: {
        ...(prev[filename] || {}),
        [labelName]: {
          ...(prev[filename]?.[labelName] || {}),
          [lang]: value,
        },
      },
    }));
  };

  const update = async (filename, labelName, lang) => {
    setModalShow(true);
    let translation = {};

    if (!lang && !labelName) {
      const fileTranslations = translations[filename];
      if (fileTranslations) {
        labelName = Object.keys(fileTranslations)[0];
        lang = Object.keys(fileTranslations[labelName])[0];
      }
    }

    if (translations[filename] && translations[filename][labelName]) {
      translation = {
        [labelName]: {
          [lang]: translations[filename][labelName][lang],
        },
      };
    } else {
      alert(`No changes were made for ${filename}`);
      setError(null);
      setModalShow(false);
      return;
    }

    try {
      await axios.put(
        `${process.env.REACT_APP_BACK_URL}/api/github/update`,
        {
          repo: process.env.REACT_APP_REPO,
          translations: translation,
          filename,
          branch: sessionStorage.getItem("branch"),
        },
        {
          headers: {
            Authorization: sessionStorage.getItem("github_token"),
          },
        }
      );

      const response = await axios.get(
        `${process.env.REACT_APP_BACK_URL}/api/github/diff`,
        {
          params: {
            repo: process.env.REACT_APP_REPO,
            branch: sessionStorage.getItem("branch"),
          },
          headers: {
            Authorization: sessionStorage.getItem("github_token"),
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );

      const filteredContents = response.data.filter((file) =>
        file.filename.includes("http")
      );
      setContents(filteredContents);
      setError(null);
    } catch (error) {
      console.error("Error updating file:", error);
      setError("Failed to update the file.");
    } finally {
      setModalShow(false);
    }
  };

  const updateAll = async () => {
    try {
      const modifiedFiles = transformedData.filter((data) => {
        return Object.entries(data.label[0]).some(([labelName, labelData]) => {
          return Object.keys(labelData).some((lang) => {
            return isFieldModified(data.filename, labelName, lang);
          });
        });
      });

      console.log("modifiedFiles", modifiedFiles);

      if (modifiedFiles.length > 0) {
        for (const file of modifiedFiles) {
          for (const [labelName, labelData] of Object.entries(file.label[0])) {
            for (const lang of Object.keys(labelData)) {
              if (
                isFieldModified(file.filename, labelName, lang) &&
                !isEmpty(translations[file.filename]?.[labelName]?.[lang])
              ) {
                await update(file.filename, labelName, lang);
              }
            }
          }
        }
        const response = await axios.get(
          `${process.env.REACT_APP_BACK_URL}/api/github/diff`,
          {
            params: {
              repo: process.env.REACT_APP_REPO,
              branch: sessionStorage.getItem("branch"),
            },
            headers: {
              Authorization: sessionStorage.getItem("github_token"),
            },
          }
        );
        setContents(response.data);
        setError(null);
        setModalShow(false);
      } else {
        alert("No files have been modified.");
        setError(null);
      }
    } catch (error) {
      console.error("Error updating files:", error);
      setError("Failed to update the files.");
    }
  };

  const isEmpty = (str) => {
    return !str || !/[a-zA-Z0-9]/.test(str);
  };

  const calculateModifiedCounts = () => {
    let modifiedFields = 0;
    let modifiedFiles = 0;

    transformedData.forEach((data) => {
      let fileHasModifiedFields = false;

      Object.entries(data.label[0]).forEach(([labelName, labelData]) => {
        Object.keys(labelData).forEach((lang) => {
          const currentTranslation =
            translations[data.filename]?.[labelName]?.[lang];
          if (
            currentTranslation &&
            currentTranslation !== labelData[lang] &&
            !isEmpty(currentTranslation)
          ) {
            modifiedFields += 1;
            fileHasModifiedFields = true;
          }
        });
      });

      if (fileHasModifiedFields) {
        modifiedFiles += 1;
      }
    });

    return { modifiedFields, modifiedFiles };
  };

  const { modifiedFields, modifiedFiles } = calculateModifiedCounts();

  const isFieldModified = (filename, labelName, lang) => {
    const currentTranslation = translations[filename]?.[labelName]?.[lang];
    return (
      currentTranslation &&
      currentTranslation !==
        contents
          .find((item) => item.filename === filename)
          .content.labels.find((label) => label.name === labelName)
          .translations.find((trans) => trans[lang])[lang] &&
      !isEmpty(currentTranslation)
    );
  };

  return (
    <div>
      <Container className="mt-4">
        <Row className="mt-4 sticky-top bg-white py-2" style={{ top: "56px" }}>
          <Col>
            <Button
              onClick={() => updateAll()}
              variant="primary"
              style={{ width: "100%" }}
              disabled={modifiedFields === 0}
            >
              Save ALL
              {modifiedFields > 0 &&
                ` - ${modifiedFields} modified fields in ${modifiedFiles} file(s)`}
            </Button>
          </Col>
        </Row>
        <br></br>
        <Row className="g-4">
          {transformedData.map((data) => {
            return Object.entries(data.label[0]).map(
              ([labelName, labelData], index) => {
                return Object.keys(labelData).map((lang) => {
                  if (lang === "original") return null;
                  const fieldStatus = isEmpty(
                    translations[data.filename]?.[labelName]?.[lang]
                  )
                    ? "Empty"
                    : isFieldModified(data.filename, labelName, lang)
                    ? "Modified"
                    : "No Modified";

                  return (
                    <Col
                      key={`${data.filename}-${labelName}-${lang}`}
                      md={6}
                      className="mb-4"
                    >
                      <Card
                        className={
                          isFieldModified(data.filename, labelName, lang)
                            ? "border-warning"
                            : ""
                        }
                      >
                        <Card.Header>
                          <div>
                            <a
                              href={data.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <FaGithub />
                            </a>{" "}
                            <strong>{lang}: </strong>
                            {labelName}
                          </div>
                        </Card.Header>
                        <Card.Body>
                          <Row>
                            <Col md={10}>
                              <Card.Text>
                                <strong>Original:</strong> {labelData.original}
                              </Card.Text>
                              <Card.Text>
                                <Form.Group>
                                  <Form.Label>
                                    <strong> Translation ({lang}):</strong>
                                  </Form.Label>
                                  <Form.Control
                                    type="text"
                                    value={
                                      translations[data.filename]?.[
                                        labelName
                                      ]?.[lang] === "to be filled in" ||
                                      translations[data.filename]?.[
                                        labelName
                                      ]?.[lang] === ""
                                        ? ""
                                        : translations[data.filename]?.[
                                            labelName
                                          ]?.[lang] ||
                                          labelData[lang] ||
                                          ""
                                    }
                                    placeholder={
                                      translations[data.filename]?.[
                                        labelName
                                      ]?.[lang] === "to be filled in" ||
                                      translations[data.filename]?.[
                                        labelName
                                      ]?.[lang] === ""
                                        ? "put your translation here"
                                        : ""
                                    }
                                    onClick={
                                      !editableTerm[
                                        `${data.filename}-${labelName}-${lang}`
                                      ]
                                        ? () =>
                                            handleEditClick(
                                              data.filename,
                                              labelName,
                                              lang,
                                              labelData[lang]
                                            )
                                        : undefined
                                    }
                                    onChange={(e) =>
                                      handleInputChange(
                                        e,
                                        data.filename,
                                        labelName,
                                        lang
                                      )
                                    }
                                  />
                                </Form.Group>
                              </Card.Text>
                            </Col>
                            <Col md={2} className="d-flex align-items-center">
                              <Button
                                variant="primary"
                                onClick={() =>
                                  update(data.filename, labelName, lang)
                                }
                                disabled={
                                  !isFieldModified(
                                    data.filename,
                                    labelName,
                                    lang
                                  )
                                }
                                style={{ marginRight: "10px" }}
                              >
                                Save
                              </Button>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                });
              }
            );
          })}
        </Row>
        <Modal
          show={modalShow}
          size="lg"
          backdrop="static"
          centered
          className="h-100"
        >
          <Modal.Header>Please Wait</Modal.Header>
          <Modal.Body>
            <div
              className="d-flex justify-content-center align-items-center"
              style={{ minHeight: "50vh" }}
            >
              <Spinner animation="border" />
            </div>
          </Modal.Body>
        </Modal>
      </Container>
    </div>
  );
};

export default Translate;
