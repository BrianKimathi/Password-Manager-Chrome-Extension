// File: extension/popup/prompt.js
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("pendingCredentials", ({ pendingCredentials }) => {
    if (pendingCredentials) {
      document.getElementById(
        "siteUrl"
      ).textContent = `Site: ${pendingCredentials.url}`;
      document.getElementById(
        "emailDisplay"
      ).textContent = `Email: ${pendingCredentials.email}`;
    }
  });

  document.getElementById("yesBtn").addEventListener("click", () => {
    chrome.storage.local.get(
      ["pendingCredentials", "token"],
      ({ pendingCredentials, token }) => {
        if (!pendingCredentials || !token) {
          console.error("Missing credentials or token");
          window.close();
          return;
        }

        const { url, email, password } = pendingCredentials;
        fetch("http://localhost:3000/api/passwords/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            site_url: url,
            username: email, // Using email as username for simplicity
            password: password,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            console.log("Save response:", data);
            if (data.message === "Password saved") {
              chrome.storage.local.remove("pendingCredentials");
              window.close();
            } else {
              console.error("Failed to save:", data.error);
            }
          })
          .catch((error) => {
            console.error("Error saving to backend:", error);
          });
      }
    );
  });

  document.getElementById("noBtn").addEventListener("click", () => {
    chrome.storage.local.remove("pendingCredentials");
    window.close();
  });
});
