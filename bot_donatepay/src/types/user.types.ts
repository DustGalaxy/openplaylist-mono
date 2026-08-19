export interface ConnectionData {
  user_id: string; // UUID владельца аккаунта в OpenPlaylist
  platform_user_id: string;
  access_token: string;
  platform?: string;
  refresh_token?: string;
  expires_at?: number;
  bot_settings?: Record<string, any> | null;
}

export interface UserTokensDto {
  user_id: string;
  platform: string;
  platform_user_id: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  bot_settings?: Record<string, any> | null;
}
