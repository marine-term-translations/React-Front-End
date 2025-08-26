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
  checkFileApprovalStatus,
  approveFile,
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
  const [prNumber, setPrNumber] = useState(null);
  const [fileApprovalStatus, setFileApprovalStatus] = useState({});
  const [reviewerMode, setReviewerMode] = useState(false);

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
        const { diffsData, pullNumber } = responseDiffChanged.data;

        console.log("diffsData", diffsData);
        console.log("pullNumber", pullNumber);

        // Store PR number for reviewer functionality
        if (pullNumber) {
          setPrNumber(pullNumber);
        }

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

        // Check file approval status if we have a PR number
        if (pullNumber) {
          const approvalStatusPromises = filteredContents.map(async (file) => {
            try {
              const approvalStatus = await checkFileApprovalStatus(pullNumber, file.filename);
              return { filename: file.filename, ...approvalStatus };
            } catch (error) {
              console.warn(`Could not check approval status for ${file.filename}:`, error);
              return { filename: file.filename, approved: false };
            }
          });

          try {
            const approvalStatuses = await Promise.all(approvalStatusPromises);
            const statusMap = {};
            approvalStatuses.forEach(status => {
              statusMap[status.filename] = status;
            });
            setFileApprovalStatus(statusMap);
          } catch (error) {
            console.warn("Error checking file approval statuses:", error);
          }
        }

        try {
          await fetchContent("config.yml");
          console.log("Config loaded successfully");
        } catch (error) {
          console.warn("Config not available:", error);
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



  const handleFileApproval = async (filename) => {
    if (!prNumber) {
      alert("No PR found for approval");
      return;
    }

    try {
      // Get the SHA from the diff data
      const responseDiffChanged = await fetchDiffChanged();
      const { diffsData } = responseDiffChanged.data;
      const fileData = diffsData.find(diff => diff.filename === filename);
      
      if (!fileData || !fileData.filesha) {
        alert("Could not find file data for approval");
        return;
      }

      await approveFile(prNumber, filename, fileData.filesha);
      
      // Update approval status
      const updatedStatus = await checkFileApprovalStatus(prNumber, filename);
      setFileApprovalStatus(prev => ({
        ...prev,
        [filename]: updatedStatus
      }));

      setToastMessage(`File ${filename} has been approved!`);
      setShowToast(true);
    } catch (error) {
      console.error("Error approving file:", error);
      setError("Failed to approve file.");
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
      {prNumber && (
        <div className="mb-4">
          <Card>
            <Card.Header className="bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Reviewer Mode</strong> - PR #{prNumber}
                </div>
                <div>
                  <Button
                    variant={reviewerMode ? "warning" : "light"}
                    size="sm"
                    onClick={() => setReviewerMode(!reviewerMode)}
                  >
                    {reviewerMode ? "Exit Reviewer Mode" : "Enter Reviewer Mode"}
                  </Button>
                </div>
              </div>
            </Card.Header>
            {reviewerMode && (
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>File Review Status:</strong>
                    {contents && Object.keys(fileApprovalStatus).length > 0 ? (
                      <div className="mt-2">
                        {contents.map(file => {
                          const status = fileApprovalStatus[file.filename];
                          return (
                            <div key={file.filename} className="d-flex align-items-center mb-1">
                              <span className={`badge ${status?.approved ? 'bg-success' : 'bg-warning'} me-2`}>
                                {status?.approved ? '✓' : '○'}
                              </span>
                              <span className="text-truncate me-2" style={{ maxWidth: "400px" }}>
                                {file.filename}
                              </span>
                              {status?.approved && (
                                <small className="text-muted">
                                  (Approved by {status.reviewer} on {new Date(status.timestamp).toLocaleDateString()})
                                </small>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-muted ms-2">Loading file status...</span>
                    )}
                  </div>
                </div>
              </Card.Body>
            )}
          </Card>
        </div>
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
              return !passed.includes(key);
            });
          const card = filteredCards[currentCardIndex];
          const fileApprovalInfo = fileApprovalStatus[card?.filename];

          if (!card) {
            // Check if all files have been reviewed when there are no more cards
            const allFilesApproved = contents && contents.length > 0 && 
              contents.every(file => fileApprovalStatus[file.filename]?.approved);
            
            return (
              <Alert variant="success" className="text-center">
                <h4>🎉 Well done!</h4>
                <p>You have completed all available translations.</p>
                {reviewerMode && allFilesApproved && (
                  <div className="mt-3">
                    <Alert variant="info">
                      <strong>All files have been reviewed and approved!</strong>
                      <br />
                      The translation process is complete.
                    </Alert>
                  </div>
                )}
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
                    <div className="d-flex justify-content-between align-items-center">
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
                      {reviewerMode && fileApprovalInfo && (
                        <div>
                          {fileApprovalInfo.approved ? (
                            <span className="badge bg-success">
                              ✓ Approved by {fileApprovalInfo.reviewer}
                            </span>
                          ) : (
                            <span className="badge bg-warning">
                              ○ Pending Review
                            </span>
                          )}
                        </div>
                      )}
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
                            style={{ marginBottom: "8px", width: reviewerMode ? "25%" : "33%" }}
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
                            style={{ marginBottom: "8px", width: reviewerMode ? "25%" : "33%" }}
                          >
                            {isEditing
                              ? "Make Suggestion"
                              : !card.labelData.original
                              ? "Make Suggestion"
                              : "Edit"}
                          </Button>
                          <Button
                            variant="danger"
                            style={{ marginBottom: "8px", width: reviewerMode ? "25%" : "33%" }}
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
                          {reviewerMode && (
                            <Button
                              variant={fileApprovalInfo?.approved ? "outline-success" : "primary"}
                              style={{ marginBottom: "8px", width: "25%" }}
                              onClick={() => handleFileApproval(card.filename)}
                              disabled={fileApprovalInfo?.approved}
                            >
                              {fileApprovalInfo?.approved ? "Approved" : "Approve File"}
                            </Button>
                          )}
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
