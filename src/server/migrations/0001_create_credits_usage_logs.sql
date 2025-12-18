-- Migration number: 0001 	 2025-12-18T23:08:30.523Z

CREATE TABLE IF NOT EXISTS credits_usage_logs (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	date TEXT NOT NULL,
	timestamp INTEGER NOT NULL,
	service_type TEXT NOT NULL,
	tier TEXT NOT NULL,
	required INTEGER NOT NULL,
	used_before INTEGER NOT NULL,
	used_after INTEGER NOT NULL,
	allowed INTEGER NOT NULL,
	meta TEXT
);

-- Index for efficient queries by user and date (used in getCreditsUsageLogsForUserOnDate)
CREATE INDEX IF NOT EXISTS idx_credits_usage_logs_user_date
	ON credits_usage_logs(user_id, date);

-- Index for efficient queries by timestamp (used for ordering)
CREATE INDEX IF NOT EXISTS idx_credits_usage_logs_timestamp
	ON credits_usage_logs(timestamp);
