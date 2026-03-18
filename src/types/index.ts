export type PropertyType = "HOUSE" | "APARTMENT" | "LAND" | "COMMERCIAL" | "OFFICE";
export type OperationType = "SALE" | "RENT" | "BOTH";
export type PropertyStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "RENTED";

export type ContentType = "POST" | "STORY" | "REEL" | "CAROUSEL" | "WHATSAPP" | "EMAIL";
export type PlatformType = "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "WHATSAPP" | "EMAIL" | "LINKEDIN";
export type ContentStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED";

export type LeadSource = "WEBSITE" | "INSTAGRAM" | "FACEBOOK" | "WHATSAPP" | "REFERRAL" | "OTHER";
export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";

export type ActivityType = "NOTE" | "CALL" | "EMAIL" | "WHATSAPP" | "MEETING" | "TASK";
export type FollowUpType = "REMINDER" | "EMAIL" | "WHATSAPP" | "CALL";

export type AIProvider = "claude" | "openai";

export type OnboardingStepStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: QuickAction[];
}

export interface QuickAction {
  label: string;
  action: string;
  type: "navigate" | "execute" | "message";
}

export interface OnboardingData {
  status: OnboardingStepStatus;
  currentStep: number;
  completedSteps: number[];
  data: {
    businessName?: string;
    businessType?: string;
    markets?: string[];
    buyerBudget?: string;
    whatsappConnected: boolean;
    metaConnected: boolean;
    tiktokConnected: boolean;
    pipelineConfigured: boolean;
  };
}

export interface SidebarNavItem {
  title: string;
  href: string;
  icon: string;
  badge?: number;
}

export interface DashboardStats {
  totalProperties: number;
  activeLeads: number;
  contentScheduled: number;
  followUpsPending: number;
  propertiesAvailable: number;
  propertiesSold: number;
  leadsWon: number;
  leadsLost: number;
}

export interface PropertyFormData {
  title: string;
  description?: string;
  propertyType: PropertyType;
  operationType: OperationType;
  price?: number;
  currency?: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  features?: string[];
  images?: string[];
  videoUrl?: string;
  status?: PropertyStatus;
}

export interface LeadFormData {
  name: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  status?: LeadStatus;
  notes?: string;
  propertyId?: string;
  assignedToId?: string;
}

export interface ContentGenerationRequest {
  propertyId?: string;
  contentType: ContentType;
  platform: PlatformType;
  tone?: string;
  language?: string;
  customPrompt?: string;
}
