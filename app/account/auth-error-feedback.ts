export type AuthMode = "signin" | "register";

export type AuthErrorFeedback = {
  title: string;
  message: string;
};

const registrationErrors: Record<string, AuthErrorFeedback> = {
  email_exists: {
    title: "This account may already exist",
    message: "Try signing in or resetting your password.",
  },
  user_already_exists: {
    title: "This account may already exist",
    message: "Try signing in or resetting your password.",
  },
  weak_password: {
    title: "Choose a stronger password",
    message: "Use at least 12 characters and avoid common passwords.",
  },
  signup_disabled: {
    title: "Account registration is unavailable",
    message: "Please try again later.",
  },
  email_provider_disabled: {
    title: "Email registration is unavailable",
    message: "Please try again later.",
  },
  email_address_invalid: {
    title: "Check your email address",
    message: "Enter a valid email address.",
  },
  validation_failed: {
    title: "Check your account details",
    message: "Check your details and try again.",
  },
  over_email_send_rate_limit: {
    title: "Please wait before trying again",
    message: "Too many requests. Wait a few minutes and try again.",
  },
  over_request_rate_limit: {
    title: "Please wait before trying again",
    message: "Too many requests. Wait a few minutes and try again.",
  },
  unexpected_failure: {
    title: "Account creation is temporarily unavailable",
    message: "Please try again later.",
  },
};

const signInErrors: Record<string, AuthErrorFeedback> = {
  email_not_confirmed: {
    title: "Confirm your email first",
    message: "Verify your email, then sign in.",
  },
  over_request_rate_limit: {
    title: "Please wait before trying again",
    message: "Too many attempts. Wait a few minutes and try again.",
  },
};

export function getAuthErrorFeedback(mode: AuthMode, code?: string): AuthErrorFeedback {
  const knownError = code && (mode === "register" ? registrationErrors[code] : signInErrors[code]);
  if (knownError) return knownError;

  return mode === "signin"
    ? {
        title: "We could not sign you in",
        message: "Check your email and password, then try again.",
      }
    : {
        title: "We could not create your account",
        message: "Check your details and try again.",
      };
}
