// =====================================================
// AUTH.JS
// Electricity Management System
// Customer Login + Admin Login + Registration
// =====================================================


import {

  auth,
  db,

  signOut,

  createUserWithEmailAndPassword,

  signInWithEmailAndPassword,

  sendPasswordResetEmail,

  doc,

  setDoc,

  getDoc,

  serverTimestamp

} from "./firebase.js";



// =====================================================
// HELPER
// =====================================================

const $ = (id) => {

  return document.getElementById(id);

};



// =====================================================
// MESSAGE FUNCTION
// =====================================================

function showMessage(text, type = "") {

  const messageBox = $("authMessage");

  if (!messageBox) {

    console.error("authMessage element not found.");

    return;

  }


  messageBox.textContent = text;

  messageBox.className = "message";


  if (type) {

    messageBox.classList.add(type);

  }


  messageBox.classList.remove("hidden");

}



// =====================================================
// HIDE MESSAGE
// =====================================================

function hideMessage() {

  const messageBox = $("authMessage");

  if (messageBox) {

    messageBox.classList.add("hidden");

  }

}



// =====================================================
// TAB SYSTEM
// =====================================================

const tabs = document.querySelectorAll(".tab");


tabs.forEach((tab) => {


  tab.addEventListener("click", () => {


    // Remove active from all tabs

    tabs.forEach((t) => {

      t.classList.remove("active");

    });


    // Active selected tab

    tab.classList.add("active");


    // Hide all forms

    $("customerLoginForm").classList.add("hidden");

    $("adminLoginForm").classList.add("hidden");

    $("registerForm").classList.add("hidden");


    // Show selected form

    const selectedTab = tab.dataset.tab;


    if (selectedTab === "customerLogin") {

      $("customerLoginForm").classList.remove("hidden");

    }


    else if (selectedTab === "adminLogin") {

      $("adminLoginForm").classList.remove("hidden");

    }


    else if (selectedTab === "register") {

      $("registerForm").classList.remove("hidden");

    }


    // Clear old message

    hideMessage();

  });

});



// =====================================================
// CUSTOMER LOGIN
// =====================================================

$("customerLoginForm").addEventListener(
  "submit",
  async (event) => {


    event.preventDefault();


    const email =
      $("customerLoginEmail").value.trim();


    const password =
      $("customerLoginPassword").value;


    if (!email || !password) {

      showMessage(
        "Please enter email and password.",
        "error"
      );

      return;

    }



    try {


      showMessage(
        "Logging in...",
        "success"
      );


      // Firebase Authentication

      const credential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );


      console.log(
        "Customer Firebase Login:",
        credential.user.uid
      );



      // Get customer document

      const userDocument =
        await getDoc(
          doc(
            db,
            "users",
            credential.user.uid
          )
        );



      // Document not found

      if (!userDocument.exists()) {


        await signOut(auth);


        showMessage(
          "Customer profile not found. Please contact administrator.",
          "error"
        );


        return;

      }



      const userData =
        userDocument.data();


      console.log(
        "Customer Data:",
        userData
      );



      // Check role

      if (userData.role !== "customer") {


        await signOut(auth);


        showMessage(
          "This account is not a customer account.",
          "error"
        );


        return;

      }



      // Check status

      const status =
        userData.status || "pending";



      // Pending

      if (status === "pending") {


        await signOut(auth);


        showMessage(
          "Your registration is pending. Please wait for administrator approval.",
          "error"
        );


        return;

      }



      // Rejected

      if (status === "rejected") {


        await signOut(auth);


        showMessage(
          "Your registration has been rejected by administrator.",
          "error"
        );


        return;

      }



      // Approved / Active

      if (
        status === "approved" ||
        status === "active"
      ) {


        showMessage(
          "Login successful! Opening customer dashboard...",
          "success"
        );


        setTimeout(() => {

          window.location.href =
            "./customer.html";

        }, 700);


        return;

      }



      // Unknown status

      await signOut(auth);


      showMessage(
        "Your account is not active. Please contact administrator.",
        "error"
      );


    }


    catch (error) {


      console.error(
        "CUSTOMER LOGIN ERROR:",
        error
      );


      showMessage(
        getFirebaseErrorMessage(error),
        "error"
      );

    }

  }
);



