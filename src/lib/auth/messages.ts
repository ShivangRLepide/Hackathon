export const GENERIC_SIGN_IN_ERROR = "Sign-in failed. Check your email and password, then try again.";
export const GENERIC_SIGN_UP_ERROR = "Could not create your account. Try again.";

// Structural subset of the Supabase AuthError, so the mapping stays pure and testable.
export type AuthErrorLike = { code?: string; message?: string; status?: number };

export function signInErrorMessage(error: AuthErrorLike): string {
  if (error.code === "email_not_confirmed") {
    return "Confirm your email address first. Open the link we sent you, then sign in.";
  }
  return GENERIC_SIGN_IN_ERROR;
}

export function signUpErrorMessage(error: AuthErrorLike): string {
  if (error.code === "signup_disabled") {
    return "Sign-up is turned off for this project. Ask your administrator to create your account.";
  }
  if (error.code === "user_already_exists" || error.code === "email_exists") {
    return "An account with this email already exists. Sign in instead.";
  }
  if (error.code === "weak_password" && error.message) {
    return error.message;
  }
  if (error.code === "over_email_send_rate_limit" || error.status === 429) {
    return "Too many attempts. Wait a minute, then try again.";
  }
  return GENERIC_SIGN_UP_ERROR;
}
