/**
 * Google Ads API Client
 * Manages Google Search/Display ad campaigns via the Google Ads API v17
 *
 * Requires:
 *  - GOOGLE_ADS_CLIENT_ID
 *  - GOOGLE_ADS_CLIENT_SECRET
 *  - GOOGLE_ADS_DEVELOPER_TOKEN
 */

const GOOGLE_ADS_API_VERSION = "v17";
const GOOGLE_ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;
const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface GoogleCustomerClient {
  resourceName: string;
  clientCustomer: string;
  level: string;
  descriptiveName?: string;
  id?: string;
}

export interface GoogleCustomerInfo {
  id: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
}

export interface GoogleCampaignCreate {
  name: string;
  objective: string;
  status?: string;
}

export interface GoogleAdGroupCreate {
  name: string;
  campaignResourceName: string;
  status?: string;
  cpcBidMicros?: string;
}

export interface GoogleKeywordTarget {
  text: string;
  matchType: "BROAD" | "PHRASE" | "EXACT";
}

export interface GoogleLocationTarget {
  id: string;
  name: string;
  type: string; // "City" | "Country" | "Region"
}

export interface GoogleResponsiveSearchAd {
  headlines: string[];     // 3–15 headlines (max 30 chars each)
  descriptions: string[];  // 2–4 descriptions (max 90 chars each)
  finalUrls: string[];
  path1?: string;
  path2?: string;
}

export interface GoogleCampaignInsights {
  impressions: string;
  clicks: string;
  costMicros: string;
  conversions: string;
  ctr: string;
  averageCpc: string;
  campaignId: string;
  campaignName: string;
}

export interface GoogleLocationSearchResult {
  id: string;
  name: string;
  canonicalName: string;
  targetType: string;
  countryCode: string;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class GoogleAdsError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public googleError?: any,
  ) {
    super(message);
    this.name = "GoogleAdsError";
  }
}

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------

