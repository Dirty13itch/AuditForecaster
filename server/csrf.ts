import { csrfSync } from "csrf-sync";
import { serverLogger } from "./logger";
import { getConfig } from "./config";

export const {
  generateToken,
  csrfSynchronisedProtection,
} = csrfSync({
  getTokenFromRequest: (req) => {
    // Accept CSRF token from request body or custom header
    const token = req.body?._csrf || req.headers['x-csrf-token'];
    if (token) {
      serverLogger.debug('[CSRF] Token received from request');
    }
    return token;
  },
  getSecret: () => {
    const config = getConfig();
    return config.sessionSecret;
  },
  size: 128,
});

serverLogger.info('[CSRF] Protection initialized');
