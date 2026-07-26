// API_URL is defined in config.js (loaded before this script)

// --- Token utilities ---

function getTokenExpiration(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000;
  } catch (e) {
    return 0;
  }
}

function isTokenExpired(expiration) {
  return expiration && Date.now() > expiration;
}

// --- Refresh token logic ---

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns the new token if successful, or null if refresh fails.
 */
async function refreshAccessToken() {
  const { refreshToken } = await new Promise((resolve) =>
    chrome.storage.local.get("refreshToken", resolve)
  );

  if (!refreshToken) return null;

  try {
    const resp = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await resp.json();
    if (data.token) {
      const expiration = getTokenExpiration(data.token);
      await new Promise((resolve) =>
        chrome.storage.local.set(
          {
            token: data.token,
            tokenExpiration: expiration,
            refreshToken: data.refreshToken,
          },
          resolve
        )
      );
      return data.token;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Start a silent refresh timer that refreshes the access token
 * shortly before it expires. Falls back to logout if refresh fails.
 */
function startTokenRefreshTimer() {
  chrome.storage.local.get(
    ["token", "tokenExpiration"],
    ({ token, tokenExpiration }) => {
      if (!token || !tokenExpiration) return;

      if (isTokenExpired(tokenExpiration)) {
        // Try to refresh immediately if already expired
        refreshAccessToken().then((newToken) => {
          if (!newToken) performLogout();
        });
        return;
      }

      // Refresh 2 minutes before expiry to give a safety margin
      const timeUntilRefresh = Math.max(
        0,
        tokenExpiration - Date.now() - 120000
      );
      setTimeout(async () => {
        const newToken = await refreshAccessToken();
        if (newToken) {
          // Schedule the next refresh with the new token
          startTokenRefreshTimer();
        } else {
          performLogout();
        }
      }, timeUntilRefresh);
    }
  );
}

// --- Login state persistence ---

function saveLoginSession(data) {
  const expiration = getTokenExpiration(data.token);
  return new Promise((resolve) =>
    chrome.storage.local.set(
      {
        token: data.token,
        tokenExpiration: expiration,
        refreshToken: data.refreshToken,
      },
      resolve
    )
  );
}

// --- UI event handlers ---

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const spinner = document.getElementById("spinner");

  spinner.style.display = "block";
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (data.token && data.refreshToken) {
      await saveLoginSession(data);
      updateUI(true);
      startTokenRefreshTimer();
    } else {
      alert("Login failed: " + (data.error || "Unknown error"));
    }
  } catch (error) {
    alert("Login error: " + error.message);
  } finally {
    spinner.style.display = "none";
  }
});

document.getElementById("registerBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const spinner = document.getElementById("spinner");

  spinner.style.display = "block";
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      alert("Registration successful! Please log in.");
    } else {
      alert("Registration failed: " + (data.error || "Unknown error"));
    }
  } catch (error) {
    alert("Register error: " + error.message);
  } finally {
    spinner.style.display = "none";
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  // Notify the backend to revoke the refresh token
  const { token, refreshToken } = await new Promise((resolve) =>
    chrome.storage.local.get(["token", "refreshToken"], resolve)
  );
  if (refreshToken && token) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Silently ignore — local cleanup is the priority
    }
  }
  performLogout();
});

function performLogout() {
  chrome.storage.local.remove(
    ["token", "tokenExpiration", "refreshToken"],
    () => {
      updateUI(false);
    }
  );
}

// --- UI state management ---

function updateUI(isLoggedIn) {
  const loginDiv = document.getElementById("login");
  const loggedInDiv = document.getElementById("logged-in");
  if (isLoggedIn) {
    loginDiv.style.display = "none";
    loggedInDiv.style.display = "flex";
  } else {
    loginDiv.style.display = "flex";
    loggedInDiv.style.display = "none";
  }
}

// Check login state on popup load
chrome.storage.local.get(
  ["token", "tokenExpiration"],
  ({ token, tokenExpiration }) => {
    const isLoggedIn = token && !isTokenExpired(tokenExpiration);
    updateUI(isLoggedIn);
    if (isLoggedIn) startTokenRefreshTimer();
  }
);
