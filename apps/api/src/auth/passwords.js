import bcrypt from "bcryptjs";

// Checks the typed password against the bcrypt hash saved on the user.
export function passwordMatches(plain, hash) {
  return bcrypt.compare(plain, hash);
}
