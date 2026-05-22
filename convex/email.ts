import { internalAction } from "./_generated/server";
import { v } from "convex/values";

interface JobInfo {
  title: string;
  link: string;
  location?: string;
  company: string;
}

/**
 * Send an email notification via Mailgun when new job postings are detected.
 * 
 * Required environment variables (set in Convex dashboard):
 *   - MAILGUN_API_KEY: Your Mailgun API key
 *   - MAILGUN_DOMAIN: Your Mailgun domain (e.g., mg.yourdomain.com)
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
  handler: async (_ctx, args) => {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    const toEmail = process.env.NOTIFICATION_EMAIL;

    if (!apiKey || !domain || !toEmail) {
      console.error(
        "Missing Mailgun environment variables. Set MAILGUN_API_KEY, MAILGUN_DOMAIN, and NOTIFICATION_EMAIL in your Convex dashboard."
      );
      return { status: "error", message: "Missing email configuration" };
    }

    const jobsWithCompany: JobInfo[] = args.jobs.map((job) => ({
      ...job,
      company: args.company,
    }));

    const subject = `🚀 ${args.jobs.length} New ${args.company} Job${args.jobs.length > 1 ? "s" : ""} Found!`;
    const htmlBody = buildEmailHtml(args.company, jobsWithCompany);
    const textBody = buildEmailText(args.company, jobsWithCompany);

    try {
      const formData = new URLSearchParams();
      formData.append("from", `Job Alerts <noreply@${domain}>`);
      formData.append("to", toEmail);
      formData.append("subject", subject);
      formData.append("html", htmlBody);
      formData.append("text", textBody);

      const response = await fetch(
        `https://api.mailgun.net/v3/${domain}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Mailgun API error (${response.status}):`, errorText);
        return { status: "error", message: errorText };
      }

      const result = await response.json();
      console.log(
        `📧 Email sent for ${args.jobs.length} new ${args.company} job(s): ${result.id}`
      );
      return { status: "success", messageId: result.id };
    } catch (error) {
      console.error("Error sending email via Mailgun:", error);
      return { status: "error", message: String(error) };
    }
  },
});

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

function buildEmailText(company: string, jobs: JobInfo[]): string {
  const jobLines = jobs
    .map(
      (job, i) =>
        `${i + 1}. ${job.title}${job.location ? ` (${job.location})` : ""}\n   ${job.link}`
    )
    .join("\n\n");

  return `🚀 ${jobs.length} New ${company} Job(s) Found!\n\n${jobLines}\n\n---\nSent by your Job Monitor`;
}
