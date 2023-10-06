const express = require("express");
const nodemailer = require("nodemailer");
const SSLCommerzPayment = require("sslcommerz-lts");
const cors = require("cors");
const app = express();

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

/* const store_id = "bmddataportal001live";
const store_passwd = "bmddataportal001live22420"; */
const store_id = "bmdda6515cfed53a80";
const store_passwd = "bmdda6515cfed53a80@ssl";
const is_live = false; //true for live, false for sandbox

app.use(express.json());

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "dataportalbmd@gmail.com",
    pass: "aylc drtg nchn cmmx",
    /*  user: "fahimferdous119@gmail.com", // Your Gmail email dataportalbmd@gmail.com
    pass: "fdlm sgdy aelz giru", // Your Gmail password or an app password */
  },
});

app.use(cors());

app.post("/send-email", (req, res) => {
  const { toEmail, subject, html } = req.body;

  const mailOptions = {
    from: "BMD Portal <dataportalbmd@gmail.com>",
    to: toEmail,
    subject: subject,
    html: html,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).send("Error sending email");
    } else {
      console.log("Email sent: " + info.response);
      res.status(200).send("Email sent successfully");
    }
  });
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
    ipn_url: "http://localhost:3030/ipn",
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

  app.post("/payment/success/:transId", async (req, res) => {
    console.log(req.params.transId);
    const docRef = doc(db, "FormData", trans_id);
    try {
      const docSnapshot = await getDoc(docRef);
      if (docSnapshot.exists()) {
        //console.log(docSnapshot.data());
        const userEmail = docSnapshot.data().Email; // Assuming the field name is "email"
        const userName = docSnapshot.data().Name;
        const tA = docSnapshot.data().totalAmount;
        await updateDoc(docRef, {
          // Update the fields as needed
          isPaid: true,
        });
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

        const mailOptions = {
          from: "BMD Portal <dataportalbmd@gmail.com>",
          to: userEmail,
          subject: `Payment Confirmation - ${userName}`,
          html: emailHTML1,
        };

        const mailOptions2 = {
          from: "BMD Portal <dataportalbmd@gmail.com>",
          to: "fahimferdous119@gmail.com",
          subject: `Payment Confirmation - ${userName}`,
          html: emailHTML1,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error(error);
            res.status(500).send("Error sending email");
          } else {
            console.log("Email sent to user ");
            res.status(200).send("Email sent successfully");
          }
        });

        transporter.sendMail(mailOptions2, (error, info) => {
          if (error) {
            console.error(error);
            res.status(500).send("Error sending email");
          } else {
            console.log("Email sent to admin ");
            res.status(200).send("Email sent successfully");
          }
        });

        res.redirect("https://dataportal.bmd.gov.bd/payment/success");
      }
    } catch (e) {
      console.log(e);
    }
  });

  app.post("/payment/cancel/:transId", async (req, res) => {
    res.redirect("https://dataportal.bmd.gov.bd/payment/cancel");
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("server started....");
});
