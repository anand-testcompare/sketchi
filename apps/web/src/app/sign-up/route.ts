import { getSignUpUrl } from "@workos-inc/authkit-nextjs";

export async function GET() {
  const authorizationUrl = await getSignUpUrl();
  return Response.redirect(authorizationUrl, 302);
}
