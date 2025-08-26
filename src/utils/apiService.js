import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_BACK_URL;
const REPO = process.env.REACT_APP_REPO;

export const fetchBranches = async (token) => {
  const response = await axios.get(`${API_BASE_URL}/api/github/branches`, {
    params: { repo: REPO },
    headers: { Authorization: token },
  });
  return response.data;
};

export const fetchBranchDiff = async (token, branch, extra_headers) => {
  const response = await axios.get(`${API_BASE_URL}/api/github/diff`, {
    params: { repo: REPO, branch: branch },
    headers: { Authorization: token, ...extra_headers },
  });
  return response.data;
};

export const sendUpdateRequest = async (beforeValue, afterValue) => {
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

export const fetchDiffChanged = async () => {
  const response = await axios.get(
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
  return response;
};

export const fetchContent = async (path) => {
  const response = await axios.get(
    `${process.env.REACT_APP_BACK_URL}/api/github/content`,
    {
      params: {
        repo: process.env.REACT_APP_REPO,
        path: path,
      },
      headers: {
        Authorization: sessionStorage.getItem("github_token"),
      },
    }
  );
  return response;
};

export const sendUpdateFile = async (filename, translation) => {
  await axios.put(
    `${process.env.REACT_APP_BACK_URL}/api/github/update`,
    {
      repo: process.env.REACT_APP_REPO,
      translations: translation,
      filename: filename,
      branch: sessionStorage.getItem("branch"),
    },
    {
      headers: {
        Authorization: sessionStorage.getItem("github_token"),
      },
    }
  );
};

// Reviewer functionality
export const checkFileApprovalStatus = async (prNumber, filePath) => {
  const response = await axios.get(
    `${API_BASE_URL}/api/github/pr/${prNumber}/file/${encodeURIComponent(filePath)}/approved`,
    {
      params: { repo: REPO },
      headers: { Authorization: sessionStorage.getItem("github_token") },
    }
  );
  return response.data;
};

export const approveFile = async (prNumber, filePath, sha) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/github/pr/${prNumber}/file/${encodeURIComponent(filePath)}/approve`,
    {
      repo: REPO,
      sha: sha,
    },
    {
      headers: { Authorization: sessionStorage.getItem("github_token") },
    }
  );
  return response.data;
};


