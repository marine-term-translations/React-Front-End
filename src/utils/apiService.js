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

export const fetchBranchDiff = async (token, branch) => {
  const response = await axios.get(`${API_BASE_URL}/api/github/diff`, {
    params: { repo: REPO, branch },
    headers: { Authorization: token },
  });
  return response.data;
};
