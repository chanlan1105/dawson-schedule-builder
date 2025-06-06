import jwt from "jsonwebtoken";
import { configDotenv } from "dotenv";

configDotenv();

// Using JSON web token (JWT)
// https://www.geeksforgeeks.org/json-web-token-jwt/
const payload = {
    "admin": true,
    "iss": "lucas",
    "iat": Date.now()
};

// HMAC-SHA256 in Node.js
// https://ssojet.com/hashing/hmac-sha256-in-nodejs/
const token = jwt.sign(payload, process.env.JWT_ENCODING_SECRET);

console.log(token);