async function googleAdsFetch<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${GOOGLE_ADS_BASE_URL}${endpoint}`;

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    throw new GoogleAdsError("GOOGLE_ADS_DEVELOPER_TOKEN no configurado", 500);
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg =
      data?.error?.message ||
      data?.[0]?.error?.message ||
      `Google Ads API error (${res.status})`;
    throw new GoogleAdsError(errMsg, res.status, data?.error || data);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// OAuth — Exchange code for tokens
// ---------------------------------------------------------------------------

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  credentials?: { clientId: string; clientSecret: string },
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: credentials?.clientId || process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: credentials?.clientSecret || process.env.GOOGLE_ADS_CLIENT_SECRET!,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json();

  if (data.error) {
    throw new GoogleAdsError(
      data.error_description || data.error || "Error exchanging code for tokens",
      400,
      data,
    );
  }

  return data as GoogleTokenResponse;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json();

  if (data.error) {
    throw new GoogleAdsError(
      data.error_description || "Error refreshing token",
      400,
      data,
    );
  }

  return data as GoogleTokenResponse;
}

// ---------------------------------------------------------------------------
// Account discovery
// ---------------------------------------------------------------------------

export async function getAccessibleCustomers(
  accessToken: string,
): Promise<string[]> {
  const data = await googleAdsFetch<{ resourceNames: string[] }>(
    `${GOOGLE_ADS_BASE_URL}/customers:listAccessibleCustomers`,
    accessToken,
  );
  return data.resourceNames || [];
}

export async function getCustomerInfo(
  accessToken: string,
  customerId: string,
): Promise<GoogleCustomerInfo> {
  const cleanId = customerId.replace(/\D/g, "");
  const query = `SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone FROM customer LIMIT 1`;

  const data = await googleAdsFetch<{ results: any[] }>(
    `${GOOGLE_ADS_BASE_URL}/customers/${cleanId}/googleAds:searchStream`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ query }),
    },
  );

  const result = data.results?.[0]?.customer;
  if (!result) {
    throw new GoogleAdsError("No se encontró información del cliente", 404);
  }

  return {
    id: result.id,
    descriptiveName: result.descriptiveName || `Customer ${result.id}`,
    currencyCode: result.currencyCode || "USD",
    timeZone: result.timeZone || "America/New_York",
  };
}

// ---------------------------------------------------------------------------
// Campaign CRUD
// ---------------------------------------------------------------------------

export async function createCampaign(
  accessToken: string,
  customerId: string,
  campaign: GoogleCampaignCreate,
  dailyBudgetMicros: number,
): Promise<{ campaignResourceName: string; budgetResourceName: string }> {
  const cleanId = customerId.replace(/\D/g, "");

  // 1. Create campaign budget
  const budgetOp = {
    create: {
      name: `${campaign.name} Budget`,
      amountMicros: String(dailyBudgetMicros),
      deliveryMethod: "STANDARD",
    },
  };

  const budgetRes = await googleAdsFetch<{ results: any[] }>(
    `${GOOGLE_ADS_BASE_URL}/customers/${cleanId}/campaignBudgets:mutate`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ operations: [budgetOp] }),
    },
  );

  const budgetResourceName = budgetRes.results?.[0]?.resourceName;
  if (!budgetResourceName) {
    throw new GoogleAdsError("Error creando presupuesto de campaña", 500);
  }

  // 2. Create campaign
  const campaignOp = {
    create: {
      name: campaign.name,
      advertisingChannelType: mapObjectiveToChannelType(campaign.objective),
      status: campaign.status || "PAUSED",
      campaignBudget: budgetResourceName,
      // Real estate compliance
      biddingStrategyType: "MAXIMIZE_CLICKS",
      startDate: formatGoogleDate(new Date()),
    },
  };

  const campaignRes = await googleAdsFetch<{ results: any[] }>(
    `${GOOGLE_ADS_BASE_URL}/customers/${cleanId}/campaigns:mutate`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ operations: [campaignOp] }),
    },
  );

  const campaignResourceName = campaignRes.results?.[0]?.resourceName;
  if (!campaignResourceName) {
    throw new GoogleAdsError("Error creando campaña", 500);
  }

  return { campaignResourceName, budgetResourceName };
}

export async function createAdGroup(
  accessToken: string,
  customerId: string,
  adGroup: GoogleAdGroupCreate,
): Promise<{ adGroupResourceName: string }> {
  const cleanId = customerId.replace(/\D/g, "");

  const op = {
    create: {
      name: adGroup.name,
      campaign: adGroup.campaignResourceName,
      status: adGroup.status || "ENABLED",
      type: "SEARCH_STANDARD",
      cpcBidMicros: adGroup.cpcBidMicros || "1000000", // $1 default
    },
  };

  const res = await googleAdsFetch<{ results: any[] }>(
    `${GOOGLE_ADS_BASE_URL}/customers/${cleanId}/adGroupAds:mutate`.replace(
      "adGroupAds",
      "adGroups",
    ),
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ operations: [op] }),
    },
  );

  const adGroupResourceName = res.results?.[0]?.resourceName;
  if (!adGroupResourceName) {
    throw new GoogleAdsError("Error creando grupo de anuncios", 500);
  }

  return { adGroupResourceName };
}

export async function createResponsiveSearchAd(
  accessToken: string,
  customerId: string,
  adGroupResourceName: string,
  ad: GoogleResponsiveSearchAd,
): Promise<{ adResourceName: string }> {
  const cleanId = customerId.replace(/\D/g, "");

  const headlines = ad.headlines.slice(0, 15).map((h, i) => ({
    text: h.substring(0, 30),
    pinnedField: i < 3 ? undefined : undefined, // Let Google optimize order
  }));

  const descriptions = ad.descriptions.slice(0, 4).map((d) => ({
    text: d.substring(0, 90),
  }));

  const op = {
    create: {
      adGroup: adGroupResourceName,
      ad: {
        responsiveSearchAd: {
          headlines,
          descriptions,
          path1: ad.path1 || undefined,
          path2: ad.path2 || undefined,
        },
        finalUrls: ad.finalUrls,
      },
      status: "ENABLED",
    },
  };

  const res = await googleAdsFetch<{ results: any[] }>(
    `${GOOGLE_ADS_BASE_URL}/customers/${cleanId}/adGroupAds:mutate`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ operations: [op] }),
    },
  );

  const adResourceName = res.results?.[0]?.resourceName;
  if (!adResourceName) {
    throw new GoogleAdsError("Error creando anuncio", 500);
  }

  return { adResourceName };
}

// ---------------------------------------------------------------------------
// Keywords
// ---------------------------------------------------------------------------

export async function addKeywords(
  accessToken: string,
  customerId: string,
  adGroupResourceName: string,
  keywords: GoogleKeywordTarget[],
): Promise<void> {
  const cleanId = customerId.replace(/\D/g, "");

  const operations = keywords.map((kw) => ({
    create: {
      adGroup: adGroupResourceName,
      keyword: {
        text: kw.text,
        matchType: kw.matchType,
      },
      status: "ENABLED",
    },
  }));

  await googleAdsFetch(
    `${GOOGLE_ADS_BASE_URL}/customers/${cleanId}/adGroupCriteria:mutate`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ operations }),
    },
  );
}

// ---------------------------------------------------------------------------
// Location targeting
// ---------------------------------------------------------------------------

export async function addLocationTargets(
  accessToken: string,
  customerId: string,
  campaignResourceName: string,
  locationIds: string[],
): Promise<void> {
  const cleanId = customerId.replace(/\D/g, "");

  const operations = locationIds.map((locId) => ({
    create: {
      campaign: campaignResourceName,
      location: {
        geoTargetConstant: `geoTargetConstants/${locId}`,
      },
    },
  }));

  await googleAdsFetch(
    `${GOOGLE_ADS_BASE_URL}/customers/${cleanId}/campaignCriteria:mutate`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ operations }),
    },
  );
}

// ---------------------------------------------------------------------------
// Campaign management
// ---------------------------------------------------------------------------

export async function updateCampaignStatus(
  accessToken: string,
  customerId: string,
  campaignResourceName: string,
  status: "ENABLED" | "PAUSED" | "REMOVED",
): Promise<void> {
  const cleanId = customerId.replace(/\D/g, "");

  const op = {
    update: {
      resourceName: campaignResourceName,
      status,
    },
    updateMask: "status",
  };

  await googleAdsFetch(
    `${GOOGLE_ADS_BASE_URL}/customers/${cleanId}/campaigns:mutate`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ operations: [op] }),
    },
  );
}

export async function listCampaigns(
  accessToken: string,
  customerId: string,
  limit = 25,
): Promise<any[]> {
  const cleanId = customerId.replace(/\D/g, "");
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.start_date,
      campaign.end_date,
      campaign_budget.amount_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.id DESC
    LIMIT ${limit}
  `;

  const data = await googleAdsFetch<{ results: any[] }>(
    `${GOOGLE_ADS_BASE_URL}/customers/${cleanId}/googleAds:searchStream`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ query }),
    },
  );

  return (data.results || []).map((r: any) => ({
    id: r.campaign?.id,
    name: r.campaign?.name,
    status: r.campaign?.status,
    channelType: r.campaign?.advertisingChannelType,
    startDate: r.campaign?.startDate,
    endDate: r.campaign?.endDate,
    dailyBudgetMicros: r.campaignBudget?.amountMicros,
    impressions: r.metrics?.impressions,
    clicks: r.metrics?.clicks,
    costMicros: r.metrics?.costMicros,
    conversions: r.metrics?.conversions,
    ctr: r.metrics?.ctr,
    averageCpc: r.metrics?.averageCpc,
  }));
}

