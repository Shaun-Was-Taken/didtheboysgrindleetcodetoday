import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { isInternship } from "./jobFetchers";

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
    // Both the dev and prod deployments run the same hourly crons, so email
    // delivery is opt-in per deployment: only the one with SEND_JOB_EMAILS=true
    // (prod) actually sends. Otherwise every alert would arrive twice.
    if (process.env.SEND_JOB_EMAILS !== "true") {
      console.log(
        "SEND_JOB_EMAILS != 'true' on this deployment; skipping email send."
      );
      return { status: "skipped", sent: 0 };
    }

    // Backfill guard: no company organically posts 50+ jobs in one hour. A
    // batch this large means a fetcher's source or query got broader (or a
    // table was reseeded) — emailing subscribers a wall of "new" jobs would
    // read as spam, so log and skip instead.
    const BACKFILL_THRESHOLD = 25;
    if (args.jobs.length > BACKFILL_THRESHOLD) {
      console.log(
        `Backfill guard: ${args.jobs.length} "new" ${args.company} jobs at once (> ${BACKFILL_THRESHOLD}); skipping alert email.`
      );
      return { status: "skipped_backfill", sent: 0 };
    }

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

    const subject = `${args.jobs.length} new ${args.company} job${args.jobs.length > 1 ? "s" : ""} posted`;
    const htmlBody = buildEmailHtml(args.company, jobsWithCompany);
    const textBody = buildEmailText(args.company, jobsWithCompany);

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
      const ok = await postEmail(apiKey, to, subject, htmlBody, textBody);
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
  html: string,
  text: string
): Promise<boolean> {
  // One-click unsubscribe mailto — required by Gmail/Yahoo for bulk senders and
  // a strong deliverability signal that keeps alerts out of spam.
  const unsubscribe = "mailto:unsubscribe@send.didtheboysgrindleetcodetoday.com";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Job Alerts <alerts@send.didtheboysgrindleetcodetoday.com>",
        to: [to],
        subject,
        html,
        text,
        headers: {
          "List-Unsubscribe": `<${unsubscribe}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
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
          ${isInternship(job.title) ? `<span style="display: inline-block; margin-left: 8px; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; padding: 2px 8px; border-radius: 999px; vertical-align: middle;">INTERNSHIP</span>` : ""}
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

/** Plain-text counterpart to the HTML email. A text/plain part paired with the
 *  HTML makes the message multipart/alternative, which spam filters trust far
 *  more than HTML-only mail. */
function buildEmailText(company: string, jobs: JobInfo[]): string {
  const lines = jobs.map((job) => {
    const loc = job.location ? ` (${job.location})` : "";
    const intern = isInternship(job.title) ? " [INTERNSHIP]" : "";
    return `- ${job.title}${loc}${intern}\n  Apply: ${job.link}`;
  });

  return [
    `${jobs.length} new ${company} job${jobs.length > 1 ? "s" : ""} posted`,
    "",
    ...lines,
    "",
    "—",
    "Sent by your Job Monitor. Auto-generated alert.",
    "Unsubscribe: unsubscribe@send.didtheboysgrindleetcodetoday.com",
  ].join("\n");
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
          {
            title: "Software Engineer Intern (Test Job)",
            link: "https://example.com/jobs/test-3",
            location: "Remote, US",
          },
        ],
      }
    );
    console.log("🧪 Test email result:", JSON.stringify(result));
    return result;
  },
});
