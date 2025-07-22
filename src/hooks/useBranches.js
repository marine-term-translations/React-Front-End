import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBranches, fetchBranchDiff } from "../utils/apiService";

const useBranches = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [emptyField, setEmptyField] = useState({});
  const [totalFieldsCount, setTotalFieldsCount] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBranchesData = async () => {
      const token = sessionStorage.getItem("github_token");
      if (!token) {
        setError(
          "Authorization token is missing or invalid. Redirecting to home..."
        );
        setLoading(false);
        setTimeout(() => navigate("/"), 3000);
        return;
      }

      try {
        const branchesData = await fetchBranches(token);
        setBranches(branchesData);

        const totalFieldsCount = {};
        const translationCounts = {};
        branchesData.forEach(async (branchData) => {
          const branch = branchData.name;
          let contents = [];
          try {
            contents = await fetchBranchDiff(token, branch);
          } catch (error) {
            console.error(`Error fetching diff for branch ${branch}:`, error);
            return;
          }

          contents = contents.filter((file) => file.filename.includes("http"));

          totalFieldsCount[branch] = {};
          translationCounts[branch] = {};

          contents.forEach((file) => {
            file.content.labels.forEach((label) => {
              label.translations.forEach((translation) => {
                Object.entries(translation).forEach(([lang, value]) => {
                  if (!translationCounts[branch][lang]) {
                    translationCounts[branch][lang] = 0;
                  }
                  if (!totalFieldsCount[branch][lang]) {
                    totalFieldsCount[branch][lang] = 0;
                  }

                  totalFieldsCount[branch][lang]++;

                  if (value && value !== "to be filled in") {
                    translationCounts[branch][lang]++;
                  }
                });
              });
            });
          });

          setEmptyField((prev) => ({
            ...prev,
            [branch]: translationCounts[branch],
          }));
          setTotalFieldsCount((prev) => ({
            ...prev,
            [branch]: totalFieldsCount[branch],
          }));
        });

        setLoading(false);
        setError(null);
      } catch (error) {
        const errorMessage = error.response?.data?.message
          ? error.response.data.message
          : error.request
          ? "Network error. Please check your connection and try again."
          : "An unexpected error occurred. Please try again.";
        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchBranchesData();
  }, [navigate]);

  return { error, loading, branches, emptyField, totalFieldsCount };
};

export default useBranches;
