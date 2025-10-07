import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import { initializeApp } from "firebase/app";
import { getFirestore, updateDoc, doc, getDoc } from "firebase/firestore";
import SSLCommerzPayment from "sslcommerz-lts";

// ==========================
// 🔧 CONFIG
// ==========================
const app = express();
app.use(express.json());
app.use(cors());

// Gmail SMTP setup
const GMAIL_USER = "dataportalbmd@gmail.com"; // your Gmail
const GMAIL_APP_PASSWORD = "kbin qbhn gynp fhyg"; // App password

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

// ==========================
// 🔥 FIREBASE SETUP
// ==========================
const firebaseConfig = {
  apiKey: "AIzaSyA0fFwse6dm4qjwxVHHPvVpV0GqfBfCpLI",
  authDomain: "bmdweather-78743.firebaseapp.com",
  projectId: "bmdweather-78743",
  storageBucket: "bmdweather-78743.appspot.com",
  messagingSenderId: "120421292150",
  appId: "1:120421292150:web:81564924a7a64e5e8be757",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ==========================
// 💳 SSLCommerz CONFIG
// ==========================
const store_id = "bmddataportal001live";
const store_passwd = "bmddataportal001live22420";
const is_live = true;

// ==========================
// ✉️ EMAIL FUNCTION
// ==========================
async function sendEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: `BMD Portal <${GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}`);
    return { ok: true };
  } catch (error) {
    console.error("❌ Email send failed:", error);
    return { ok: false, error };
  }
}

// ==========================
// 📩 ROUTES
// ==========================

// Test email route
app.post("/send-email", async (req, res) => {
  const { toEmail, subject, html } = req.body;
  const result = await sendEmail({ to: toEmail, subject, html });
  if (result.ok) return res.status(200).send("Email sent successfully");
  return res.status(500).send("Error sending email");
});

// ==========================
// 💰 PAYMENT HANDLING
// ==========================
let dataBody;
let trans_id;

app.post("/pay-now", async (req, res) => {
  dataBody = req.body.data;
  trans_id = req.body.dataid;

  const data = {
    total_amount: dataBody.totalAmount,
    currency: "BDT",
    tran_id: trans_id,
    success_url: `https://weatherbmd-api.onrender.com/payment/success/${trans_id}`,
    fail_url: `https://weatherbmd-api.onrender.com/payment/cancel/${trans_id}`,
    cancel_url: `https://weatherbmd-api.onrender.com/payment/cancel/${trans_id}`,
    ipn_url: "https://weatherbmd-api.onrender.com/ipn",
    shipping_method: "Courier",
    product_name: "Weather Data",
    product_category: "Weather Data",
    product_profile: "general",
    cus_name: dataBody.Name,
    cus_email: dataBody.Email,
    cus_add1: dataBody.Organization,
    cus_add2: "Dhaka",
    cus_city: "Dhaka",
    cus_state: "Dhaka",
    cus_postcode: "1000",
    cus_country: "Bangladesh",
    cus_phone: dataBody.Phone,
    cus_fax: "01711111111",
    ship_name: "Customer Name",
    ship_add1: "Dhaka",
    ship_add2: "Dhaka",
    ship_city: "Dhaka",
    ship_state: "Dhaka",
    ship_postcode: 1000,
    ship_country: "Bangladesh",
  };

  const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
  sslcz.init(data).then((apiResponse) => {
    let GatewayPageURL = apiResponse.GatewayPageURL;
    console.log("Redirecting to:", GatewayPageURL);
    res.send({ url: GatewayPageURL });
  });
});

// ==========================
// ✅ PAYMENT SUCCESS
// ==========================
app.post("/payment/success/:transId", async (req, res) => {
  const currentTransId = req.params.transId;
  const docRef = doc(db, "FormData", currentTransId);

  try {
    const docSnapshot = await getDoc(docRef);
    if (docSnapshot.exists()) {
      const userData = docSnapshot.data();
      const emailHTML = `
        <html>
          <body>
            <div>
              <h3>BMD Data Portal</h3>
              <p><b>Payment Confirmation</b></p>
              <hr />
              <h5>Name: ${userData.Name}</h5>
              <h5>Email: ${userData.Email}</h5>
              <h5>Total Amount: ${userData.totalAmount}</h5>
              <h5>Payment Status: <span style="color:green;">Paid</span></h5>
              <hr/>
              <p>Thank you for being with us.</p>
            </div>
          </body>
        </html>
      `;

      await updateDoc(docRef, { isPaid: true });

      // Send confirmation emails (user + admin)
      await Promise.all([
        sendEmail({
          to: userData.Email,
          subject: `Payment Confirmation - ${userData.Name}`,
          html: emailHTML,
        }),
        sendEmail({
          to: "bmddataportal@gmail.com",
          subject: `Payment Confirmation - ${userData.Name}`,
          html: emailHTML,
        }),
      ]);

      return res.redirect("https://dataportal.bmd.gov.bd/payment/success");
    }
    return res.redirect("https://dataportal.bmd.gov.bd/payment/cancel");
  } catch (error) {
    console.error(error);
    return res.redirect("https://dataportal.bmd.gov.bd/payment/cancel");
  }
});

// ==========================
// ❌ PAYMENT CANCEL
// ==========================
app.post("/payment/cancel/:transId", async (req, res) => {
  res.redirect("https://dataportal.bmd.gov.bd/payment/cancel");
});

// ==========================
// 🚀 START SERVER
// ==========================
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`✅ Server started on port ${PORT}...`));
