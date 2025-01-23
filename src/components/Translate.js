import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Table,
  Button,
  Form,
  Spinner,
  Alert,
  Row,
  Col,
  Modal,
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

const Translate = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState(null);
  const [modalShow, setModalShow] = useState(false);
  const [editableTerm, setEditableTerm] = useState({});
  const [translations, setTranslations] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState(null);

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
        console.log(contents);

        // filter out contents for which the filename does not include "http"
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
        setSelectedLanguage(content.target_languages[0]);
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
    const labels = item.content.labels.reduce((acc, label) => {
      acc[label.name] = {
        original: label.original,
        ...label.translations.reduce((transAcc, translation) => {
          Object.keys(translation).forEach((lang) => {
            transAcc[lang] = translation[lang];
          });
          return transAcc;
        }, {}),
      };
      return acc;
    }, {});

    console.log(labels);
    console.log(item.filename);

    return {
      filename: item.filename,
      label: [labels],
    };
  });

  const handleEditClick = (filename, labelName, key, term) => {
    // console.log("click");
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

  const handleInputChange = (event, filename, labelName, key) => {
    const { value } = event.target;

    setTranslations((prev) => ({
      ...prev,
      [filename]: {
        ...(prev[filename] || {}),
        [labelName]: {
          ...(prev[filename]?.[labelName] || {}),
          [key]: value,
        },
      },
    }));
  };

  const update = async (filename, all = false) => {
    setModalShow(true);
    if (translations[filename]) {
      try {
        const translation = Object.entries(translations[filename]).reduce(
          (acc, [labelKey, translationObj]) => {
            const translatedValue = translationObj[selectedLanguage];
            if (
              translatedValue !==
                contents
                  .find((item) => item.filename === filename)
                  .content.labels.find((label) => label.name === labelKey)
                  .translations[selectedLanguage] &&
              !isEmpty(translatedValue)
            ) {
              acc[labelKey] = { [selectedLanguage]: translatedValue };
            }
            return acc;
          },
          {}
        );

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

        if (!all) {
          const response = await axios.get(
            `${process.env.REACT_APP_BACK_URL}/api/github/diff`,
            {
              params: {
                repo: process.env.REACT_APP_REPO,
                branch: sessionStorage.getItem("branch"),
              },
              headers: {
                Authorization: sessionStorage.getItem("github_token"),
                "Cache-Control": "no-cache", // Invalidate cache
                Pragma: "no-cache", // Invalidate cache
                Expires: "0", // Invalidate cache
              },
            }
          );

          const filteredContents = response.data.filter((file) =>
            file.filename.includes("http")
          );
          setContents(filteredContents);
          setModalShow(false);
        }
        setError(null);
      } catch (error) {
        console.error("Error updating file:", error);
        setError("Failed to update the file.");
      }
    } else {
      alert(`You don't make a change for ${filename}`);
      setError(null);
    }
  };

  const handleLanguageChange = (event) => {
    setSelectedLanguage(event.target.value);
  };

  const updateAll = async () => {
    try {
      const modifiedFiles = transformedData.filter((data) => {
        return Object.keys(data.label[0]).some((labelName) =>
          isFieldModified(data.filename, labelName)
        );
      });

      if (modifiedFiles.length > 0) {
        for (const file of modifiedFiles) {
          await update(file.filename, true);
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
        const currentTranslation =
          translations[data.filename]?.[labelName]?.[selectedLanguage];
        if (
          currentTranslation &&
          currentTranslation !== labelData[selectedLanguage] &&
          !isEmpty(currentTranslation)
        ) {
          modifiedFields += 1;
          fileHasModifiedFields = true;
        }
      });

      if (fileHasModifiedFields) {
        modifiedFiles += 1;
      }
    });

    return { modifiedFields, modifiedFiles };
  };

  const { modifiedFields, modifiedFiles } = calculateModifiedCounts();

  const isFieldModified = (filename, labelName) => {
    const currentTranslation =
      translations[filename]?.[labelName]?.[selectedLanguage];
    return (
      currentTranslation &&
      currentTranslation !==
        contents
          .find((item) => item.filename === filename)
          .content.labels.find((label) => label.name === labelName)
          .translations.find(
            (trans) => Object.keys(trans)[0] === selectedLanguage
          )[selectedLanguage] &&
      !isEmpty(currentTranslation)
    );
  };

  return (
    <div>
      <h1>Translate Files</h1>
      <Container className="mt-4">
        <Table
          bordered
          responsive="lg"
          className="text-center m-auto"
          style={{ width: "auto" }}
        >
          <thead>
            <tr>
              <th>
                <pre> </pre>
              </th>
              <th>Label</th>
              <th>Original</th>
              <th>
                <Form.Group
                  as={Row}
                  className="align-items-center"
                  controlId="languageselect"
                >
                  <Form.Label column>Translation Language</Form.Label>
                  <Col>
                    <Form.Select
                      value={selectedLanguage}
                      onChange={handleLanguageChange}
                    >
                      {config.target_languages.map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                </Form.Group>
              </th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {transformedData.map((data) => {
              const totalRows = Object.keys(data.label[0]).length;
              const fileHasModifiedFields = Object.keys(data.label[0]).some(
                (labelName) => isFieldModified(data.filename, labelName)
              );

              return (
                <>
                  {Object.entries(data.label[0]).map(
                    ([labelName, labelData], index) => {
                      const isFirstRow = index === 0;
                      const fieldStatus = isEmpty(
                        translations[data.filename]?.[labelName]?.[
                          selectedLanguage
                        ]
                      )
                        ? "Empty"
                        : isFieldModified(data.filename, labelName)
                        ? "Modified"
                        : "No Modified";

                      return (
                        <tr key={`${data.filename}-${labelName}`}>
                          {isFirstRow && <td rowSpan={totalRows}></td>}
                          <td>{labelName}</td>
                          <td
                            style={{
                              maxWidth: "30vw",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {labelData.original}
                          </td>
                          <td>
                            <Form.Control
                              as="textarea"
                              value={
                                translations[data.filename]?.[labelName]?.[
                                  selectedLanguage
                                ] ||
                                labelData[selectedLanguage] ||
                                ""
                              }
                              onClick={
                                !editableTerm[
                                  `${data.filename}-${labelName}-${selectedLanguage}`
                                ]
                                  ? () =>
                                      handleEditClick(
                                        data.filename,
                                        labelName,
                                        selectedLanguage,
                                        labelData[selectedLanguage]
                                      )
                                  : undefined
                              }
                              onChange={(e) =>
                                handleInputChange(
                                  e,
                                  data.filename,
                                  labelName,
                                  selectedLanguage
                                )
                              }
                              style={{
                                minHeight: "50px",
                                resize: "vertical",
                                fontSize: "16px",
                                height: "auto",
                              }}
                            />
                          </td>
                          <td>
                            {editableTerm[
                              `${data.filename}-${labelName}-${selectedLanguage}`
                            ] ? (
                              <span>{fieldStatus}</span>
                            ) : isEmpty(labelData[selectedLanguage]) ? (
                              <span>Empty</span>
                            ) : (
                              <span>No Modified</span>
                            )}
                          </td>
                          {isFirstRow && (
                            <td
                              rowSpan={totalRows}
                              style={{ verticalAlign: "middle" }}
                            >
                              <Button
                                onClick={() => update(data.filename)}
                                variant="primary"
                                disabled={!fileHasModifiedFields}
                                style={{
                                  width: "100%",
                                  height: "auto",
                                  paddingTop: "25px",
                                  paddingBottom: "25px",
                                }}
                              >
                                Save
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    }
                  )}
                </>
              );
            })}
            <tr>
              <td colSpan={6}>
                <Button
                  onClick={() => updateAll()}
                  variant="primary"
                  style={{ width: "100%" }}
                  disabled={modifiedFields === 0}
                >
                  Save ALL ({selectedLanguage})
                  {modifiedFields > 0 &&
                    ` - ${modifiedFields} modified fields in ${modifiedFiles} file(s)`}
                </Button>
              </td>
            </tr>
          </tbody>
        </Table>
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
