const API_BASE = window.BANKING_API_BASE || "";
const session = {
  token: sessionStorage.getItem("northstar_token"),
  user: null,
  balance: null,
  transactions: [],
  page: "overview",
  filter: "all",
};
const authView = document.querySelector("#auth-view");
const bankView = document.querySelector("#bank-view");
const authForm = document.querySelector("#auth-form");
const dialog = document.querySelector("#action-dialog");
const toast = document.querySelector("#toast");
let authMode = "login";
let authKind = "customer";
let activeDialogAction = "";
let toastTimer;

const escapeHtml = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const money = (amount) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(Number(amount) || 0);
const dateLabel = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recently"
    : new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
};
const tokenPayload = (token) => {
  try {
    return JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
  } catch {
    return null;
  }
};

async function api(path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
    ...options.headers,
  };
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error(
      "Could not reach the banking service. Check that the server is running and try again.",
    );
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && session.token) signOut(false);
    const detail = payload.errors?.map((item) => item.message).join(" ");
    throw new Error(
      detail || payload.message || "The request could not be completed.",
    );
  }
  return payload;
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3400);
}

function setAuthMode(mode, kind = "customer") {
  authMode = mode;
  authKind = kind;
  const isRegister = mode === "register";
  const isAdmin = kind === "admin";
  document.querySelectorAll("[data-auth-mode]").forEach((tab) => {
    const active = tab.dataset.authMode === mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  document.querySelector("#name-field").classList.toggle("hidden", !isRegister);
  document.querySelector("#name-field input").required = isRegister;
  document.querySelector("#auth-eyebrow").textContent = isAdmin
    ? "ADMIN ACCESS"
    : isRegister
      ? "GET STARTED"
      : "WELCOME BACK";
  document.querySelector("#auth-title").textContent = isAdmin
    ? "Create an admin account"
    : isRegister
      ? "Open your account"
      : "Sign in to your account";
  document.querySelector("#auth-description").textContent = isAdmin
    ? "Create a privileged account using your admin creation key."
    : isRegister
      ? "A few details and you’re ready to go."
      : "Enter your details to continue.";
  document.querySelector("#auth-submit").innerHTML =
    `${isAdmin ? "Create admin account" : isRegister ? "Create account" : "Sign in"} <span aria-hidden="true">→</span>`;
  const password = authForm.elements.password;
  password.autocomplete = isRegister ? "new-password" : "current-password";
  password.minLength = isRegister ? 6 : 1;
  document.querySelector("#auth-error").classList.add("hidden");
  let adminFields = document.querySelector("#admin-fields");
  if (isAdmin && !adminFields) {
    adminFields = document.createElement("label");
    adminFields.className = "field";
    adminFields.id = "admin-fields";
    adminFields.innerHTML =
      '<span>Admin creation key</span><input name="adminCode" type="password" autocomplete="off" required placeholder="Enter your admin key">';
    document.querySelector("#name-field").after(adminFields);
  } else if (adminFields) {
    adminFields.classList.toggle("hidden", !isAdmin);
    adminFields.querySelector("input").required = isAdmin;
  }
  let adminLink = document.querySelector("#admin-register-link");
  if (!adminLink) {
    adminLink = document.createElement("button");
    adminLink.id = "admin-register-link";
    adminLink.type = "button";
    adminLink.className = "text-button admin-link";
    adminLink.textContent = "Create an admin account";
    adminLink.addEventListener("click", () => setAuthMode("register", "admin"));
    document.querySelector(".fine-print").before(adminLink);
  }
  adminLink.classList.toggle("hidden", isAdmin);
}

document
  .querySelectorAll("[data-auth-mode]")
  .forEach((tab) =>
    tab.addEventListener("click", () => setAuthMode(tab.dataset.authMode)),
  );

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = document.querySelector("#auth-submit");
  const errorBox = document.querySelector("#auth-error");
  const form = new FormData(authForm);
  const body = Object.fromEntries(form.entries());
  const path =
    authKind === "admin"
      ? "/auth/createAdmin"
      : authMode === "register"
        ? "/auth/register"
        : "/auth/login";
  if (authKind === "customer") delete body.adminCode;
  if (authMode === "login" && authKind === "customer") delete body.name;
  submit.disabled = true;
  errorBox.classList.add("hidden");
  try {
    const result = await api(path, { method: "POST", body });
    if (authMode === "login" && authKind === "customer") {
      session.token = result.token;
      sessionStorage.setItem("northstar_token", result.token);
      await enterBank();
    } else {
      showAuthError(
        authKind === "admin"
          ? "Admin account created. Sign in with your new credentials."
          : "Account created. Sign in to access your account.",
        false,
      );
      authForm.reset();
      setAuthMode("login");
    }
  } catch (error) {
    showAuthError(error.message);
  } finally {
    submit.disabled = false;
  }
});

