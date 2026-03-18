/**
 * Meta Marketing API Client
 * Manages Facebook/Instagram ad campaigns via the Graph API v21.0
 */

const META_API_VERSION = "v21.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MetaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface MetaAdAccount {
  id: string;
  name: string;
  account_id: string;
  currency: string;
  account_status: number;
}

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}

export interface MetaCampaignCreate {
  name: string;
  objective: string;
  status?: string;
  special_ad_categories?: string[];
}

export interface MetaAdSetCreate {
  name: string;
  campaign_id: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  end_time?: string;
  billing_event: string;
  optimization_goal: string;
  targeting: MetaTargeting;
  status?: string;
}

export interface MetaTargeting {
  geo_locations?: {
    countries?: string[];
    cities?: { key: string; name?: string; radius?: number; distance_unit?: string }[];
    regions?: { key: string; name?: string }[];
  };
  age_min?: number;
  age_max?: number;
  genders?: number[];
  flexible_spec?: { interests?: { id: string; name: string }[] }[];
  publisher_platforms?: string[];
  facebook_positions?: string[];
  instagram_positions?: string[];
}

export interface MetaAdCreativeCreate {
  name: string;
  object_story_spec: {
    page_id: string;
    link_data?: {
      link: string;
      message: string;
      name?: string;
      description?: string;
      call_to_action?: { type: string; value?: { link: string } };
      image_hash?: string;
    };
  };
}

export interface MetaAdCreate {
  name: string;
  adset_id: string;
  creative: { creative_id: string };
  status?: string;
}

export interface MetaCampaignInsights {
  impressions: string;
  clicks: string;
  spend: string;
  actions?: { action_type: string; value: string }[];
  ctr?: string;
  cpc?: string;
  cost_per_action_type?: { action_type: string; value: string }[];
  date_start: string;
  date_stop: string;
}

export interface MetaLocationSearch {
  key: string;
  name: string;
  type: string;
  country_code?: string;
  region?: string;
}

export interface MetaInterestSearch {
  id: string;
  name: string;
  audience_size_lower_bound?: number;
  audience_size_upper_bound?: number;
  path?: string[];
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class MetaAdsError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public metaError?: any,
  ) {
    super(message);
    this.name = "MetaAdsError";
  }
}

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------

