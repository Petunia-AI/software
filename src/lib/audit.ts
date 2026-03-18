/**
 * Audit Log Helper
 * Registra quién hizo qué y cuándo en la plataforma
 */

import { prisma } from "@/lib/prisma";

export interface AuditParams {
  organizationId?: string | null;
  userId?: string | null;
  action: string;           // "lead.created" | "lead.updated" | "campaign.published" | etc.
  resourceType: string;     // "lead" | "campaign" | "property" | "knowledge"
  resourceId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId ?? null,
        userId: params.userId ?? null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId ?? null,
        details: params.details ? JSON.parse(JSON.stringify(params.details)) : undefined,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Never let audit logging break the main flow
    console.error("[AUDIT_LOG_ERROR]", err);
  }
}

// Convenience wrappers
export const audit = {
  leadCreated: (params: { organizationId: string; userId?: string; leadId: string; leadName: string; source: string; score: number; ipAddress?: string }) =>
    logAudit({
      organizationId: params.organizationId,
      userId: params.userId,
      action: "lead.created",
      resourceType: "lead",
      resourceId: params.leadId,
      details: { name: params.leadName, source: params.source, score: params.score },
      ipAddress: params.ipAddress,
    }),

  leadUpdated: (params: { organizationId: string; userId?: string; leadId: string; changes: Record<string, unknown> }) =>
    logAudit({
      organizationId: params.organizationId,
      userId: params.userId,
      action: "lead.updated",
      resourceType: "lead",
      resourceId: params.leadId,
      details: { changes: params.changes },
    }),

  leadStatusChanged: (params: { organizationId: string; userId?: string; leadId: string; from: string; to: string }) =>
    logAudit({
      organizationId: params.organizationId,
      userId: params.userId,
      action: "lead.status_changed",
      resourceType: "lead",
      resourceId: params.leadId,
      details: { from: params.from, to: params.to },
    }),

  campaignPublished: (params: { organizationId: string; userId?: string; campaignId: string; campaignName: string; platform: string }) =>
    logAudit({
      organizationId: params.organizationId,
      userId: params.userId,
      action: "campaign.published",
      resourceType: "campaign",
      resourceId: params.campaignId,
      details: { name: params.campaignName, platform: params.platform },
    }),

  propertyCreated: (params: { organizationId: string; userId?: string; propertyId: string; title: string }) =>
    logAudit({
      organizationId: params.organizationId,
      userId: params.userId,
      action: "property.created",
      resourceType: "property",
      resourceId: params.propertyId,
      details: { title: params.title },
    }),

  contentGenerated: (params: { organizationId: string; userId?: string; platform: string; contentType: string }) =>
    logAudit({
      organizationId: params.organizationId,
      userId: params.userId,
      action: "content.generated",
      resourceType: "content",
      details: { platform: params.platform, contentType: params.contentType },
    }),

  metricsSynced: (params: { organizationId: string; campaigns: number; platform: string }) =>
    logAudit({
      organizationId: params.organizationId,
      action: "metrics.synced",
      resourceType: "campaign",
      details: { campaignCount: params.campaigns, platform: params.platform },
    }),

  dripCreated: (params: { organizationId: string; userId?: string; dripId: string; name: string }) =>
    logAudit({
      organizationId: params.organizationId,
      userId: params.userId,
      action: "drip.created",
      resourceType: "drip",
      resourceId: params.dripId,
      details: { name: params.name },
    }),

  abTestCreated: (params: { organizationId: string; userId?: string; testId: string; name: string }) =>
    logAudit({
      organizationId: params.organizationId,
      userId: params.userId,
      action: "abtest.created",
      resourceType: "abtest",
      resourceId: params.testId,
      details: { name: params.name },
    }),
};
