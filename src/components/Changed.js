import React, { useEffect, useState, useCallback } from "react";
import { Modal, Button, Spinner, Alert, Form, Table } from "react-bootstrap";
import axios from "axios";
import DiffViewer from "react-diff-viewer-continued";
import { formatInTimeZone } from "date-fns-tz";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, getReviewers } from "../utils/apiService";
import "bootstrap/dist/css/bootstrap.min.css";

const Changed = () => {
  const [diffs, setDiffs] = useState([]);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [overwrite, setOverwrite] = useState({});
  const [upToDate, setUpToDate] = useState(false);
  const [emptyField, setEmptyField] = useState({});
  const [modalShow, setModalShow] = useState(false);
  const [readyToMerge, setReadyToMerge] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [emptyFieldFile, setEmptyFieldFile] = useState({});
  const [upToDateMessage, setUpToDateMessage] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showDiffSection, setShowDiffSection] = useState(false);
  const [isEligibleReviewer, setIsEligibleReviewer] = useState(false);
  const [reviewerCheckLoading, setReviewerCheckLoading] = useState(true);
  const navigate = useNavigate();

  const isEmpty = (str) => {
    return !str || !/[a-zA-Z0-9]/.test(str) || str === "to be filled in";
  };

  const emptyCounts = useCallback(async () => {
    const responseDiff = await axios.get(
      `${process.env.REACT_APP_BACK_URL}/api/github/diff`,
      {
        params: {
          repo: process.env.REACT_APP_REPO,
          branch: sessionStorage.getItem("branch"),
        },
        headers: { Authorization: sessionStorage.getItem("github_token") },
      }
    );
    const contents = responseDiff.data;
    console.log(contents);

    //filter out files from .github folder
    const filteredContents = contents.filter(
      (file) =>
        !file.filename.startsWith(".github/") &&
        !file.filename.startsWith("config.yml")
    );

    console.log("Filtered contents:", filteredContents);

    const translationCounts = {};
    const fileCounts = {};
    filteredContents.forEach((file) => {
      const firstInFile = {};

      file.content.labels.forEach((label) => {
        label.translations.forEach((translation) => {
          Object.entries(translation).forEach(([lang, value]) => {
            if (isEmpty(value)) {
              if (!translationCounts[lang]) {
                translationCounts[lang] = 0;
                fileCounts[lang] = 0;
              }
              translationCounts[lang]++;
              if (!firstInFile[lang]) {
                firstInFile[lang] = true;
                fileCounts[lang]++;
              }
            }
          });
        });
      });
    });

    setEmptyField(translationCounts);
    setEmptyFieldFile(fileCounts);
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem("github_token")) {
      navigate("/");
    }
    const branch = sessionStorage.getItem("branch");
    if (!branch) {
      navigate("/branches");
    }

    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BACK_URL}/api/github/changed`,
          {
            params: {
              repo: process.env.REACT_APP_REPO,
              branch,
            },
            headers: {
              Authorization: sessionStorage.getItem("github_token"),
            },
          }
        );
        const responseConflicts = await axios.get(
          `${process.env.REACT_APP_BACK_URL}/api/github/conflicts`,
          {
            params: {
              repo: process.env.REACT_APP_REPO,
              branch,
            },
            headers: {
              Authorization: sessionStorage.getItem("github_token"),
            },
          }
        );
        setConflicts(responseConflicts.data);

        if (response.data.compare) {
          setUpToDate(true);
          setUpToDateMessage(response.data.message);
        }
        const { diffsData, commentsData } = response.data;

        emptyCounts();

        setDiffs(diffsData);
        setComments(commentsData);
        setLoading(false);
        setError(null);
      } catch (error) {
        console.error(
          "Error while retrieving files from pull request and conflicts:",
          error
        );
        setLoading(false);
        setError(
          "Error while retrieving files from pull request and conflicts."
        );
      }
    };

    fetchData();
  }, [emptyCounts, navigate]);

  // Check if user is an eligible reviewer
  useEffect(() => {
    const checkReviewerStatus = async () => {
      try {
        setReviewerCheckLoading(true);
        
        let userInfo = null;
        try {
          userInfo = await getCurrentUser();
        } catch (error) {
          console.warn("Could not get user info:", error);
        }

        let reviewers = [];
        try {
          reviewers = await getReviewers();
        } catch (error) {
          console.warn("Could not get reviewers:", error);
        }

        if (userInfo && reviewers.includes(userInfo.login)) {
          setIsEligibleReviewer(true);
        } else {
          setIsEligibleReviewer(false);
        }
      } catch (error) {
        console.warn("Error checking reviewer status:", error);
        setIsEligibleReviewer(false);
      } finally {
        setReviewerCheckLoading(false);
      }
    };

    if (sessionStorage.getItem("github_token")) {
      checkReviewerStatus();
    } else {
      setReviewerCheckLoading(false);
    }
  }, []);

  if (loading || reviewerCheckLoading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "85vh" }}
      >
        <Spinner animation="border" />
      </div>
    );
  }

  // Check if user is an eligible reviewer
  if (!isEligibleReviewer) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Alert variant="warning">
          <Alert.Heading>Access Restricted</Alert.Heading>
          <p>
            Only eligible reviewers can access the Changed page since it contains merge functionality.
            Please contact an administrator if you believe you should have reviewer access.
          </p>
        </Alert>
      </div>
    );
  }

  if (upToDate) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Alert variant="success">{upToDateMessage}</Alert>
      </div>
    );
  }
  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Alert variant="danger">{error}</Alert>
      </div>
    );
  }

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleLineNumberClick = (lineId, event, filename) => {
    // console.log(lineId)
    setSelectedLine(lineId);
    setSelectedFile(filename);
    // setShowCommentForm(true);
  };

  const merge = async () => {
    try {
      await axios.put(
        `${process.env.REACT_APP_BACK_URL}/api/github/merge`,
        {
          repo: process.env.REACT_APP_REPO,
          branch: sessionStorage.getItem("branch"),
        },
        {
          headers: {
            Authorization: sessionStorage.getItem("github_token"),
          },
        }
      );
      setError(null);
      sessionStorage.removeItem("branch");
      window.location.reload();
    } catch (error) {
      console.log("Error during merge :", error);
      setError("Error during merge.");
    }
    // emptyCounts()
  };

  const overwritefun = async () => {
    let totalConflicts = 0;
    let totalOverwritten = 0;
    let errorList = [];
    let completedOverwrites = 0;

    setModal(
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "50vh" }}
      >
        <Spinner animation="border" />
      </div>
    );
    setModalShow(true);

    Object.entries(overwrite).forEach(([filename, item1]) => {
      Object.entries(item1).forEach(([label, item2]) => {
        Object.entries(item2).forEach(([language, val]) => {
          if (val) {
            totalConflicts++;
          }
        });
      });
    });

    for (const [filename, item1] of Object.entries(overwrite)) {
      for (const [label, item2] of Object.entries(item1)) {
        for (const [language, val] of Object.entries(item2)) {
          if (val) {
            totalOverwritten++;
            const fileConflict = conflicts.find(
              ({ filename: conflictFile }) => conflictFile === filename
            );
            const conflict = fileConflict?.conflicts.find(
              ({ label: conflictLabel, language: conflictLanguage }) =>
                conflictLabel === label && conflictLanguage === language
            );
            if (conflict) {
              const translations = {
                [conflict.label]: {
                  [conflict.language]: conflict.syncValue,
                },
              };

              try {
                await axios.put(
                  `${process.env.REACT_APP_BACK_URL}/api/github/update`,
                  {
                    repo: process.env.REACT_APP_REPO,
                    translations,
                    filename,
                    branch: sessionStorage.getItem("branch"),
                  },
                  {
                    headers: {
                      Authorization: sessionStorage.getItem("github_token"),
                    },
                  }
                );

                completedOverwrites++;
                setModal(
                  <div className="d-flex justify-content-center align-items-center">
                    <div>
                      Overwriting {completedOverwrites} of {totalConflicts}{" "}
                      conflicts...
                    </div>
                    <Spinner animation="border" className="ml-2" />
                  </div>
                );
              } catch (error) {
                errorList.push(
                  `Error updating ${filename} for label ${label} and language ${language}: ${error.message}`
                );
              }
            }
          }
        }
      }
    }

    if (errorList.length > 0) {
      setModal(
        <div>
          <div className="d-flex justify-content-center align-items-center text-danger mb-3">
            Some errors occurred:
          </div>
          <ul className="text-danger">
            {errorList.map((err, index) => (
              <li key={index}>{err}</li>
            ))}
          </ul>
          <div className="d-flex justify-content-center align-items-center">
            You have overwritten {totalOverwritten} fields out of{" "}
            {totalConflicts} conflicts
          </div>
        </div>
      );
    } else {
      setModal(
        <div className="d-flex justify-content-center align-items-center">
          You have overwritten {totalOverwritten} fields out of {totalConflicts}{" "}
          conflicts with no errors.
        </div>
      );
      setReadyToMerge(true);
    }

    emptyCounts();
  };

  const selectAllColumn = (action) => {
    setOverwrite((prev) => {
      const updatedOverwrite = { ...prev };

      conflicts.forEach((item) => {
        item.conflicts.forEach((conflict) => {
          if (!updatedOverwrite[item.filename]) {
            updatedOverwrite[item.filename] = {};
          }
          if (!updatedOverwrite[item.filename][conflict.label]) {
            updatedOverwrite[item.filename][conflict.label] = {};
          }
          updatedOverwrite[item.filename][conflict.label][conflict.language] =
            action === "overwrite";
        });
      });
      return updatedOverwrite;
    });
  };

  const radioButton = (val, item, conflict) => {
    setOverwrite((prev) => ({
      ...prev,
      [item.filename]: {
        ...prev[item.filename],
        [conflict.label]: {
          ...prev[item.filename]?.[conflict.label],
          [conflict.language]: val,
        },
      },
    }));
  };
  const allConflictsResolved = () => {
    for (const item of conflicts) {
      for (const conflict of item.conflicts) {
        if (
          overwrite[item.filename]?.[conflict.label]?.[conflict.language] ===
          undefined
        ) {
          return false;
        }
      }
    }
    return true;
  };

  const closeModal = async () => {
    const responseConflicts = await axios.get(
      `${process.env.REACT_APP_BACK_URL}/api/github/conflicts`,
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
    setConflicts(responseConflicts.data);
    setModalShow(false);
  };

  // console.log(conflicts);
  return (
    <div className="container my-4">
      <div className="mb-4">
        {Object.keys(emptyField).length !== 0 ? (
          <>
            <h2>Empty Field</h2>
            <ul className="list-unstyled">
              {Object.entries(emptyField).map(([lang, count]) => (
                <li key={lang}>
                  <strong>{lang}:</strong> {count} fields in{" "}
                  {emptyFieldFile[lang]} files
                </li>
              ))}
            </ul>
          </>
        ) : (
          <h2>No Empty Field</h2>
        )}
      </div>

      <h2>Conflicts</h2>
      {conflicts.length > 0 ? (
        <Table
          bordered
          responsive="lg"
          className="text-center m-auto"
          style={{ width: "auto" }}
        >
          <thead className="thead-dark">
            <tr>
              <th>Label</th>
              <th>Language</th>
              <th style={{ width: "25vw" }}>Remote Value</th>
              <th style={{ width: "25vw" }}>
                {" "}
                Local ({sessionStorage.getItem("branch")}) Value
              </th>
              <th>
                Choose remote value
                <br />
                <Button
                  variant="primary"
                  onClick={() => selectAllColumn("overwrite")}
                >
                  Select All
                </Button>
              </th>
              <th>
                Ignore conflict
                <br />
                <Button
                  variant="primary"
                  onClick={() => selectAllColumn("save")}
                >
                  Select All
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {conflicts.map((item) => (
              <>
                {item.conflicts.map((conflict) => (
                  <tr key={conflict.label + conflict.language}>
                    <td>{conflict.label}</td>
                    <td>{conflict.language}</td>
                    <td>{conflict.syncValue}</td>
                    <td>{conflict.branchValue}</td>
                    <td>
                      <Form.Check
                        type="radio"
                        name={`overwrite-${item.filename}-${conflict.label}-${conflict.language}`}
                        value="overwrite"
                        checked={
                          overwrite[item.filename]?.[conflict.label]?.[
                            conflict.language
                          ] === true
                        }
                        onChange={() => {
                          radioButton(true, item, conflict);
                        }}
                      />
                    </td>
                    <td>
                      <Form.Check
                        type="radio"
                        name={`overwrite-${item.filename}-${conflict.label}-${conflict.language}`}
                        value="save"
                        checked={
                          overwrite[item.filename]?.[conflict.label]?.[
                            conflict.language
                          ] === false
                        }
                        onChange={() => {
                          radioButton(false, item, conflict);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </>
            ))}
            <tr>
              <td colSpan={6}>
                <Button
                  variant="success"
                  onClick={() => overwritefun()}
                  className="w-100"
                  disabled={!allConflictsResolved()}
                >
                  Apply
                </Button>
              </td>
            </tr>
          </tbody>
        </Table>
      ) : (
        <>
          <h3>No Conflict</h3>
          <Button
            variant="primary"
            onClick={() => merge()}
            disabled={Object.keys(emptyField).length !== 0}
            className="w-100"
          >
            Merge
          </Button>
        </>
      )}

      <Modal
        show={modalShow}
        onHide={() => setModalShow(false)}
        size="lg"
        backdrop="static"
        centered
        className="h-100"
      >
        <Modal.Header>
          {/* <Modal.Title>Modal heading</Modal.Title> */}
        </Modal.Header>
        <Modal.Body>{modal}</Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={() => merge()}
            disabled={!(Object.keys(emptyField).length === 0 && readyToMerge)}
          >
            Merge
          </Button>
          <Button variant="secondary" onClick={() => closeModal()}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <h2 className="mt-4">
        <Button
          variant="info"
          onClick={() => setShowDiffSection((prev) => !prev)}
          className="w-100"
        >
          {showDiffSection
            ? "Hide Diff with main branch"
            : "Show Diff with main branch"}
        </Button>
      </h2>

      {showDiffSection && (
        <div>
          {diffs.map((fileDiff, index) => (
            <div key={index} className="my-3">
              <h3>{fileDiff.filename}</h3>
              <DiffViewer
                oldValue={fileDiff.before}
                newValue={fileDiff.after}
                splitView={false}
                showDiffOnly={true}
                onLineNumberClick={(lineId, event) =>
                  handleLineNumberClick(lineId, event, fileDiff.filename)
                }
              />
              {comments
                .filter((comment) => comment.path === fileDiff.filename)
                .map((comment, commentIndex) => {
                  const formattedDate = formatInTimeZone(
                    comment.created_at,
                    userTimeZone,
                    "dd/MM/yyyy HH:mm:ss"
                  );

                  return (
                    <div key={commentIndex}>
                      <strong>
                        Comment on line {comment.line} at {formattedDate}:
                      </strong>{" "}
                      {comment.body}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      )}

      {showCommentForm && (
        <div
          className="position-fixed w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: "rgba(0, 0, 0, 0.5)" }}
        >
          <div className="bg-white p-4 rounded">
            <h3>
              Add a comment for line {selectedLine} in file {selectedFile}
            </h3>
            <Form.Control
              as="textarea"
              placeholder="Enter your comment"
              rows={3}
            />
            <div className="mt-2">
              <Button
                variant="secondary"
                onClick={() => setShowCommentForm(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" className="ml-2">
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Changed;
