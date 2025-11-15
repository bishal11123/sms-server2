// server/middleware/authMiddleware.js
import { auth } from "express-oauth2-jwt-bearer";

// ✅ Protect routes using Auth0 JWT verification
export const authenticateToken = auth({
  audience: "https://myapi.example.com", // 👈 your Auth0 API Identifier
  issuerBaseURL: "https://dev-y3b7afevz32ju2k1.us.auth0.com/",
});
