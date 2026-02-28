import { getSignUpUrl } from "@workos-inc/authkit-nextjs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const redirectUri = `${requestUrl.origin}/callback`;
  const authorizationUrl = await getSignUpUrl({ redirectUri });
  return Response.redirect(authorizationUrl, 302);
}