// =====================================================
// ADMIN LOGIN
// =====================================================

$("adminLoginForm").addEventListener(
  "submit",
  async (event) => {


    event.preventDefault();


    const email =
      $("adminLoginEmail").value.trim();


    const password =
      $("adminLoginPassword").value;


    if (!email || !password) {

      showMessage(
        "Please enter admin email and password.",
        "error"
      );

      return;

    }



    try {


      showMessage(
        "Checking administrator account...",
        "success"
      );


      // Firebase Authentication

      const credential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );


      console.log(
        "Admin Firebase Login:",
        credential.user.uid
      );



      // Get Firestore admin document

      const userDocument =
        await getDoc(
          doc(
            db,
            "users",
            credential.user.uid
          )
        );



      // No document

      if (!userDocument.exists()) {


        await signOut(auth);


        showMessage(
          "Admin profile not found in Firestore.",
          "error"
        );


        return;

      }



      const userData =
        userDocument.data();


      console.log(
        "Admin Firestore Data:",
        userData
      );



      // =================================================
      // CHECK ADMIN ROLE
      // =================================================

      if (userData.role !== "admin") {


        await signOut(auth);


        showMessage(
          "Access denied. This account is not an administrator.",
          "error"
        );


        return;

      }



      // =================================================
      // CHECK ADMIN STATUS
      // =================================================

      if (
        userData.status !== "approved" &&
        userData.status !== "active"
      ) {


        await signOut(auth);


        showMessage(
          "Administrator account is not active.",
          "error"
        );


        return;

      }



      // =================================================
      // ADMIN LOGIN SUCCESS
      // =================================================

      showMessage(
        "Admin login successful! Opening Admin Panel...",
        "success"
      );


      setTimeout(() => {

        window.location.href =
          "./admin.html";

      }, 700);


    }


    catch (error) {


      console.error(
        "ADMIN LOGIN ERROR:",
        error
      );


      showMessage(
        getFirebaseErrorMessage(error),
        "error"
      );

    }

  }
);



// =====================================================
// CUSTOMER REGISTRATION
// =====================================================

