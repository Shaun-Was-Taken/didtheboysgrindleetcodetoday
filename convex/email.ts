import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

interface JobInfo {
  title: string;
  link: string;
  location?: string;
  company: string;
}

/**
 * Send an email notification via Resend when new job postings are detected.
 * 
 * Required environment variables (set in Convex dashboard):
 *   - RESEND_API_KEY: Your Resend API key
 *   - NOTIFICATION_EMAIL: The email address to send notifications to
 */
export const sendNewJobsEmail = internalAction({
  args: {
    company: v.string(),
    jobs: v.array(
      v.object({
        title: v.string(),
        link: v.string(),
        location: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error(
        "Missing RESEND_API_KEY. Set it in your Convex dashboard."
      );
      return { status: "error", message: "Missing email configuration" };
    }

    const jobsWithCompany: JobInfo[] = args.jobs.map((job) => ({
      ...job,
      company: args.company,
    }));

    const subject = `🚀 ${args.jobs.length} New ${args.company} Job${args.jobs.length > 1 ? "s" : ""} Found!`;
    const htmlBody = buildEmailHtml(args.company, jobsWithCompany);

    // Recipients: the owner inbox (if configured) + every Premium user who
    // opted into this company's alerts. A Set dedupes overlaps.
    const recipients = new Set<string>();
    const ownerEmail = process.env.NOTIFICATION_EMAIL;
    if (ownerEmail) recipients.add(ownerEmail);

    const subscribers: string[] = await ctx.runQuery(
      internal.jobAlerts.getSubscribersForCompany,
      { company: args.company }
    );
    for (const email of subscribers) recipients.add(email);

    if (recipients.size === 0) {
      console.log("No alert recipients configured; skipping email.");
      return { status: "success", sent: 0 };
    }

    let sent = 0;
    for (const to of recipients) {
      const ok = await postEmail(apiKey, to, subject, htmlBody);
      if (ok) sent++;
    }
    console.log(
      `📧 Sent ${args.company} alert to ${sent}/${recipients.size} recipient(s).`
    );
    return { status: "success", sent };
  },
});

/** Send one alert email via Resend. Returns whether it succeeded. */
async function postEmail(
  apiKey: string,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Job Alerts <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error(
        `Resend API error (${response.status}) for ${to}:`,
        JSON.stringify(errorData)
      );
      return false;
    }
    const result = await response.json();
    console.log(`📧 Email sent to ${to}: ${result.id}`);
    return true;
  } catch (error) {
    console.error(`Error sending email to ${to} via Resend:`, error);
    return false;
  }
}

function buildEmailHtml(company: string, jobs: JobInfo[]): string {
  const jobRows = jobs
    .map(
      (job) => `
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0;">
          <a href="${job.link}" style="color: #2563eb; text-decoration: none; font-weight: 600; font-size: 16px;">
            ${job.title}
          </a>
          ${job.location ? `<div style="color: #6b7280; font-size: 13px; margin-top: 4px;">📍 ${job.location}</div>` : ""}
        </td>
        <td style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0; text-align: right; vertical-align: middle;">
          <a href="${job.link}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500;">
            Apply →
          </a>
        </td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); border-radius: 12px 12px 0 0; padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
        🚀 New ${company} Jobs
      </h1>
      <p style="color: #c7d2fe; margin: 8px 0 0; font-size: 14px;">
        ${jobs.length} new position${jobs.length > 1 ? "s" : ""} detected • ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>

    <!-- Job List -->
    <div style="background: #ffffff; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <table style="width: 100%; border-collapse: collapse;">
        ${jobRows}
      </table>
      
      <!-- Footer -->
      <div style="padding: 20px 24px; text-align: center; border-top: 1px solid #f0f0f0;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          Sent by your Job Monitor • Auto-generated alert
        </p>
      </div>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Test action to verify email sending works.
 * Run with: npx convex run email:testEmailSending
 */
export const testEmailSending = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("🧪 Sending test email...");
    // Explicit type breaks a circular inference cycle (this action calls
    // sendNewJobsEmail, which lives in the same module).
    const result: { status: string; message?: string; sent?: number } =
      await ctx.runAction(
        internal.email.sendNewJobsEmail,
      {
        company: "TestCompany",
        jobs: [
          {
            title: "Software Engineer I (Test Job)",
            link: "https://example.com/jobs/test-1",
            location: "Remote, US",
          },
          {
            title: "Software Engineer II (Test Job)",
            link: "https://example.com/jobs/test-2",
            location: "Austin, TX",
          },
        ],
      }
    );
    console.log("🧪 Test email result:", JSON.stringify(result));
    return result;
  },
});
