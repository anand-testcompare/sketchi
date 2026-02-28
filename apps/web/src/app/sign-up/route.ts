import { getSignUpUrl } from "@workos-inc/authkit-nextjs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const previewOrigin =
    process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : requestUrl.origin;
  const redirectUri = `${previewOrigin}/callback`;
  const authorizationUrl = await getSignUpUrl({ redirectUri });
  return Response.redirect(authorizationUrl, 302);
}
