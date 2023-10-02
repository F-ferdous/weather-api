const express = require("express");
const nodemailer = require("nodemailer");
const SSLCommerzPayment = require("sslcommerz-lts");
const cors = require("cors");
const app = express();

/* const store_id = "bmddataportal001live";
const store_passwd = "bmddataportal001live22420"; */
const store_id = "bmdda6515cfed53a80";
const store_passwd = "bmdda6515cfed53a80@ssl";
const is_live = false; //true for live, false for sandbox

app.use(express.json());

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "fahimferdous119@gmail.com", // Your Gmail email
    pass: "fdlm sgdy aelz giru", // Your Gmail password or an app password
  },
});

app.use(cors());

app.post("/send-email", (req, res) => {
  const { toEmail, subject, html } = req.body;

  const mailOptions = {
    from: "BMD Portal <climate1971@gmail.com>",
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

app.post("/pay-now", async (req, res) => {
  const dataBody = req.body.data;
  const trans_id = req.body.dataid;
  const data = {
    total_amount: dataBody.totalAmount,
    currency: "BDT",
    tran_id: trans_id, // use unique tran_id for each api call
    success_url: `http://weatherdemo.idatahost.com/payment/success/${trans_id}`,
    fail_url: "https://weatherdemo.idatahost.com/fail",
    cancel_url: "https://weatherdemo.idatahost.com/cancel",
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
    res.redirect(
      `http://weatherdemo.idatahost.com/payment/success/${req.params.transId}`
    );
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("server started....");
});
