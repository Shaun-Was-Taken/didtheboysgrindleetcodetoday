import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Routes that require an authenticated user; signed-out visitors are
// redirected to sign-in before the page renders. /jobs is intentionally NOT
// here: the page must be crawlable for SEO — it shows a sign-in prompt to
// signed-out visitors and the job data itself only renders when signed in.
const isProtectedRoute = createRouteMatcher(['/admin(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}