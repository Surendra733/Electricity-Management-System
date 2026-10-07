import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from "./firebase.js";

const $ = id => document.getElementById(id);

let currentUser = null;
let profile = null;
let billsCache = [];


/* =========================================================
   COMMON FUNCTIONS
========================================================= */

const showMessage = (text, type = "success") => {
  const el = $("pageMessage");

  el.textContent = text;
  el.className = `message ${type}`;

  setTimeout(() => {
    el.classList.add("hidden");
  }, 3500);
};


const money = n => {
  return `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};


const dateText = d => {

  if (!d) return "-";

  if (d.toDate) {
    return d.toDate().toLocaleDateString("en-IN");
  }

  if (d instanceof Date) {
    return d.toLocaleDateString("en-IN");
  }

  return "-";
};


const esc = (v = "") => {

  return String(v).replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
  );

};


/* =========================================================
   AUTHENTICATION
========================================================= */

onAuthStateChanged(auth, async user => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  currentUser = user;

  try {

    const snap = await getDoc(
      doc(db, "users", user.uid)
    );

    if (!snap.exists()) {

      location.href = "index.html";
      return;

    }

    profile = snap.data();

    if (profile.role === "admin") {

      location.href = "admin.html";
      return;

    }

    renderProfile();

    await Promise.all([
      loadBills(),
      loadComplaints(),
      loadServices()
    ]);

  } catch (error) {

    console.error(error);

    showMessage(
      "Unable to load customer account.",
      "error"
    );

  }

});


/* =========================================================
   LOGOUT
========================================================= */

$("logoutBtn").onclick = async () => {

  try {

    await signOut(auth);

    location.href = "index.html";

  } catch (error) {

    console.error(error);

  }

};


/* =========================================================
   CUSTOMER PROFILE
========================================================= */

function renderProfile() {

  $("welcomeName").textContent =
    profile.name || "Customer";

  $("customerGreeting").textContent =
    `Hello, ${profile.name || "Customer"}`;

  $("meterNumber").textContent =
    profile.meterNumber || "Pending Approval";

  $("accountStatus").innerHTML = `
    <span class="status ${profile.status || "pending"}">
      ${esc(profile.status || "pending")}
    </span>
  `;


  $("profileDetails").innerHTML = `

    <div class="detail-item">
      <span>Name</span>
      <strong>${esc(profile.name)}</strong>
    </div>

    <div class="detail-item">
      <span>Age</span>
      <strong>${esc(profile.age)}</strong>
    </div>

    <div class="detail-item">
      <span>Mobile</span>
      <strong>${esc(profile.mobile)}</strong>
    </div>

    <div class="detail-item">
      <span>Email</span>
      <strong>${esc(profile.email)}</strong>
    </div>

    <div class="detail-item" style="grid-column:1/-1">
      <span>Address</span>
      <strong>${esc(profile.address)}</strong>
    </div>

  `;

}


/* =========================================================
   LOAD BILLS
========================================================= */

async function loadBills() {

  try {

    const q = query(
      collection(db, "bills"),
      where("customerId", "==", currentUser.uid)
    );

    const snap = await getDocs(q);

    const bills = snap.docs
      .map(d => ({
        id: d.id,
        ...d.data()
      }))
      .sort(
        (a, b) =>
          (b.createdAt?.seconds || 0) -
          (a.createdAt?.seconds || 0)
      );


    billsCache = bills;


    const pending =
      bills.filter(
        b => b.status !== "paid"
      );


    $("pendingBills").textContent =
      pending.length;


    $("currentBill").textContent =
      bills[0]
        ? money(bills[0].amount)
        : "₹0";


    /* =====================================================
       BILL TABLE
    ===================================================== */

    $("billsTable").innerHTML =
      bills.length

        ? bills.map(b => `

          <tr>

            <td>
              ${esc(b.billNo || "-")}
            </td>

            <td>
              ${esc(b.month || "-")}
            </td>

            <td>
              ${esc(b.units || 0)}
            </td>

            <td>
              ${money(b.amount)}
            </td>

            <td>
              ${dateText(b.dueDate)}
            </td>

            <td>
              <span class="status ${b.status || "pending"}">
                ${esc(b.status || "pending")}
              </span>
            </td>

            <td>

              ${
                b.status !== "paid"

                ? `
                  <button
                    class="btn primary pay-btn"
                    data-id="${b.id}"
                    data-amount="${b.amount}">
                    Request Payment
                  </button>
                `

                : "Paid ✓"
              }

              <br>

              <button
                class="btn outline download-bill-btn"
                data-id="${b.id}"
                style="margin-top:6px;">
                📄 Download Electricity Bill PDF
              </button>

            </td>

          </tr>

        `).join("")

        : `
          <tr>
            <td colspan="7">
              No bills available.
            </td>
          </tr>
        `;


    /* =====================================================
       LATEST BILL
    ===================================================== */

    $("latestBill").innerHTML = bills[0]

      ? `

        <div class="bill-box">

          <div>
            Bill ${esc(bills[0].billNo || "-")}
          </div>

          <div class="amount">
            ${money(bills[0].amount)}
          </div>

          <div class="bill-meta">

            <span>
              Units:
              <b>${esc(bills[0].units || 0)}</b>
            </span>

            <span>
              Month:
              <b>${esc(bills[0].month || "-")}</b>
            </span>

            <span>
              Due:
              <b>${dateText(bills[0].dueDate)}</b>
            </span>

            <span>
              Status:
              <b>${esc(bills[0].status || "pending")}</b>
            </span>

          </div>

          <button
            class="btn primary"
            id="latestBillDownload"
            style="margin-top:15px;">

            📄 Download Electricity Bill PDF

          </button>

        </div>

      `

      : `
        <p class="muted">
          No bill generated yet.
        </p>
      `;


    /* =====================================================
       PAYMENT BUTTON
    ===================================================== */

    document
      .querySelectorAll(".pay-btn")
      .forEach(btn => {

        btn.onclick = () => {

          requestPayment(
            btn.dataset.id,
            Number(btn.dataset.amount)
          );

        };

      });


    /* =====================================================
       DOWNLOAD BUTTONS
    ===================================================== */

    document
      .querySelectorAll(".download-bill-btn")
      .forEach(btn => {

        btn.onclick = () => {

          const bill = billsCache.find(
            x => x.id === btn.dataset.id
          );

          if (bill) {

            downloadBillPDF(bill);

          }

        };

      });


    const latestDownload =
      $("latestBillDownload");

    if (latestDownload && bills[0]) {

      latestDownload.onclick = () => {

        downloadBillPDF(bills[0]);

      };

    }

  } catch (error) {

    console.error("Bills Error:", error);

    showMessage(
      "Unable to load bills.",
      "error"
    );

  }

}


/* =========================================================
   PAYMENT REQUEST
========================================================= */

async function requestPayment(
  billId,
  amount
) {

  try {

    await addDoc(
      collection(db, "paymentRequests"),
      {

        billId,

        customerId:
          currentUser.uid,

        customerName:
          profile.name,

        amount,

        status:
          "pending",

        createdAt:
          serverTimestamp()

      }
    );


    showMessage(
      "Payment request sent to admin. This demo does not process real money."
    );

  } catch (error) {

    console.error(error);

    showMessage(
      "Payment request failed.",
      "error"
    );

  }

}


/* =========================================================
   COMPLAINTS
========================================================= */

async function loadComplaints() {

  try {

    const q = query(
      collection(db, "complaints"),
      where(
        "customerId",
        "==",
        currentUser.uid
      )
    );

    const snap = await getDocs(q);

    const arr = snap.docs
      .map(d => ({
        id: d.id,
        ...d.data()
      }))
      .sort(
        (a, b) =>
          (b.createdAt?.seconds || 0) -
          (a.createdAt?.seconds || 0)
      );


    $("openComplaints").textContent =
      arr.filter(
        x => x.status === "open"
      ).length;


    $("complaintsList").innerHTML =

      arr.map(x => `

        <div class="list-item">

          <strong>

            ${esc(x.type)}

            <span class="status ${x.status}">
              ${esc(x.status)}
            </span>

          </strong>

          <p>
            ${esc(x.description)}
          </p>

          <small>
            ${dateText(x.createdAt)}
          </small>

        </div>

      `).join("")

      ||

      `
        <p class="muted">
          No complaints.
        </p>
      `;

  } catch (error) {

    console.error(error);

  }

}


/* =========================================================
   SERVICE REQUESTS
========================================================= */

async function loadServices() {

  try {

    const q = query(
      collection(db, "serviceRequests"),
      where(
        "customerId",
        "==",
        currentUser.uid
      )
    );

    const snap = await getDocs(q);

    const arr = snap.docs
      .map(d => ({
        id: d.id,
        ...d.data()
      }))
      .sort(
        (a, b) =>
          (b.createdAt?.seconds || 0) -
          (a.createdAt?.seconds || 0)
      );


    $("serviceList").innerHTML =

      arr.map(x => `

        <div class="list-item">

          <strong>

            ${esc(x.type)}

            <span class="status ${x.status}">
              ${esc(x.status)}
            </span>

          </strong>

          <p>
            ${esc(x.description)}
          </p>

          <small>
            ${dateText(x.createdAt)}
          </small>

        </div>

      `).join("")

      ||

      `
        <p class="muted">
          No service requests.
        </p>
      `;

  } catch (error) {

    console.error(error);

  }

}


/* =========================================================
   COMPLAINT FORM
========================================================= */

$("complaintForm").onsubmit = async e => {

  e.preventDefault();

  try {

    await addDoc(
      collection(db, "complaints"),
      {

        customerId:
          currentUser.uid,

        customerName:
          profile.name,

        type:
          $("complaintType").value,

        description:
          $("complaintDescription")
            .value
            .trim(),

        status:
          "open",

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()

      }
    );


    e.target.reset();

    showMessage(
      "Complaint submitted."
    );

    loadComplaints();

  } catch (error) {

    console.error(error);

    showMessage(
      "Unable to submit complaint.",
      "error"
    );

  }

};


/* =========================================================
   SERVICE FORM
========================================================= */

$("serviceForm").onsubmit = async e => {

  e.preventDefault();

  try {

    await addDoc(
      collection(db, "serviceRequests"),
      {

        customerId:
          currentUser.uid,

        customerName:
          profile.name,

        type:
          $("serviceType").value,

        description:
          $("serviceDescription")
            .value
            .trim(),

        status:
          "open",

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()

      }
    );


    e.target.reset();

    showMessage(
      "Service request submitted."
    );

    loadServices();

  } catch (error) {

    console.error(error);

    showMessage(
      "Unable to submit service request.",
      "error"
    );

  }

};


/* =========================================================
   LOAD jsPDF LIBRARY
========================================================= */

function loadPDFLibrary() {

  return new Promise((resolve, reject) => {

    /* Already loaded */

    if (
      window.jspdf &&
      window.jspdf.jsPDF
    ) {

      resolve(window.jspdf.jsPDF);

      return;

    }


    const existing =
      document.querySelector(
        'script[data-jspdf="true"]'
      );


    if (existing) {

      existing.addEventListener(
        "load",
        () => {

          if (
            window.jspdf &&
            window.jspdf.jsPDF
          ) {

            resolve(window.jspdf.jsPDF);

          } else {

            reject(
              new Error(
                "jsPDF loaded but not available."
              )
            );

          }

        }
      );


      existing.addEventListener(
        "error",
        () => {

          reject(
            new Error(
              "Unable to load PDF library."
            )
          );

        }
      );

      return;

    }


    /* First CDN */

    const script =
      document.createElement("script");

    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

    script.async = true;

    script.dataset.jspdf = "true";


    script.onload = () => {

      if (
        window.jspdf &&
        window.jspdf.jsPDF
      ) {

        resolve(window.jspdf.jsPDF);

        return;

      }


      /* Second CDN */

      const backup =
        document.createElement("script");

      backup.src =
        "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";

      backup.async = true;

      backup.dataset.jspdf = "true";


      backup.onload = () => {

        if (
          window.jspdf &&
          window.jspdf.jsPDF
        ) {

          resolve(window.jspdf.jsPDF);

        } else {

          reject(
            new Error(
              "PDF library is not available."
            )
          );

        }

      };


      backup.onerror = () => {

        reject(
          new Error(
            "Unable to load PDF library."
          )
        );

      };


      document.head.appendChild(
        backup
      );

    };


    script.onerror = () => {

      /* Try backup directly */

      const backup =
        document.createElement("script");

      backup.src =
        "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";

      backup.async = true;

      backup.dataset.jspdf = "true";


      backup.onload = () => {

        if (
          window.jspdf &&
          window.jspdf.jsPDF
        ) {

          resolve(window.jspdf.jsPDF);

        } else {

          reject(
            new Error(
              "PDF library is not available."
            )
          );

        }

      };


      backup.onerror = () => {

        reject(
          new Error(
            "Unable to load PDF library."
          )
        );

      };


      document.head.appendChild(
        backup
      );

    };


    document.head.appendChild(
      script
    );

  });

}


/* =========================================================
   ELECTRICITY BILL PDF
========================================================= */

async function downloadBillPDF(bill) {

  try {

    showMessage(
      "Generating electricity bill PDF..."
    );


    const jsPDF =
      await loadPDFLibrary();


    const pdf =
      new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });


    /* =====================================================
       COMPANY INFORMATION
    ===================================================== */

    const companyName =
      "UrjaSetu Power Distribution Limited";

    const companyShort =
      "UPDL";

    const companyAddress =
      "Customer Service Centre, Bhopal, Madhya Pradesh - 462001";

    const customerCare =
      "Customer Care: 8319428709";

    const website =
      "www.vsrtsolution.info";


    /* =====================================================
       BILL DATA
    ===================================================== */

    const totalAmount =
      Number(bill.amount || 0);


    const units =
      Number(bill.units || 0);


    /*
      If admin has not stored separate charges,
      we calculate an illustrative breakup
      from the total bill amount.
    */

    let energyCharge =
      Math.round(totalAmount * 0.78 * 100) / 100;

    let fixedCharge =
      Math.round(totalAmount * 0.12 * 100) / 100;

    let electricityDuty =
      Math.round(totalAmount * 0.07 * 100) / 100;

    let otherCharges =
      Math.round(
        (
          totalAmount -
          energyCharge -
          fixedCharge -
          electricityDuty
        ) * 100
      ) / 100;


    if (otherCharges < 0) {
      otherCharges = 0;
    }


    /* =====================================================
       COLORS
    ===================================================== */

    const blue = [20, 83, 150];

    const dark = [30, 30, 30];

    const grey = [100, 100, 100];

    const light = [240, 244, 248];


    /* =====================================================
       HEADER
    ===================================================== */

    pdf.setFillColor(
      blue[0],
      blue[1],
      blue[2]
    );

    pdf.rect(
      0,
      0,
      210,
      38,
      "F"
    );


    /* LIGHTNING LOGO */

    pdf.setTextColor(
      255,
      255,
      255
    );

    pdf.setFontSize(24);

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.text(
      "⚡",
      15,
      23
    );


    pdf.setFontSize(16);

    pdf.text(
      companyName,
      30,
      16
    );


    pdf.setFontSize(9);

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.text(
      companyAddress,
      30,
      23
    );

    pdf.text(
      customerCare,
      30,
      29
    );


    /* =====================================================
       BILL TITLE
    ===================================================== */

    pdf.setTextColor(
      dark[0],
      dark[1],
      dark[2]
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(18);

    pdf.text(
      "ELECTRICITY BILL",
      15,
      52
    );


    pdf.setFontSize(9);

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setTextColor(
      grey[0],
      grey[1],
      grey[2]
    );

    pdf.text(
      "Domestic Electricity Consumption Statement",
      15,
      58
    );


    /* =====================================================
       BILL INFORMATION BOX
    ===================================================== */

    pdf.setFillColor(
      light[0],
      light[1],
      light[2]
    );

    pdf.roundedRect(
      15,
      65,
      180,
      38,
      3,
      3,
      "F"
    );


    pdf.setTextColor(
      dark[0],
      dark[1],
      dark[2]
    );


    pdf.setFontSize(9);

    pdf.setFont(
      "helvetica",
      "bold"
    );


    pdf.text(
      "Bill Number",
      20,
      74
    );

    pdf.text(
      "Billing Month",
      75,
      74
    );

    pdf.text(
      "Meter Number",
      135,
      74
    );


    pdf.setFont(
      "helvetica",
      "normal"
    );


    pdf.text(
      String(bill.billNo || "-"),
      20,
      81
    );

    pdf.text(
      String(bill.month || "-"),
      75,
      81
    );

    pdf.text(
      String(
        profile.meterNumber ||
        "Not Allocated"
      ),
      135,
      81
    );


    pdf.setFont(
      "helvetica",
      "bold"
    );


    pdf.text(
      "Bill Date",
      20,
      92
    );

    pdf.text(
      "Due Date",
      75,
      92
    );

    pdf.text(
      "Payment Status",
      135,
      92
    );


    pdf.setFont(
      "helvetica",
      "normal"
    );


    pdf.text(
      new Date().toLocaleDateString(
        "en-IN"
      ),
      20,
      98
    );

    pdf.text(
      dateText(bill.dueDate),
      75,
      98
    );

    pdf.text(
      String(
        bill.status || "pending"
      ).toUpperCase(),
      135,
      98
    );


    /* =====================================================
       CUSTOMER DETAILS
    ===================================================== */

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(12);

    pdf.text(
      "Consumer Details",
      15,
      116
    );


    pdf.setDrawColor(
      210,
      210,
      210
    );

    pdf.line(
      15,
      119,
      195,
      119
    );


    pdf.setFontSize(9);

    pdf.setTextColor(
      dark[0],
      dark[1],
      dark[2]
    );


    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.text(
      "Consumer Name:",
      15,
      128
    );

    pdf.text(
      "Mobile:",
      110,
      128
    );


    pdf.setFont(
      "helvetica",
      "normal"
    );


    pdf.text(
      String(profile.name || "-"),
      45,
      128
    );

    pdf.text(
      String(profile.mobile || "-"),
      130,
      128
    );


    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.text(
      "Email:",
      15,
      137
    );

    pdf.text(
      "Account Status:",
      110,
      137
    );


    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.text(
      String(profile.email || "-"),
      45,
      137
    );

    pdf.text(
      String(
        profile.status || "active"
      ).toUpperCase(),
      145,
      137
    );


    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.text(
      "Service Address:",
      15,
      146
    );


    pdf.setFont(
      "helvetica",
      "normal"
    );


    const addressLines =
      pdf.splitTextToSize(
        String(profile.address || "-"),
        145
      );


    pdf.text(
      addressLines,
      50,
      146
    );


    /* =====================================================
       METER READING
    ===================================================== */

    let readingY = 163;


    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(12);

    pdf.text(
      "Meter & Consumption Details",
      15,
      readingY
    );


    readingY += 6;


    pdf.setFillColor(
      light[0],
      light[1],
      light[2]
    );


    pdf.rect(
      15,
      readingY,
      180,
      25,
      "F"
    );


    pdf.setFontSize(9);


    pdf.setFont(
      "helvetica",
      "bold"
    );


    pdf.text(
      "Previous Reading",
      25,
      readingY + 9
    );

    pdf.text(
      "Current Reading",
      75,
      readingY + 9
    );

    pdf.text(
      "Units Consumed",
      130,
      readingY + 9
    );


    const previousReading =
      Math.max(
        0,
        units * 10
      );


    const currentReading =
      previousReading + units;


    pdf.setFont(
      "helvetica",
      "normal"
    );


    pdf.text(
      `${previousReading} kWh`,
      25,
      readingY + 17
    );

    pdf.text(
      `${currentReading} kWh`,
      75,
      readingY + 17
    );

    pdf.text(
      `${units} Units`,
      130,
      readingY + 17
    );


    /* =====================================================
       BILL CALCULATION
    ===================================================== */

    const chargeY =
      readingY + 38;


    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(12);

    pdf.text(
      "Bill Calculation",
      15,
      chargeY
    );


    /* Table Header */

    pdf.setFillColor(
      blue[0],
      blue[1],
      blue[2]
    );


    pdf.rect(
      15,
      chargeY + 6,
      180,
      10,
      "F"
    );


    pdf.setTextColor(
      255,
      255,
      255
    );


    pdf.setFontSize(9);

    pdf.text(
      "Description",
      22,
      chargeY + 13
    );

    pdf.text(
      "Amount",
      160,
      chargeY + 13
    );


    /* Table rows */

    pdf.setTextColor(
      dark[0],
      dark[1],
      dark[2]
    );


    pdf.setFont(
      "helvetica",
      "normal"
    );


    const rows = [

      [
        "Energy Consumption Charges",
        energyCharge
      ],

      [
        "Fixed / Meter Charges",
        fixedCharge
      ],

      [
        "Electricity Duty / Tax",
        electricityDuty
      ],

      [
        "Other Charges / Adjustment",
        otherCharges
      ]

    ];


    let rowY =
      chargeY + 23;


    rows.forEach(row => {

      pdf.line(
        15,
        rowY - 5,
        195,
        rowY - 5
      );


      pdf.text(
        row[0],
        22,
        rowY
      );


      pdf.text(
        money(row[1]),
        160,
        rowY
      );


      rowY += 9;

    });


    /* =====================================================
       TOTAL
    ===================================================== */

    pdf.setFillColor(
      light[0],
      light[1],
      light[2]
    );


    pdf.rect(
      15,
      rowY - 3,
      180,
      17,
      "F"
    );


    pdf.setFont(
      "helvetica",
      "bold"
    );


    pdf.setFontSize(12);


    pdf.text(
      "TOTAL AMOUNT PAYABLE",
      22,
      rowY + 8
    );


    pdf.setFontSize(14);


    pdf.text(
      money(totalAmount),
      150,
      rowY + 8
    );


    /* =====================================================
       PAYMENT INFORMATION
    ===================================================== */

    const paymentY =
      rowY + 30;


    pdf.setFontSize(12);

    pdf.text(
      "Payment Information",
      15,
      paymentY
    );


    pdf.setFontSize(9);

    pdf.setFont(
      "helvetica",
      "normal"
    );


    pdf.text(
      "Please pay the bill on or before the due date.",
      15,
      paymentY + 9
    );


    pdf.text(
      `Due Date: ${dateText(bill.dueDate)}`,
      15,
      paymentY + 16
    );


    pdf.text(
      `Current Status: ${String(
        bill.status || "pending"
      ).toUpperCase()}`,
      15,
      paymentY + 23
    );


    /* =====================================================
       FOOTER
    ===================================================== */

    pdf.setDrawColor(
      200,
      200,
      200
    );


    pdf.line(
      15,
      275,
      195,
      275
    );


    pdf.setFontSize(8);

    pdf.setTextColor(
      grey[0],
      grey[1],
      grey[2]
    );


    pdf.text(
      companyName,
      15,
      282
    );


    pdf.text(
      customerCare,
      15,
      287
    );


    pdf.text(
      "This is a computer-generated electricity bill.",
      15,
      292
    );


    pdf.text(
      "No physical signature is required.",
      15,
      297
    );


    /* =====================================================
       DOWNLOAD
    ===================================================== */

    const safeBillNo =
      String(
        bill.billNo || "Electricity-Bill"
      )
      .replace(
        /[^a-zA-Z0-9-_]/g,
        "-"
      );


    pdf.save(
      `Electricity-Bill-${safeBillNo}.pdf`
    );


    showMessage(
      "Electricity bill PDF downloaded successfully."
    );

  } catch (error) {

    console.error(
      "PDF Generation Error:",
      error
    );


    showMessage(
      "PDF generate nahi ho pa raha. Internet connection aur browser Console check karein.",
      "error"
    );

  }

}