/* =============================================
   CREDIAMIGA - SCRIPT.JS
   Sistema de Gestión de Préstamos
   ============================================= */

"use strict";

// ─── STATE ───────────────────────────────────────────────────────────────────
let STATE = {
  clients: [],
  loans: [],
  payments: [], // {loanId, date, amount, mora, total}
};

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initCredentials();
  loadState();
  startClock();

  document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    doLogin();
  });

  // Set today as default loan date
  const today = todayStr();
  const ld = document.getElementById("loanDate");
  if (ld) {
    ld.max = today;
    ld.value = today;
  }
});

// ─── CLOCK ────────────────────────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById("datetime");
  function tick() {
    const now = new Date();
    el.innerHTML = `<div>${now.toLocaleDateString("es-DO", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</div>
                    <div style="font-weight:700;font-size:14px">${now.toLocaleTimeString("es-DO")}</div>`;
  }
  tick();
  setInterval(tick, 1000);
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function generatePassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
  return Array.from(
    { length: len },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

function initCredentials() {
  if (!localStorage.getItem("ca_user")) {
    localStorage.setItem("ca_user", "admin");
    localStorage.setItem("ca_pass", "1234");
  }
  document.getElementById("showUser").textContent =
    localStorage.getItem("ca_user");
  document.getElementById("showPass").textContent =
    localStorage.getItem("ca_pass");
  document.getElementById("credentialsBox").style.display = "block";
}

function doLogin() {
  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value;
  if (
    user === localStorage.getItem("ca_user") &&
    pass === localStorage.getItem("ca_pass")
  ) {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("mainApp").style.display = "flex";
    document.getElementById("sidebarUserName").textContent = user;
    refreshDashboard();
    renderClients();
    renderLoans();
    renderPayments();
    updateLateCount();
  } else {
    showNotif("Usuario o contraseña incorrectos", "error");
  }
}

function logout() {
  document.getElementById("mainApp").style.display = "none";
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("loginPass").value = "";
}

function showChangePass() {
  document.getElementById("changePassModal").style.display = "flex";
}

function changePassword() {
  const old = document.getElementById("oldPass").value;
  const nw = document.getElementById("newPass").value;
  const cf = document.getElementById("confirmPass").value;
  if (old !== localStorage.getItem("ca_pass")) {
    showNotif("Contraseña actual incorrecta", "error");
    return;
  }
  if (nw.length < 6) {
    showNotif("La nueva contraseña debe tener al menos 6 caracteres", "error");
    return;
  }
  if (nw !== cf) {
    showNotif("Las contraseñas no coinciden", "error");
    return;
  }
  localStorage.setItem("ca_pass", nw);
  closeModal("changePassModal");
  showNotif("Contraseña actualizada exitosamente");
}

function togglePass(id) {
  const el = document.getElementById(id);
  el.type = el.type === "password" ? "text" : "password";
}

// ─── STORAGE ──────────────────────────────────────────────────────────────────
function loadState() {
  try {
    const saved = localStorage.getItem("ca_state");
    if (saved) STATE = JSON.parse(saved);
  } catch (e) {
    STATE = { clients: [], loans: [], payments: [] };
  }
}

function saveState() {
  localStorage.setItem("ca_state", JSON.stringify(STATE));
  updateLateCount();
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function showSection(name) {
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  document.getElementById("sec-" + name).classList.add("active");
  document.querySelector(`[data-section="${name}"]`)?.classList.add("active");
  document.getElementById("breadcrumb").textContent = sectionLabel(name);

  if (name === "dashboard") {
    refreshDashboard();
  }
  if (name === "clients") {
    renderClients();
  }
  if (name === "loans") {
    renderLoans();
  }
  if (name === "payments") {
    renderPayments();
  }
  if (name === "documents") {
    populateDocLoanSelect();
  }
  if (name === "reports") {
    renderReports();
  }

  // Mobile: close sidebar
  if (window.innerWidth <= 900) {
    document.getElementById("sidebar").classList.remove("mobile-open");
  }
}

function sectionLabel(n) {
  return (
    {
      dashboard: "Dashboard",
      calculator: "Calculadora",
      clients: "Clientes",
      loans: "Préstamos",
      payments: "Pagos",
      documents: "Documentos",
      reports: "Reportes",
    }[n] || n
  );
}

function toggleSidebar() {
  const sb = document.getElementById("sidebar");
  const ca = document.querySelector(".content-area");
  if (window.innerWidth <= 900) {
    sb.classList.toggle("mobile-open");
  } else {
    sb.classList.toggle("collapsed");
    ca.classList.toggle("expanded");
  }
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
function showNotif(msg, type = "success") {
  const area = document.getElementById("notifArea");
  const icon =
    type === "error"
      ? "fa-times-circle"
      : type === "warning"
        ? "fa-exclamation-triangle"
        : "fa-check-circle";
  const color =
    type === "error" ? "#ef5350" : type === "warning" ? "#e65100" : "#2e7d32";
  const el = document.createElement("div");
  el.className = `notif ${type}`;
  el.innerHTML = `<i class="fas ${icon}" style="color:${color}"></i><span>${msg}</span>`;
  area.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id).style.display = "none";
}

// Close on overlay click
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.style.display = "none";
  }
});

