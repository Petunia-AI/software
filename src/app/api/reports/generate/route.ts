import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("No autorizado", { status: 401 });

  const orgId = (session.user as any).organizationId as string;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "overview";

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, brandColor: true, logo: true },
  });

  const [leadsByStatus, leadsBySource, totalLeads, metaCampaigns, topLeads] = await Promise.all([
    prisma.lead.groupBy({ by: ["status"], where: { organizationId: orgId }, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["source"], where: { organizationId: orgId }, _count: { _all: true } }),
    prisma.lead.count({ where: { organizationId: orgId } }),
    prisma.metaCampaign.findMany({
      where: { organizationId: orgId, status: { in: ["ACTIVE", "COMPLETED", "PAUSED"] } },
      select: { name: true, status: true, impressions: true, clicks: true, leads: true, spent: true, ctr: true, cpl: true },
      orderBy: { leads: "desc" }, take: 10,
    }),
    prisma.lead.findMany({
      where: { organizationId: orgId },
      orderBy: { score: "desc" },
      take: 10,
      select: { name: true, email: true, phone: true, source: true, status: true, score: true, createdAt: true },
    }),
  ]);

  const wonLeads = leadsByStatus.find((r) => r.status === "WON")?._count._all ?? 0;
  const brandColor = org?.brandColor ?? "#7c3aed";
  const date = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  const metaTotals = metaCampaigns.reduce(
    (acc, c) => ({
      impressions: acc.impressions + (c.impressions ?? 0),
      clicks: acc.clicks + (c.clicks ?? 0),
      leads: acc.leads + (c.leads ?? 0),
      spent: acc.spent + Number(c.spent ?? 0),
    }),
    { impressions: 0, clicks: 0, leads: 0, spent: 0 }
  );

  const STATUS_LABELS: Record<string, string> = { NEW: "Nuevo", CONTACTED: "Contactado", QUALIFIED: "Calificado", PROPOSAL: "Propuesta", NEGOTIATION: "Negociación", WON: "Ganado", LOST: "Perdido" };
  const SOURCE_LABELS: Record<string, string> = { INSTAGRAM: "Instagram", FACEBOOK: "Facebook", WHATSAPP: "WhatsApp", WEBSITE: "Sitio Web", REFERRAL: "Referido", OTHER: "Otro" };

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte — ${org?.name ?? "Petunia"}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; background: #fff; }
  @page { size: A4; margin: 20mm 15mm; }
  @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  .header { background: ${brandColor}; color: white; padding: 28px 32px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 22px; font-weight: 700; }
  .header p { font-size: 13px; opacity: 0.8; margin-top: 4px; }
  .header .date { font-size: 13px; opacity: 0.7; text-align: right; }
  .body { padding: 28px 32px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
  .kpi { background: #f8f8f8; border-radius: 10px; padding: 16px; border-left: 4px solid ${brandColor}; }
  .kpi .label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .kpi .value { font-size: 24px; font-weight: 700; color: #1a1a1a; }
  .kpi .sub { font-size: 11px; color: #888; margin-top: 2px; }
  .section { margin-bottom: 28px; }
  .section h2 { font-size: 14px; font-weight: 700; color: #333; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid ${brandColor}; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: ${brandColor}; color: white; padding: 8px 10px; text-align: left; font-weight: 600; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #fafafa; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-gray { background: #f3f4f6; color: #374151; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #aaa; }
  .print-btn { position: fixed; top: 20px; right: 20px; background: ${brandColor}; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 1000; }
  .print-btn:hover { opacity: 0.9; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">⬇ Descargar PDF</button>

<div class="header">
  <div>
    <h1>${org?.name ?? "Mi Empresa"}</h1>
    <p>Reporte de Performance — ${type === "overview" ? "Resumen General" : "Detallado"}</p>
  </div>
  <div class="date">
    <div style="font-size:16px;font-weight:700;">Generado</div>
    <div>${date}</div>
  </div>
</div>

<div class="body">

  <!-- KPIs -->
  <div class="kpis">
    <div class="kpi">
      <div class="label">Total Leads</div>
      <div class="value">${totalLeads}</div>
      <div class="sub">${wonLeads} ganados</div>
    </div>
    <div class="kpi">
      <div class="label">Conversión</div>
      <div class="value">${totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0}%</div>
      <div class="sub">Leads → Ganados</div>
    </div>
    <div class="kpi">
      <div class="label">Leads Meta Ads</div>
      <div class="value">${metaTotals.leads}</div>
      <div class="sub">$${metaTotals.spent.toFixed(0)} invertidos</div>
    </div>
    <div class="kpi">
      <div class="label">CPL Promedio</div>
      <div class="value">${metaTotals.leads > 0 ? "$" + (metaTotals.spent / metaTotals.leads).toFixed(2) : "—"}</div>
      <div class="sub">Costo por lead</div>
    </div>
  </div>

  <div class="grid2">
    <!-- Pipeline -->
    <div class="section">
      <h2>Pipeline de Ventas</h2>
      <table>
        <thead><tr><th>Estatus</th><th>Leads</th><th>%</th></tr></thead>
        <tbody>
          ${leadsByStatus.map((r) => `
            <tr>
              <td>${STATUS_LABELS[r.status] ?? r.status}</td>
              <td><strong>${r._count._all}</strong></td>
              <td>${totalLeads > 0 ? Math.round((r._count._all / totalLeads) * 100) : 0}%</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>

    <!-- Sources -->
    <div class="section">
      <h2>Fuente de Leads</h2>
      <table>
        <thead><tr><th>Canal</th><th>Leads</th><th>%</th></tr></thead>
        <tbody>
          ${leadsBySource.sort((a, b) => b._count._all - a._count._all).map((r) => `
            <tr>
              <td>${SOURCE_LABELS[r.source] ?? r.source}</td>
              <td><strong>${r._count._all}</strong></td>
              <td>${totalLeads > 0 ? Math.round((r._count._all / totalLeads) * 100) : 0}%</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Meta Campaigns -->
  ${metaCampaigns.length > 0 ? `
  <div class="section">
    <h2>Campañas Meta Ads</h2>
    <table>
      <thead><tr><th>Campaña</th><th>Estado</th><th>Impresiones</th><th>Clics</th><th>CTR</th><th>Leads</th><th>Invertido</th><th>CPL</th></tr></thead>
      <tbody>
        ${metaCampaigns.map((c) => `
          <tr>
            <td>${c.name}</td>
            <td><span class="badge ${c.status === "ACTIVE" ? "badge-green" : c.status === "PAUSED" ? "badge-amber" : "badge-gray"}">${c.status === "ACTIVE" ? "Activa" : c.status === "PAUSED" ? "Pausada" : "Completada"}</span></td>
            <td>${(c.impressions ?? 0).toLocaleString("es-MX")}</td>
            <td>${(c.clicks ?? 0).toLocaleString("es-MX")}</td>
            <td>${((Number(c.ctr ?? 0)) * 100).toFixed(2)}%</td>
            <td><strong>${c.leads ?? 0}</strong></td>
            <td>$${Number(c.spent ?? 0).toFixed(0)}</td>
            <td>${c.cpl ? "$" + Number(c.cpl).toFixed(2) : "—"}</td>
          </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <!-- Top Leads -->
  ${topLeads.length > 0 ? `
  <div class="section">
    <h2>Top Leads por Score IA</h2>
    <table>
      <thead><tr><th>#</th><th>Nombre</th><th>Email</th><th>Fuente</th><th>Estatus</th><th>Score</th><th>Fecha</th></tr></thead>
      <tbody>
        ${topLeads.map((l, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${l.name}</strong></td>
            <td>${l.email ?? "—"}</td>
            <td>${SOURCE_LABELS[l.source] ?? l.source}</td>
            <td>${STATUS_LABELS[l.status] ?? l.status}</td>
            <td><strong style="color:${l.score >= 70 ? "#16a34a" : l.score >= 40 ? "#d97706" : "#dc2626"}">${l.score}/100</strong></td>
            <td>${new Date(l.createdAt).toLocaleDateString("es-MX")}</td>
          </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <div class="footer">
    Reporte generado automáticamente por <strong>Petunia AI</strong> · ${date}
  </div>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Report-Generated": new Date().toISOString(),
    },
  });
}
