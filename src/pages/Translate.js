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
import { FaLink } from "react-icons/fa";
import {
  sendUpdateRequest,
  fetchBranchDiff,
  fetchDiffChanged,
  fetchContent,
  sendUpdateFile,
  checkFileApprovalStatus,
  approveFile,
  getCurrentUser,
  fetchCommits,
  getReviewers,
  getPRComments,
} from "../utils/apiService";

import {
  createEmptyStore,
  getLinkedDataNQuads,
  extractSkosPrefLabel,
} from "../utils/linkedDataUtils";

const Translate = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewerModeFirstClicked, setReviewerModeFirstClicked] =
    useState(false);
  const [contents, setContents] = useState(null);
  const [modalShow, setModalShow] = useState(false);
  const [editableTerm, setEditableTerm] = useState({});
  const [translations, setTranslations] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selectedStatuses] = useState(["Conflict", "No Modified", "Modified"]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [prNumber, setPrNumber] = useState(null);
  const [fileApprovalStatus, setFileApprovalStatus] = useState({});
  const [reviewerMode, setReviewerMode] = useState(false);
  const [isEligibleReviewer, setIsEligibleReviewer] = useState(false);
  const [commits, setCommits] = useState([]);
  const [showLabelReviewModal, setShowLabelReviewModal] = useState(false);
  const [selectedFileForReview, setSelectedFileForReview] = useState(null);
  const [approvalDetails, setApprovalDetails] = useState({});
  const [isLoadingReviewer, setIsLoadingReviewer] = useState(false);
  const [disabledButtons, setDisabledButtons] = useState({});
  const [suggestionErrors, setSuggestionErrors] = useState({});
  const [cardHistory, setCardHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [preLabels, setPreLabels] = useState({}); // Store prelabel data for each URI

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

  // Load history from sessionStorage on component mount
  useEffect(() => {
    try {
      const history = JSON.parse(sessionStorage.getItem("cardHistory") || "[]");
      setCardHistory(history);
    } catch {
      setCardHistory([]);
    }
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
          // Get current user info
          let userInfo = null;
          try {
            userInfo = await getCurrentUser();
          } catch (error) {
            console.warn("Could not get current user info:", error);
          }

          // Get PR comments for approval details
          try {
            await getPRComments(pullNumber);
          } catch (error) {
            console.warn("Could not get PR comments:", error);
          }

          let reviewers = [];
          try {
            reviewers = await getReviewers();
          } catch (error) {
            console.warn("Could not get reviewers:", error);
          }

          if (userInfo && reviewers.includes(userInfo.login)) {
            setIsEligibleReviewer(true);
          }
        }

        try {
          await fetchContent("config.yml");
          console.log("Config loaded successfully");
        } catch (error) {
          console.warn("Config not available:", error);
        }

        // get the commits
        try {
          const commits = await fetchCommits();
          setCommits(commits);
          console.log("Commits loaded successfully");
          console.log("Commits:", commits);
        } catch (error) {
          console.warn("Commits not available:", error);
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

  const handleClickId = (id) => {
    setDisabledButtons((prevState) => ({
      ...prevState,
      [id]: true,
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

  const handleFileApproval = async (filename, lang, labelname) => {
    if (!prNumber) {
      alert("No PR found for approval");
      return;
    }

    try {
      // Get the SHA from the diff data
      const responseDiffChanged = await fetchDiffChanged();
      const { diffsData } = responseDiffChanged.data;
      const fileData = diffsData.find((diff) => diff.filename === filename);

      if (!fileData || !fileData.filesha) {
        alert("Could not find file data for approval");
        return;
      }

      console.log("Approving label:", labelname, "in file:", filename);
      let latest_commit_sha = commits.data[0].sha;

      await approveFile(prNumber, filename, latest_commit_sha, lang, labelname);

      // Update approval status for the specific file
      const updatedStatus = await checkFileApprovalStatus(prNumber, filename);

      // Get updated PR comments to refresh approval details
      const updatedComments = await getPRComments(prNumber);

      // Update approval details
      const fileApprovalDetails = {};
      updatedStatus.approvedLabels?.forEach((approvedItem) => {
        // Handle both legacy string format and new object format
        const labelName =
          typeof approvedItem === "string" ? approvedItem : approvedItem.label;

        if (typeof approvedItem === "object" && approvedItem.reviewer) {
          // Use the data from the new API response structure
          fileApprovalDetails[labelName] = {
            approver: approvedItem.reviewer,
            approvedAt: approvedItem.timestamp,
            commentUrl: approvedItem.comment_url,
          };
        } else {
          // Fallback to finding the comment manually (for legacy support)
          const approvalComment = updatedComments.find(
            (comment) =>
              comment.path === filename &&
              comment.body.trim().toLowerCase() ===
                `approved-${labelName}`.toLowerCase()
          );

          if (approvalComment) {
            fileApprovalDetails[labelName] = {
              approver: approvalComment.user.login,
              approvedAt: approvalComment.created_at,
              commentUrl: approvalComment.html_url,
            };
          }
        }
      });

      setApprovalDetails((prev) => ({
        ...prev,
        [filename]: fileApprovalDetails,
      }));

      setFileApprovalStatus((prev) => ({
        ...prev,
        [filename]: {
          approved: updatedStatus.approved,
          approvedLabels: (updatedStatus.approvedLabels || []).map((item) =>
            typeof item === "string" ? item : item.label
          ),
          unapprovedLabels: (updatedStatus.unapprovedLabels || []).map((item) =>
            typeof item === "string" ? item : item.label
          ),
        },
      }));

      setToastMessage(
        `Label "${labelname}" in file ${filename} has been approved!`
      );
      setShowToast(true);
    } catch (error) {
      console.error("Error approving file:", error);
      setError("Failed to approve file.");
    }
  };

  const navigateToFile = (filename) => {
    // In reviewer mode, show label review modal instead of navigating to first card
    if (reviewerMode) {
      setSelectedFileForReview(filename);
      setShowLabelReviewModal(true);
      return;
    }

    // Original navigation logic for non-reviewer mode
    // Generate all cards like in the render method
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

    // Filter cards by selected statuses and not in passed cards
    let passed = [];
    try {
      passed = JSON.parse(sessionStorage.getItem("passedCards") || "[]");
    } catch {
      passed = [];
    }

    const filteredCards = cards
      .filter((card) => selectedStatuses.includes(card.status))
      .filter((card) => {
        const key = `${card.filename}_-_${card.labelName}_-_${card.lang}`;
        return !passed.includes(key);
      })
      .filter((card) => isCardAvailableForNonReviewer(card));

    // Find the first card for the requested filename
    const targetCardIndex = filteredCards.findIndex(
      (card) => card.filename === filename
    );
    if (targetCardIndex !== -1) {
      setCurrentCardIndex(targetCardIndex);
    }
  };

  const isEmpty = (str) => {
    return !str || !/[a-zA-Z0-9]/.test(str);
  };

  // Helper function to fetch prelabel data for a card
  const fetchPrefLabel = async (uri) => {
    if (preLabels[uri]) {
      return; // Already fetched
    }

    try {
      let store = createEmptyStore();
      await getLinkedDataNQuads(uri, store);
      const prelabel = extractSkosPrefLabel(store, uri);
      if (prelabel) {
        setPreLabels((prev) => ({
          ...prev,
          [uri]: prelabel,
        }));
      }
    } catch (error) {
      console.error("Error fetching prelabel data:", error);
    }
  };

  // Helper function to add card to history
  const addToHistory = (card, action) => {
    const historyEntry = {
      id: `${card.filename}_-_${card.labelName}_-_${card.lang}`,
      filename: card.filename,
      labelName: card.labelName,
      lang: card.lang,
      action: action,
      timestamp: new Date().toISOString(),
      original: card.labelData.original,
    };

    // Update session storage for history
    let history = [];
    try {
      history = JSON.parse(sessionStorage.getItem("cardHistory") || "[]");
    } catch {
      history = [];
    }

    // Add to history if not already present or if action is different
    const existingIndex = history.findIndex(
      (item) => item.id === historyEntry.id
    );
    if (existingIndex === -1) {
      history.push(historyEntry);
    } else {
      // Update existing entry with new action and timestamp
      history[existingIndex] = {
        ...history[existingIndex],
        action,
        timestamp: historyEntry.timestamp,
      };
    }

    sessionStorage.setItem("cardHistory", JSON.stringify(history));
    setCardHistory(history);
  };

  // Helper function to get visited cards list
  const getVisitedCards = () => {
    try {
      return JSON.parse(sessionStorage.getItem("visitedCards") || "[]");
    } catch {
      return [];
    }
  };

  // Helper function to add card to visited list
  const addToVisited = (cardKey) => {
    const visited = getVisitedCards();
    if (!visited.includes(cardKey)) {
      visited.push(cardKey);
      sessionStorage.setItem("visitedCards", JSON.stringify(visited));
    }
  };

  // Helper function to check if a card should be shown to non-reviewers
  const isCardAvailableForNonReviewer = (card) => {
    // If in reviewer mode, show all cards
    if (reviewerMode) {
      return true;
    }

    // Check if this specific label is approved
    const fileApprovalInfo = fileApprovalStatus[card.filename];
    const isLabelApproved = fileApprovalInfo?.approvedLabels?.includes(
      card.labelName
    );

    // For non-reviewers, only show cards that are NOT approved
    return !isLabelApproved;
  };

  // Helper function to go to previous card
  const goToPrevCard = () => {
    if (currentCardIndex > 0) {
      const newIndex = currentCardIndex - 1;
      setCurrentCardIndex(newIndex);

      // Get the current cards list to find the previous card
      const cards = getAllCards(transformedData);
      const card = cards[newIndex];
      if (card) {
        const cardKey = `${card.filename}_-_${card.labelName}_-_${card.lang}`;
        addToVisited(cardKey);
        addToHistory(card, "viewed_previous");

        // Fetch prelabel data for the previous card
        fetchPrefLabel(card.uri);
      }
    }
  };

  // Helper function to get all available cards (including visited ones for navigation)
  const getAllCards = (data = transformedData) => {
    const cards = [];
    data.forEach((item) => {
      Object.entries(item.label[0]).forEach(([labelName, labelData]) => {
        Object.keys(labelData).forEach((lang) => {
          if (lang === "original" || lang === "status") return;
          cards.push({
            filename: item.filename,
            uri: item.uri,
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

    // Filter by selected statuses and reviewer access
    return cards
      .filter((card) => selectedStatuses.includes(card.status))
      .filter((card) => isCardAvailableForNonReviewer(card));
  };

  // Helper function to navigate to specific card by history item
  const navigateToHistoryCard = (historyItem) => {
    const cards = getAllCards(transformedData);
    const cardIndex = cards.findIndex(
      (card) =>
        `${card.filename}_-_${card.labelName}_-_${card.lang}` === historyItem.id
    );

    if (cardIndex !== -1) {
      setCurrentCardIndex(cardIndex);
      addToHistory(cards[cardIndex], "viewed_from_history");
      setShowHistoryModal(false);

      // Fetch prelabel data for the selected card
      fetchPrefLabel(cards[cardIndex].uri);
    }
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
      {prNumber && isEligibleReviewer && (
        <div className="mb-4">
          <Card>
            <Card.Header className="bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Reviewer Mode</strong> - PR #{prNumber}
                  {isLoadingReviewer && (
                    <Spinner animation="border" size="sm" />
                  )}
                </div>
                <div>
                  <Button
                    variant={reviewerMode ? "warning" : "light"}
                    size="sm"
                    onClick={async () => {
                      if (!reviewerMode && !reviewerModeFirstClicked) {
                        // First time entering reviewer mode, check all file statuses
                        setReviewerModeFirstClicked(true);
                        setIsLoadingReviewer(true);
                        const approvalStatusPromises = contents.map(
                          async (file) => {
                            try {
                              const approvalStatus =
                                await checkFileApprovalStatus(
                                  prNumber,
                                  file.filename
                                );
                              return {
                                filename: file.filename,
                                approved: approvalStatus.approved,
                                approvedLabels: (
                                  approvalStatus.approvedLabels || []
                                ).map((item) =>
                                  typeof item === "string" ? item : item.label
                                ),
                                unapprovedLabels: (
                                  approvalStatus.unapprovedLabels || []
                                ).map((item) =>
                                  typeof item === "string" ? item : item.label
                                ),
                                // Store raw approval data for processing approval details
                                rawApprovedLabels:
                                  approvalStatus.approvedLabels || [],
                              };
                            } catch (error) {
                              console.warn(
                                `Could not check approval status for ${file.filename}:`,
                                error
                              );
                              return {
                                filename: file.filename,
                                approved: false,
                                approvedLabels: [],
                                unapprovedLabels: [],
                                rawApprovedLabels: [],
                              };
                            }
                          }
                        );

                        let comments = [];
                        try {
                          comments = await getPRComments(prNumber);
                        } catch (error) {
                          console.warn("Could not get PR comments:", error);
                        }

                        try {
                          const approvalStatuses = await Promise.all(
                            approvalStatusPromises
                          );
                          const statusMap = {};
                          const approvalDetailsMap = {};

                          approvalStatuses.forEach((status) => {
                            statusMap[status.filename] = status;

                            const fileApprovalDetails = {};
                            // Use raw approval data to access metadata
                            status.rawApprovedLabels?.forEach(
                              (approvedItem) => {
                                // Handle both legacy string format and new object format
                                const labelName =
                                  typeof approvedItem === "string"
                                    ? approvedItem
                                    : approvedItem.label;

                                if (
                                  typeof approvedItem === "object" &&
                                  approvedItem.reviewer
                                ) {
                                  // Use the data from the new API response structure
                                  fileApprovalDetails[labelName] = {
                                    approver: approvedItem.reviewer,
                                    approvedAt: approvedItem.timestamp,
                                    commentUrl: approvedItem.comment_url,
                                  };
                                } else {
                                  // Fallback to finding the comment manually (for legacy support)
                                  const approvalComment = comments.find(
                                    (comment) =>
                                      comment.path === status.filename &&
                                      comment.body.trim().toLowerCase() ===
                                        `approved-${labelName}`.toLowerCase()
                                  );

                                  if (approvalComment) {
                                    fileApprovalDetails[labelName] = {
                                      approver: approvalComment.user.login,
                                      approvedAt: approvalComment.created_at,
                                      commentUrl: approvalComment.html_url,
                                    };
                                  }
                                }
                              }
                            );

                            approvalDetailsMap[status.filename] =
                              fileApprovalDetails;
                          });

                          setFileApprovalStatus(statusMap);
                          setApprovalDetails(approvalDetailsMap);
                        } catch (error) {
                          console.warn(
                            "Error checking file approval statuses:",
                            error
                          );
                        }
                      }
                      setReviewerMode(!reviewerMode);
                      setIsLoadingReviewer(false);
                    }}
                  >
                    {reviewerMode
                      ? "Exit Reviewer Mode"
                      : "Enter Reviewer Mode"}
                  </Button>
                </div>
              </div>
            </Card.Header>
            {reviewerMode && (
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div className="w-100">
                    <strong>File Review Status:</strong>
                    {contents && Object.keys(fileApprovalStatus).length > 0 ? (
                      <div className="mt-2">
                        {contents.map((file) => {
                          const status = fileApprovalStatus[file.filename];
                          const fileApprovalInfo =
                            approvalDetails[file.filename] || {};
                          const approvedCount =
                            status?.approvedLabels?.length || 0;
                          const unapprovedCount =
                            status?.unapprovedLabels?.length || 0;
                          const totalLabels = approvedCount + unapprovedCount;

                          // The pending review count are the labels whose value is not empty or "to be filled in"
                          const pendingCount = (() => {
                            const fileData = transformedData.find(
                              (data) => data.filename === file.filename
                            );
                            if (!fileData) return 0;
                            let count = 0;
                            Object.entries(fileData.label[0]).forEach(
                              ([labelName, labelData]) => {
                                // Only count unapproved labels
                                if (
                                  status?.unapprovedLabels?.includes(labelName)
                                ) {
                                  // Check if any language translation is non-empty and not "to be filled in"
                                  const hasTranslation = Object.entries(
                                    labelData
                                  ).some(
                                    ([lang, value]) =>
                                      lang !== "original" &&
                                      lang !== "status" &&
                                      value &&
                                      value.trim() !== "" &&
                                      value !== "to be filled in"
                                  );
                                  if (hasTranslation) count++;
                                }
                              }
                            );
                            return count;
                          })();

                          return (
                            <div
                              key={file.filename}
                              className="mb-2 p-2 border rounded"
                            >
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center">
                                  <span
                                    className={`badge ${
                                      status?.approved
                                        ? "bg-success"
                                        : "bg-warning"
                                    } me-2`}
                                  >
                                    {status?.approved ? "✓" : "○"}
                                  </span>
                                  <span
                                    className="text-truncate me-2 text-primary fw-bold"
                                    style={{
                                      maxWidth: "300px",
                                      cursor: "pointer",
                                      textDecoration: "underline",
                                    }}
                                    onClick={() =>
                                      navigateToFile(file.filename)
                                    }
                                    title="Click to review labels in this file"
                                  >
                                    {file.filename}
                                  </span>
                                </div>
                                <div className="text-end">
                                  <div className="small text-muted">
                                    Labels: {approvedCount}/{totalLabels}{" "}
                                    approved
                                  </div>
                                  {pendingCount > 0 && (
                                    <div className="small text-warning">
                                      {pendingCount} pending review
                                    </div>
                                  )}
                                </div>
                              </div>
                              {(status?.approvedLabels?.length > 0 ||
                                status?.unapprovedLabels?.length > 0) && (
                                <div className="mt-2">
                                  {status?.approvedLabels?.length > 0 && (
                                    <div className="mb-1">
                                      <small className="text-success fw-bold">
                                        Approved:{" "}
                                      </small>
                                      <div className="ms-2">
                                        {status.approvedLabels.map(
                                          (labelName) => {
                                            const approvalInfo =
                                              fileApprovalInfo[labelName];
                                            return (
                                              <div
                                                key={labelName}
                                                className="mb-1"
                                              >
                                                <span className="small text-muted">
                                                  {labelName}
                                                </span>
                                                {approvalInfo && (
                                                  <span className="small text-muted ms-2">
                                                    (by {approvalInfo.approver}{" "}
                                                    on{" "}
                                                    {new Date(
                                                      approvalInfo.approvedAt
                                                    ).toLocaleDateString()}
                                                    )
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          }
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {status?.unapprovedLabels?.length > 0 && (
                                    <div>
                                      <small className="text-warning fw-bold">
                                        Pending:{" "}
                                      </small>
                                      <small className="text-muted">
                                        {status.unapprovedLabels.join(", ")}
                                      </small>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-muted ms-2">
                        Loading file status...
                      </span>
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

          // For navigation purposes, we include all cards (including visited ones)
          // but for displaying "new" cards, we still respect the passed cards filter
          const allCards = cards
            .filter((card) => selectedStatuses.includes(card.status))
            .filter((card) => isCardAvailableForNonReviewer(card));

          let passed = [];
          try {
            passed = JSON.parse(sessionStorage.getItem("passedCards") || "[]");
          } catch {
            passed = [];
          }
          console.log("passed", passed);

          // For determining the "active" cards for auto-navigation, filter out passed ones
          const unvisitedCards = allCards.filter((card) => {
            const key = `${card.filename}_-_${card.labelName}_-_${card.lang}`;
            return !passed.includes(key);
          });

          // Use allCards for navigation but default to showing unvisited ones
          const filteredCards = allCards;

          // Ensure currentCardIndex points to a valid card
          if (
            filteredCards.length > 0 &&
            currentCardIndex >= filteredCards.length
          ) {
            setCurrentCardIndex(0);
          }

          // If we're in the middle of unvisited cards, try to show those first
          // Otherwise, allow navigation through all cards
          let displayCardIndex = currentCardIndex;
          if (
            unvisitedCards.length > 0 &&
            currentCardIndex < unvisitedCards.length
          ) {
            // Show unvisited cards when available
            const currentCard = filteredCards[currentCardIndex];
            const isCurrentCardUnvisited = unvisitedCards.some(
              (card) =>
                card.filename === currentCard?.filename &&
                card.labelName === currentCard?.labelName &&
                card.lang === currentCard?.lang
            );
            if (!isCurrentCardUnvisited && unvisitedCards.length > 0) {
              // Jump to first unvisited card if current is visited
              const firstUnvisitedIndex = filteredCards.findIndex((card) =>
                unvisitedCards.some(
                  (unvisited) =>
                    unvisited.filename === card.filename &&
                    unvisited.labelName === card.labelName &&
                    unvisited.lang === card.lang
                )
              );
              if (firstUnvisitedIndex !== -1) {
                displayCardIndex = firstUnvisitedIndex;
                setCurrentCardIndex(firstUnvisitedIndex);
              }
            }
          }

          const card = filteredCards[displayCardIndex];
          const fileApprovalInfo = fileApprovalStatus[card?.filename];

          // Track current card when displayed (only once per card per session)
          if (card) {
            // Fetch prelabel data for the current card
            fetchPrefLabel(card.uri);

            const cardKey = `${card.filename}_-_${card.labelName}_-_${card.lang}`;
            const visitedCards = getVisitedCards();
            if (!visitedCards.includes(cardKey)) {
              addToVisited(cardKey);
              addToHistory(card, "viewed");
            }
          }

          // Check if this specific label is approved
          const isLabelApproved = fileApprovalInfo?.approvedLabels?.includes(
            card?.labelName
          );

          if (!card) {
            // Check if all files have been reviewed when there are no more cards
            const allFilesApproved =
              contents &&
              contents.length > 0 &&
              contents.every(
                (file) => fileApprovalStatus[file.filename]?.approved
              );

            return (
              <Alert variant="success" className="text-center">
                <h4>🎉 Well done!</h4>
                <p>You have completed all available translations.</p>
                {reviewerMode && allFilesApproved && (
                  <div className="mt-3">
                    <Alert variant="info">
                      <strong>
                        All files have been reviewed and approved!
                      </strong>
                      <br />
                      The translation process is complete.
                    </Alert>
                  </div>
                )}
                {prNumber && isEligibleReviewer && !reviewerMode && (
                  <Alert variant="warning" className="mt-3">
                    <strong>Some files need reviewing.</strong> Enter Reviewer
                    Mode to review and approve translations.
                  </Alert>
                )}
                {reviewerMode && (
                  <Alert variant="info" className="mt-3">
                    <strong>Reviewer Mode:</strong> Please review and approve
                    the pending changes.
                  </Alert>
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

            // Add to history and visited cards
            addToVisited(key);
            addToHistory(card, "confirmed");

            setEditableTerm((prev) => ({
              ...prev,
              [key]: false,
            }));

            // Navigate to next available card
            const nextIndex = currentCardIndex + 1;
            if (nextIndex < filteredCards.length) {
              setCurrentCardIndex(nextIndex);
              const nextCard = filteredCards[nextIndex];
              // Fetch prelabel data for the next card
              fetchPrefLabel(nextCard.uri);
              const nextKey = `${nextCard.filename}_-_${nextCard.labelName}_-_${nextCard.lang}`;
              addToVisited(nextKey);
              addToHistory(nextCard, "viewed");
            }
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
                        {preLabels[card.uri] ? (
                          <a
                            href={card.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "none", color: "inherit" }}
                          >
                            <FaLink /> <b>{preLabels[card.uri]}</b>
                            {" | "}
                          </a>
                        ) : (
                          <a
                            href={card.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FaLink />
                          </a>
                        )}
                        <strong>{card.lang}: </strong>
                        {card.labelName}
                      </div>
                      {reviewerMode && fileApprovalInfo && (
                        <div>
                          {isLabelApproved ? (
                            <span className="badge bg-success">
                              ✓ Label Approved
                            </span>
                          ) : (
                            <span className="badge bg-warning">
                              ○ Label Pending Review
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
                          {suggestionErrors[
                            `${card.filename}-${card.labelName}-${card.lang}`
                          ] && (
                            <Alert variant="warning" className="mt-2">
                              Suggestions are not working at the moment. Please
                              fill in the translations manually.
                            </Alert>
                          )}
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
                              if (isEditing) {
                                await update(
                                  card.filename,
                                  card.labelName,
                                  card.lang
                                );
                              }
                              goToNextCard();
                            }}
                            disabled={
                              isEditing &&
                              !isFieldModified(
                                card.filename,
                                card.labelName,
                                card.lang
                              )
                            }
                            style={{
                              marginBottom: "8px",
                              width: reviewerMode ? "25%" : "33%",
                            }}
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
                                  // Clear any previous suggestion errors for this card
                                  setSuggestionErrors((prev) => ({
                                    ...prev,
                                    [`${card.filename}-${card.labelName}-${card.lang}`]: false,
                                  }));
                                } catch (error) {
                                  setEditableTerm((prev) => ({
                                    ...prev,
                                    [`${card.filename}-${card.labelName}-${card.lang}`]: true,
                                  }));
                                  setSuggestionErrors((prev) => ({
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
                              isEditing === "suggestion-done" ||
                              suggestionErrors[
                                `${card.filename}-${card.labelName}-${card.lang}`
                              ]
                            }
                            style={{
                              marginBottom: "8px",
                              width: reviewerMode ? "25%" : "33%",
                            }}
                          >
                            {isEditing
                              ? "Make Suggestion"
                              : !card.labelData.original
                              ? "Make Suggestion"
                              : "Edit"}
                          </Button>
                          <Button
                            variant="danger"
                            style={{
                              marginBottom: "8px",
                              width: reviewerMode ? "25%" : "33%",
                            }}
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
                              variant={
                                isLabelApproved ? "outline-success" : "primary"
                              }
                              style={{ marginBottom: "8px", width: "25%" }}
                              onClick={() =>
                                handleFileApproval(
                                  card.filename,
                                  card.lang,
                                  card.labelName
                                )
                              }
                              disabled={isLabelApproved}
                            >
                              {isLabelApproved
                                ? "Label Approved"
                                : "Approve Label"}
                            </Button>
                          )}
                        </div>
                      </Col>
                    </Row>
                    {/* Navigation buttons row */}
                    <Row className="mb-3">
                      <Col className="mt-2">
                        <div className="d-flex justify-content-center gap-2">
                          <Button
                            variant="outline-primary"
                            onClick={goToPrevCard}
                            disabled={currentCardIndex === 0}
                            style={{ width: "120px" }}
                          >
                            ← Previous
                          </Button>
                          <Button
                            variant="outline-info"
                            onClick={() => setShowHistoryModal(true)}
                            style={{ width: "120px" }}
                          >
                            📋 History
                          </Button>
                          <div className="text-muted small align-self-center mx-2">
                            Card {currentCardIndex + 1} of{" "}
                            {filteredCards.length}
                          </div>
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

      {/* Label Review Modal */}
      {showLabelReviewModal && selectedFileForReview && (
        <Modal
          show={showLabelReviewModal}
          onHide={() => {
            setShowLabelReviewModal(false);
            setSelectedFileForReview(null);
          }}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Review Labels - {selectedFileForReview}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {(() => {
              const fileStatus = fileApprovalStatus[selectedFileForReview];
              const fileApprovalInfo =
                approvalDetails[selectedFileForReview] || {};
              const fileData = transformedData.find(
                (data) => data.filename === selectedFileForReview
              );

              if (!fileData) {
                return <div>No data found for this file.</div>;
              }

              // Filter out unapproved labels that have empty/undefined values to avoid confusion
              const filteredUnapprovedLabels =
                fileStatus?.unapprovedLabels?.filter((labelName) => {
                  const labelData = fileData.label[0][labelName];
                  if (!labelData) return false;

                  // Check if any language has a non-empty value
                  const translations = Object.entries(labelData).filter(
                    ([key]) => key !== "original" && key !== "status"
                  );

                  return translations.some(
                    ([lang, translation]) =>
                      translation &&
                      translation.trim() !== "" &&
                      translation !== "to be filled in"
                  );
                }) || [];

              return (
                <div>
                  <div className="mb-3">
                    <strong>File: </strong>
                    <span className="text-primary">
                      {selectedFileForReview}
                    </span>
                  </div>

                  {filteredUnapprovedLabels.length > 0 && (
                    <div className="mb-4">
                      <h6 className="text-warning">
                        🔍 Labels Pending Review:
                      </h6>
                      <div className="list-group">
                        {filteredUnapprovedLabels.map((labelName) => {
                          const labelData = fileData.label[0][labelName];
                          if (!labelData) return null;

                          // Get all language translations for this label (excluding empty ones)
                          const translations = Object.entries(labelData).filter(
                            ([key, value]) =>
                              key !== "original" &&
                              key !== "status" &&
                              value &&
                              value.trim() !== "" &&
                              value !== "to be filled in"
                          );

                          return (
                            <div key={labelName} className="list-group-item">
                              <div className="d-flex justify-content-between align-items-start">
                                <div className="flex-grow-1">
                                  <h6 className="mb-1 text-dark">
                                    {labelName}
                                  </h6>
                                  <p className="mb-2 text-muted small">
                                    <strong>Original:</strong>{" "}
                                    {labelData.original}
                                  </p>
                                  <div className="row">
                                    {translations.map(([lang, translation]) => (
                                      <div key={lang} className="col-md-6 mb-2">
                                        <small>
                                          <strong>{lang}:</strong> {translation}
                                        </small>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="ms-3">
                                  {translations.map(([lang]) => (
                                    <Button
                                      key={lang}
                                      id={`approve-${lang}-${labelName}-${selectedFileForReview}`}
                                      variant="outline-primary"
                                      size="sm"
                                      className="me-1 mb-1"
                                      disabled={
                                        disabledButtons[
                                          `approve-${lang}-${labelName}-${selectedFileForReview}`
                                        ]
                                      }
                                      onClick={() => {
                                        handleClickId(
                                          `approve-${lang}-${labelName}-${selectedFileForReview}`
                                        );
                                        handleFileApproval(
                                          selectedFileForReview,
                                          lang,
                                          labelName
                                        );
                                      }}
                                    >
                                      Approve {lang}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {fileStatus?.approvedLabels?.length > 0 && (
                    <div className="mb-3">
                      <h6 className="text-success">✅ Approved Labels:</h6>
                      <div className="list-group">
                        {fileStatus.approvedLabels.map((labelName) => {
                          const approvalInfo = fileApprovalInfo[labelName];
                          return (
                            <div
                              key={labelName}
                              className="list-group-item list-group-item-success"
                            >
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center">
                                  <span className="badge bg-success me-2">
                                    ✓
                                  </span>
                                  <span className="fw-bold">{labelName}</span>
                                </div>
                                {approvalInfo && (
                                  <div className="text-end">
                                    <div className="small text-muted">
                                      <strong>Approved by:</strong>{" "}
                                      {approvalInfo.approver}
                                    </div>
                                    <div className="small text-muted">
                                      <strong>Date:</strong>{" "}
                                      {new Date(
                                        approvalInfo.approvedAt
                                      ).toLocaleDateString()}{" "}
                                      at{" "}
                                      {new Date(
                                        approvalInfo.approvedAt
                                      ).toLocaleTimeString()}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {fileStatus?.approved && (
                    <Alert variant="success" className="mt-3">
                      <strong>
                        🎉 All labels in this file have been approved!
                      </strong>
                    </Alert>
                  )}
                </div>
              );
            })()}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowLabelReviewModal(false);
                setSelectedFileForReview(null);
              }}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* History Modal */}
      <Modal
        show={showHistoryModal}
        onHide={() => setShowHistoryModal(false)}
        size="lg"
        aria-labelledby="history-modal-title"
      >
        <Modal.Header closeButton>
          <Modal.Title id="history-modal-title">Session History</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {cardHistory.length === 0 ? (
            <Alert variant="info">
              No history available yet. Start working on cards to build your
              session history.
            </Alert>
          ) : (
            <div>
              <p className="text-muted mb-3">
                Click on any item to navigate back to that card.
              </p>
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {cardHistory
                  .slice()
                  .reverse()
                  .map((item, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      className="card mb-2 cursor-pointer"
                      style={{ cursor: "pointer" }}
                      onClick={() => navigateToHistoryCard(item)}
                    >
                      <div className="card-body py-2 px-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <h6 className="mb-1 text-primary">
                              {item.labelName} ({item.lang})
                            </h6>
                            <p className="mb-1 small text-muted">
                              <strong>File:</strong>{" "}
                              {item.filename.split("/").pop()}
                            </p>
                            {item.original && (
                              <p className="mb-1 small text-muted">
                                <strong>Original:</strong>{" "}
                                {item.original.length > 50
                                  ? item.original.substring(0, 50) + "..."
                                  : item.original}
                              </p>
                            )}
                          </div>
                          <div className="text-end">
                            <span
                              className={`badge ${
                                item.action === "confirmed"
                                  ? "bg-success"
                                  : item.action === "viewed_from_history"
                                  ? "bg-info"
                                  : item.action === "viewed_previous"
                                  ? "bg-warning"
                                  : "bg-secondary"
                              }`}
                            >
                              {item.action === "confirmed"
                                ? "✓ Confirmed"
                                : item.action === "viewed_from_history"
                                ? "📋 From History"
                                : item.action === "viewed_previous"
                                ? "← Previous"
                                : "👁 Viewed"}
                            </span>
                            <div className="small text-muted mt-1">
                              {new Date(item.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowHistoryModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Translate;
