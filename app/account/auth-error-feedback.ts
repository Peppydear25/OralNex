export type AuthMode = "signin" | "register";

export type AuthErrorFeedback = {
  title: string;
  message: string;
};

const registrationErrors: Record<string, AuthErrorFeedback> = {
  email_exists: {
    title: "This account may already exist",
    message:
      "Try signing in with this email, or use Forgot password if you cannot remember the password.",
  },
  user_already_exists: {
    title: "This account may already exist",
    message:
      "Try signing in with this email, or use Forgot password if you cannot remember the password.",
  },
  weak_password: {
    title: "Choose a stronger password",
    message: "Use at least twelve characters and avoid passwords that are common or easy to guess.",
  },
  signup_disabled: {
    title: "Account registration is unavailable",
    message:
      "New customer registration is currently disabled. Please try again after it has been enabled.",
  },
  email_provider_disabled: {
    title: "Email registration is unavailable",
    message: "Email and password registration is not enabled for this store yet.",
  },
  email_address_invalid: {
    title: "Check your email address",
    message: "Enter a valid email address and try creating your account again.",
  },
  validation_failed: {
    title: "Check your account details",
    message: "One or more account details are not valid. Review the form and try again.",
  },
  over_email_send_rate_limit: {
    title: "Please wait before trying again",
    message:
      "Too many verification emails were requested. Wait a few minutes, then submit the form once more.",
  },
  over_request_rate_limit: {
    title: "Please wait before trying again",
    message: "Too many account requests were made. Wait a few minutes, then try again.",
  },
  unexpected_failure: {
    title: "Account creation is temporarily unavailable",
    message: "The account service could not finish this request. Please try again shortly.",
  },
};

const signInErrors: Record<string, AuthErrorFeedback> = {
  email_not_confirmed: {
    title: "Confirm your email first",
    message: "Open the latest verification email from OralNex, confirm your address, then sign in.",
  },
  over_request_rate_limit: {
    title: "Please wait before trying again",
    message: "Too many sign-in attempts were made. Wait a few minutes, then try again.",
  },
};

export function getAuthErrorFeedback(mode: AuthMode, code?: string): AuthErrorFeedback {
  const knownError = code && (mode === "register" ? registrationErrors[code] : signInErrors[code]);
  if (knownError) return knownError;

  return mode === "signin"
    ? {
        title: "We could not sign you in",
        message: "The email or password is incorrect. Check your details and try again.",
      }
    : {
        title: "We could not create your account",
        message: "Check your account details and connection, then try again shortly.",
      };
}