function showAuthError(message, isError = true) {
  const box = document.querySelector("#auth-error");
  box.textContent = message;
  box.style.background = isError ? "" : "#edf6ef";
  box.style.color = isError ? "" : "#24724a";
  box.classList.remove("hidden");
}

async function enterBank() {
  if (!session.token) return showAuth();
  authView.classList.add("hidden");
  bankView.classList.remove("hidden");
  const decoded = tokenPayload(session.token);
  session.user = {
    id: decoded?.id,
    email: decoded?.email,
    accountNumber: decoded?.accountNumber,
    role: decoded?.role || "user",
  };
  document
    .querySelector("#admin-nav")
    .classList.toggle("hidden", session.user.role !== "admin");
  try {
    const [profile, balance, transactions] = await Promise.all([
      api("/user/profile"),
      api("/banking/balance"),
      api("/banking/transactions"),
    ]);
    session.user = { ...session.user, ...profile.data };
    session.balance = balance.data;
    session.transactions = Array.isArray(transactions.data)
      ? transactions.data
      : [];
    renderShellUser();
    renderPage(session.page);
  } catch (error) {
    if (!session.token) return;
    showToast(error.message, true);
    renderShellUser();
    renderPage(session.page);
  }
}

function renderShellUser() {
  const user = session.user || {};
  document.querySelector("#user-name").textContent =
    user.name || user.email || "Your account";
  document.querySelector("#user-email").textContent = user.email || "";
  document.querySelector("#user-avatar").textContent = (
    user.name ||
    user.email ||
    "N"
  )
    .trim()
    .charAt(0)
    .toUpperCase();
}

function showAuth() {
  bankView.classList.add("hidden");
  authView.classList.remove("hidden");
  setAuthMode("login");
}

function signOut(showMessage = true) {
  session.token = null;
  session.user = null;
  session.balance = null;
  sessionStorage.removeItem("northstar_token");
  showAuth();
  if (showMessage) showToast("You have signed out.");
}

document
  .querySelector("#logout-button")
  .addEventListener("click", () => signOut());
document
  .querySelector("#menu-toggle")
  .addEventListener("click", () =>
    document.querySelector("#sidebar").classList.toggle("is-open"),
  );
document.querySelectorAll(".nav-item").forEach((button) =>
  button.addEventListener("click", () => {
    session.page = button.dataset.page;
    document.querySelector("#sidebar").classList.remove("is-open");
    renderPage(session.page);
  }),
);
document
  .querySelector("#profile-menu")
  .addEventListener("click", () => renderPage("settings"));

