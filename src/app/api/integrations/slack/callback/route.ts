import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForToken } from "@/lib/slack";
import crypto from "crypto";

/**
 * GET /api/integrations/slack/callback
 * Slack redirects here after the user authorises the app.
 * Exchanges the code for a bot token and stores it on the organization.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // User cancelled the flow
    if (error) {
      return NextResponse.redirect(
        new URL("/settings?slack=cancelled", process.env.NEXTAUTH_URL!),
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings?slack=error&reason=missing_params", process.env.NEXTAUTH_URL!),
      );
    }

    // Validate state HMAC
    const parts = state.split(":");
    if (parts.length !== 4) {
      return NextResponse.redirect(
        new URL("/settings?slack=error&reason=invalid_state", process.env.NEXTAUTH_URL!),
      );
    }

    const [organizationId, userId, random, hmac] = parts;
    const payload = `${organizationId}:${userId}:${random}`;
    const expectedHmac = crypto
      .createHmac("sha256", process.env.NEXTAUTH_SECRET || "secret")
      .update(payload)
      .digest("hex");

    if (hmac !== expectedHmac) {
      return NextResponse.redirect(
        new URL("/settings?slack=error&reason=tampered_state", process.env.NEXTAUTH_URL!),
      );
    }

    // Verify the state matches what we stored
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { slackConnectedBy: true },
    });

    if (!org || org.slackConnectedBy !== state) {
      return NextResponse.redirect(
        new URL("/settings?slack=error&reason=state_mismatch", process.env.NEXTAUTH_URL!),
      );
    }

    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code);

    // Determine channel from incoming webhook (if available)
    const channelId =
      tokenData.incoming_webhook?.channel_id || null;
    const channelName =
      tokenData.incoming_webhook?.channel
        ? tokenData.incoming_webhook.channel.replace(/^#/, "")
        : null;

    // Store the Slack connection on the organization
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        slackTeamId: tokenData.team.id,
        slackTeamName: tokenData.team.name,
        slackBotToken: tokenData.access_token,
        slackChannelId: channelId,
        slackChannelName: channelName,
        slackConnectedAt: new Date(),
        slackConnectedBy: userId,
      },
    });

    return NextResponse.redirect(
      new URL("/settings?slack=success", process.env.NEXTAUTH_URL!),
    );
  } catch (error) {
    console.error("[Slack Callback]", error);
    return NextResponse.redirect(
      new URL(
        `/settings?slack=error&reason=${encodeURIComponent(String(error))}`,
        process.env.NEXTAUTH_URL!,
      ),
    );
  }
}
