import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, buildEmailHtml, OrgSmtpConfig } from "@/lib/email";

/**
 * GET /api/cron/process-drips
 *
 * Processes pending email drip enrollments and sends the next scheduled email.
 * Should run every 15–30 minutes via Vercel cron or external scheduler.
 * Protected by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const results = { processed: 0, sent: 0, errors: 0, skipped: 0 };

  // Fetch all active enrollments due to send now
  const due = await prisma.emailDripEnrollment.findMany({
    where: {
      status: "ACTIVE",
      nextSendAt: { lte: now },
    },
    include: {
      lead: { select: { id: true, name: true, email: true } },
      drip: {
        select: {
          id: true,
          name: true,
          fromName: true,
          fromEmail: true,
          replyTo: true,
          status: true,
          organization: {
            select: {
              name: true,
              brandColor: true,
              smtpHost: true,
              smtpPort: true,
              smtpUser: true,
              smtpPass: true,
              smtpFrom: true,
              smtpFromName: true,
              smtpSecure: true,
              smtpVerified: true,
            },
          },
          steps: { orderBy: { stepNumber: "asc" } },
        },
      },
    },
    take: 100, // process max 100 per run
  });

  for (const enrollment of due) {
    results.processed++;

    // Skip if drip is no longer active
    if (enrollment.drip.status !== "ACTIVE") {
      await prisma.emailDripEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "CANCELLED" },
      });
      results.skipped++;
      continue;
    }

    const steps = enrollment.drip.steps;
    const nextStepIdx = enrollment.currentStep; // 0-indexed: step index to send
    const step = steps[nextStepIdx];

    if (!step) {
      // No more steps → complete the enrollment
      await prisma.emailDripEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "COMPLETED", completedAt: now, nextSendAt: null },
      });
      await prisma.emailDrip.update({
        where: { id: enrollment.dripId },
        data: { totalCompleted: { increment: 1 } },
      });
      results.skipped++;
      continue;
    }

    if (!enrollment.lead.email) {
      await prisma.emailDripEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "BOUNCED", lastError: "Lead sin email" },
      });
      results.skipped++;
      continue;
    }

    // Build org SMTP config if verified
    const org = enrollment.drip.organization;
    const smtpConfig: OrgSmtpConfig | null =
      org.smtpVerified && org.smtpHost && org.smtpUser && org.smtpPass
        ? {
            smtpHost: org.smtpHost,
            smtpPort: org.smtpPort ?? 587,
            smtpUser: org.smtpUser,
            smtpPass: org.smtpPass,
            smtpFrom: org.smtpFrom ?? org.smtpUser,
            smtpFromName: org.smtpFromName,
            smtpSecure: org.smtpSecure,
          }
        : null;

    // Build and send email
    const html = buildEmailHtml({
      preheader: step.subject,
      body: step.bodyHtml
        .replace(/{{nombre}}/gi, enrollment.lead.name ?? "")
        .replace(/{{name}}/gi, enrollment.lead.name ?? ""),
      orgName: org.name,
      brandColor: org.brandColor ?? "#7c3aed",
    });

    const result = await sendEmail(
      {
        to: enrollment.lead.email,
        from: enrollment.drip.fromEmail ?? undefined,
        fromName: enrollment.drip.fromName ?? org.name,
        replyTo: enrollment.drip.replyTo ?? undefined,
        subject: step.subject.replace(/{{nombre}}/gi, enrollment.lead.name ?? ""),
        html,
        text: step.bodyText ?? undefined,
      },
      smtpConfig
    );

    if (result.error) {
      await prisma.emailDripEnrollment.update({
        where: { id: enrollment.id },
        data: { lastError: result.error },
      });
      results.errors++;
      continue;
    }

    // Move to next step
    const nextStep = steps[nextStepIdx + 1];
    const nextSendAt = nextStep
      ? new Date(now.getTime() + nextStep.delayDays * 24 * 60 * 60 * 1000)
      : null;

    await prisma.emailDripEnrollment.update({
      where: { id: enrollment.id },
      data: {
        currentStep: nextStepIdx + 1,
        emailsSent: { increment: 1 },
        nextSendAt,
        status: nextStep ? "ACTIVE" : "COMPLETED",
        completedAt: nextStep ? null : now,
        lastError: null,
      },
    });

    if (!nextStep) {
      await prisma.emailDrip.update({
        where: { id: enrollment.dripId },
        data: { totalCompleted: { increment: 1 } },
      });
    }

    results.sent++;
  }

  return NextResponse.json({ ok: true, ...results, processedAt: now.toISOString() });
}

export const POST = GET;
