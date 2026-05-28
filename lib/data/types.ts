export type DataSource = "supabase" | "mock";

export type DataResult<T> = {
  data: T;
  source: DataSource;
  error?: string;
};
