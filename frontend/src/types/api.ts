export interface PendingResponse {
  id: string;
  comment_id: string;
  influencer_id: string;
  suggested_text: string;
  final_text: string | null;
  llm_provider_used: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  comment_content: string | null;
  comment_author: string | null;
}

export interface KnowledgeEntry {
  id: string;
  influencer_id: string;
  category: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface SocialAccount {
  id: string;
  influencer_id: string;
  platform: string;
  account_id: string;
  page_id: string | null;
  username: string | null;
  profile_picture_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Influencer {
  id: string;
  name: string;
  slug: string;
  llm_provider: string | null;
  system_prompt_core: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}
