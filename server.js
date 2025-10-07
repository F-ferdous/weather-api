const express = require("express");
const nodemailer = require("nodemailer");
const SSLCommerzPayment = require("sslcommerz-lts");
const cors = require("cors");
const app = express();
const sgMail = require("@sendgrid/mail");

const { initializeApp } = require("firebase/app");
const { getFirestore, updateDoc, doc, getDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyA0fFwse6dm4qjwxVHHPvVpV0GqfBfCpLI",
  authDomain: "bmdweather-78743.firebaseapp.com",
  projectId: "bmdweather-78743",
  storageBucket: "bmdweather-78743.appspot.com",
  messagingSenderId: "120421292150",
  appId: "1:120421292150:web:81564924a7a64e5e8be757",
};
// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

// Get a reference to the Firestore instance
const db = getFirestore();

const store_id = "bmddataportal001live";
const store_passwd = "bmddataportal001live22420";
/* const store_id = "bmdda6515cfed53a80";
const store_passwd = "bmdda6515cfed53a80@ssl"; */
const is_live = true; //true for live, false for sandbox

app.use(express.json());

// Configure email providers
const {
  SENDGRID_API_KEY,
  EMAIL_FROM = "BMD Portal <dataportalbmd@gmail.com>",
  ADMIN_EMAIL = "bmddataportal@gmail.com",
  GMAIL_USER = "dataportalbmd@gmail.com",
  GMAIL_PASS = "kbin qbhn gynp fhyg",
  SMTP_HOST = "smtp.gmail.com",
  SMTP_PORT = 465,
} = process.env;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

const smtpTransporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465, // true for 465, false for 587
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
  connectionTimeout: 10_000, // 10s
  greetingTimeout: 10_000,
  socketTimeout: 20_000,
});

async function sendEmail({ to, subject, html }) {
  try {
    if (SENDGRID_API_KEY) {
      await sgMail.send({
        to,
        from: EMAIL_FROM,
        subject,
        html,
      });
      return { ok: true };
    }
    // Fallback to SMTP
    await smtpTransporter.sendMail({ from: EMAIL_FROM, to, subject, html });
    return { ok: true };
  } catch (err) {
    console.error("Email send failed:", err);
    return { ok: false, error: err };
  }
}

app.use(cors());

app.post("/send-email", async (req, res) => {
  const { toEmail, subject, html } = req.body;
  const result = await sendEmail({ to: toEmail, subject, html });
  if (result.ok) return res.status(200).send("Email sent successfully");
  return res.status(500).send("Error sending email");
});

let dataBody;
let trans_id;

app.post("/pay-now", async (req, res) => {
  dataBody = req.body.data;
  trans_id = req.body.dataid;
  const data = {
    total_amount: dataBody.totalAmount,
    currency: "BDT",
    tran_id: trans_id, // use unique tran_id for each api call
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
    // Redirect the user to payment gateway
    let GatewayPageURL = apiResponse.GatewayPageURL;
    console.log("Redirecting to: ", GatewayPageURL);
    res.send({ url: GatewayPageURL });
  });
});

// Payment success callback (top-level route)
app.post("/payment/success/:transId", async (req, res) => {
  console.log(req.params.transId);
  const currentTransId = req.params.transId;
  const docRef = doc(db, "FormData", currentTransId);
  try {
    const docSnapshot = await getDoc(docRef);
    if (docSnapshot.exists()) {
      const userEmail = docSnapshot.data().Email;
      const userName = docSnapshot.data().Name;
      const tA = docSnapshot.data().totalAmount;
      await updateDoc(docRef, { isPaid: true });
      const emailHTML1 = `
        <html>
          <head>
            <style>
              /* Add your CSS styles here */
            </style>
          </head>
          <body>
            <div>
              <h3>BMD Data Portal</h3>
              <p><b>Payment Confirmation</b></p>
              <hr />
              <h5>Name: ${userName}</h5>
              <h5>Email: ${userEmail}</h5>
              <h5>Total Amount: ${tA}</h5>
              <h5>Payment Status: <span color="green">Paid</span></h5>
              <hr/>
              <p>Thank you for being with us</p>
              
            </div>
          </body>
        </html>
      `;
      // Fire-and-forget emails; don't block redirect
      await Promise.all([
        sendEmail({
          to: userEmail,
          subject: `Payment Confirmation - ${userName}`,
          html: emailHTML1,
        }),
        sendEmail({
          to: ADMIN_EMAIL,
          subject: `Payment Confirmation - ${userName}`,
          html: emailHTML1,
        }),
      ]);
      return res.redirect("https://dataportal.bmd.gov.bd/payment/success");
    }
    return res.redirect("https://dataportal.bmd.gov.bd/payment/cancel");
  } catch (e) {
    console.log(e);
    return res.redirect("https://dataportal.bmd.gov.bd/payment/cancel");
  }
});

app.post("/payment/cancel/:transId", async (req, res) => {
  res.redirect("https://dataportal.bmd.gov.bd/payment/cancel");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("server started....");
});
