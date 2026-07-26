importScripts("./config.js");

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

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns the new token string, or null if refresh failed.
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "autofillForm") {
    if (!sender.tab || sender.tab.url.startsWith("chrome://")) {
      console.log("Cannot autofill on restricted page:", sender.tab.url);
      return;
    }

    handleAutofill(sender);
  }
});

async function handleAutofill(sender) {
  const { token, tokenExpiration } = await new Promise((resolve) =>
    chrome.storage.local.get(["token", "tokenExpiration"], resolve)
  );

  if (!token) {
    console.log("No token found, skipping autofill");
    return;
  }

  let activeToken = token;

  if (isTokenExpired(tokenExpiration)) {
    console.log("Token expired, attempting refresh");
    activeToken = await refreshAccessToken();
    if (!activeToken) {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "autofillFailed",
        error: "Session expired, please log in again",
      });
      return;
    }
  }

  try {
    const response = await fetch(`${API_URL}/passwords/list`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch passwords: ${response.status} ${response.statusText}`
      );
    }

    const passwords = await response.json();
    const url = new URL(sender.tab.url).hostname;
    const matchingCredential = passwords.find(
      (cred) => url === new URL(cred.site_url).hostname
    );

    if (matchingCredential) {
      chrome.scripting.executeScript(
        {
          target: { tabId: sender.tab.id },
          func: fillForm,
          args: [matchingCredential.username, matchingCredential.password],
        },
        (results) => {
          if (chrome.runtime.lastError) {
            chrome.tabs.sendMessage(sender.tab.id, {
              action: "autofillFailed",
              error: chrome.runtime.lastError.message,
            });
          } else {
            console.log("Autofill executed successfully");
          }
        }
      );
    } else {
      console.log("No matching credential found for:", url);
    }
  } catch (error) {
    console.error("Autofill error:", error);
    chrome.tabs.sendMessage(sender.tab.id, {
      action: "autofillFailed",
      error: error.message,
    });
  }
}

function fillForm(email, password) {
  const emailField = document.querySelector(
    'input[type="email"], input[name*="email"], input[id*="email"]'
  );
  const passwordField = document.querySelector('input[type="password"]');
  if (emailField) emailField.value = email;
  if (passwordField) passwordField.value = password;
}

// Attempt token refresh on startup if token is expired
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(
    ["token", "tokenExpiration"],
    ({ token, tokenExpiration }) => {
      if (token && isTokenExpired(tokenExpiration)) {
        refreshAccessToken();
      }
    }
  );
});
