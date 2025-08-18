import React, { useEffect, useState } from "react";
import { fetchSuggestions } from "../utils/SuggestionService";
import { useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Button,
  Form,
  Spinner,
  Alert,
  Modal,
  Toast,
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaGithub } from "react-icons/fa";
import {
  sendUpdateRequest,
  fetchBranchDiff,
  fetchDiffChanged,
  fetchContent,
  sendUpdateFile,
} from "../utils/apiService";

import {
  createEmptyStore,
  getLinkedDataNQuads,
} from "../utils/linkedDataUtils";

const Translate = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState(null);
  const [modalShow, setModalShow] = useState(false);
  const [editableTerm, setEditableTerm] = useState({});
  const [translations, setTranslations] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [displayedData, setDisplayedData] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([
    "Conflict",
    "No Modified",
    "Modified",
  ]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [upToDate, setUpToDate] = useState(false);
  const [upToDateMessage, setUpToDateMessage] = useState("");

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
        const response = await fetchBranchDiff(
          sessionStorage.getItem("github_token"),
          sessionStorage.getItem("branch")
        );

        let contents = response;
        const responseDiffChanged = await fetchDiffChanged();
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

          //console.log("Before value:", beforeValue);
          //console.log("After value:", afterValue);
          const hasChanges = beforeValue !== afterValue;

          //console.log("Has changes:", hasChanges);

          if (hasChanges) {
            contents.forEach((file) => {
              file.content.labels.forEach((label) => {
                //console.log("Label:", label);
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

        //console.log("contents", contents);

        const filteredContents = contents.filter((file) =>
          file.filename.includes("http")
        );
        setContents(filteredContents);

        const responseConfig = await fetchContent("config.yml");
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

  // Recompute cards when displayedData changes
  useEffect(() => {
    setCurrentCardIndex(0);
  }, [displayedData]);

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
    //console.log("item", item);
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

    //console.log("labels", labels);

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
      sendUpdateFile(filename, translation);
      const response = await fetchBranchDiff(
        sessionStorage.getItem("github_token"),
        sessionStorage.getItem("branch"),
        {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Expires: "0",
        }
      );

      const filteredContents = response.filter((file) =>
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
      <div className="mt-4">
        {(() => {
          const cards = [];
          transformedData.forEach((data) => {
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
          let filteredCards = cards.filter((card) =>
            selectedStatuses.includes(card.status)
          );

          // Only show one card at a time
          // Filter out cards that are already in sessionStorage "passedCards"
          let passed = [];
          try {
            passed = JSON.parse(sessionStorage.getItem("passedCards") || "[]");
          } catch {
            passed = [];
          }
          console.log("passed", passed);
          filteredCards = cards
            .filter((card) => selectedStatuses.includes(card.status))
            .filter((card) => {
              const key = `${card.filename}_-_${card.labelName}_-_${card.lang}`;
              //console.log("key", key);
              //console.log("passed.includes(key)", passed.includes(key));
              return !passed.includes(key);
            });
          const card = filteredCards[currentCardIndex];

          if (!card) {
            return (
              <Alert variant="success" className="text-center">
                All done! No more cards to review.
              </Alert>
            );
          }

          const isEditing =
            editableTerm[`${card.filename}-${card.labelName}-${card.lang}`];
          const translationValue =
            translations[card.filename]?.[card.labelName]?.[card.lang] ??
            card.labelData[card.lang] ??
            "";

          // Helper to go to next card
          const goToNextCard = async () => {
            // Mark as passed in session cookie
            const key = `${card.filename}_-_${card.labelName}_-_${card.lang}`;
            let passed = [];
            try {
              passed = JSON.parse(
                sessionStorage.getItem("passedCards") || "[]"
              );
            } catch {
              passed = [];
            }
            if (!passed.includes(key)) {
              passed.push(key);
              sessionStorage.setItem("passedCards", JSON.stringify(passed));
            }
            setEditableTerm((prev) => ({
              ...prev,
              [key]: false,
            }));
            // make empty store
            let store = createEmptyStore();
            await getLinkedDataNQuads(card.uri, store);
            setCurrentCardIndex((prev) => prev + 1);
          };

          return (
            <Row className="g-3 align-items-stretch">
              <Col key={`${card.filename}-${card.labelName}-${card.lang}`}>
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
                      <Col md={12}>
                        <Card.Text>
                          <strong>Original:</strong> {card.labelData.original}
                        </Card.Text>
                        <Card.Text>
                          <Form.Group>
                            <Form.Label>
                              <strong> Translation ({card.lang}):</strong>
                            </Form.Label>
                            {!isEditing ? (
                              <div
                                style={{
                                  minHeight: "2.5em",
                                  whiteSpace: "pre-wrap",
                                  border: "1px solid #ced4da",
                                  borderRadius: "0.375rem",
                                  padding: "0.375rem 0.75rem",
                                  background: "#f8f9fa",
                                }}
                              >
                                {translationValue || (
                                  <span style={{ color: "#aaa" }}>
                                    put your translation here
                                  </span>
                                )}
                              </div>
                            ) : (
                              <Form.Control
                                as="textarea"
                                rows={
                                  card.labelData.original.length > 50 ? 4 : 2
                                }
                                style={{ resize: "both" }}
                                value={translationValue}
                                placeholder="put your translation here"
                                onChange={(e) =>
                                  handleInputChange(
                                    e,
                                    card.filename,
                                    card.labelName,
                                    card.lang
                                  )
                                }
                              />
                            )}
                          </Form.Group>
                        </Card.Text>
                      </Col>
                      <Col
                        md={2}
                        className="d-flex flex-column align-items-center justify-content-center gap-2"
                      ></Col>
                    </Row>
                    <Row className="mb-3">
                      <Col className="mt-3">
                        <div className="d-flex justify-content-between gap-2">
                          <Button
                            variant="success"
                            onClick={async () => {
                              if (!isEditing) {
                                goToNextCard();
                              } else {
                                await update(
                                  card.filename,
                                  card.labelName,
                                  card.lang
                                );
                                goToNextCard();
                              }
                            }}
                            disabled={
                              isEditing &&
                              !isFieldModified(
                                card.filename,
                                card.labelName,
                                card.lang
                              )
                            }
                            style={{ marginBottom: "8px", width: "33%" }}
                          >
                            {isEditing ? "Save Translation" : "Confirm"}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={async () => {
                              if (!isEditing) {
                                handleEditClick(
                                  card.filename,
                                  card.labelName,
                                  card.lang,
                                  card.labelData[card.lang]
                                );
                              } else {
                                // "Make Suggestion" clicked
                                try {
                                  setEditableTerm((prev) => ({
                                    ...prev,
                                    [`${card.filename}-${card.labelName}-${card.lang}`]:
                                      "suggestion-in-progress",
                                  }));
                                  const suggestion = await fetchSuggestions(
                                    card.labelData.original,
                                    card.lang
                                  );
                                  setTranslations((prev) => ({
                                    ...prev,
                                    [card.filename]: {
                                      ...(prev[card.filename] || {}),
                                      [card.labelName]: {
                                        ...(prev[card.filename]?.[
                                          card.labelName
                                        ] || {}),
                                        [card.lang]:
                                          suggestion ||
                                          prev[card.filename]?.[
                                            card.labelName
                                          ]?.[card.lang] ||
                                          "",
                                      },
                                    },
                                  }));
                                  setEditableTerm((prev) => ({
                                    ...prev,
                                    [`${card.filename}-${card.labelName}-${card.lang}`]:
                                      "suggestion-done",
                                  }));
                                } catch (error) {
                                  setEditableTerm((prev) => ({
                                    ...prev,
                                    [`${card.filename}-${card.labelName}-${card.lang}`]: true,
                                  }));
                                  console.error(
                                    "Error fetching suggestion:",
                                    error
                                  );
                                }
                              }
                            }}
                            disabled={
                              isEditing === "suggestion-in-progress" ||
                              isEditing === "suggestion-done"
                            }
                            style={{ marginBottom: "8px", width: "33%" }}
                          >
                            {isEditing
                              ? "Make Suggestion"
                              : !card.labelData.original
                              ? "Make Suggestion"
                              : "Edit"}
                          </Button>
                          <Button
                            variant="danger"
                            style={{ marginBottom: "8px", width: "33%" }}
                            onClick={async () => {
                              if (
                                translationValue !== card.labelData.original
                              ) {
                                setTranslations((prev) => ({
                                  ...prev,
                                  [card.filename]: {
                                    ...(prev[card.filename] || {}),
                                    [card.labelName]: {
                                      ...(prev[card.filename]?.[
                                        card.labelName
                                      ] || {}),
                                      [card.lang]: card.labelData.original,
                                    },
                                  },
                                }));
                              }
                              // Always set to editing mode after using original value
                              setEditableTerm((prev) => ({
                                ...prev,
                                [`${card.filename}-${card.labelName}-${card.lang}`]: true,
                              }));
                            }}
                          >
                            Use Original Value
                          </Button>
                        </div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
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
      </div>
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
