import { pgTable, uuid, text, timestamp, integer, decimal, numeric, jsonb, uniqueIndex, index, pgEnum } from "drizzle-orm/pg-core";

// Classification types
export const classificationEnum = pgEnum("classification", [
  "willing_to_meet",    // Strong interest, wants to schedule
  "interested",         // Positive response, open to discussion
  "needs_more_info",    // Curious but needs clarification
  "not_interested",     // Polite decline
  "out_of_office",      // Auto-reply, vacation
  "unsubscribe",        // Wants to be removed
  "bounce",             // Email bounced
  "other",              // Uncategorized
]);

// Qualification requests - stores all emails sent for qualification
export const qualificationRequests = pgTable(
  "qualification_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Source identification (which project/service sent this)
    sourceService: text("source_service").notNull(), // 'mcpfactory', 'pressbeat', etc.
    sourceOrgId: text("source_org_id").notNull(),    // Clerk org ID or similar
    sourceRefId: text("source_ref_id"),              // Campaign run ID, pitch ID, etc.

    // Context fields for filtering/aggregation
    appId: text("app_id"),
    clerkOrgId: text("clerk_org_id"),
    clerkUserId: text("clerk_user_id"),
    brandId: text("brand_id"),
    campaignId: text("campaign_id"),
    runId: text("run_id"),

    // Email content to qualify
    fromEmail: text("from_email").notNull(),
    toEmail: text("to_email").notNull(),
    subject: text("subject"),
    bodyText: text("body_text"),
    bodyHtml: text("body_html"),

    // Original email reference (for threading)
    inReplyToMessageId: text("in_reply_to_message_id"),

    // Timestamps
    emailReceivedAt: timestamp("email_received_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_qr_clerk_org").on(table.clerkOrgId),
    index("idx_qr_campaign").on(table.campaignId),
    index("idx_qr_app").on(table.appId),
  ]
);

// Qualifications - AI analysis results
export const qualifications = pgTable("qualifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => qualificationRequests.id, { onDelete: "cascade" }),
  
  // Classification result
  classification: classificationEnum("classification").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }), // 0.0000 to 1.0000
  reasoning: text("reasoning"),
  
  // Extracted intent/action items
  suggestedAction: text("suggested_action"), // 'forward_to_client', 'auto_reply', 'ignore', etc.
  extractedDetails: jsonb("extracted_details"), // { meeting_time: "...", phone: "...", etc. }
  
  // Model info for tracking costs
  model: text("model").notNull().default("claude-3-haiku-20240307"),
  inputTokens: decimal("input_tokens", { precision: 10, scale: 0 }),
  outputTokens: decimal("output_tokens", { precision: 10, scale: 0 }),
  costUsd: decimal("cost_usd", { precision: 10, scale: 6 }),
  
  // Raw response for debugging
  responseRaw: jsonb("response_raw"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Webhook callbacks - notify source service of qualification results
export const webhookCallbacks = pgTable("webhook_callbacks", {
  id: uuid("id").primaryKey().defaultRandom(),
  qualificationId: uuid("qualification_id")
    .notNull()
    .references(() => qualifications.id, { onDelete: "cascade" }),
  
  webhookUrl: text("webhook_url").notNull(),
  
  // Delivery status
  status: text("status").notNull().default("pending"), // 'pending', 'sent', 'failed'
  attempts: decimal("attempts", { precision: 3, scale: 0 }).notNull().default("0"),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  lastError: text("last_error"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Local users table (maps to Clerk)
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_users_clerk_id").on(table.clerkUserId),
  ]
);

// Local orgs table (maps to Clerk)
export const orgs = pgTable(
  "orgs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkOrgId: text("clerk_org_id").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_orgs_clerk_id").on(table.clerkOrgId),
  ]
);

// Task type registry
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  }
);

// Task runs (individual executions)
export const tasksRuns = pgTable(
  "tasks_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id),
    userId: uuid("user_id")
      .references(() => users.id),
    status: text("status").notNull().default("running"), // running, completed, failed
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_tasks_runs_task").on(table.taskId),
    index("idx_tasks_runs_org").on(table.orgId),
    index("idx_tasks_runs_status").on(table.status),
  ]
);

// Cost line items per task run
export const tasksRunsCosts = pgTable(
  "tasks_runs_costs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskRunId: uuid("task_run_id")
      .notNull()
      .references(() => tasksRuns.id, { onDelete: "cascade" }),
    costName: text("cost_name").notNull(),
    units: integer("units").notNull(),
    costPerUnitInUsdCents: numeric("cost_per_unit_in_usd_cents", { precision: 12, scale: 10 }).notNull(),
    totalCostInUsdCents: numeric("total_cost_in_usd_cents", { precision: 12, scale: 10 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_tasks_runs_costs_run").on(table.taskRunId),
    index("idx_tasks_runs_costs_name").on(table.costName),
  ]
);

export type QualificationRequest = typeof qualificationRequests.$inferSelect;
export type NewQualificationRequest = typeof qualificationRequests.$inferInsert;
export type Qualification = typeof qualifications.$inferSelect;
export type NewQualification = typeof qualifications.$inferInsert;
export type WebhookCallback = typeof webhookCallbacks.$inferSelect;
export type NewWebhookCallback = typeof webhookCallbacks.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Org = typeof orgs.$inferSelect;
export type NewOrg = typeof orgs.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskRun = typeof tasksRuns.$inferSelect;
export type NewTaskRun = typeof tasksRuns.$inferInsert;
export type TaskRunCost = typeof tasksRunsCosts.$inferSelect;
export type NewTaskRunCost = typeof tasksRunsCosts.$inferInsert;
