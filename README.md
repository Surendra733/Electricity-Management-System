# PowerConnect - Electricity Management System

A complete beginner-friendly Electricity Management System using:
- HTML
- CSS
- Vanilla JavaScript
- Firebase Authentication
- Cloud Firestore

## Main Modules

### Customer
1. Email/password registration
2. Customer details: name, age, address, mobile, email
3. Registration request to admin
4. Admin-approved unique meter number
5. Customer dashboard
6. View bills
7. Payment request (demo/manual verification)
8. Raise complaints
9. Service requests
10. Account status

### Admin
1. Admin login
2. Dashboard statistics
3. View pending customer registrations
4. Approve/reject customer
5. Automatically generate unique MPEZ-style meter number
6. Edit customer details
7. Change customer status
8. Generate electricity bills
9. Verify payment requests
10. Resolve complaints/service requests

## Firebase Setup

1. Go to Firebase Console.
2. Create a new project.
3. Add a Web App.
4. Copy its Firebase configuration.
5. Open `js/firebase.js`.
6. Replace:
   YOUR_API_KEY
   YOUR_PROJECT.firebaseapp.com
   YOUR_PROJECT_ID
   YOUR_MESSAGING_SENDER_ID
   YOUR_APP_ID

7. Authentication:
   Firebase Console > Authentication > Sign-in method > Email/Password > Enable.

8. Firestore:
   Firebase Console > Firestore Database > Create database.

9. Firestore Rules:
   Copy everything from `firebase.rules` into Firestore > Rules and Publish.

## Create the first Admin

For security, normal registration always creates a customer.

1. Register one account through the website.
2. Open Firebase Console > Firestore Database > Data.
3. Open `users`.
4. Open that user's document.
5. Change:
   role = admin
6. Keep the user's email/password as normal Firebase Authentication credentials.
7. Login again. The system will open `admin.html`.

Recommended admin profile:
{
  "name": "System Administrator",
  "role": "admin",
  "status": "active"
}

## Run

This project does not require React or Node.js.

Recommended:
1. Open the folder in VS Code.
2. Install the VS Code extension "Live Server".
3. Right-click `index.html`.
4. Select "Open with Live Server".
5. Register a customer.
6. Login as admin and approve the registration.
7. Customer receives a meter number.
8. Admin can create a bill.
9. Customer can request payment.
10. Admin can mark the bill paid.

Do not open the HTML file using `file://` if Firebase modules are blocked by the browser. Use Live Server.

## Important production notes

The admin Delete button removes the Firestore customer record only; Firebase Authentication accounts require Firebase Console/Admin SDK for deletion.

This is a college/project/demo implementation. For a real electricity utility:
- Do not generate official meter numbers from browser JavaScript.
- Use a trusted backend/Cloud Function for meter allocation and billing.
- Add server-side validation.
- Add audit logs.
- Add role management through custom claims or a secure backend.
- Integrate a real payment gateway instead of the demo payment request.
- Add rate limiting and abuse protection.
- Never store payment card/UPI credentials in Firestore.
