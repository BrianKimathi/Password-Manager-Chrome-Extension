const API_URL = "http://localhost:3000/api";

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

// Auto-logout function
function startTokenExpirationCheck() {
  chrome.storage.local.get(
    ["token", "tokenExpiration"],
    ({ token, tokenExpiration }) => {
      if (token && tokenExpiration) {
        if (isTokenExpired(tokenExpiration)) {
          logout();
        } else {
          const timeLeft = tokenExpiration - Date.now();
          setTimeout(logout, timeLeft); // Auto-logout when token expires
        }
      }
    }
  );
}

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const spinner = document.getElementById("spinner");
  console.log("Login clicked! Email:", email, "Password:", password);

  spinner.style.display = "block";
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    console.log("Login response:", data);
    if (data.token) {
      const expiration = getTokenExpiration(data.token);
      chrome.storage.local.set(
        { token: data.token, tokenExpiration: expiration },
        () => {
          console.log(
            "Token stored:",
            data.token,
            "Expires at:",
            new Date(expiration)
          );
          updateUI(true);
          startTokenExpirationCheck(); // Start expiration check
        }
      );
    } else {
      console.log("No token received:", data);
      alert("Login failed: " + (data.error || "Unknown error"));
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("Login error: " + error.message);
  } finally {
    spinner.style.display = "none";
  }
});

document.getElementById("registerBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const spinner = document.getElementById("spinner");
  console.log("Register clicked! Email:", email, "Password:", password);

  spinner.style.display = "block";
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    console.log("Register response:", data);
    if (response.ok) {
      alert("Registration successful! Please log in.");
    } else {
      alert("Registration failed: " + (data.error || "Unknown error"));
    }
  } catch (error) {
    console.error("Register error:", error);
    alert("Register error: " + error.message);
  } finally {
    spinner.style.display = "none";
  }
});

document.getElementById("logoutBtn").addEventListener("click", logout);

function logout() {
  chrome.storage.local.remove(["token", "tokenExpiration"], () => {
    console.log("Token and expiration removed");
    updateUI(false);
  });
}

// Function to update UI based on login state
function updateUI(isLoggedIn) {
  const loginDiv = document.getElementById("login");
  const loggedInDiv = document.getElementById("logged-in");
  if (isLoggedIn) {
    loginDiv.style.display = "none";
    loggedInDiv.style.display = "flex";
    console.log("UI updated to logged-in state");
  } else {
    loginDiv.style.display = "flex";
    loggedInDiv.style.display = "none";
    console.log("UI updated to login state");
  }
}

// Check login state on popup load
chrome.storage.local.get(
  ["token", "tokenExpiration"],
  ({ token, tokenExpiration }) => {
    console.log(
      "Initial check - Token:",
      token,
      "Expiration:",
      tokenExpiration
    );
    const isLoggedIn = token && !isTokenExpired(tokenExpiration);
    updateUI(isLoggedIn);
    if (isLoggedIn) startTokenExpirationCheck();
  }
);