function pageHeading(kicker, title, subtitle, action = "") {
  return `<div class="page-head"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;
}

function transactionRows(items) {
  if (!items.length)
    return `<div class="empty-state"><strong>Nothing here yet</strong>Your account activity will appear here.</div>`;
  return `<table class="transaction-table"><thead><tr><th>Transaction</th><th>Date</th><th>Account</th><th>Amount</th><th>Status</th></tr></thead><tbody>${items
    .map((item) => {
      const type = String(item.type || "transaction").toLowerCase();
      const inbound =
        item.receiverId === session.user?.id ||
        type === "deposit" ||
        type === "admin_credit";
      const label =
        type === "transfer"
          ? inbound
            ? "Transfer received"
            : "Transfer sent"
          : type === "withdrawal"
            ? "Cash withdrawal"
            : type === "deposit"
              ? "Account deposit"
              : type
                  .replaceAll("_", " ")
                  .replace(/^./, (letter) => letter.toUpperCase());
      const account = inbound ? item.senderAccount : item.receiverAccount;
      const amount = Number(item.amount) || 0;
      return `<tr><td><div class="transaction-name"><span class="transaction-symbol">${inbound ? "↙" : "↗"}</span><span><strong>${escapeHtml(label)}</strong><small>Reference #${escapeHtml(item.id ?? "—")}</small></span></div></td><td>${escapeHtml(dateLabel(item.createdAt))}</td><td>${account ? `•• ${escapeHtml(String(account).slice(-4))}` : "—"}</td><td class="${inbound ? "amount-positive" : "amount-negative"}">${inbound ? "+" : "−"}${money(amount)}</td><td><span class="status-pill">${escapeHtml(item.status || "complete")}</span></td></tr>`;
    })
    .join("")}</tbody></table>`;
}

function overviewPage() {
  const balance = session.balance || {};
  const recent = [...session.transactions]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  const actions = [
    ["transfer", "Transfer", "Send to an account", "↗"],
    ["deposit", "Deposit", "Add money", "＋"],
    ["withdraw", "Withdraw", "Move money out", "↙"],
    ["pin", "Transaction PIN", "Manage your PIN", "◎"],
  ];
  return `<div class="page-enter">${pageHeading("ACCOUNT OVERVIEW", `Good ${greeting()}, ${escapeHtml((session.user?.name || "there").split(" ")[0])}.`, "Here’s what’s happening with your money.")}
    <section class="balance-panel"><div class="balance-top"><span class="balance-label">Total available balance</span><span class="balance-chip">PERSONAL ACCOUNT</span></div><div class="balance-amount">${money(balance.balance)}</div><div class="balance-account">Account number <strong>${escapeHtml(balance.accountNumber || session.user?.accountNumber || "Unavailable")}</strong></div><div class="balance-actions"><button class="button button-light" data-action="transfer">Send money <span>→</span></button><button class="button button-outline-light" data-action="deposit">Add money <span>＋</span></button></div></section>
    <div class="quick-grid">${actions.map(([action, title, desc, icon]) => `<button class="quick-action" data-action="${action}"><span class="quick-icon">${icon}</span><span><strong>${title}</strong><small>${desc}</small></span></button>`).join("")}</div>
    <div class="section-heading"><h2>Recent activity</h2><button class="text-button" data-page-link="activity">View all activity →</button></div>${transactionRows(recent)}</div>`;
}

function activityPage() {
  const filtered = session.transactions.filter(
    (item) =>
      session.filter === "all" ||
      String(item.type).toLowerCase().includes(session.filter),
  );
  return `<div class="page-enter">${pageHeading("ACCOUNT ACTIVITY", "Your activity", "A clear view of money moving in and out of your account.")}
  <div class="section-heading"><h2>${filtered.length} ${filtered.length === 1 ? "transaction" : "transactions"}</h2><div class="activity-filter">${[
    ["all", "All"],
    ["transfer", "Transfers"],
    ["deposit", "Deposits"],
    ["withdrawal", "Withdrawals"],
  ]
    .map(
      ([key, label]) =>
        `<button class="filter-button ${session.filter === key ? "is-active" : ""}" data-filter="${key}">${label}</button>`,
    )
    .join(
      "",
    )}</div></div>${transactionRows([...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))}</div>`;
}

function paymentsPage() {
  return `<div class="page-enter">${pageHeading("PAYMENTS", "Move your money", "Choose a transaction to get started.")}
    <div class="quick-grid payment-grid">${[
      ["transfer", "Send a transfer", "Pay another Northstar account", "↗"],
      ["deposit", "Deposit funds", "Add money to your balance", "＋"],
      ["withdraw", "Withdraw funds", "Withdraw from your balance", "↙"],
    ]
      .map(
        ([action, title, desc, icon]) =>
          `<button class="quick-action" data-action="${action}"><span class="quick-icon">${icon}</span><span><strong>${title}</strong><small>${desc}</small></span></button>`,
      )
      .join("")}</div>
    <div class="two-col"><section class="surface"><h2>Before you transfer</h2><p class="surface-intro">Transfers require your 4-digit transaction PIN. Double-check the recipient's account number before confirming.</p><button class="button button-quiet" data-action="pin">Manage transaction PIN</button></section><section class="surface"><h2>Available balance</h2><p class="surface-intro">Your current account balance.</p><strong style="font:700 23px Manrope,sans-serif">${money(session.balance?.balance)}</strong></section></div></div>`;
}

