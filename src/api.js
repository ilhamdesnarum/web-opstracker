/**
 * API Service for Web_OpsTracker
 * Centralizes all calls to Google Apps Script / Firebase
 */

const APPS_SCRIPT_URL = import.meta.env.DEV 
  ? "/api/gas/macros/s/AKfycbxha3aQ0CjaVWJi0_XfCn-T67xu_RKBCAQShKPw-Ex5nykS17v9Roc42LoGPd2m2LfQ/exec"
  : "https://script.google.com/macros/s/AKfycbxha3aQ0CjaVWJi0_XfCn-T67xu_RKBCAQShKPw-Ex5nykS17v9Roc42LoGPd2m2LfQ/exec";

const api = {
  /**
   * Fetch all initial data needed for the dashboard
   */
  fetchData: async () => {
    try {
      const response = await fetch(`${APPS_SCRIPT_URL}?action=getDashboardData`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error("API Error (fetchData):", error);
      // For development/mock purposes if URL is not ready
      return {
        success: true,
        data: {
          pelangganData: [],
          odpData: [],
          visitData: [],
          summaryData: {
            totalPelanggan: 0,
            totalAktif: 0,
            totalWaiting: 0,
            totalKendala: 0,
            dailyActiveData: [],
            stationSummary: []
          },
          petugasList: []
        }
      };
    }
  },

  /**
   * Generic run function to call Google Apps Script functions
   */
  run: async (functionName, payload) => {
    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: functionName,
          data: payload
        })
      });
      return await response.json();
    } catch (error) {
      console.error(`API Error (${functionName}):`, error);
      return { success: false, message: error.message };
    }
  }
};

export default api;