async function metaFetch<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${META_BASE_URL}${endpoint}`;

  const separator = url.includes("?") ? "&" : "?";
  const fullUrl = `${url}${separator}access_token=${encodeURIComponent(accessToken)}`;

  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new MetaAdsError(
      data.error?.message || `Meta API error (${res.status})`,
      res.status,
      data.error,
    );
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// OAuth — Exchange code for long-lived token
// ---------------------------------------------------------------------------

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  credentials?: { appId: string; appSecret: string },
): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    client_id: credentials?.appId || process.env.META_APP_ID!,
    client_secret: credentials?.appSecret || process.env.META_APP_SECRET!,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(
    `${META_BASE_URL}/oauth/access_token?${params.toString()}`,
  );
  const data = await res.json();

  if (data.error) {
    throw new MetaAdsError(
      data.error.message || "Error exchanging code for token",
      400,
      data.error,
    );
  }

  return data as MetaTokenResponse;
}

export async function getLongLivedToken(
  shortLivedToken: string,
  credentials?: { appId: string; appSecret: string },
): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: credentials?.appId || process.env.META_APP_ID!,
    client_secret: credentials?.appSecret || process.env.META_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  });

  const res = await fetch(
    `${META_BASE_URL}/oauth/access_token?${params.toString()}`,
  );
  const data = await res.json();

  if (data.error) {
    throw new MetaAdsError(
      data.error.message || "Error getting long-lived token",
      400,
      data.error,
    );
  }

  return data as MetaTokenResponse;
}

// ---------------------------------------------------------------------------
// Account & Page discovery
// ---------------------------------------------------------------------------

export async function getAdAccounts(
  accessToken: string,
): Promise<MetaAdAccount[]> {
  const data = await metaFetch<{ data: MetaAdAccount[] }>(
    "/me/adaccounts?fields=id,name,account_id,currency,account_status&limit=50",
    accessToken,
  );
  return data.data || [];
}

export async function getPages(
  accessToken: string,
): Promise<MetaPage[]> {
  const data = await metaFetch<{ data: MetaPage[] }>(
    "/me/accounts?fields=id,name,access_token,category&limit=50",
    accessToken,
  );
  return data.data || [];
}

// ---------------------------------------------------------------------------
// Campaign CRUD
// ---------------------------------------------------------------------------

export async function createCampaign(
  adAccountId: string,
  accessToken: string,
  campaign: MetaCampaignCreate,
): Promise<{ id: string }> {
  // Meta Marketing API requires HOUSING special ad category for real estate
  const body: any = {
    name: campaign.name,
    objective: mapObjectiveToMeta(campaign.objective),
    status: campaign.status || "PAUSED",
    special_ad_categories: campaign.special_ad_categories || ["HOUSING"],
  };

  return metaFetch<{ id: string }>(
    `/${adAccountId}/campaigns`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function createAdSet(
  adAccountId: string,
  accessToken: string,
  adSet: MetaAdSetCreate,
): Promise<{ id: string }> {
  return metaFetch<{ id: string }>(
    `/${adAccountId}/adsets`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(adSet),
    },
  );
}

export async function createAdCreative(
  adAccountId: string,
  accessToken: string,
  creative: MetaAdCreativeCreate,
): Promise<{ id: string }> {
  return metaFetch<{ id: string }>(
    `/${adAccountId}/adcreatives`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(creative),
    },
  );
}

export async function createAd(
  adAccountId: string,
  accessToken: string,
  ad: MetaAdCreate,
): Promise<{ id: string }> {
  return metaFetch<{ id: string }>(
    `/${adAccountId}/ads`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(ad),
    },
  );
}

// ---------------------------------------------------------------------------
// Campaign management
// ---------------------------------------------------------------------------

export async function getCampaignById(
  campaignId: string,
  accessToken: string,
): Promise<any> {
  return metaFetch(
    `/${campaignId}?fields=id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time`,
    accessToken,
  );
}

export async function updateCampaignStatus(
  campaignId: string,
  accessToken: string,
  status: "ACTIVE" | "PAUSED" | "DELETED",
): Promise<{ success: boolean }> {
  return metaFetch<{ success: boolean }>(
    `/${campaignId}`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ status }),
    },
  );
}

export async function listCampaigns(
  adAccountId: string,
  accessToken: string,
  limit = 25,
): Promise<any[]> {
  const data = await metaFetch<{ data: any[] }>(
    `/${adAccountId}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time&limit=${limit}`,
    accessToken,
  );
  return data.data || [];
}

// ---------------------------------------------------------------------------
// Insights / Reporting
// ---------------------------------------------------------------------------

export async function getCampaignInsights(
  campaignId: string,
  accessToken: string,
  datePreset = "last_30d",
): Promise<MetaCampaignInsights[]> {
  const data = await metaFetch<{ data: MetaCampaignInsights[] }>(
    `/${campaignId}/insights?fields=impressions,clicks,spend,actions,ctr,cpc,cost_per_action_type&date_preset=${datePreset}`,
    accessToken,
  );
  return data.data || [];
}

export async function getAdAccountInsights(
  adAccountId: string,
  accessToken: string,
  datePreset = "last_30d",
): Promise<MetaCampaignInsights[]> {
  const data = await metaFetch<{ data: MetaCampaignInsights[] }>(
    `/${adAccountId}/insights?fields=impressions,clicks,spend,actions,ctr,cpc&date_preset=${datePreset}&level=campaign`,
    accessToken,
  );
  return data.data || [];
}

// ---------------------------------------------------------------------------
// Targeting helpers
// ---------------------------------------------------------------------------

export async function searchLocations(
  accessToken: string,
  query: string,
  type: "city" | "country" | "region" = "city",
): Promise<MetaLocationSearch[]> {
  const data = await metaFetch<{ data: MetaLocationSearch[] }>(
    `/search?type=adgeolocation&location_types=["${type}"]&q=${encodeURIComponent(query)}&limit=10`,
    accessToken,
  );
  return data.data || [];
}

export async function searchInterests(
  accessToken: string,
  query: string,
): Promise<MetaInterestSearch[]> {
  const data = await metaFetch<{ data: MetaInterestSearch[] }>(
    `/search?type=adinterest&q=${encodeURIComponent(query)}&limit=15`,
    accessToken,
  );
  return data.data || [];
}

// ---------------------------------------------------------------------------
// Image upload
// ---------------------------------------------------------------------------

export async function uploadAdImage(
  adAccountId: string,
  accessToken: string,
  imageUrl: string,
): Promise<{ hash: string }> {
  // Download the image first then upload as bytes
  const imgRes = await fetch(imageUrl);
  const imgBuffer = await imgRes.arrayBuffer();
  const base64 = Buffer.from(imgBuffer).toString("base64");

  const formData = new FormData();
  formData.append("bytes", base64);

  const res = await fetch(
    `${META_BASE_URL}/${adAccountId}/adimages?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      body: formData,
    },
  );
  const data = await res.json();

  if (data.error) {
    throw new MetaAdsError(
      data.error.message || "Error uploading image",
      400,
      data.error,
    );
  }

  // Response: { images: { bytes: { hash: "..." } } }
  const images = data.images || {};
  const first = Object.values(images)[0] as any;
  return { hash: first?.hash || "" };
}

