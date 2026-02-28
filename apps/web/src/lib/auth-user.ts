export interface AuthUserIdentity {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

function fallbackNameFromEmail(email: string | null | undefined): string {
  if (!email) {
    return "Profile";
  }

  const [localPart] = email.split("@");
  if (!localPart) {
    return "Profile";
  }

  return localPart;
}

export function getUserDisplayName(user: AuthUserIdentity): string {
  const firstName = user.firstName?.trim() ?? "";
  const lastName = user.lastName?.trim() ?? "";
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  return fallbackNameFromEmail(user.email);
}

export function getUserInitials(user: AuthUserIdentity): string {
  const firstName = user.firstName?.trim() ?? "";
  const lastName = user.lastName?.trim() ?? "";

  if (firstName || lastName) {
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim();
    return initials.toUpperCase() || "P";
  }

  const email = user.email?.trim() ?? "";
  if (email) {
    return email.charAt(0).toUpperCase();
  }

  return "P";
}
