import http2 from "http2";
import jwt from "jsonwebtoken";
import { readFileSync } from "fs";

const KEY_PATH    = process.argv[2] || "/Users/vettedai/Downloads/AuthKey_XXXXX.p8";
const KEY_ID      = process.argv[3];
const TEAM_ID     = process.argv[4];
const BUNDLE_ID   = "com.vettedai.app";
const TOKEN       = "a864e5b4885d4cb00e185b2a4e190b317bff1407e10e6d80f3081903532c6542";

const pem = readFileSync(KEY_PATH, "utf8");
const signed = jwt.sign({}, pem, { algorithm: "ES256", issuer: TEAM_ID, keyid: KEY_ID, expiresIn: "30m" });

const client = http2.connect("https://api.development.push.apple.com");
const body = JSON.stringify({ aps: { alert: { title: "Local test", body: "From script" } } });
const req = client.request({
  ":method": "POST",
  ":path": `/3/device/${TOKEN}`,
  authorization: `bearer ${signed}`,
  "apns-topic": BUNDLE_ID,
  "apns-push-type": "alert",
  "apns-priority": "10",
  "apns-expiration": "0",
  "content-type": "application/json",
  "content-length": Buffer.byteLength(body),
});

let status = 0, response = "";
req.on("response", (h) => { status = h[":status"]; });
req.on("data", (c) => { response += c; });
req.on("end", () => {
  console.log("Status:", status);
  console.log("Body:", response || "(empty = success)");
  client.close();
});
req.write(body);
req.end();
