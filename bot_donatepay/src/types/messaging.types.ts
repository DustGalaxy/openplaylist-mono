export interface DonatePayNewOrderPayload {
  request_id: string;
  owner_platform_id: string;
  owner_id: string;
  requester_id: string;
  requester_nickname: string;
  donation_amount: number;
  donation_currency: string;
  yt_video_url: string;
  priority: string;
  source: string;
}

export interface TokenDiedPayload {
  access_token: string;
  platform_user_id: string;
}

export interface ConnectCommandPayload {
  user_id?: string;
  platform_user_id?: string;
  access_token?: string;
  action?: string;
  token?: string;
  channel?: string;
  platform?: string;
  refresh_token?: string;
  expires_at?: number;
  bot_settings?: Record<string, any> | null;
}

export type DisconnectCommandPayload =
  | string
  | {
      platform_user_id?: string;
      channel?: string;
    };
