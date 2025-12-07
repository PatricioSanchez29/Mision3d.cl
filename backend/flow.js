import express from "express";
import axios from "axios";
import crypto from "crypto";

const router = express.Router();

// Función de firma
function flowSign(params, secret) {
  const ordered = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHmac("sha256", secret).update(ordered).digest("hex");
}

function calcCartTotals(items) {
  return items.reduce((acc, i) => acc + i.price * i.qty, 0);
}

// Crear pago en Flow
router.post("/flow", async (req, res) => {
  try {
    const { items, payer, shippingCost = 0, discount = 0 } = req.body;
    const subtotal = calcCartTotals(items);
    const total = Math.max(0, subtotal - discount + shippingCost);

    const apiKey = process.env.FLOW_API_KEY;
    const secret = process.env.FLOW_SECRET;
    const commerceId = process.env.FLOW_COMMERCE_ID;
    const returnUrl = process.env.FLOW_RETURN_URL;
    const confirmUrl = process.env.FLOW_CONFIRM_URL;
    const baseUrl = process.env.FLOW_BASE_URL || "https://sandbox.flow.cl/api";

    const params = {
      apiKey,
      commerceOrder: "ORD-" + Date.now(),
      commerceId,
      amount: total,
      subject: "Compra Mision3D",
      email: payer?.email || "cliente@example.com",
      urlConfirmation: confirmUrl,
      urlReturn: returnUrl,
    };

    const s = flowSign(params, secret);
    const body = new URLSearchParams({ ...params, s });
    const url = baseUrl + "/payment/create";

    const resp = await axios.post(url, body.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const flowUrl = `https://sandbox.flow.cl/app/web/pay.php?token=${resp.data.token}`;
    res.json({ url: flowUrl, token: resp.data.token });
  } catch (err) {
    console.error("Flow error:", err.response?.data || err.message);
    res.status(500).json({ error: "flow", detail: err.response?.data || err.message });
  }
});

// Confirmación y retorno
router.post("/flow/confirm", express.urlencoded({ extended: true }), (req, res) => {
  console.log("Flow confirm payload:", req.body);
  res.status(200).send("OK");
});

router.get("/flow/retorno", (req, res) => {
  res.send("<h2>✅ Pago Flow recibido</h2>");
});

export default router;
