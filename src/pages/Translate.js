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
  checkReviewerStatus,
  getFileReviewStatus,
  submitFileReview,
  submitPRApproval,
} from "../utils/apiService";

import {
  createEmptyStore,
  getLinkedDataNQuads,
} from "../utils/linkedDataUtils";

const Translate = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState(null);
  const [modalShow, setModalShow] = useState(false);
  const [editableTerm, setEditableTerm] = useState({});
  const [translations, setTranslations] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selectedStatuses] = useState([
    "Conflict",
    "No Modified",
    "Modified",
  ]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  
  // Reviewer workflow state
  const [isReviewer, setIsReviewer] = useState(false);
  const [reviewMode, setReviewMode] = useState(false); // true when in review mode, false when in edit mode
  const [fileReviewStatus, setFileReviewStatus] = useState({});
  const [allFilesCompleted, setAllFilesCompleted] = useState(false);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const { diffsData } = responseDiffChanged.data;

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

        try {
          await fetchContent("config.yml");
          console.log("Config loaded successfully");
        } catch (error) {
          console.warn("Config not available:", error);
        }
        
        // Check reviewer status and file review status
        try {
          const reviewerStatus = await checkReviewerStatus();
          setIsReviewer(reviewerStatus.isReviewer);
          
          if (reviewerStatus.isReviewer) {
            const fileStatus = await getFileReviewStatus();
            setFileReviewStatus(fileStatus.files);
            
            // Determine if we should be in review mode
            // If all files have been edited, switch to review mode
            const allFilesEdited = Object.values(fileStatus.files).every(
              (file) => file.edited
            );
            setReviewMode(allFilesEdited);
            
            // Check if all files are completed (both edited and reviewed)
            const allCompleted = Object.values(fileStatus.files).every(
              (file) => file.edited && file.reviewed
            );
            setAllFilesCompleted(allCompleted);
          }
        } catch (error) {
          console.warn("Could not fetch reviewer status:", error);
          // Continue without reviewer functionality if API not available
        }
        
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

  // Reviewer functions
  const handleFileApproval = async (filename, approved) => {
    try {
      await submitFileReview(filename, approved);
      
      // Update local review status
      setFileReviewStatus(prev => ({
        ...prev,
        [filename]: {
          ...prev[filename],
          reviewed: true,
          approved: approved
        }
      }));
      
      // Check if all files are now completed
      const updatedStatus = {
        ...fileReviewStatus,
        [filename]: {
          ...fileReviewStatus[filename],
          reviewed: true,
          approved: approved
        }
      };
      
      const allCompleted = Object.values(updatedStatus).every(
        (file) => file.edited && file.reviewed
      );
      setAllFilesCompleted(allCompleted);
      
      // If all files are completed and approved, submit PR approval
      if (allCompleted && Object.values(updatedStatus).every(file => file.approved)) {
        await submitPRApproval();
        setToastMessage("All files reviewed and PR approved!");
        setShowToast(true);
      }
      
    } catch (error) {
      console.error("Error submitting file review:", error);
      setError("Failed to submit file review.");
    }
  };

  const handleSwitchToReviewMode = () => {
    setReviewMode(true);
    // Reset current card index to start reviewing from the beginning
    setCurrentCardIndex(0);
    // Clear passed cards for review mode
    const reviewPassedKey = "reviewPassedCards";
    if (!sessionStorage.getItem(reviewPassedKey)) {
      sessionStorage.setItem(reviewPassedKey, JSON.stringify([]));
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
      {/* Reviewer Status Bar */}
      {isReviewer && (
        <Alert variant={reviewMode ? "warning" : "info"} className="mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>
                🔍 Reviewer Mode: {reviewMode ? "Reviewing Files" : "Editing Files"}
              </strong>
              {reviewMode && (
                <span className="ms-2">
                  Review and approve translations before final submission.
                </span>
              )}
            </div>
            {!reviewMode && isReviewer && (
              <Button
                variant="outline-warning"
                size="sm"
                onClick={handleSwitchToReviewMode}
                disabled={!Object.values(fileReviewStatus).every(file => file.edited)}
              >
                Switch to Review Mode
              </Button>
            )}
          </div>
        </Alert>
      )}
      
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
          // Filter out cards that are already in sessionStorage "passedCards" or "reviewPassedCards"
          let passed = [];
          const passedKey = reviewMode ? "reviewPassedCards" : "passedCards";
          try {
            passed = JSON.parse(sessionStorage.getItem(passedKey) || "[]");
          } catch {
            passed = [];
          }
          console.log("passed", passed);
          
          filteredCards = cards
            .filter((card) => selectedStatuses.includes(card.status))
            .filter((card) => {
              const key = `${card.filename}_-_${card.labelName}_-_${card.lang}`;
              
              // In review mode, only show files that have been edited and need review
              if (reviewMode && isReviewer) {
                const fileStatus = fileReviewStatus[card.filename];
                const shouldShowForReview = fileStatus && fileStatus.edited && !fileStatus.reviewed;
                return shouldShowForReview && !passed.includes(key);
              }
              
              // In edit mode, show files that haven't been passed yet
              return !passed.includes(key);
            });
          const card = filteredCards[currentCardIndex];

          if (!card) {
            // Different completion messages based on mode and status
            if (allFilesCompleted && isReviewer) {
              return (
                <Alert variant="success" className="text-center">
                  <h4>🎉 All done!</h4>
                  <p>All files have been edited and reviewed by at least one reviewer.</p>
                </Alert>
              );
            } else if (reviewMode && isReviewer) {
              return (
                <Alert variant="info" className="text-center">
                  <h4>Review Complete!</h4>
                  <p>You have finished reviewing all available files.</p>
                  {!allFilesCompleted && (
                    <Button 
                      variant="primary" 
                      onClick={() => {
                        setReviewMode(false);
                        setCurrentCardIndex(0);
                      }}
                    >
                      Switch to Edit Mode
                    </Button>
                  )}
                </Alert>
              );
            } else if (isReviewer && !reviewMode) {
              // Check if all files are edited and can switch to review mode
              const allEdited = Object.values(fileReviewStatus).every(file => file.edited);
              if (allEdited) {
                return (
                  <Alert variant="warning" className="text-center">
                    <h4>Ready for Review!</h4>
                    <p>All assigned files have been edited and are ready for review.</p>
                    <Button variant="success" onClick={handleSwitchToReviewMode}>
                      Start Review Process
                    </Button>
                  </Alert>
                );
              }
            }
            
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
            const passedKey = reviewMode ? "reviewPassedCards" : "passedCards";
            let passed = [];
            try {
              passed = JSON.parse(
                sessionStorage.getItem(passedKey) || "[]"
              );
            } catch {
              passed = [];
            }
            if (!passed.includes(key)) {
              passed.push(key);
              sessionStorage.setItem(passedKey, JSON.stringify(passed));
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
                            {!isEditing || (reviewMode && isReviewer) ? (
                              <div
                                style={{
                                  minHeight: "2.5em",
                                  whiteSpace: "pre-wrap",
                                  border: "1px solid #ced4da",
                                  borderRadius: "0.375rem",
                                  padding: "0.375rem 0.75rem",
                                  background: reviewMode && isReviewer ? "#e9ecef" : "#f8f9fa",
                                }}
                              >
                                {translationValue || (
                                  <span style={{ color: "#aaa" }}>
                                    {reviewMode && isReviewer ? "Translation for review" : "put your translation here"}
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
                        {reviewMode && isReviewer ? (
                          // Review mode buttons
                          <div className="d-flex justify-content-between gap-2">
                            <Button
                              variant="success"
                              onClick={async () => {
                                await handleFileApproval(card.filename, true);
                                goToNextCard();
                              }}
                              style={{ marginBottom: "8px", width: "48%" }}
                            >
                              ✅ Approve File
                            </Button>
                            <Button
                              variant="danger"
                              onClick={async () => {
                                await handleFileApproval(card.filename, false);
                                goToNextCard();
                              }}
                              style={{ marginBottom: "8px", width: "48%" }}
                            >
                              ❌ Reject File
                            </Button>
                          </div>
                        ) : (
                          // Edit mode buttons (original)
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
                        )}
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
