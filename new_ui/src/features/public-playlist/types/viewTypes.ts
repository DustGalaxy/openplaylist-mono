type ViewerMode = 'free' | 'synced'
type RepeatMode = 'all' | 'once' | 'none'
type SeekSignal = { position: number; token: number } | null
type SortSettings = {
  order_mode: "auto" | "random" | "free" | "host";
  date: "desc" | "asc" | "none";
  priority: "desc" | "asc" | "none";
  manual_order_ids: Array<string>;
}