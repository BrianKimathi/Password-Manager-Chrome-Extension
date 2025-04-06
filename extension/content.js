// File: extension/content.js
function detectLoginForm() {
  const forms = document.getElementsByTagName("form");
  for (const form of forms) {
    const inputs = form.getElementsByTagName("input");
    let emailField = null;
    let passwordField = null;

    for (const input of inputs) {
      if (
        input.type === "email" ||
        input.name.toLowerCase().includes("email") ||
        input.id.toLowerCase().includes("email")
      ) {
        emailField = input;
      }
      if (input.type === "password") {
        passwordField = input;
      }
    }

    if (emailField && passwordField) {
      form.addEventListener("submit", (e) => {
        const email = emailField.value;
        const password = passwordField.value;
        if (email && password) {
          chrome.runtime.sendMessage({
            action: "promptSaveCredentials",
            url: window.location.href,
            email,
            password,
          });
        }
      });

      // Request autofill from background
      chrome.runtime.sendMessage({
        action: "autofillForm",
        url: window.location.href,
      });
    }
  }
}

document.addEventListener("DOMContentLoaded", detectLoginForm);
const observer = new MutationObserver(detectLoginForm);
observer.observe(document.body, { childList: true, subtree: true });