// ---------------------------------------------------------------------------
// Full campaign pipeline — creates Campaign → AdSet → Creative → Ad
// ---------------------------------------------------------------------------

export interface FullCampaignParams {
  adAccountId: string;
  pageId: string;
  accessToken: string;
  name: string;
  objective: string;
  dailyBudget: number; // in cents
  currency: string;
  startDate?: string;
  endDate?: string;
  targeting: MetaTargeting;
  headline: string;
  primaryText: string;
  description?: string;
  callToAction?: string;
  linkUrl: string;
  imageUrl?: string;
}

export interface FullCampaignResult {
  campaignId: string;
  adSetId: string;
  creativeId: string;
  adId: string;
}

export async function createFullCampaign(
  params: FullCampaignParams,
): Promise<FullCampaignResult> {
  const {
    adAccountId,
    pageId,
    accessToken,
    name,
    objective,
    dailyBudget,
    startDate,
    endDate,
    targeting,
    headline,
    primaryText,
    description,
    callToAction,
    linkUrl,
    imageUrl,
  } = params;

  // 1. Create campaign
  const campaign = await createCampaign(adAccountId, accessToken, {
    name,
    objective,
    status: "PAUSED", // always create paused, user activates later
    special_ad_categories: ["HOUSING"],
  });

  // 2. Create ad set with targeting & budget
  const adSetData: MetaAdSetCreate = {
    name: `${name} - Ad Set`,
    campaign_id: campaign.id,
    daily_budget: String(dailyBudget),
    billing_event: "IMPRESSIONS",
    optimization_goal: mapOptimizationGoal(objective),
    targeting,
    status: "PAUSED",
  };

  if (startDate) adSetData.start_time = startDate;
  if (endDate) adSetData.end_time = endDate;

  const adSet = await createAdSet(adAccountId, accessToken, adSetData);

  // 3. Upload image if provided
  let imageHash: string | undefined;
  if (imageUrl) {
    const upload = await uploadAdImage(adAccountId, accessToken, imageUrl);
    imageHash = upload.hash;
  }

  // 4. Create ad creative
  const creativeData: MetaAdCreativeCreate = {
    name: `${name} - Creative`,
    object_story_spec: {
      page_id: pageId,
      link_data: {
        link: linkUrl,
        message: primaryText,
        name: headline,
        description: description || undefined,
        call_to_action: {
          type: callToAction || "LEARN_MORE",
          value: { link: linkUrl },
        },
        ...(imageHash ? { image_hash: imageHash } : {}),
      },
    },
  };

  const creative = await createAdCreative(
    adAccountId,
    accessToken,
    creativeData,
  );

  // 5. Create the ad
  const ad = await createAd(adAccountId, accessToken, {
    name: `${name} - Ad`,
    adset_id: adSet.id,
    creative: { creative_id: creative.id },
    status: "PAUSED",
  });

  return {
    campaignId: campaign.id,
    adSetId: adSet.id,
    creativeId: creative.id,
    adId: ad.id,
  };
}

// ---------------------------------------------------------------------------
// Objective mapping helpers
// ---------------------------------------------------------------------------

function mapObjectiveToMeta(objective: string): string {
  const map: Record<string, string> = {
    LEAD_GENERATION: "OUTCOME_LEADS",
    TRAFFIC: "OUTCOME_TRAFFIC",
    BRAND_AWARENESS: "OUTCOME_AWARENESS",
    ENGAGEMENT: "OUTCOME_ENGAGEMENT",
    CONVERSIONS: "OUTCOME_SALES",
    MESSAGES: "OUTCOME_ENGAGEMENT",
  };
  return map[objective] || "OUTCOME_LEADS";
}

function mapOptimizationGoal(objective: string): string {
  const map: Record<string, string> = {
    LEAD_GENERATION: "LEAD_GENERATION",
    TRAFFIC: "LINK_CLICKS",
    BRAND_AWARENESS: "REACH",
    ENGAGEMENT: "POST_ENGAGEMENT",
    CONVERSIONS: "OFFSITE_CONVERSIONS",
    MESSAGES: "CONVERSATIONS",
  };
  return map[objective] || "LEAD_GENERATION";
}

// ---------------------------------------------------------------------------
// Build OAuth URL
// ---------------------------------------------------------------------------

export function buildMetaOAuthUrl(redirectUri: string, state: string, appId?: string): string {
  const params = new URLSearchParams({
    client_id: appId || process.env.META_APP_ID!,
    redirect_uri: redirectUri,
    state,
    scope: [
      "ads_management",
      "ads_read",
      "business_management",
      "pages_show_list",
      "pages_read_engagement",
      "leads_retrieval",
    ].join(","),
    response_type: "code",
  });

  return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params.toString()}`;
}
