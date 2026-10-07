import {
  auth, db, onAuthStateChanged, signOut, doc, getDoc, updateDoc, setDoc,
  collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, deleteDoc
} from "./firebase.js";

const $ = id => document.getElementById(id);
let adminUser = null, customers = [];

const msg = (text,type="success") => { const e=$("adminMessage"); e.textContent=text; e.className=`message ${type}`; setTimeout(()=>e.classList.add("hidden"),3500); };
const money = n => `₹${Number(n||0).toLocaleString("en-IN",{minimumFractionDigits:2})}`;
const dateText = d => d?.toDate ? d.toDate().toLocaleDateString("en-IN") : "-";
const esc = v => String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

onAuthStateChanged(auth, async user => {
  if (!user) return location.href="index.html";
  const snap=await getDoc(doc(db,"users",user.uid));
  if (!snap.exists() || snap.data().role!=="admin") return location.href="customer.html";
  adminUser={uid:user.uid,...snap.data()}; $("adminName").textContent=adminUser.name||user.email;
  await loadAll();
});
$("logoutBtn").onclick=()=>signOut(auth).then(()=>location.href="index.html");
$("refreshBtn").onclick=loadAll;
$("closeModal").onclick=()=>$("customerModal").classList.add("hidden");

async function loadAll(){
  await Promise.all([loadRequests(),loadCustomers(),loadPayments(),loadIssues()]);
}
async function loadRequests(){
  const snap=await getDocs(query(collection(db,"registrationRequests"),where("requestStatus","==","pending")));
  const rows=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  $("pendingRegistrations").textContent=rows.length;
  $("requestsTable").innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.mobile)}</td><td>${esc(r.address)}</td><td>${esc(r.email)}</td><td>${dateText(r.createdAt)}</td><td><button class="btn success approve-btn" data-id="${r.id}">Approve & Meter</button><button class="btn danger reject-btn" data-id="${r.id}">Reject</button></td></tr>`).join(""):`<tr><td colspan="6">No pending registration requests.</td></tr>`;
  document.querySelectorAll(".approve-btn").forEach(b=>b.onclick=()=>approveCustomer(b.dataset.id));
  document.querySelectorAll(".reject-btn").forEach(b=>b.onclick=()=>rejectCustomer(b.dataset.id));
}
async function loadCustomers(){
  const snap=await getDocs(query(collection(db,"users"),where("role","==","customer")));
  customers=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  $("totalCustomers").textContent=customers.length;
  $("activeMeters").textContent=customers.filter(c=>c.meterNumber&&c.status==="active").length;
  $("customersTable").innerHTML=customers.length?customers.map(c=>`<tr><td><b>${esc(c.name)}</b><br><small>${esc(c.email)}</small></td><td>${esc(c.meterNumber||"Not assigned")}</td><td>${esc(c.mobile)}</td><td>${esc(c.address)}</td><td><span class="status ${c.status}">${c.status}</span></td><td><button class="btn outline edit-btn" data-id="${c.id}">Edit</button> <button class="btn danger delete-btn" data-id="${c.id}">Delete</button></td></tr>`).join(""):`<tr><td colspan="6">No customers.</td></tr>`;
  $("billCustomer").innerHTML='<option value="">Select customer</option>'+customers.filter(c=>c.status==="active").map(c=>`<option value="${c.id}">${esc(c.name)} - ${esc(c.meterNumber||"No meter")}</option>`).join("");
  document.querySelectorAll(".edit-btn").forEach(b=>b.onclick=()=>openEdit(b.dataset.id));
  document.querySelectorAll(".delete-btn").forEach(b=>b.onclick=()=>deleteCustomer(b.dataset.id));
}
async function generateMeter(){
  for(let i=0;i<20;i++){
    const n="MPEZ-"+Math.floor(10000000+Math.random()*90000000);
    const snap=await getDocs(query(collection(db,"users"),where("meterNumber","==",n)));
    if(snap.empty) return n;
  }
  throw new Error("Could not generate unique meter number. Try again.");
}
async function approveCustomer(uid){
  try{
    const request=await getDoc(doc(db,"registrationRequests",uid)); if(!request.exists()) throw new Error("Request not found.");
    const r=request.data(), meter=await generateMeter();
    await updateDoc(doc(db,"users",uid),{meterNumber:meter,status:"active",updatedAt:serverTimestamp(),approvedAt:serverTimestamp(),approvedBy:adminUser.uid});
    await updateDoc(doc(db,"registrationRequests",uid),{requestStatus:"approved",meterNumber:meter,reviewedAt:serverTimestamp(),reviewedBy:adminUser.uid});
    msg(`Customer approved. Meter ${meter} allocated.`); loadAll();
  }catch(e){msg(e.message,"error")}
}
async function rejectCustomer(uid){
  await updateDoc(doc(db,"users",uid),{status:"rejected",updatedAt:serverTimestamp()});
  await updateDoc(doc(db,"registrationRequests",uid),{requestStatus:"rejected",reviewedAt:serverTimestamp(),reviewedBy:adminUser.uid});
  msg("Registration rejected."); loadAll();
}

async function deleteCustomer(uid){
  const c=customers.find(x=>x.id===uid);
  if(!c) return;
  if(!confirm(`Delete Firestore customer record for ${c.name}? The Firebase Authentication account is not deleted by this browser-only demo.`)) return;
  await deleteDoc(doc(db,"users",uid));
  try { await deleteDoc(doc(db,"registrationRequests",uid)); } catch(e) {}
  msg("Customer Firestore record deleted. Auth account must be removed separately from Firebase Console.");
  loadCustomers();
}

function openEdit(uid){
  const c=customers.find(x=>x.id===uid); if(!c)return;
  $("editUid").value=uid;$("editName").value=c.name||"";$("editAge").value=c.age||"";
  $("editMobile").value=c.mobile||"";$("editAddress").value=c.address||"";
  $("editMeter").value=c.meterNumber||"";$("editStatus").value=c.status||"pending";
  $("modalTitle").textContent=`Edit: ${c.name}`;$("customerModal").classList.remove("hidden");
}
$("customerEditForm").onsubmit=async e=>{
  e.preventDefault(); const uid=$("editUid").value;
  let meter=$("editMeter").value.trim();
  if(!meter) meter=await generateMeter();
  await updateDoc(doc(db,"users",uid),{name:$("editName").value.trim(),age:Number($("editAge").value),mobile:$("editMobile").value.trim(),address:$("editAddress").value.trim(),meterNumber:meter,status:$("editStatus").value,updatedAt:serverTimestamp()});
  $("customerModal").classList.add("hidden");msg("Customer updated.");loadCustomers();
};
$("billForm").onsubmit=async e=>{
  e.preventDefault(); const uid=$("billCustomer").value;
  const c=customers.find(x=>x.id===uid); if(!c)return;
  const billNo="BILL-"+Date.now();
  await addDoc(collection(db,"bills"),{billNo,customerId:uid,customerName:c.name,meterNumber:c.meterNumber,month:$("billMonth").value,units:Number($("billUnits").value),amount:Number($("billAmount").value),dueDate:new Date($("billDueDate").value+"T23:59:59"),status:"unpaid",createdAt:serverTimestamp(),createdBy:adminUser.uid});
  e.target.reset();msg(`Bill ${billNo} generated.`);loadPayments();
};
async function loadPayments(){
  const snap=await getDocs(query(collection(db,"paymentRequests"),orderBy("createdAt","desc")));
  const rows=snap.docs.map(d=>({id:d.id,...d.data()}));
  $("paymentsTable").innerHTML=rows.length?rows.map(p=>`<tr><td>${esc(p.customerName||p.customerId)}</td><td>${esc(p.billId)}</td><td>${money(p.amount)}</td><td>${dateText(p.createdAt)}</td><td><span class="status ${p.status}">${p.status}</span></td><td>${p.status==="pending"?`<button class="btn success payment-btn" data-id="${p.id}" data-bill="${p.billId}">Mark Paid</button>`:"-"}</td></tr>`).join(""):`<tr><td colspan="6">No payment requests.</td></tr>`;
  document.querySelectorAll(".payment-btn").forEach(b=>b.onclick=()=>markPaid(b.dataset.id,b.dataset.bill));
}
async function markPaid(pid,billId){
  await updateDoc(doc(db,"paymentRequests",pid),{status:"approved",approvedAt:serverTimestamp(),approvedBy:adminUser.uid});
  await updateDoc(doc(db,"bills",billId),{status:"paid",paidAt:serverTimestamp(),paidVia:"Admin verified"});
  msg("Payment verified and bill marked paid.");loadPayments();
}
async function loadIssues(){
  const [cSnap,sSnap]=await Promise.all([
    getDocs(query(collection(db,"complaints"),orderBy("createdAt","desc"))),
    getDocs(query(collection(db,"serviceRequests"),orderBy("createdAt","desc")))
  ]);
  const rows=[...cSnap.docs.map(d=>({id:d.id,kind:"Complaint",...d.data()})),...sSnap.docs.map(d=>({id:d.id,kind:"Service",...d.data()}))].sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  $("adminOpenComplaints").textContent=rows.filter(x=>x.kind==="Complaint"&&x.status==="open").length;
  $("issuesTable").innerHTML=rows.length?rows.map(x=>`<tr><td>${esc(x.customerName||x.customerId)}</td><td>${esc(x.kind)}: ${esc(x.type)}</td><td>${esc(x.description)}</td><td>${dateText(x.createdAt)}</td><td><span class="status ${x.status}">${x.status}</span></td><td>${x.status==="open"?`<button class="btn success resolve-btn" data-id="${x.id}" data-kind="${x.kind}">Resolve</button>`:"Resolved"}</td></tr>`).join(""):`<tr><td colspan="6">No complaints or service requests.</td></tr>`;
  document.querySelectorAll(".resolve-btn").forEach(b=>b.onclick=()=>resolveIssue(b.dataset.id,b.dataset.kind));
}
async function resolveIssue(id,kind){
  const col=kind==="Complaint"?"complaints":"serviceRequests";
  await updateDoc(doc(db,col,id),{status:"resolved",updatedAt:serverTimestamp(),resolvedBy:adminUser.uid});
  msg(`${kind} resolved.`);loadIssues();
}