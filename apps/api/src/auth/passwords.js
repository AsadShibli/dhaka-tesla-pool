import bcrypt from "bcryptjs";

// Stores a hash, never the password the person typed.
export function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

// Checks the typed password against the bcrypt hash saved on the user.
export function passwordMatches(plain, hash) {
  return bcrypt.compare(plain, hash);
}