function settingsPage() {
  const user = session.user || {};
  return `<div class="page-enter">${pageHeading("YOUR PROFILE", "Account settings", "Your personal account information and security preferences.")}
    <div class="two-col"><section class="surface"><h2>Personal details</h2><p class="surface-intro">Details associated with your Northstar account.</p><div class="detail-stack"><div class="account-detail"><span>Full name</span><strong>${escapeHtml(user.name || "Not available")}</strong></div><div class="account-detail"><span>Email address</span><strong>${escapeHtml(user.email || "Not available")}</strong></div><div class="account-detail"><span>Account number</span><strong>${escapeHtml(session.balance?.accountNumber || user.accountNumber || "Not available")}</strong></div><div class="account-detail"><span>Account type</span><strong>${escapeHtml(user.role === "admin" ? "Administrator" : "Personal")}</strong></div></div></section>
    <section class="surface"><h2>Transaction security</h2><p class="surface-intro">Your PIN is required to authorize transfers and withdrawals.</p><div class="detail-stack"><div class="account-detail"><span>Transaction PIN</span><strong>••••</strong></div></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="button button-primary" data-action="pin">Create PIN</button><button class="button button-quiet" data-action="update-pin">Update PIN</button></div></section></div></div>`;
}

function adminPage() {
  return `<div class="page-enter">${pageHeading("ADMINISTRATION", "Admin console", "Administrative operations for account servicing.")}
    <div class="two-col"><section class="surface admin-highlight"><h2>Credit a user account</h2><p class="surface-intro">Credit an account by its user ID. This action is recorded as an admin credit transaction.</p><button class="button button-primary" data-action="admin-credit">Credit account <span>→</span></button></section>
    <section class="surface"><h2>Admin account</h2><p class="surface-intro">Signed in with administrator privileges.</p><div class="account-detail"><span>Administrator</span><strong>${escapeHtml(session.user?.name || session.user?.email || "Admin")}</strong></div></section></div>
    <div class="section-heading" style="margin-top:30px"><h2>Recent account activity</h2></div>${transactionRows([...session.transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))}</div>`;
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}

function renderPage(page) {
  if (page === "admin" && session.user?.role !== "admin") page = "overview";
  session.page = page;
  const pages = {
    overview: overviewPage,
    activity: activityPage,
    payments: paymentsPage,
    settings: settingsPage,
    admin: adminPage,
  };
  document.querySelector("#page-content").innerHTML = (
    pages[page] || overviewPage
  )();
  document
    .querySelectorAll(".nav-item")
    .forEach((item) =>
      item.classList.toggle("is-active", item.dataset.page === page),
    );
  document.querySelector("#breadcrumb-page").textContent =
    {
      overview: "Overview",
      activity: "Activity",
      payments: "Move money",
      settings: "Account settings",
      admin: "Admin",
    }[page] || "Overview";
}

document
  .querySelector("#page-content")
  .addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-action]");
    const pageButton = event.target.closest("[data-page-link]");
    const filterButton = event.target.closest("[data-filter]");
    if (actionButton) return openAction(actionButton.dataset.action);
    if (pageButton) return renderPage(pageButton.dataset.pageLink);
    if (filterButton) {
      session.filter = filterButton.dataset.filter;
      return renderPage("activity");
    }
  });

function fieldMarkup(
  name,
  label,
  type = "text",
  placeholder = "",
  options = {},
) {
  const attrs = `${options.required === false ? "" : "required"} ${options.min ? `min="${options.min}"` : ""} ${options.step ? `step="${options.step}"` : ""} ${options.maxLength ? `maxlength="${options.maxLength}"` : ""} ${options.pattern ? `pattern="${options.pattern}"` : ""} ${options.inputMode ? `inputmode="${options.inputMode}"` : ""}`;
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" ${attrs} placeholder="${placeholder}"></label>`;
}

