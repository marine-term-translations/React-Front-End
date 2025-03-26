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
  InputGroup,
  FormControl,
  ToggleButton,
  ToggleButtonGroup,
  Toast,
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaGithub, FaInfoCircle, FaSearch } from "react-icons/fa";

const Translate = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState(null);
  const [modalShow, setModalShow] = useState(false);
  const [editableTerm, setEditableTerm] = useState({});
  const [translations, setTranslations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLangs, setSelectedLangs] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([
    "Conflict",
    "No Modified",
    "Modified",
  ]);
  const [showUnfilled, setShowUnfilled] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [upToDate, setUpToDate] = useState(false);
  const [upToDateMessage, setUpToDateMessage] = useState("");

  const sendUpdateRequest = async (beforeValue, afterValue) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_BACK_URL}/api/github/auto-update`,
        {
          repo: process.env.REACT_APP_REPO,
          branch: sessionStorage.getItem("branch"),
          before: beforeValue,
          after: afterValue,
        },
        {
          headers: {
            Authorization: sessionStorage.getItem("github_token"),
          },
        }
      );
      console.log("Auto-update request sent successfully.");
    } catch (error) {
      console.error("Error sending auto-update request:", error);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (calculateModifiedCounts().modifiedFields > 0) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

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
        let contents = response.data;
        const responseDiffChanged = await axios.get(
          `${process.env.REACT_APP_BACK_URL}/api/github/changed`,
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
        if (responseDiffChanged.data.compare) {
          setUpToDate(true);
          setUpToDateMessage(responseDiffChanged.data.message);
        }
        const { diffsData, commentsData } = responseDiffChanged.data;

        console.log("diffsData", diffsData);

        diffsData.forEach((diff) => {
          const beforeMatches =
            diff.before.match(/original:\s*(.*?)(?=\s*path:|$)/g) || [];
          const afterMatches =
            diff.after.match(/original:\s*(.*?)(?=\s*path:|$)/g) || [];

          const beforeValues = beforeMatches.map((match) =>
            match.replace(/original:\s*"/, "").replace(/"$/, "")
          );
          const afterValues = afterMatches.map((match) =>
            match.replace(/original:\s*"/, "").replace(/"$/, "")
          );

          const beforeValue =
            beforeValues.length > 1
              ? beforeValues[0].replace(/^original:\s*/, "").trim()
              : beforeValues[0]?.replace(/^original:\s*/, "").trim() || null;
          const afterValue =
            afterValues.length > 1
              ? afterValues[0].replace(/^original:\s*/, "").trim()
              : afterValues[0]?.replace(/^original:\s*/, "").trim() || null;

          console.log("Before value:", beforeValue);
          console.log("After value:", afterValue);
          const hasChanges = beforeValue !== afterValue;

          console.log("Has changes:", hasChanges);

          if (hasChanges) {
            contents.forEach((file) => {
              file.content.labels.forEach((label) => {
                console.log("Label:", label);
                if (label.original === afterValue) {
                  label.original = beforeValue;
                  label.translations.forEach((translation) => {
                    Object.keys(translation).forEach((lang) => {
                      translation[lang] =
                        "MERGE CONFLICT: " + translation[lang];
                    });
                  });
                }
              });
            });

            setToastMessage(
              "A file has been changed on main. This file will be updated."
            );
            setShowToast(true);
            sendUpdateRequest(beforeValue, afterValue);
          }
        });

        console.log("contents", contents);

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

  useEffect(() => {
    if (contents) {
      const allLangs = new Set();
      contents.forEach((item) => {
        item.content.labels.forEach((label) => {
          label.translations.forEach((translation) => {
            Object.keys(translation).forEach((lang) => {
              allLangs.add(lang);
            });
          });
        });
      });
      setSelectedLangs(Array.from(allLangs));
    }
  }, [contents]);

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
    console.log("item", item);
    const uri = item.content.uri;
    const labels = item.content.labels.reduce((acc, label) => {
      acc[label.name] = {
        status: label.translations.some((translation) =>
          Object.values(translation).some((value) =>
            value.includes("MERGE CONFLICT")
          )
        )
          ? "Conflict"
          : label.translations.some((translation) =>
              Object.values(translation).some(
                (value) => value !== "" && value !== "to be filled in"
              )
            )
          ? "Modified"
          : "No Modified",
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

    console.log("labels", labels);

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

  const filteredData = transformedData.filter((data) => {
    return Object.entries(data.label[0]).some(([labelName, labelData]) => {
      return Object.keys(labelData).some((lang) => {
        const value = labelData[lang];
        return (
          selectedLangs.includes(lang) &&
          labelData.original.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    });
  });

  const displayedData = showUnfilled
    ? filteredData.filter((item) =>
        Object.entries(item.label[0]).some(([labelName, labelData]) =>
          Object.keys(labelData).some((lang) => isEmpty(labelData[lang]))
        )
      )
    : filteredData;

  const handleLangChange = (lang) => {
    setSelectedLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  return (
    <div>
      <Container className="mt-4">
        <Card className="mb-4">
          <Card.Body>
            <Row className="g-2">
              <Col md={4}>
                <InputGroup>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <FormControl
                    placeholder="Search in original translation"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </Col>
              <Col md={4}>
                <Form>
                  {selectedLangs.map((lang) => (
                    <Form.Check
                      key={lang}
                      type="checkbox"
                      label={lang}
                      checked={selectedLangs.includes(lang)}
                      onChange={() => handleLangChange(lang)}
                    />
                  ))}
                </Form>
              </Col>
              <Col md={4}>
                <ToggleButtonGroup
                  type="checkbox"
                  value={showUnfilled}
                  onChange={() => setShowUnfilled(!showUnfilled)}
                >
                  <ToggleButton id="tbg-btn-2" value={1}>
                    Show Unfilled
                  </ToggleButton>
                </ToggleButtonGroup>
              </Col>
            </Row>
            <Row className="mt-2">
              <Col>
                <Button variant="info">
                  <FaInfoCircle />{" "}
                  {
                    // Calculate displayed fields count based on displayedData
                    displayedData.reduce(
                      (acc, item) =>
                        acc +
                        Object.entries(item.label[0]).reduce(
                          (acc, [labelName, labelData]) =>
                            acc +
                            Object.keys(labelData).filter(
                              (key) => key !== "status" && key !== "original"
                            ).length,
                          0
                        ),
                      0
                    )
                  }{" "}
                  /{" "}
                  {transformedData.reduce(
                    (acc, data) =>
                      acc +
                      Object.entries(data.label[0]).reduce(
                        (acc, [labelName, labelData]) =>
                          acc +
                          Object.keys(labelData).filter(
                            (key) => key !== "status" && key !== "original"
                          ).length,
                        0
                      ),
                    0
                  )}{" "}
                  fields
                </Button>
              </Col>
            </Row>
            <Row className="mt-2">
              <Col>
                <Form>
                  {["Conflict", "No Modified", "Modified"].map((status) => (
                    <Form.Check
                      inline
                      key={status}
                      type="checkbox"
                      label={status}
                      checked={selectedStatuses.includes(status)}
                      onChange={() =>
                        setSelectedStatuses((prev) =>
                          prev.includes(status)
                            ? prev.filter((s) => s !== status)
                            : [...prev, status]
                        )
                      }
                    />
                  ))}
                </Form>
              </Col>
            </Row>
          </Card.Body>
        </Card>
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
        {(() => {
          const cards = [];
          displayedData.forEach((data) => {
            Object.entries(data.label[0]).forEach(([labelName, labelData]) => {
              Object.keys(labelData).forEach((lang) => {
                if (lang === "original" || lang === "status") return;
                cards.push({
                  filename: data.filename,
                  uri: data.uri,
                  labelName,
                  labelData,
                  lang,
                  status: labelData.status,
                });
              });
            });
          });
          const statusOrder = {
            Conflict: 0,
            "No Modified": 1,
            Modified: 2,
            Empty: 3,
          };
          cards.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
          const filteredCards = cards.filter((card) =>
            selectedStatuses.includes(card.status)
          );
          return (
            <Row className="g-3 align-items-stretch">
              {filteredCards.map((card) => (
                <Col
                  key={`${card.filename}-${card.labelName}-${card.lang}`}
                  md={6}
                >
                  <Card
                    className={`h-100 ${
                      isFieldModified(card.filename, card.labelName, card.lang)
                        ? "border-warning"
                        : ""
                    }`}
                  >
                    <Card.Header
                      className={
                        card.status === "Conflict"
                          ? "bg-danger text-white"
                          : card.status === "No Modified"
                          ? "bg-info text-white"
                          : card.status === "Modified"
                          ? "bg-warning text-white"
                          : ""
                      }
                    >
                      <div>
                        <a
                          href={card.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FaGithub />
                        </a>{" "}
                        <strong>{card.lang}: </strong>
                        {card.labelName}
                      </div>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={10}>
                          <Card.Text>
                            <strong>Original:</strong> {card.labelData.original}
                          </Card.Text>
                          <Card.Text>
                            <Form.Group>
                              <Form.Label>
                                <strong> Translation ({card.lang}):</strong>
                              </Form.Label>
                              <Form.Control
                                as="textarea"
                                rows={
                                  card.labelData.original.length > 50 ? 4 : 2
                                }
                                style={{ resize: "both" }}
                                value={
                                  translations[card.filename]?.[
                                    card.labelName
                                  ]?.[card.lang] === "to be filled in" ||
                                  translations[card.filename]?.[
                                    card.labelName
                                  ]?.[card.lang] === ""
                                    ? ""
                                    : translations[card.filename]?.[
                                        card.labelName
                                      ]?.[card.lang] ||
                                      card.labelData[card.lang] ||
                                      ""
                                }
                                placeholder={
                                  translations[card.filename]?.[
                                    card.labelName
                                  ]?.[card.lang] === "to be filled in" ||
                                  translations[card.filename]?.[
                                    card.labelName
                                  ]?.[card.lang] === ""
                                    ? "put your translation here"
                                    : ""
                                }
                                onClick={
                                  !editableTerm[
                                    `${card.filename}-${card.labelName}-${card.lang}`
                                  ]
                                    ? () =>
                                        handleEditClick(
                                          card.filename,
                                          card.labelName,
                                          card.lang,
                                          card.labelData[card.lang]
                                        )
                                    : undefined
                                }
                                onChange={(e) =>
                                  handleInputChange(
                                    e,
                                    card.filename,
                                    card.labelName,
                                    card.lang
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
                              update(card.filename, card.labelName, card.lang)
                            }
                            disabled={
                              !isFieldModified(
                                card.filename,
                                card.labelName,
                                card.lang
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
              ))}
            </Row>
          );
        })()}
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
      {showToast && (
        <Toast
          onClose={() => setShowToast(false)}
          show={showToast}
          delay={30000}
          autohide
          bg="Primary"
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 1050,
          }}
        >
          <Toast.Header>
            <strong className="me-auto">Automatic file update</strong>
          </Toast.Header>
          <Toast.Body>{toastMessage}</Toast.Body>
        </Toast>
      )}
    </div>
  );
};

export default Translate;
