// Utility to decode JWT and get expiration time
function getTokenExpiration(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000; // Convert to milliseconds
  } catch (e) {
    console.error("Failed to decode token:", e);
    return 0;
  }
}

// Check if token is expired
function isTokenExpired(expiration) {
  return expiration && Date.now() > expiration;
}

// Logout function to clear token and expiration
function logout() {
  chrome.storage.local.remove(["token", "tokenExpiration"], () => {
    console.log("Token and expiration removed from background");
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "autofillForm") {
    if (!sender.tab || sender.tab.url.startsWith("chrome://")) {
      console.log("Cannot autofill on restricted page:", sender.tab.url);
      return;
    }

    chrome.storage.local.get(
      ["token", "tokenExpiration"],
      ({ token, tokenExpiration }) => {
        if (!token) {
          console.log("No token found, skipping autofill");
          return;
        }

        if (isTokenExpired(tokenExpiration)) {
          console.log("Token expired, logging out");
          logout();
          chrome.tabs.sendMessage(sender.tab.id, {
            action: "autofillFailed",
            error: "Token expired, please log in again",
          });
          return;
        }

        console.log("Using token:", token.slice(0, 10) + "...");
        fetch("http://localhost:3000/api/passwords/list", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `Failed to fetch passwords: ${response.status} ${response.statusText}`
              );
            }
            return response.json();
          })
          .then((passwords) => {
            const url = new URL(message.url).hostname;
            const matchingCredential = passwords.find(
              (cred) => url === new URL(cred.site_url).hostname
            );
            if (matchingCredential) {
              chrome.scripting.executeScript(
                {
                  target: { tabId: sender.tab.id },
                  func: fillForm,
                  args: [
                    matchingCredential.username,
                    matchingCredential.password,
                  ],
                },
                (results) => {
                  if (chrome.runtime.lastError) {
                    console.error(
                      "Script injection failed:",
                      chrome.runtime.lastError.message
                    );
                    chrome.tabs.sendMessage(sender.tab.id, {
                      action: "autofillFailed",
                      error: chrome.runtime.lastError.message,
                    });
                  } else {
                    console.log("Autofill script executed successfully");
                  }
                }
              );
            } else {
              console.log("No matching credential found for:", url);
            }
          })
          .catch((error) => {
            console.error("Autofill error:", error);
            chrome.tabs.sendMessage(sender.tab.id, {
              action: "autofillFailed",
              error: error.message,
            });
          });
      }
    );
  }
});

function fillForm(email, password) {
  const emailField = document.querySelector(
    'input[type="email"], input[name*="email"], input[id*="email"]'
  );
  const passwordField = document.querySelector('input[type="password"]');
  if (emailField) emailField.value = email;
  if (passwordField) passwordField.value = password;
}

// Check token expiration on extension startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(
    ["token", "tokenExpiration"],
    ({ token, tokenExpiration }) => {
      if (token && isTokenExpired(tokenExpiration)) {
        console.log("Token expired on startup, clearing");
        logout();
      }
    }
  );
});
