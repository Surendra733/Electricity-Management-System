import {
  auth, db, onAuthStateChanged, signOut, doc, getDoc, updateDoc,
  collection, query, where, orderBy, getDocs, addDoc, serverTimestamp
} from "./firebase.js";

const $ = id => document.getElementById(id);
let currentUser = null, profile = null;

const showMessage = (text, type="success") => {
  const el = $("pageMessage"); el.textContent = text; el.className = `message ${type}`;
  setTimeout(() => el.classList.add("hidden"), 3500);
};
const money = n => `₹${Number(n || 0).toLocaleString("en-IN", {minimumFractionDigits:2})}`;
const dateText = d => d?.toDate ? d.toDate().toLocaleDateString("en-IN") : "-";

onAuthStateChanged(auth, async user => {
  if (!user) return location.href = "index.html";
  currentUser = user;
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return location.href = "index.html";
  profile = snap.data();
  if (profile.role === "admin") return location.href = "admin.html";
  renderProfile();
  await Promise.all([loadBills(), loadComplaints(), loadServices()]);
});

$("logoutBtn").onclick = () => signOut(auth).then(() => location.href = "index.html");

function renderProfile() {
  $("welcomeName").textContent = profile.name;
  $("customerGreeting").textContent = `Hello, ${profile.name}`;
  $("meterNumber").textContent = profile.meterNumber || "Pending Approval";
  $("accountStatus").innerHTML = `<span class="status ${profile.status}">${profile.status}</span>`;
  $("profileDetails").innerHTML = `
    <div class="detail-item"><span>Name</span><strong>${esc(profile.name)}</strong></div>
    <div class="detail-item"><span>Age</span><strong>${profile.age}</strong></div>
    <div class="detail-item"><span>Mobile</span><strong>${esc(profile.mobile)}</strong></div>
    <div class="detail-item"><span>Email</span><strong>${esc(profile.email)}</strong></div>
    <div class="detail-item" style="grid-column:1/-1"><span>Address</span><strong>${esc(profile.address)}</strong></div>`;
}

async function loadBills() {
  const q = query(collection(db, "bills"), where("customerId","==",currentUser.uid));
  const snap = await getDocs(q);
  const bills = snap.docs.map(d => ({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  const pending = bills.filter(b => b.status !== "paid");
  $("pendingBills").textContent = pending.length;
  $("currentBill").textContent = bills[0] ? money(bills[0].amount) : "₹0";
  $("billsTable").innerHTML = bills.length ? bills.map(b => `
    <tr><td>${esc(b.billNo)}</td><td>${esc(b.month)}</td><td>${b.units}</td><td>${money(b.amount)}</td>
    <td>${dateText(b.dueDate)}</td><td><span class="status ${b.status}">${b.status}</span></td>
    <td>${b.status !== "paid" ? `<button class="btn primary pay-btn" data-id="${b.id}" data-amount="${b.amount}">Request Payment</button>` : "Paid ✓"}</td></tr>`).join("") : `<tr><td colspan="7">No bills available.</td></tr>`;
  $("latestBill").innerHTML = bills[0] ? `<div class="bill-box"><div>Bill ${esc(bills[0].billNo)}</div><div class="amount">${money(bills[0].amount)}</div><div class="bill-meta"><span>Units: <b>${bills[0].units}</b></span><span>Month: <b>${esc(bills[0].month)}</b></span><span>Due: <b>${dateText(bills[0].dueDate)}</b></span><span>Status: <b>${bills[0].status}</b></span></div></div>` : `<p class="muted">No bill generated yet.</p>`;
  document.querySelectorAll(".pay-btn").forEach(btn => btn.onclick = () => requestPayment(btn.dataset.id, Number(btn.dataset.amount)));
}
async function requestPayment(billId, amount) {
  await addDoc(collection(db,"paymentRequests"), {billId, customerId:currentUser.uid, customerName:profile.name, amount, status:"pending", createdAt:serverTimestamp()});
  showMessage("Payment request sent to admin. This demo does not process real money.");
}
async function loadComplaints() {
  const q = query(collection(db,"complaints"),where("customerId","==",currentUser.uid));
  const snap = await getDocs(q); const arr = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  $("openComplaints").textContent = arr.filter(x=>x.status==="open").length;
  $("complaintsList").innerHTML = arr.map(x=>`<div class="list-item"><strong>${esc(x.type)} <span class="status ${x.status}">${x.status}</span></strong><p>${esc(x.description)}</p><small>${dateText(x.createdAt)}</small></div>`).join("") || `<p class="muted">No complaints.</p>`;
}
async function loadServices() {
  const q = query(collection(db,"serviceRequests"),where("customerId","==",currentUser.uid));
  const snap = await getDocs(q); const arr = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  $("serviceList").innerHTML = arr.map(x=>`<div class="list-item"><strong>${esc(x.type)} <span class="status ${x.status}">${x.status}</span></strong><p>${esc(x.description)}</p><small>${dateText(x.createdAt)}</small></div>`).join("") || `<p class="muted">No service requests.</p>`;
}
$("complaintForm").onsubmit = async e => {
  e.preventDefault();
  await addDoc(collection(db,"complaints"),{customerId:currentUser.uid,customerName:profile.name,type:$("complaintType").value,description:$("complaintDescription").value.trim(),status:"open",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  e.target.reset(); showMessage("Complaint submitted."); loadComplaints();
};
$("serviceForm").onsubmit = async e => {
  e.preventDefault();
  await addDoc(collection(db,"serviceRequests"),{customerId:currentUser.uid,customerName:profile.name,type:$("serviceType").value,description:$("serviceDescription").value.trim(),status:"open",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  e.target.reset(); showMessage("Service request submitted."); loadServices();
};
function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}