// ---------------------------------------------------------------------------
// Insights / Reporting
// ---------------------------------------------------------------------------

export async function getCampaignInsights(
  accessToken: string,
  customerId: string,
  campaignId: string,
  dateRange: "LAST_30_DAYS" | "LAST_7_DAYS" | "THIS_MONTH" = "LAST_30_DAYS",
): Promise<GoogleCampaignInsights | null> {
  const cleanCustomerId = customerId.replace(/\D/g, "");
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE campaign.id = ${campaignId}
      AND segments.date DURING ${dateRange}
  `;

  try {
    const data = await googleAdsFetch<{ results: any[] }>(
      `${GOOGLE_ADS_BASE_URL}/customers/${cleanCustomerId}/googleAds:searchStream`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({ query }),
      },
    );

    const r = data.results?.[0];
    if (!r) return null;

    return {
      campaignId: r.campaign?.id,
      campaignName: r.campaign?.name,
      impressions: r.metrics?.impressions || "0",
      clicks: r.metrics?.clicks || "0",
      costMicros: r.metrics?.costMicros || "0",
      conversions: r.metrics?.conversions || "0",
      ctr: r.metrics?.ctr || "0",
      averageCpc: r.metrics?.averageCpc || "0",
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Location search (Geo Target Constants)
// ---------------------------------------------------------------------------

export async function searchLocations(
  accessToken: string,
  query: string,
  countryCode = "US",
): Promise<GoogleLocationSearchResult[]> {
  // Use the geo target constant suggest endpoint
  const customerId = process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? "0" : "0"; // Uses a placeholder; works with dev token
  const body = {
    locale: "es",
    countryCode,
    locationNames: { names: [query] },
  };

  try {
    const data = await googleAdsFetch<{ results: any[] }>(
      `${GOOGLE_ADS_BASE_URL}/geoTargetConstants:suggest`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    return (data.results || []).map((r: any) => ({
      id: r.geoTargetConstant?.resourceName?.split("/").pop() || "",
      name: r.geoTargetConstant?.name || "",
      canonicalName: r.geoTargetConstant?.canonicalName || "",
      targetType: r.geoTargetConstant?.targetType || "",
      countryCode: r.geoTargetConstant?.countryCode || "",
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Keyword ideas (planning)
// ---------------------------------------------------------------------------

export async function getKeywordIdeas(
  accessToken: string,
  customerId: string,
  keywords: string[],
  language = "1003", // Spanish
  locationId = "2484", // Mexico
): Promise<{ text: string; avgMonthlySearches: string; competition: string }[]> {
  const cleanId = customerId.replace(/\D/g, "");

  try {
    const body = {
      language: `languageConstants/${language}`,
      geoTargetConstants: [`geoTargetConstants/${locationId}`],
      keywordSeed: { keywords },
      pageSize: 20,
    };

    const data = await googleAdsFetch<{ results: any[] }>(
      `${GOOGLE_ADS_BASE_URL}/customers/${cleanId}:generateKeywordIdeas`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    return (data.results || []).map((r: any) => ({
      text: r.text || "",
      avgMonthlySearches: r.keywordIdeaMetrics?.avgMonthlySearches || "0",
      competition: r.keywordIdeaMetrics?.competition || "UNSPECIFIED",
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Full campaign pipeline — creates Campaign → AdGroup → Keywords → Ad
// ---------------------------------------------------------------------------

export interface FullGoogleCampaignParams {
  accessToken: string;
  customerId: string;
  name: string;
  objective: string;
  dailyBudget: number; // in micros ($1 = 1_000_000)
  headlines: string[];
  descriptions: string[];
  finalUrl: string;
  displayPath1?: string;
  displayPath2?: string;
  keywords?: GoogleKeywordTarget[];
  locationIds?: string[];
}

export interface FullGoogleCampaignResult {
  campaignResourceName: string;
  adGroupResourceName: string;
  adResourceName: string;
  budgetResourceName: string;
}

export async function createFullGoogleCampaign(
  params: FullGoogleCampaignParams,
): Promise<FullGoogleCampaignResult> {
  const {
    accessToken,
    customerId,
    name,
    objective,
    dailyBudget,
    headlines,
    descriptions,
    finalUrl,
    displayPath1,
    displayPath2,
    keywords,
    locationIds,
  } = params;

  // 1. Create campaign with budget
  const { campaignResourceName, budgetResourceName } = await createCampaign(
    accessToken,
    customerId,
    { name, objective, status: "PAUSED" },
    dailyBudget,
  );

  // 2. Add location targeting if provided
  if (locationIds && locationIds.length > 0) {
    await addLocationTargets(accessToken, customerId, campaignResourceName, locationIds);
  }

  // 3. Create ad group
  const { adGroupResourceName } = await createAdGroup(
    accessToken,
    customerId,
    {
      name: `${name} - Ad Group`,
      campaignResourceName,
      status: "ENABLED",
    },
  );

  // 4. Add keywords if provided
  if (keywords && keywords.length > 0) {
    await addKeywords(accessToken, customerId, adGroupResourceName, keywords);
  } else {
    // Default real estate keywords
    const defaultKeywords: GoogleKeywordTarget[] = [
      { text: "casas en venta", matchType: "BROAD" },
      { text: "departamentos en renta", matchType: "BROAD" },
      { text: "bienes raices", matchType: "BROAD" },
      { text: "inmobiliaria", matchType: "BROAD" },
    ];
    await addKeywords(accessToken, customerId, adGroupResourceName, defaultKeywords);
  }

  // 5. Create responsive search ad
  const { adResourceName } = await createResponsiveSearchAd(
    accessToken,
    customerId,
    adGroupResourceName,
    {
      headlines: headlines.length >= 3 ? headlines : [...headlines, "Encuentra tu hogar ideal", "Las mejores propiedades", "Contacta hoy"].slice(0, 15),
      descriptions: descriptions.length >= 2 ? descriptions : [...descriptions, "Explora nuestra selección de propiedades disponibles. Agenda tu visita hoy."].slice(0, 4),
      finalUrls: [finalUrl],
      path1: displayPath1,
      path2: displayPath2,
    },
  );

  return {
    campaignResourceName,
    adGroupResourceName,
    adResourceName,
    budgetResourceName,
  };
}

// ---------------------------------------------------------------------------
// Objective & channel type mapping
// ---------------------------------------------------------------------------

function mapObjectiveToChannelType(objective: string): string {
  const map: Record<string, string> = {
    LEAD_GENERATION: "SEARCH",
    TRAFFIC: "SEARCH",
    BRAND_AWARENESS: "DISPLAY",
    ENGAGEMENT: "SEARCH",
    CONVERSIONS: "SEARCH",
    MESSAGES: "SEARCH",
  };
  return map[objective] || "SEARCH";
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatGoogleDate(date: Date): string {
  return date.toISOString().split("T")[0].replace(/-/g, "");
}

// ---------------------------------------------------------------------------
// Build OAuth URL
// ---------------------------------------------------------------------------

export function buildGoogleOAuthUrl(redirectUri: string, state: string, clientId?: string): string {
  const params = new URLSearchParams({
    client_id: clientId || process.env.GOOGLE_ADS_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/adwords",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_OAUTH_URL}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Helper: get fresh access token (refresh if needed)
// ---------------------------------------------------------------------------

export async function getValidAccessToken(
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date | null,
): Promise<{ accessToken: string; refreshed: boolean }> {
  // If token is still valid, return it
  if (expiresAt && new Date(expiresAt) > new Date(Date.now() + 5 * 60 * 1000)) {
    return { accessToken, refreshed: false };
  }

  // Need to refresh
  if (!refreshToken) {
    throw new GoogleAdsError("No hay refresh token. Reconecta Google Ads.", 401);
  }

  const newTokens = await refreshAccessToken(refreshToken);
  return { accessToken: newTokens.access_token, refreshed: true };
}

// ---------------------------------------------------------------------------
// Extract Google resource ID from resource name
// ---------------------------------------------------------------------------

export function extractResourceId(resourceName: string): string {
  return resourceName.split("/").pop() || resourceName;
}
