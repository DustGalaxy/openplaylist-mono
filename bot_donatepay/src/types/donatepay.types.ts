export interface DonatePayVideo {
  link: string | null;
  id: string | null;
  start: number | null;
  finish: number | null;
  title: string | null;
  channel: { id: string | null; title: string | null };
  image: string | null;
  live: boolean | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  dislikes: number | null;
  embeddable: boolean | null;
}

export interface DonatePayVars {
  name: string;
  comment: string;
  sum: number;
  currency: string;
  target: string;
  video?: DonatePayVideo;
  boss: string;
  premiumSettings?: {
    image: string | null;
    effect: string | null;
    voice: string | null;
    emotion: string | null;
    speed: number | null;
  };
  like: string;
  social_provider: string;
  social_name: string;
}

export interface DonatePayNotification {
  id: number;
  user_id: number;
  type: "donation" | string;
  view: any | null;
  vars: DonatePayVars;
  created_at: string;
}

export interface CentrifugeDonatePayMessage {
  data: {
    notification: DonatePayNotification;
  };
}

export interface DonatePayConnectionTokenResponse {
  token: string;
  status?: string;
  message?: string;
}

export interface DonatePaySubscriptionTokenResponse {
  channels?: Array<{
    channel: string;
    token: string;
  }>;
  [key: string]: any;
}