$("registerForm").addEventListener(
  "submit",
  async (event) => {


    event.preventDefault();


    // Get values

    const name =
      $("regName").value.trim();


    const age =
      Number(
        $("regAge").value
      );


    const address =
      $("regAddress").value.trim();


    const mobile =
      $("regMobile").value.trim();


    const email =
      $("regEmail").value.trim();


    const password =
      $("regPassword").value;



    // =================================================
    // VALIDATION
    // =================================================

    if (!name) {

      showMessage(
        "Please enter your full name.",
        "error"
      );

      return;

    }


    if (
      !age ||
      age < 18 ||
      age > 100
    ) {

      showMessage(
        "Please enter valid age between 18 and 100.",
        "error"
      );

      return;

    }


    if (!address) {

      showMessage(
        "Please enter your address.",
        "error"
      );

      return;

    }


    if (
      !/^[0-9]{10}$/.test(mobile)
    ) {

      showMessage(
        "Please enter a valid 10-digit mobile number.",
        "error"
      );

      return;

    }


    if (!email) {

      showMessage(
        "Please enter email.",
        "error"
      );

      return;

    }


    if (password.length < 6) {

      showMessage(
        "Password must contain at least 6 characters.",
        "error"
      );

      return;

    }



    try {


      showMessage(
        "Creating customer account...",
        "success"
      );



      // =================================================
      // CREATE FIREBASE AUTH ACCOUNT
      // =================================================

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );


      const uid =
        credential.user.uid;



      console.log(
        "New Customer UID:",
        uid
      );



      // =================================================
      // CUSTOMER DATA
      // =================================================

      const customerData = {

        uid: uid,

        name: name,

        age: age,

        address: address,

        mobile: mobile,

        email: email,

        role: "customer",

        status: "pending",

        meterNumber: "",

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp()

      };



      // =================================================
      // SAVE USER
      // =================================================

      await setDoc(
        doc(
          db,
          "users",
          uid
        ),
        customerData
      );



      // =================================================
      // REGISTRATION REQUEST
      // =================================================

      await setDoc(
        doc(
          db,
          "registrationRequests",
          uid
        ),
        {

          ...customerData,

          requestStatus: "pending",

          reviewedAt: null

        }
      );



      // Sign out

      await signOut(auth);



      // Clear form

      $("registerForm").reset();



      showMessage(
        "Registration successful! Your request has been sent to the administrator.",
        "success"
      );



      // After 2 seconds go to Customer Login

      setTimeout(() => {


        // Customer Login tab

        const customerTab =
          document.querySelector(
            '[data-tab="customerLogin"]'
          );


        if (customerTab) {

          customerTab.click();

        }


        $("customerLoginEmail").value =
          email;


        showMessage(
          "Registration submitted. Please wait for administrator approval before login.",
          "success"
        );


      }, 2000);


    }


    catch (error) {


      console.error(
        "REGISTRATION ERROR:",
        error
      );


      showMessage(
        getFirebaseErrorMessage(error),
        "error"
      );

    }

  }
);



// =====================================================
// CUSTOMER FORGOT PASSWORD
// =====================================================

$("customerForgotPassword").addEventListener(
  "click",
  async () => {


    const email =
      $("customerLoginEmail").value.trim();


    if (!email) {

      showMessage(
        "Please enter your email address first.",
        "error"
      );

      return;

    }



    try {


      await sendPasswordResetEmail(
        auth,
        email
      );


      showMessage(
        "Password reset email sent. Please check your inbox.",
        "success"
      );


    }


    catch (error) {


      console.error(
        "PASSWORD RESET ERROR:",
        error
      );


      showMessage(
        getFirebaseErrorMessage(error),
        "error"
      );

    }

  }
);



// =====================================================
// ADMIN FORGOT PASSWORD
// =====================================================

$("adminForgotPassword").addEventListener(
  "click",
  async () => {


    const email =
      $("adminLoginEmail").value.trim();


    if (!email) {

      showMessage(
        "Please enter admin email first.",
        "error"
      );

      return;

    }



    try {


      await sendPasswordResetEmail(
        auth,
        email
      );


      showMessage(
        "Admin password reset email sent.",
        "success"
      );


    }


    catch (error) {


      console.error(
        "ADMIN PASSWORD RESET ERROR:",
        error
      );


      showMessage(
        getFirebaseErrorMessage(error),
        "error"
      );

    }

  }
);



// =====================================================
// FIREBASE ERROR HANDLER
// =====================================================

function getFirebaseErrorMessage(error) {


  console.error(
    "Firebase Error:",
    error
  );


  switch (error.code) {


    case "auth/invalid-credential":

      return "Invalid email or password.";


    case "auth/invalid-email":

      return "Invalid email address.";


    case "auth/user-not-found":

      return "No account found with this email.";


    case "auth/wrong-password":

      return "Incorrect password.";


    case "auth/email-already-in-use":

      return "This email is already registered.";


    case "auth/weak-password":

      return "Password should contain at least 6 characters.";


    case "auth/too-many-requests":

      return "Too many login attempts. Please try again later.";


    case "auth/network-request-failed":

      return "Network error. Please check your internet connection.";


    case "permission-denied":

      return "Firebase permission denied. Please check Firestore Rules.";


    default:

      return (
        error.message ||
        "Something went wrong. Please try again."
      );

  }

}