function openAction(action) {
  activeDialogAction = action;
  const configs = {
    transfer: {
      eyebrow: "SEND MONEY",
      title: "Send a transfer",
      copy: "Move money securely to another Northstar account.",
      button: "Review transfer",
      fields: `${fieldMarkup("accountNumber", "Recipient account number", "text", "10-digit account number", { pattern: "[0-9]{10}" })}${fieldMarkup("amount", "Amount", "number", "0.00", { min: "0.01", step: "0.01" })}${fieldMarkup("pin", "Transaction PIN", "password", "4-digit PIN", { maxLength: 4, pattern: "[0-9]{4}", inputMode: "numeric" })}`,
    },
    deposit: {
      eyebrow: "ADD MONEY",
      title: "Deposit funds",
      copy: "Add funds to your account balance.",
      button: "Deposit funds",
      fields: fieldMarkup("amount", "Amount", "number", "0.00", {
        min: "0.01",
        step: "0.01",
      }),
    },
    withdraw: {
      eyebrow: "WITHDRAW",
      title: "Withdraw funds",
      copy: "Withdraw money from your available balance.",
      button: "Withdraw funds",
      fields: `${fieldMarkup("amount", "Amount", "number", "0.00", { min: "0.01", step: "0.01" })}${fieldMarkup("pin", "Transaction PIN", "password", "4-digit PIN", { maxLength: 4, pattern: "[0-9]{4}", inputMode: "numeric" })}`,
    },
    pin: {
      eyebrow: "SECURITY",
      title: "Create transaction PIN",
      copy: "Set a 4-digit PIN to authorize transactions.",
      button: "Create PIN",
      fields: fieldMarkup(
        "pin",
        "New transaction PIN",
        "password",
        "4 digits",
        { maxLength: 4, pattern: "[0-9]{4}", inputMode: "numeric" },
      ),
    },
    "update-pin": {
      eyebrow: "SECURITY",
      title: "Update transaction PIN",
      copy: "Enter your current PIN and choose a new 4-digit PIN.",
      button: "Update PIN",
      fields: `${fieldMarkup("currentPin", "Current PIN", "password", "4 digits", { maxLength: 4, pattern: "[0-9]{4}", inputMode: "numeric" })}${fieldMarkup("newPin", "New PIN", "password", "4 digits", { maxLength: 4, pattern: "[0-9]{4}", inputMode: "numeric" })}`,
    },
    "admin-credit": {
      eyebrow: "ADMINISTRATION",
      title: "Credit an account",
      copy: "Enter the user's ID and the amount to credit.",
      button: "Credit account",
      fields: `${fieldMarkup("userId", "User ID", "number", "Account user ID", { min: "1", step: "1" })}${fieldMarkup("amount", "Amount", "number", "0.00", { min: "0.01", step: "0.01" })}`,
    },
  };
  const config = configs[action];
  if (!config) return;
  document.querySelector("#dialog-eyebrow").textContent = config.eyebrow;
  document.querySelector("#dialog-title").textContent = config.title;
  document.querySelector("#dialog-copy").textContent = config.copy;
  document.querySelector("#dialog-fields").innerHTML = config.fields;
  document.querySelector("#dialog-submit").innerHTML =
    `${config.button} <span aria-hidden="true">→</span>`;
  document.querySelector("#dialog-error").classList.add("hidden");
  document.querySelector("#action-form").reset();
  dialog.showModal();
}

document
  .querySelectorAll(".dialog-close")
  .forEach((button) => button.addEventListener("click", () => dialog.close()));
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

document
  .querySelector("#action-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = document.querySelector("#dialog-submit");
    const errorBox = document.querySelector("#dialog-error");
    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    if (values.amount) values.amount = Number(values.amount);
    if (values.userId) values.userId = Number(values.userId);
    const requests = {
      transfer: ["/banking/transfer", "POST", values],
      deposit: ["/banking/deposit", "POST", values],
      withdraw: ["/banking/withdraw", "POST", values],
      pin: ["/banking/pin", "POST", values],
      "update-pin": ["/banking/pin", "PATCH", values],
      "admin-credit": [
        `/banking/admin/users/${values.userId}/balance`,
        "PATCH",
        { amount: values.amount },
      ],
    };
    const [path, method, body] = requests[activeDialogAction];
    submit.disabled = true;
    errorBox.classList.add("hidden");
    try {
      const result = await api(path, { method, body });
      dialog.close();
      showToast(result.message || "Transaction completed successfully.");
      if (["pin", "update-pin"].includes(activeDialogAction))
        renderPage("settings");
      await refreshAccount();
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.classList.remove("hidden");
    } finally {
      submit.disabled = false;
    }
  });

async function refreshAccount() {
  try {
    const [balance, transactions] = await Promise.all([
      api("/banking/balance"),
      api("/banking/transactions"),
    ]);
    session.balance = balance.data;
    session.transactions = Array.isArray(transactions.data)
      ? transactions.data
      : [];
    renderPage(session.page);
  } catch (error) {
    showToast(error.message, true);
  }
}

setAuthMode("login");
if (session.token) enterBank();
