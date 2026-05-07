const VALID_CREDENTIALS = [
  { email: "admin@judgeflow.gov.in", password: "admin123" },
  { email: "admin", password: "admin123" },
  { email: "reviewer@gov.in", password: "review123" },
  { email: "demo", password: "demo" }
];

export function login(email, password) {
  const found = VALID_CREDENTIALS.find(
    c => c.email === email.toLowerCase().trim() &&
         c.password === password
  );
  if (found) {
    localStorage.setItem("jf_auth", "true");
    localStorage.setItem("jf_user", email);
    return true;
  }
  return false;
}

export function logout() {
  localStorage.removeItem("jf_auth");
  localStorage.removeItem("jf_user");
}

export function isAuthenticated() {
  return localStorage.getItem("jf_auth") === "true";
}

export function getUser() {
  return localStorage.getItem("jf_user") || "Admin";
}