// ─── UTILS ────────────────────────────────────────────────────────────────────
function fmt(n) {
  return (
    "RD$" +
    Number(n).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function parseDate(str) {
  // Parse YYYY-MM-DD as local date
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function diffDays(a, b) {
  // a, b: Date objects. Returns b - a in days
  return Math.floor((b - a) / 86400000);
}

function nextPaymentDate(startDate, type, n) {
  const d = new Date(startDate);
  if (type === "weekly") d.setDate(d.getDate() + 7 * n);
  if (type === "biweekly") d.setDate(d.getDate() + 15 * n);
  if (type === "monthly") d.setMonth(d.getMonth() + n);
  return d;
}

function typeLabel(t) {
  return (
    { weekly: "Semanal", biweekly: "Quincenal", monthly: "Mensual" }[t] || t
  );
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ─── FINANCIAL LOGIC ──────────────────────────────────────────────────────────
function calcInstallment(principal, ratePercent, numInstallments) {
  // Simple interest: total = principal * (1 + rate/100), installment = total / n
  const total = principal * (1 + ratePercent / 100);
  const interest = total - principal;
  const installment = total / numInstallments;
  return { total, interest, installment };
}

function getSuggestedInstallments(type) {
  return {
    weekly: "12 – 24 cuotas (3 – 6 meses)",
    biweekly: "6 – 12 cuotas (3 – 6 meses)",
    monthly: "3 – 12 cuotas (3 – 12 meses)",
  }[type];
}

// Build full amortization schedule from loan object
function buildSchedule(loan) {
  const start = parseDate(loan.date);
  const { installment, total, interest } = calcInstallment(
    loan.amount,
    loan.rate,
    loan.installments,
  );
  const rows = [];
  let balance = total;

  for (let i = 1; i <= loan.installments; i++) {
    const dueDate = nextPaymentDate(start, loan.type, i);
    const principalPart = loan.amount / loan.installments;
    const interestPart = interest / loan.installments;
    balance -= installment;
    if (Math.abs(balance) < 0.01) balance = 0;
    rows.push({
      num: i,
      dueDate,
      principal: principalPart,
      interest: interestPart,
      installment,
      balance: Math.max(balance, 0),
    });
  }
  return rows;
}

// Calculate loan status from today
function loanStatus(loan) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseDate(loan.date);
  const schedule = buildSchedule(loan);
  const payments = STATE.payments.filter((p) => p.loanId === loan.id);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const moraPaid = payments.reduce((s, p) => s + (p.mora || 0), 0);

  const { total, installment } = calcInstallment(
    loan.amount,
    loan.rate,
    loan.installments,
  );

  let balance = total - totalPaid;
  if (balance < 0.01) balance = 0;

  // Count paid installments (floor)
  const paidInstallments = Math.min(
    Math.floor(totalPaid / installment),
    loan.installments,
  );
  const remaining = loan.installments - paidInstallments;

  // Determine next due date
  const nextDue = remaining > 0 ? schedule[paidInstallments] : null;

  // Days late: if today > nextDue.dueDate and balance > 0
  let daysLate = 0;
  let mora = 0;
  if (nextDue && balance > 0) {
    const due = new Date(nextDue.dueDate);
    due.setHours(0, 0, 0, 0);
    daysLate = diffDays(due, today);
    if (daysLate < 0) daysLate = 0;
    const dailyMoraRate = (loan.moraRate || 0.5) / 100;
    mora = installment * dailyMoraRate * daysLate;
  }

  const status = balance <= 0 ? "paid" : daysLate > 0 ? "late" : "active";

  return {
    total,
    balance,
    totalPaid,
    paidInstallments,
    remaining,
    installment,
    nextDue,
    daysLate,
    mora,
    status,
    moraPaid,
    interest: total - loan.amount,
  };
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function refreshDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let totalLent = 0,
    totalCollected = 0,
    activeClients = new Set(),
    lateCount = 0;
  const upcoming = [],
    late = [];

  STATE.loans.forEach((loan) => {
    const st = loanStatus(loan);
    const client = STATE.clients.find((c) => c.id === loan.clientId);
    const cname = client ? `${client.name} ${client.lastname}` : "Sin cliente";

    totalLent += loan.amount;
    totalCollected += st.totalPaid;
    if (st.status !== "paid") activeClients.add(loan.clientId);
    if (st.status === "late") {
      lateCount++;
      late.push({
        cname,
        daysLate: st.daysLate,
        mora: st.mora,
        loanId: loan.id,
      });
    }

    if (st.nextDue && st.status === "active") {
      const d = new Date(st.nextDue.dueDate);
      d.setHours(0, 0, 0, 0);
      const days = diffDays(today, d);
      if (days >= 0 && days <= 7) {
        upcoming.push({
          cname,
          dueDate: d,
          days,
          installment: st.installment,
          loanId: loan.id,
        });
      }
    }
  });

  document.getElementById("statTotalLent").textContent = fmt(totalLent);
  document.getElementById("statTotalCollected").textContent =
    fmt(totalCollected);
  document.getElementById("statBalance").textContent = fmt(
    totalLent - totalCollected,
  );
  document.getElementById("statActiveClients").textContent = activeClients.size;
  document.getElementById("statLate").textContent = lateCount;

  // Upcoming
  const upEl = document.getElementById("upcomingPayments");
  if (upcoming.length === 0) {
    upEl.innerHTML =
      '<div class="empty-msg">No hay vencimientos próximos en 7 días</div>';
  } else {
    upcoming.sort((a, b) => a.days - b.days);
    upEl.innerHTML = upcoming
      .map(
        (u) => `
      <div class="list-item">
        <div><div class="item-name">${u.cname}</div>
        <div class="item-info">${u.dueDate.toLocaleDateString("es-DO")}</div></div>
        <div style="text-align:right">
          <div>${fmt(u.installment)}</div>
          <span class="item-badge badge-due">${u.days === 0 ? "Hoy" : `En ${u.days} día${u.days > 1 ? "s" : ""}`}</span>
        </div>
      </div>`,
      )
      .join("");
  }

  // Late
  const lateEl = document.getElementById("lateLoans");
  if (late.length === 0) {
    lateEl.innerHTML =
      '<div class="empty-msg">No hay préstamos en atraso</div>';
  } else {
    lateEl.innerHTML = late
      .map(
        (l) => `
      <div class="list-item">
        <div><div class="item-name">${l.cname}</div>
        <div class="item-info">Mora: ${fmt(l.mora)}</div></div>
        <span class="item-badge badge-late">${l.daysLate} día${l.daysLate > 1 ? "s" : ""} atraso</span>
      </div>`,
      )
      .join("");
  }
}

function updateLateCount() {
  let c = 0;
  STATE.loans.forEach((loan) => {
    if (loanStatus(loan).status === "late") c++;
  });
  document.getElementById("lateCount").textContent = c;
}

// ─── CALCULATOR ───────────────────────────────────────────────────────────────
function calcLoan() {
  const amount = parseFloat(document.getElementById("calcAmount").value) || 0;
  const rate = parseFloat(document.getElementById("calcRate").value) || 10;
  const type = document.getElementById("calcType").value;
  const n = parseInt(document.getElementById("calcInstallments").value) || 1;

  if (amount > 25000) {
    document.getElementById("calcAmount").value = 25000;
    showNotif("Monto máximo: RD$25,000", "warning");
    return;
  }

  const { total, interest, installment } = calcInstallment(amount, rate, n);
  const freq = typeLabel(type);

  document.getElementById("rAmount").textContent = fmt(amount);
  document.getElementById("rInterest").textContent = fmt(interest);
  document.getElementById("rTotal").textContent = fmt(total);
  document.getElementById("rInstallment").textContent = fmt(installment);
  document.getElementById("rCount").textContent = n;
  document.getElementById("rFreq").textContent = freq;
  document.getElementById("calcInstSuggestion").textContent =
    "Sugerencia: " + getSuggestedInstallments(type);

  // Amortization
  if (amount > 0) {
    const start = new Date();
    let bal = total;
    let rows = "";
    for (let i = 1; i <= n; i++) {
      const due = nextPaymentDate(start, type, i);
      const p = amount / n;
      const int = interest / n;
      bal -= installment;
      if (Math.abs(bal) < 0.01) bal = 0;
      rows += `<tr><td>${i}</td><td>${due.toLocaleDateString("es-DO")}</td>
               <td>${fmt(p)}</td><td>${fmt(int)}</td>
               <td>${fmt(installment)}</td><td>${fmt(Math.max(bal, 0))}</td></tr>`;
    }
    document.getElementById("calcAmortization").innerHTML = `
      <div class="card-header" style="padding:10px 0 6px;border:none;font-size:13px"><i class="fas fa-table"></i> Tabla de Amortización</div>
      <table class="data-table">
        <thead><tr><th>#</th><th>Fecha</th><th>Capital</th><th>Interés</th><th>Cuota</th><th>Balance</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }
}

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
function openClientModal(id = null) {
  document.getElementById("clientId").value = id || "";
  document.getElementById("clientName").value = "";
  document.getElementById("clientLastname").value = "";
  document.getElementById("clientCedula").value = "";
  document.getElementById("clientPhone").value = "";
  document.getElementById("clientOccupation").value = "";
  document.getElementById("clientAddress").value = "";
  document.getElementById("clientModalTitle").innerHTML =
    '<i class="fas fa-user-plus"></i> Nuevo Cliente';

  if (id) {
    const c = STATE.clients.find((x) => x.id === id);
    if (c) {
      document.getElementById("clientId").value = c.id;
      document.getElementById("clientName").value = c.name;
      document.getElementById("clientLastname").value = c.lastname;
      document.getElementById("clientCedula").value = c.cedula;
      document.getElementById("clientPhone").value = c.phone;
      document.getElementById("clientOccupation").value = c.occupation;
      document.getElementById("clientAddress").value = c.address;
      document.getElementById("clientModalTitle").innerHTML =
        '<i class="fas fa-user-edit"></i> Editar Cliente';
    }
  }
  document.getElementById("clientModal").style.display = "flex";
}

function saveClient() {
  const id = document.getElementById("clientId").value;
  const name = document.getElementById("clientName").value.trim();
  const last = document.getElementById("clientLastname").value.trim();
  const ced = document.getElementById("clientCedula").value.trim();
  const tel = document.getElementById("clientPhone").value.trim();
  const occ = document.getElementById("clientOccupation").value.trim();
  const addr = document.getElementById("clientAddress").value.trim();

  if (!name || !last || !ced || !tel) {
    showNotif("Complete los campos obligatorios", "error");
    return;
  }

  if (id) {
    const idx = STATE.clients.findIndex((c) => c.id === id);
    if (idx > -1)
      STATE.clients[idx] = {
        id,
        name,
        lastname: last,
        cedula: ced,
        phone: tel,
        occupation: occ,
        address: addr,
      };
    showNotif("Cliente actualizado");
  } else {
    // Check duplicate cedula
    if (STATE.clients.find((c) => c.cedula === ced)) {
      showNotif("Ya existe un cliente con esa cédula", "error");
      return;
    }
    STATE.clients.push({
      id: uid(),
      name,
      lastname: last,
      cedula: ced,
      phone: tel,
      occupation: occ,
      address: addr,
    });
    showNotif("Cliente creado exitosamente");
  }

  saveState();
  closeModal("clientModal");
  renderClients();
}

function deleteClient(id) {
  if (!confirm("¿Eliminar este cliente?")) return;
  const hasLoans = STATE.loans.some((l) => l.clientId === id);
  if (hasLoans) {
    showNotif("No puede eliminar un cliente con préstamos activos", "error");
    return;
  }
  STATE.clients = STATE.clients.filter((c) => c.id !== id);
  saveState();
  renderClients();
  showNotif("Cliente eliminado");
}

function renderClients() {
  const q = (
    document.getElementById("clientSearch")?.value || ""
  ).toLowerCase();
  const list = STATE.clients.filter((c) =>
    `${c.name} ${c.lastname} ${c.cedula} ${c.phone}`.toLowerCase().includes(q),
  );

  const tbody = document.getElementById("clientTableBody");
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">No hay clientes registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map(
      (c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${c.name} ${c.lastname}</strong></td>
      <td>${c.cedula}</td>
      <td>${c.phone}</td>
      <td>${c.occupation || "—"}</td>
      <td>${c.address || "—"}</td>
      <td>
        <button class="btn-icon edit" onclick="openClientModal('${c.id}')" title="Editar"><i class="fas fa-edit"></i></button>
        <button class="btn-icon del"  onclick="deleteClient('${c.id}')"   title="Eliminar"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`,
    )
    .join("");
}

// ─── LOANS ────────────────────────────────────────────────────────────────────
function openLoanModal(id = null) {
  // Populate client dropdown
  const sel = document.getElementById("loanClient");
  sel.innerHTML = '<option value="">-- Seleccionar cliente --</option>';
  STATE.clients.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.name} ${c.lastname} — ${c.cedula}`;
    sel.appendChild(opt);
  });

  if (STATE.clients.length === 0) {
    showNotif("Primero registre un cliente", "warning");
    showSection("clients");
    return;
  }

  // Reset
  document.getElementById("loanId").value = "";
  document.getElementById("loanAmount").value = "";
  document.getElementById("loanRate").value = "10";
  document.getElementById("loanType").value = "monthly";
  document.getElementById("loanInstallments").value = "12";
  document.getElementById("loanDate").value = todayStr();
  document.getElementById("loanDate").max = todayStr();
  document.getElementById("loanMoraRate").value = "0.5";
  document.getElementById("loanNotes").value = "";
  document.getElementById("loanPreview").style.display = "none";
  document.getElementById("loanModalTitle").innerHTML =
    '<i class="fas fa-file-invoice-dollar"></i> Nuevo Préstamo';

  if (id) {
    const loan = STATE.loans.find((l) => l.id === id);
    if (loan) {
      document.getElementById("loanId").value = loan.id;
      document.getElementById("loanClient").value = loan.clientId;
      document.getElementById("loanAmount").value = loan.amount;
      document.getElementById("loanRate").value = loan.rate;
      document.getElementById("loanType").value = loan.type;
      document.getElementById("loanInstallments").value = loan.installments;
      document.getElementById("loanDate").value = loan.date;
      document.getElementById("loanMoraRate").value = loan.moraRate || 0.5;
      document.getElementById("loanNotes").value = loan.notes || "";
      document.getElementById("loanModalTitle").innerHTML =
        '<i class="fas fa-edit"></i> Editar Préstamo';
      previewLoan();
    }
  }

  document.getElementById("loanModal").style.display = "flex";
}

function previewLoan() {
  const amount = parseFloat(document.getElementById("loanAmount").value) || 0;
  const rate = parseFloat(document.getElementById("loanRate").value) || 0;
  const n = parseInt(document.getElementById("loanInstallments").value) || 1;
  const type = document.getElementById("loanType").value;
  const date = document.getElementById("loanDate").value;

  if (!amount || !rate || !n || !date) {
    document.getElementById("loanPreview").style.display = "none";
    return;
  }

  const { total, interest, installment } = calcInstallment(amount, rate, n);

  // Check if date is past → calculate initial mora
  const startDate = parseDate(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysPast = Math.max(diffDays(startDate, today), 0);

  let warningHTML = "";
  if (daysPast > 0) {
    warningHTML = `<div style="color:var(--red);font-size:12px;margin-top:8px;padding:8px;background:#fde8e8;border-radius:6px">
      <i class="fas fa-exclamation-triangle"></i> Fecha pasada: ${daysPast} días desde el inicio. Se calcularán posibles atrasos.
    </div>`;
  }

  document.getElementById("loanPreview").style.display = "block";
  document.getElementById("loanPreview").innerHTML = `
    <div class="loan-preview-grid">
      <div class="loan-preview-item"><span>Monto</span><strong>${fmt(amount)}</strong></div>
      <div class="loan-preview-item"><span>Interés Total</span><strong>${fmt(interest)}</strong></div>
      <div class="loan-preview-item"><span>Total a Pagar</span><strong>${fmt(total)}</strong></div>
      <div class="loan-preview-item"><span>Cuota</span><strong>${fmt(installment)}</strong></div>
      <div class="loan-preview-item"><span>Cuotas</span><strong>${n} (${typeLabel(type)})</strong></div>
      <div class="loan-preview-item"><span>Fecha</span><strong>${date}</strong></div>
    </div>
    ${warningHTML}`;
}

function saveLoan() {
  const id = document.getElementById("loanId").value;
  const clientId = document.getElementById("loanClient").value;
  const amount = parseFloat(document.getElementById("loanAmount").value);
  const rate = parseFloat(document.getElementById("loanRate").value);
  const type = document.getElementById("loanType").value;
  const n = parseInt(document.getElementById("loanInstallments").value);
  const date = document.getElementById("loanDate").value;
  const moraRate =
    parseFloat(document.getElementById("loanMoraRate").value) || 0.5;
  const notes = document.getElementById("loanNotes").value.trim();

  // Validations
  if (!clientId) {
    showNotif("Seleccione un cliente", "error");
    return;
  }
  if (!amount || amount <= 0) {
    showNotif("Ingrese un monto válido", "error");
    return;
  }
  if (amount > 25000) {
    showNotif("Monto máximo: RD$25,000", "error");
    return;
  }
  if (!rate || rate < 4 || rate > 20) {
    showNotif("La tasa debe estar entre 4% y 20%", "error");
    return;
  }
  if (!n || n < 1) {
    showNotif("Ingrese un número de cuotas válido", "error");
    return;
  }
  if (!date) {
    showNotif("Ingrese la fecha del préstamo", "error");
    return;
  }

  const today = todayStr();
  if (date > today) {
    showNotif("No se permiten fechas futuras", "error");
    return;
  }

  const loan = {
    id: id || uid(),
    clientId,
    amount,
    rate,
    type,
    installments: n,
    date,
    moraRate,
    notes,
  };

  if (id) {
    const idx = STATE.loans.findIndex((l) => l.id === id);
    if (idx > -1) STATE.loans[idx] = loan;
    showNotif("Préstamo actualizado");
  } else {
    STATE.loans.push(loan);
    showNotif("Préstamo creado exitosamente");
  }

  saveState();
  closeModal("loanModal");
  renderLoans();
  refreshDashboard();
}

function deleteLoan(id) {
  if (!confirm("¿Eliminar este préstamo y todos sus pagos?")) return;
  STATE.loans = STATE.loans.filter((l) => l.id !== id);
  STATE.payments = STATE.payments.filter((p) => p.loanId !== id);
  saveState();
  renderLoans();
  refreshDashboard();
  showNotif("Préstamo eliminado");
}

function renderLoans() {
  const q = (document.getElementById("loanSearch")?.value || "").toLowerCase();
  const filter = document.getElementById("loanFilter")?.value || "all";
  const tbody = document.getElementById("loanTableBody");
  if (!tbody) return;

  let list = STATE.loans.map((loan) => {
    const client = STATE.clients.find((c) => c.id === loan.clientId);
    const st = loanStatus(loan);
    return { loan, client, st };
  });

  if (filter !== "all") list = list.filter((r) => r.st.status === filter);
  if (q)
    list = list.filter((r) => {
      const cn = r.client ? `${r.client.name} ${r.client.lastname}` : "";
      return cn.toLowerCase().includes(q);
    });

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-msg">No hay préstamos</td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map(({ loan, client, st }, i) => {
      const cname = client
        ? `${client.name} ${client.lastname}`
        : "Sin cliente";
      const statusBadge = `<span class="status-badge status-${st.status}">
      <i class="fas fa-circle" style="font-size:7px"></i>
      ${{ active: "Al día", late: "En atraso", paid: "Pagado" }[st.status]}
      ${st.daysLate > 0 ? `(${st.daysLate}d)` : ""}
    </span>`;
      return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${cname}</strong></td>
        <td>${fmt(loan.amount)}</td>
        <td>${loan.rate}%</td>
        <td>${fmt(st.installment)}</td>
        <td>${loan.date}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn-icon pay"  onclick="openPaymentModal('${loan.id}')" title="Pagar"><i class="fas fa-credit-card"></i></button>
          <button class="btn-icon view" onclick="openScheduleModal('${loan.id}')" title="Cronograma"><i class="fas fa-calendar-alt"></i></button>
          <button class="btn-icon edit" onclick="openLoanModal('${loan.id}')" title="Editar"><i class="fas fa-edit"></i></button>
          <button class="btn-icon del"  onclick="deleteLoan('${loan.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
    })
    .join("");
}

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
function renderPayments() {
  const q = (
    document.getElementById("paymentSearch")?.value || ""
  ).toLowerCase();
  const filter = document.getElementById("paymentFilter")?.value || "active";
  const el = document.getElementById("paymentsList");
  if (!el) return;

  let list = STATE.loans.map((loan) => {
    const client = STATE.clients.find((c) => c.id === loan.clientId);
    const st = loanStatus(loan);
    return { loan, client, st };
  });

  if (filter === "active") list = list.filter((r) => r.st.status !== "paid");
  if (filter === "late") list = list.filter((r) => r.st.status === "late");
  if (q)
    list = list.filter((r) => {
      const cn = r.client ? `${r.client.name} ${r.client.lastname}` : "";
      return cn.toLowerCase().includes(q);
    });

  if (list.length === 0) {
    el.innerHTML =
      '<div class="empty-msg"><i class="fas fa-inbox"></i><br>No hay préstamos activos</div>';
    return;
  }

  el.innerHTML = list
    .map(({ loan, client, st }) => {
      const cname = client
        ? `${client.name} ${client.lastname}`
        : "Sin cliente";
      const isLate = st.status === "late";
      const nextDateStr = st.nextDue
        ? new Date(st.nextDue.dueDate).toLocaleDateString("es-DO")
        : "—";
      return `
      <div class="payment-card ${isLate ? "late" : "ok"}">
        <div class="payment-card-header">
          <div>
            <div class="payment-client-name"><i class="fas fa-user"></i> ${cname}</div>
            <small style="color:var(--text-muted)">${typeLabel(loan.type)} · ${loan.rate}% · Inicio: ${loan.date}</small>
          </div>
          <span class="status-badge status-${st.status}">
            ${{ active: "Al día", late: "En atraso", paid: "Pagado" }[st.status]}
          </span>
        </div>
        <div class="payment-info-grid">
          <div class="payment-info-item"><span>Monto Original</span><strong>${fmt(loan.amount)}</strong></div>
          <div class="payment-info-item"><span>Total a Pagar</span><strong>${fmt(st.total)}</strong></div>
          <div class="payment-info-item"><span>Cuota</span><strong>${fmt(st.installment)}</strong></div>
          <div class="payment-info-item"><span>Balance</span><strong>${fmt(st.balance)}</strong></div>
          <div class="payment-info-item"><span>Total Pagado</span><strong>${fmt(st.totalPaid)}</strong></div>
          <div class="payment-info-item"><span>Cuotas Rest.</span><strong>${st.remaining} / ${loan.installments}</strong></div>
          <div class="payment-info-item ${isLate ? "mora" : ""}"><span>Días Atraso</span><strong>${st.daysLate}</strong></div>
          <div class="payment-info-item ${isLate ? "mora" : ""}"><span>Mora Acum.</span><strong>${fmt(st.mora)}</strong></div>
          <div class="payment-info-item"><span>Próx. Vencimiento</span><strong>${nextDateStr}</strong></div>
        </div>
        <div class="payment-card-actions">
          ${st.status !== "paid" ? `<button class="btn-primary btn-sm" onclick="openPaymentModal('${loan.id}')"><i class="fas fa-credit-card"></i> Registrar Pago</button>` : ""}
          <button class="btn-sm btn-outline" onclick="openScheduleModal('${loan.id}')"><i class="fas fa-calendar-alt"></i> Cronograma</button>
          <button class="btn-sm btn-outline" onclick="openPaymentHistory('${loan.id}')"><i class="fas fa-history"></i> Historial</button>
        </div>
        ${
          isLate
            ? `<div style="margin-top:10px;padding:8px 12px;background:#fde8e8;border-radius:6px;font-size:12px;color:var(--red)">
          <i class="fas fa-exclamation-triangle"></i> <strong>${st.daysLate} días de atraso.</strong> Mora acumulada: ${fmt(st.mora)}. Total con mora: ${fmt(st.balance + st.mora)}
        </div>`
            : ""
        }
      </div>`;
    })
    .join("");
}

function openPaymentModal(loanId) {
  const loan = STATE.loans.find((l) => l.id === loanId);
  const client = STATE.clients.find((c) => c.id === loan.clientId);
  const st = loanStatus(loan);

  if (st.status === "paid") {
    showNotif("Este préstamo ya está pagado", "warning");
    return;
  }

  document.getElementById("payLoanId").value = loanId;
  document.getElementById("payDate").value = todayStr();
  document.getElementById("payAmount").value = "";
  document.getElementById("payPreview").innerHTML = "";

  const cname = client ? `${client.name} ${client.lastname}` : "Sin cliente";

  document.getElementById("paymentDetails").innerHTML = `
    <div class="pd-item"><span>Cliente</span><strong>${cname}</strong></div>
    <div class="pd-item"><span>Monto Original</span><strong>${fmt(loan.amount)}</strong></div>
    <div class="pd-item"><span>Cuota</span><strong>${fmt(st.installment)}</strong></div>
    <div class="pd-item"><span>Balance</span><strong>${fmt(st.balance)}</strong></div>
    <div class="pd-item"><span>Días Atraso</span><strong style="color:${st.daysLate > 0 ? "var(--red)" : "inherit"}">${st.daysLate}</strong></div>
    <div class="pd-item"><span>Mora</span><strong style="color:var(--red)">${fmt(st.mora)}</strong></div>
    <div class="pd-item"><span>Total con Mora</span><strong>${fmt(st.balance + st.mora)}</strong></div>
    <div class="pd-item"><span>Cuotas Restantes</span><strong>${st.remaining}</strong></div>`;

  // Suggest amount
  document.getElementById("payAmount").value = (
    st.installment + st.mora
  ).toFixed(2);
  updatePayPreview();

  document.getElementById("paymentModal").style.display = "flex";
}

function updatePayPreview() {
  const loanId = document.getElementById("payLoanId").value;
  const amount = parseFloat(document.getElementById("payAmount").value) || 0;
  if (!loanId || !amount) {
    document.getElementById("payPreview").innerHTML = "";
    return;
  }

  const loan = STATE.loans.find((l) => l.id === loanId);
  const st = loanStatus(loan);

  const moraApplied = Math.min(amount, st.mora);
  const principal = Math.max(amount - moraApplied, 0);
  const newBalance = Math.max(st.balance - principal, 0);

  document.getElementById("payPreview").innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      <div><span style="font-size:11px;color:var(--text-muted)">Abono capital</span><br><strong>${fmt(principal)}</strong></div>
      <div><span style="font-size:11px;color:var(--text-muted)">Mora aplicada</span><br><strong style="color:var(--red)">${fmt(moraApplied)}</strong></div>
      <div><span style="font-size:11px;color:var(--text-muted)">Nuevo balance</span><br><strong style="color:var(--green-dark)">${fmt(newBalance)}</strong></div>
    </div>`;
}

function applyPayment() {
  const loanId = document.getElementById("payLoanId").value;
  const amount = parseFloat(document.getElementById("payAmount").value);
  const date = document.getElementById("payDate").value;

  if (!amount || amount <= 0) {
    showNotif("Ingrese un monto válido", "error");
    return;
  }
  if (!date) {
    showNotif("Ingrese la fecha de pago", "error");
    return;
  }

  const loan = STATE.loans.find((l) => l.id === loanId);
  const st = loanStatus(loan);

  if (amount > st.balance + st.mora + 0.01) {
    showNotif("El monto excede el balance total con mora", "warning");
  }

  const moraApplied = Math.min(amount, st.mora);
  const principal = Math.max(amount - moraApplied, 0);
  const newBalance = Math.max(st.balance - principal, 0);

  const payment = {
    id: uid(),
    loanId,
    date,
    amount: principal,
    mora: moraApplied,
    total: amount,
    balanceAfter: newBalance,
  };

  STATE.payments.push(payment);
  saveState();
  closeModal("paymentModal");
  showNotif("Pago registrado exitosamente");
  renderPayments();
  refreshDashboard();

  // Show receipt
  showReceipt(payment, loan);
}

// ─── RECEIPT ──────────────────────────────────────────────────────────────────
function showReceipt(payment, loan) {
  const client = STATE.clients.find((c) => c.id === loan.clientId);
  const cname = client ? `${client.name} ${client.lastname}` : "Sin cliente";
  const st = loanStatus(loan);

  document.getElementById("receiptContent").innerHTML = `
    <div class="receipt">
      <div class="receipt-header">
        <div class="logo-circle" style="margin:0 auto 8px;width:50px;height:50px;font-size:18px">CA</div>
        <h3>CrediAmiga</h3>
        <p>Recibo de Pago</p>
        <p style="font-size:11px;color:var(--text-muted)">${new Date().toLocaleString("es-DO")}</p>
      </div>
      <hr class="receipt-divider">
      <div class="receipt-row"><span>Cliente</span><strong>${cname}</strong></div>
      <div class="receipt-row"><span>Fecha de Pago</span><strong>${payment.date}</strong></div>
      <hr class="receipt-divider">
      <div class="receipt-row"><span>Cuota</span><strong>${fmt(st.installment)}</strong></div>
      <div class="receipt-row"><span>Abono Capital</span><strong>${fmt(payment.amount)}</strong></div>
      <div class="receipt-row"><span>Mora Aplicada</span><strong style="color:var(--red)">${fmt(payment.mora)}</strong></div>
      <div class="receipt-row"><span>Total Pagado</span><strong>${fmt(payment.total)}</strong></div>
      <hr class="receipt-divider">
      <div class="receipt-row receipt-total"><span>Balance Restante</span><strong>${fmt(payment.balanceAfter)}</strong></div>
    </div>`;

  document.getElementById("receiptModal").style.display = "flex";
}

function printReceipt() {
  const content = document.getElementById("receiptContent").innerHTML;
  const win = window.open("", "_blank");
  win.document.write(`<html><head><title>Recibo CrediAmiga</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
      body{font-family:Poppins,sans-serif;margin:0;padding:20px;color:#1a202c}
      .receipt-header{text-align:center;margin-bottom:16px}
      .logo-circle{width:50px;height:50px;background:linear-gradient(135deg,#2e7d32,#1565c0);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:white;margin:0 auto 8px}
      .receipt-header h3{font-size:20px;font-weight:800;color:#1b5e20}
      .receipt-divider{border:none;border-top:1px dashed #e2e8f0;margin:10px 0}
      .receipt-row{display:flex;justify-content:space-between;padding:6px 0}
      .receipt-row span{color:#718096}.receipt-row strong{font-weight:700}
      .receipt-total{background:#e8f5e9;padding:10px;border-radius:8px}
      .receipt-total strong{color:#1b5e20;font-size:16px}
    </style></head><body>${content}</body></html>`);
  win.document.close();
  win.print();
}

// ─── SCHEDULE MODAL ───────────────────────────────────────────────────────────
function openScheduleModal(loanId) {
  const loan = STATE.loans.find((l) => l.id === loanId);
  const client = STATE.clients.find((c) => c.id === loan.clientId);
  const schedule = buildSchedule(loan);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const payments = STATE.payments.filter((p) => p.loanId === loanId);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const paidInstallments = Math.floor(
    totalPaid /
      calcInstallment(loan.amount, loan.rate, loan.installments).installment,
  );
  const cname = client ? `${client.name} ${client.lastname}` : "Sin cliente";

  let rows = schedule
    .map((row, i) => {
      const isPaid = i < paidInstallments;
      const isLate = !isPaid && new Date(row.dueDate) < today;
      const cls = isPaid ? "paid" : isLate ? "late" : "";
      return `<tr class="${cls}">
      <td>${row.num}</td>
      <td>${new Date(row.dueDate).toLocaleDateString("es-DO")}</td>
      <td>${fmt(row.principal)}</td>
      <td>${fmt(row.interest)}</td>
      <td>${fmt(row.installment)}</td>
      <td>${fmt(row.balance)}</td>
      <td>${isPaid ? '<span class="status-badge status-paid">Pagado</span>' : isLate ? '<span class="status-badge status-late">Atrasado</span>' : '<span class="status-badge status-active">Pendiente</span>'}</td>
    </tr>`;
    })
    .join("");

  document.getElementById("scheduleContent").innerHTML = `
    <div style="margin-bottom:12px;font-size:13px;color:var(--text-muted)">
      <strong style="color:var(--text)">${cname}</strong> · ${fmt(loan.amount)} · ${loan.rate}% · ${typeLabel(loan.type)} · Inicio: ${loan.date}
    </div>
    <table class="schedule-table">
      <thead><tr><th>#</th><th>Fecha</th><th>Capital</th><th>Interés</th><th>Cuota</th><th>Balance</th><th>Estado</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  document.getElementById("scheduleModal").style.display = "flex";
}

function printSchedule() {
  const content = document.getElementById("scheduleContent").innerHTML;
  const win = window.open("", "_blank");
  win.document.write(`<html><head><title>Cronograma CrediAmiga</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      body{font-family:Poppins,sans-serif;margin:20px;font-size:12px}
      table{width:100%;border-collapse:collapse}
      th{background:#2e7d32;color:white;padding:8px 10px;text-align:left}
      td{padding:8px 10px;border-bottom:1px solid #e2e8f0}
      tr.paid td{background:#e8f5e9;color:#718096}
      tr.late td{background:#fde8e8}
      h2{color:#1b5e20}
    </style></head><body>
    <h2><i>CrediAmiga</i> — Cronograma de Pagos</h2>
    ${content}
    </body></html>`);
  win.document.close();
  win.print();
}

// ─── PAYMENT HISTORY ──────────────────────────────────────────────────────────
function openPaymentHistory(loanId) {
  const loan = STATE.loans.find((l) => l.id === loanId);
  const client = STATE.clients.find((c) => c.id === loan.clientId);
  const payments = STATE.payments.filter((p) => p.loanId === loanId);
  const cname = client ? `${client.name} ${client.lastname}` : "Sin cliente";

  let rows =
    payments.length === 0
      ? '<tr><td colspan="5" style="text-align:center;padding:16px;color:#718096">Sin pagos registrados</td></tr>'
      : payments
          .map(
            (p) => `
        <tr>
          <td>${p.date}</td>
          <td>${fmt(p.amount)}</td>
          <td style="color:var(--red)">${fmt(p.mora)}</td>
          <td>${fmt(p.total)}</td>
          <td>${fmt(p.balanceAfter)}</td>
        </tr>`,
          )
          .join("");

  document.getElementById("scheduleContent").innerHTML = `
    <div style="margin-bottom:12px;font-size:13px">
      <strong>${cname}</strong> — Historial de Pagos
    </div>
    <table class="history-table">
      <thead><tr><th>Fecha</th><th>Capital</th><th>Mora</th><th>Total Pagado</th><th>Balance</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  document.getElementById("scheduleModal").style.display = "flex";
}

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────
function populateDocLoanSelect() {
  const sel = document.getElementById("docLoanSelect");
  sel.innerHTML = '<option value="">-- Seleccionar préstamo --</option>';
  STATE.loans.forEach((loan) => {
    const client = STATE.clients.find((c) => c.id === loan.clientId);
    const cname = client ? `${client.name} ${client.lastname}` : "Sin cliente";
    const opt = document.createElement("option");
    opt.value = loan.id;
    opt.textContent = `${cname} — ${fmt(loan.amount)} — ${loan.date}`;
    sel.appendChild(opt);
  });
}

function renderDocuments() {
  const loanId = document.getElementById("docLoanSelect").value;
  const el = document.getElementById("documentContent");
  if (!loanId) {
    el.innerHTML = "";
    return;
  }

  const loan = STATE.loans.find((l) => l.id === loanId);
  if (!loan) {
    el.innerHTML = '<p class="empty-msg">Préstamo no encontrado</p>';
    return;
  }

  const client = STATE.clients.find((c) => c.id === loan.clientId);
  if (!client) {
    el.innerHTML =
      '<p class="empty-msg">Cliente no encontrado. Verifique que el cliente del préstamo existe.</p>';
    return;
  }

  const st = loanStatus(loan);

  const schedule = buildSchedule(loan);

  el.innerHTML = `
    <div id="contractDoc" style="max-width:720px;margin:20px auto;font-size:13px;line-height:1.7">
      <div style="text-align:center;margin-bottom:24px">
        <div class="logo-circle" style="margin:0 auto 8px;width:56px;height:56px;font-size:20px;background:linear-gradient(135deg,#2e7d32,#1565c0);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;color:white">CA</div>
        <h2 style="color:#1b5e20;margin:0">CrediAmiga</h2>
        <p style="color:#718096;margin:0">CONTRATO DE PRÉSTAMO</p>
        <p style="font-size:11px;color:#718096">No. ${loan.id.toUpperCase().substr(-8)}</p>
      </div>
      <p>En la ciudad de Santo Domingo, República Dominicana, el día <strong>${loan.date}</strong>, se establece el siguiente contrato de préstamo entre las partes:</p>
      <h4 style="color:#2e7d32;border-bottom:1px solid #e2e8f0;padding-bottom:4px">DATOS DEL PRESTATARIO</h4>
      <p><strong>Nombre:</strong> ${client.name} ${client.lastname}<br>
         <strong>Cédula:</strong> ${client.cedula}<br>
         <strong>Teléfono:</strong> ${client.phone}<br>
         <strong>Ocupación:</strong> ${client.occupation || "—"}<br>
         <strong>Dirección:</strong> ${client.address || "—"}</p>
      <h4 style="color:#2e7d32;border-bottom:1px solid #e2e8f0;padding-bottom:4px">CONDICIONES DEL PRÉSTAMO</h4>
      <p><strong>Monto Prestado:</strong> ${fmt(loan.amount)}<br>
         <strong>Tasa de Interés:</strong> ${loan.rate}%<br>
         <strong>Total a Pagar:</strong> ${fmt(st.total)}<br>
         <strong>Cuota:</strong> ${fmt(st.installment)}<br>
         <strong>Número de Cuotas:</strong> ${loan.installments}<br>
         <strong>Frecuencia de Pago:</strong> ${typeLabel(loan.type)}<br>
         <strong>Mora Diaria:</strong> ${loan.moraRate || 0.5}%<br>
         <strong>Fecha de Inicio:</strong> ${loan.date}</p>
      ${loan.notes ? `<p><strong>Notas:</strong> ${loan.notes}</p>` : ""}
      <h4 style="color:#2e7d32;border-bottom:1px solid #e2e8f0;padding-bottom:4px">CRONOGRAMA DE PAGOS</h4>
      <table class="schedule-table" style="font-size:11px">
        <thead><tr><th>#</th><th>Fecha</th><th>Capital</th><th>Interés</th><th>Cuota</th><th>Balance</th></tr></thead>
        <tbody>
          ${schedule
            .map(
              (r) => `<tr>
            <td>${r.num}</td>
            <td>${new Date(r.dueDate).toLocaleDateString("es-DO")}</td>
            <td>${fmt(r.principal)}</td>
            <td>${fmt(r.interest)}</td>
            <td>${fmt(r.installment)}</td>
            <td>${fmt(r.balance)}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
      <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:20px;text-align:center">
        <div>
          <div style="border-top:1px solid #000;padding-top:6px;margin-top:40px">Firma del Prestamista</div>
        </div>
        <div>
          <div style="border-top:1px solid #000;padding-top:6px;margin-top:40px">Firma del Prestatario: ${client.name} ${client.lastname}</div>
        </div>
      </div>
    </div>
    <div style="text-align:center;margin-top:16px">
      <button class="btn-primary" style="font-size:15px;padding:12px 28px" onclick="printContract()">
        <i class="fas fa-print"></i> Imprimir Contrato
      </button>
    </div>`;
}

function printContract() {
  const content = document.getElementById("contractDoc").innerHTML;
  const win = window.open("", "_blank");
  win.document.write(`<html><head><title>Contrato CrediAmiga</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
      body{font-family:Poppins,sans-serif;margin:30px;font-size:13px;line-height:1.7;color:#1a202c}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{background:#2e7d32;color:white;padding:7px 10px;text-align:left}
      td{padding:7px 10px;border-bottom:1px solid #e2e8f0}
      h2{color:#1b5e20;margin:0}h4{color:#2e7d32}
    </style></head><body>${content}</body></html>`);
  win.document.close();
  win.print();
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────
function renderReports() {
  let totalLent = 0,
    totalCollected = 0,
    totalMora = 0,
    totalInterest = 0;
  const allPayments = [];

  STATE.loans.forEach((loan) => {
    const st = loanStatus(loan);
    const client = STATE.clients.find((c) => c.id === loan.clientId);
    const cname = client ? `${client.name} ${client.lastname}` : "Sin cliente";
    totalLent += loan.amount;
    totalInterest += st.interest;
    totalMora += st.mora;
    STATE.payments
      .filter((p) => p.loanId === loan.id)
      .forEach((p) => {
        totalCollected += p.total;
        allPayments.push({ ...p, cname });
      });
  });

  document.getElementById("repTotalLent").textContent = fmt(totalLent);
  document.getElementById("repTotalCollected").textContent =
    fmt(totalCollected);
  document.getElementById("repTotalMora").textContent = fmt(totalMora);
  document.getElementById("repInterest").textContent = fmt(totalInterest);

  allPayments.sort((a, b) => b.date.localeCompare(a.date));

  const tbody = document.getElementById("allPaymentsBody");
  if (allPayments.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="empty-msg">Sin pagos registrados</td></tr>';
    return;
  }
  tbody.innerHTML = allPayments
    .map(
      (p) => `
    <tr>
      <td>${p.date}</td>
      <td>${p.cname}</td>
      <td>${fmt(p.amount)}</td>
      <td style="color:var(--red)">${fmt(p.mora)}</td>
      <td>${fmt(p.total)}</td>
    </tr>`,
    )
    .join("");
}

// ─── EXPORT / IMPORT ──────────────────────────────────────────────────────────
function exportJSON() {
  const data = JSON.stringify(STATE, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `crediamiga_backup_${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showNotif("Datos exportados en JSON");
}

function exportPDF() {
  const today = new Date().toLocaleDateString("es-DO");
  let totalLent = 0,
    totalCollected = 0,
    lateCount = 0;
  STATE.loans.forEach((loan) => {
    const st = loanStatus(loan);
    totalLent += loan.amount;
    totalCollected += st.totalPaid;
    if (st.status === "late") lateCount++;
  });

  let loanRows = STATE.loans
    .map((loan) => {
      const client = STATE.clients.find((c) => c.id === loan.clientId);
      const st = loanStatus(loan);
      const cname = client
        ? `${client.name} ${client.lastname}`
        : "Sin cliente";
      return `<tr>
      <td>${cname}</td><td>${fmt(loan.amount)}</td>
      <td>${loan.rate}%</td><td>${typeLabel(loan.type)}</td>
      <td>${fmt(st.installment)}</td><td>${loan.date}</td>
      <td>${{ active: "Al día", late: "En atraso", paid: "Pagado" }[st.status]}</td>
      <td>${fmt(st.balance)}</td>
    </tr>`;
    })
    .join("");

  const win = window.open("", "_blank");
  win.document.write(`<html><head><title>Reporte CrediAmiga</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
      body{font-family:Poppins,sans-serif;margin:30px;color:#1a202c;font-size:13px}
      h1{color:#1b5e20;margin-bottom:4px}
      .meta{color:#718096;margin-bottom:20px}
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
      .stat{background:#e8f5e9;padding:14px;border-radius:8px}
      .stat span{font-size:11px;color:#718096;display:block}
      .stat strong{font-size:18px;color:#1b5e20}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#2e7d32;color:white;padding:8px 10px;text-align:left}
      td{padding:8px 10px;border-bottom:1px solid #e2e8f0}
    </style></head><body>
    <h1>CrediAmiga — Reporte General</h1>
    <div class="meta">Generado el ${today} · Total de clientes: ${STATE.clients.length} · Total de préstamos: ${STATE.loans.length}</div>
    <div class="stats">
      <div class="stat"><span>Total Prestado</span><strong>${fmt(totalLent)}</strong></div>
      <div class="stat"><span>Total Cobrado</span><strong>${fmt(totalCollected)}</strong></div>
      <div class="stat"><span>Balance</span><strong>${fmt(totalLent - totalCollected)}</strong></div>
      <div class="stat"><span>En Atraso</span><strong>${lateCount} préstamo${lateCount !== 1 ? "s" : ""}</strong></div>
    </div>
    <h3 style="color:#2e7d32">Detalle de Préstamos</h3>
    <table>
      <thead><tr><th>Cliente</th><th>Monto</th><th>Tasa</th><th>Tipo</th><th>Cuota</th><th>Fecha</th><th>Estado</th><th>Balance</th></tr></thead>
      <tbody>${loanRows || '<tr><td colspan="8" style="text-align:center">Sin préstamos</td></tr>'}</tbody>
    </table>
    </body></html>`);
  win.document.close();
  win.print();
  showNotif("PDF generado para imprimir");
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.clients || !data.loans) {
        showNotif("Archivo inválido", "error");
        return;
      }
      if (
        !confirm(
          `¿Importar datos? Se reemplazarán los datos actuales.\nClientes: ${data.clients.length} · Préstamos: ${data.loans.length}`,
        )
      )
        return;
      STATE = data;
      saveState();
      refreshDashboard();
      renderClients();
      renderLoans();
      renderPayments();
      showNotif("Datos importados exitosamente");
    } catch {
      showNotif("Error al leer el archivo JSON", "error");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

// ─── AUTO SAVE every 30 seconds ───────────────────────────────────────────────
setInterval(() => {
  saveState();
}, 30000);
