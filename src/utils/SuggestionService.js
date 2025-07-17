/**
 * SuggestionService handles API calls to fetch translation suggestions.
 */

const REACT_APP_BACK_URL = process.env.REACT_APP_BACK_URL || "";

/**
/**
 * Fetches translation suggestions from the API.
 * @param {string} text - The text to get suggestions for.
 * @param {string} targetLang - The target language for the translation.
 * @returns {Promise<string>} - A promise that resolves to a suggestion string.
 */
export const fetchSuggestions = async (text, targetLang) => {
  if (!text || !targetLang) {
    throw new Error(
      "Text and targetLang parameters are required to fetch suggestions."
    );
  }

  try {
    const response = await fetch(
      `${REACT_APP_BACK_URL}/api/translation/suggestions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: text, target: targetLang }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
    }

    const data = await response.json();
    return data.suggestion || "";
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    throw error;
  }
};
