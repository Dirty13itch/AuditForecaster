CREATE TABLE "achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"icon_name" text NOT NULL,
	"criteria" jsonb NOT NULL,
	"tier" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" varchar,
	"changes_json" jsonb,
	"ip_address" varchar,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "builder_abbreviations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"builder_id" varchar NOT NULL,
	"abbreviation" text NOT NULL,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "builder_agreements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"builder_id" varchar NOT NULL,
	"agreement_name" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"status" text NOT NULL,
	"default_inspection_price" numeric(10, 2),
	"payment_terms" text,
	"inspection_types_included" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "builder_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"builder_id" varchar NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"email" text,
	"phone" text,
	"mobile_phone" text,
	"is_primary" boolean DEFAULT false,
	"preferred_contact" text DEFAULT 'phone',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "builder_interactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"builder_id" varchar NOT NULL,
	"interaction_type" text NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"interaction_date" timestamp NOT NULL,
	"contact_id" varchar,
	"outcome" text,
	"follow_up_required" boolean DEFAULT false,
	"follow_up_date" timestamp,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "builder_programs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"builder_id" varchar NOT NULL,
	"program_name" text NOT NULL,
	"program_type" text NOT NULL,
	"enrollment_date" timestamp NOT NULL,
	"expiration_date" timestamp,
	"status" text NOT NULL,
	"certification_number" text,
	"rebate_amount" numeric(10, 2),
	"requires_documentation" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "builders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company_name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"trade_specialization" text,
	"rating" integer,
	"total_jobs" integer DEFAULT 0,
	"notes" text,
	"volume_tier" text,
	"billing_terms" text,
	"preferred_lead_time" integer
);
--> statement-breakpoint
CREATE TABLE "calendar_import_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calendar_id" text NOT NULL,
	"calendar_name" text,
	"import_timestamp" timestamp DEFAULT now() NOT NULL,
	"events_processed" integer DEFAULT 0,
	"jobs_created" integer DEFAULT 0,
	"events_queued" integer DEFAULT 0,
	"errors" text
);
--> statement-breakpoint
CREATE TABLE "calendar_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"calendar_id" text NOT NULL,
	"calendar_name" text NOT NULL,
	"background_color" text,
	"foreground_color" text,
	"is_enabled" boolean DEFAULT true,
	"is_primary" boolean DEFAULT false,
	"access_role" text,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "checklist_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"item_number" integer NOT NULL,
	"title" text NOT NULL,
	"completed" boolean DEFAULT false,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"photo_count" integer DEFAULT 0,
	"photo_required" boolean DEFAULT false,
	"voice_note_url" text,
	"voice_note_duration" integer
);
--> statement-breakpoint
CREATE TABLE "compliance_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar NOT NULL,
	"evaluated_at" timestamp DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"violations" jsonb,
	"rule_snapshot" jsonb
);
--> statement-breakpoint
CREATE TABLE "compliance_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"code_year" text NOT NULL,
	"metric_type" text NOT NULL,
	"threshold" numeric(10, 2) NOT NULL,
	"units" text NOT NULL,
	"severity" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "developments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"builder_id" varchar NOT NULL,
	"name" text NOT NULL,
	"region" text,
	"municipality" text,
	"address" text,
	"status" text NOT NULL,
	"total_lots" integer DEFAULT 0,
	"completed_lots" integer DEFAULT 0,
	"start_date" timestamp,
	"target_completion_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"job_assigned" boolean DEFAULT true,
	"job_status_changed" boolean DEFAULT true,
	"report_ready" boolean DEFAULT true,
	"calendar_events" boolean DEFAULT true,
	"daily_digest" boolean DEFAULT true,
	"weekly_performance_summary" boolean DEFAULT true,
	"unsubscribe_token" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "email_preferences_unsubscribe_token_unique" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar,
	"category" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"receipt_url" text,
	"date" timestamp NOT NULL,
	"is_work_related" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "forecasts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"predicted_tdl" numeric(10, 2),
	"predicted_dlo" numeric(10, 2),
	"predicted_ach50" numeric(10, 2),
	"actual_tdl" numeric(10, 2),
	"actual_dlo" numeric(10, 2),
	"actual_ach50" numeric(10, 2),
	"cfm50" numeric(10, 2),
	"house_volume" numeric(10, 2),
	"house_surface_area" numeric(10, 2),
	"total_duct_leakage_cfm25" numeric(10, 2),
	"duct_leakage_to_outside_cfm25" numeric(10, 2),
	"total_led_count" integer,
	"strip_led_count" integer,
	"supplies_inside_conditioned" integer,
	"supplies_outside_conditioned" integer,
	"return_registers_count" integer,
	"central_returns_count" integer,
	"aerosealed" boolean DEFAULT false,
	"test_conditions" text,
	"equipment_notes" text,
	"weather_conditions" text,
	"outdoor_temp" numeric(5, 1),
	"indoor_temp" numeric(5, 1),
	"wind_speed" numeric(5, 1),
	"confidence" integer,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "google_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_event_id" text NOT NULL,
	"google_calendar_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"color_id" text,
	"is_converted" boolean DEFAULT false,
	"converted_to_job_id" varchar,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"builder_id" varchar,
	"plan_id" varchar,
	"lot_id" varchar,
	"contractor" text NOT NULL,
	"status" text NOT NULL,
	"inspection_type" text NOT NULL,
	"pricing" numeric(10, 2),
	"scheduled_date" timestamp,
	"completed_date" timestamp,
	"completed_items" integer DEFAULT 0,
	"total_items" integer DEFAULT 52,
	"priority" text DEFAULT 'medium',
	"latitude" real,
	"longitude" real,
	"floor_area" numeric(10, 2),
	"surface_area" numeric(10, 2),
	"house_volume" numeric(10, 2),
	"stories" numeric(3, 1),
	"notes" text,
	"builder_signature_url" text,
	"builder_signed_at" timestamp,
	"builder_signer_name" text,
	"compliance_status" text,
	"compliance_flags" jsonb,
	"last_compliance_check" timestamp,
	"source_google_event_id" varchar,
	"google_event_id" varchar,
	"original_scheduled_date" timestamp,
	"is_cancelled" boolean DEFAULT false,
	"created_by" varchar,
	CONSTRAINT "jobs_google_event_id_unique" UNIQUE("google_event_id")
);
--> statement-breakpoint
CREATE TABLE "lots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"development_id" varchar NOT NULL,
	"lot_number" text NOT NULL,
	"phase" text,
	"block" text,
	"street_address" text,
	"plan_id" varchar,
	"status" text NOT NULL,
	"square_footage" numeric(10, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mileage_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"start_location" text,
	"end_location" text,
	"distance" numeric(10, 2) NOT NULL,
	"purpose" text,
	"is_work_related" boolean,
	"job_id" varchar,
	"start_latitude" real,
	"start_longitude" real,
	"end_latitude" real,
	"end_longitude" real
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"checklist_item_id" varchar,
	"file_path" text NOT NULL,
	"thumbnail_path" text,
	"full_url" text,
	"hash" text,
	"caption" text,
	"tags" text[],
	"annotation_data" jsonb,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"builder_id" varchar NOT NULL,
	"plan_name" text NOT NULL,
	"floor_area" numeric(10, 2),
	"surface_area" numeric(10, 2),
	"house_volume" numeric(10, 2),
	"stories" numeric(3, 1),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_field_values" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_instance_id" varchar NOT NULL,
	"section_instance_id" varchar NOT NULL,
	"template_field_id" varchar NOT NULL,
	"field_type" text NOT NULL,
	"text_value" text,
	"number_value" numeric(20, 5),
	"boolean_value" boolean,
	"date_value" timestamp,
	"json_value" jsonb,
	"is_calculated" boolean DEFAULT false,
	"calculation_error" text,
	"modified_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_instances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"template_id" varchar NOT NULL,
	"template_version" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"approved_by" varchar,
	"inspector_id" varchar,
	"pdf_url" text,
	"emailed_to" text,
	"emailed_at" timestamp,
	"score_summary" jsonb,
	"compliance_status" text,
	"compliance_flags" jsonb,
	"last_compliance_check" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_section_instances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_instance_id" varchar NOT NULL,
	"template_section_id" varchar NOT NULL,
	"parent_instance_id" varchar,
	"repetition_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"published_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "schedule_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"title" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"notes" text,
	"google_calendar_event_id" text,
	"google_calendar_id" text,
	"last_synced_at" timestamp,
	"color" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_fields" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" varchar NOT NULL,
	"field_type" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"placeholder" text,
	"order_index" integer NOT NULL,
	"is_required" boolean DEFAULT false,
	"is_visible" boolean DEFAULT true,
	"default_value" text,
	"configuration" jsonb,
	"validation_rules" jsonb,
	"conditional_logic" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_sections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"parent_section_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"order_index" integer NOT NULL,
	"is_repeatable" boolean DEFAULT false,
	"min_repetitions" integer DEFAULT 1,
	"max_repetitions" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "unmatched_calendar_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_event_id" text NOT NULL,
	"calendar_id" text NOT NULL,
	"title" text NOT NULL,
	"location" text,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"raw_event_json" jsonb,
	"confidence_score" integer,
	"status" text DEFAULT 'pending',
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"created_job_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "upload_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp NOT NULL,
	"photo_count" integer NOT NULL,
	"job_id" varchar,
	"acknowledged" boolean DEFAULT false,
	"acknowledged_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"achievement_id" varchar NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	"progress" integer DEFAULT 0,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" text DEFAULT 'inspector' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builder_abbreviations" ADD CONSTRAINT "builder_abbreviations_builder_id_builders_id_fk" FOREIGN KEY ("builder_id") REFERENCES "public"."builders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builder_agreements" ADD CONSTRAINT "builder_agreements_builder_id_builders_id_fk" FOREIGN KEY ("builder_id") REFERENCES "public"."builders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builder_contacts" ADD CONSTRAINT "builder_contacts_builder_id_builders_id_fk" FOREIGN KEY ("builder_id") REFERENCES "public"."builders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builder_interactions" ADD CONSTRAINT "builder_interactions_builder_id_builders_id_fk" FOREIGN KEY ("builder_id") REFERENCES "public"."builders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builder_interactions" ADD CONSTRAINT "builder_interactions_contact_id_builder_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."builder_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builder_interactions" ADD CONSTRAINT "builder_interactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builder_programs" ADD CONSTRAINT "builder_programs_builder_id_builders_id_fk" FOREIGN KEY ("builder_id") REFERENCES "public"."builders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developments" ADD CONSTRAINT "developments_builder_id_builders_id_fk" FOREIGN KEY ("builder_id") REFERENCES "public"."builders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_events" ADD CONSTRAINT "google_events_converted_to_job_id_jobs_id_fk" FOREIGN KEY ("converted_to_job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_builder_id_builders_id_fk" FOREIGN KEY ("builder_id") REFERENCES "public"."builders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_development_id_developments_id_fk" FOREIGN KEY ("development_id") REFERENCES "public"."developments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_checklist_item_id_checklist_items_id_fk" FOREIGN KEY ("checklist_item_id") REFERENCES "public"."checklist_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_builder_id_builders_id_fk" FOREIGN KEY ("builder_id") REFERENCES "public"."builders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_field_values" ADD CONSTRAINT "report_field_values_report_instance_id_report_instances_id_fk" FOREIGN KEY ("report_instance_id") REFERENCES "public"."report_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_field_values" ADD CONSTRAINT "report_field_values_section_instance_id_report_section_instances_id_fk" FOREIGN KEY ("section_instance_id") REFERENCES "public"."report_section_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_field_values" ADD CONSTRAINT "report_field_values_template_field_id_template_fields_id_fk" FOREIGN KEY ("template_field_id") REFERENCES "public"."template_fields"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_field_values" ADD CONSTRAINT "report_field_values_modified_by_users_id_fk" FOREIGN KEY ("modified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_instances" ADD CONSTRAINT "report_instances_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_instances" ADD CONSTRAINT "report_instances_template_id_report_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_instances" ADD CONSTRAINT "report_instances_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_instances" ADD CONSTRAINT "report_instances_inspector_id_users_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_section_instances" ADD CONSTRAINT "report_section_instances_report_instance_id_report_instances_id_fk" FOREIGN KEY ("report_instance_id") REFERENCES "public"."report_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_section_instances" ADD CONSTRAINT "report_section_instances_template_section_id_template_sections_id_fk" FOREIGN KEY ("template_section_id") REFERENCES "public"."template_sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_fields" ADD CONSTRAINT "template_fields_section_id_template_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."template_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_sections" ADD CONSTRAINT "template_sections_template_id_report_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unmatched_calendar_events" ADD CONSTRAINT "unmatched_calendar_events_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unmatched_calendar_events" ADD CONSTRAINT "unmatched_calendar_events_created_job_id_jobs_id_fk" FOREIGN KEY ("created_job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_achievements_type" ON "achievements" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_resource" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_timestamp" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_builder_abbreviations_abbreviation" ON "builder_abbreviations" USING btree ("abbreviation");--> statement-breakpoint
CREATE INDEX "idx_builder_abbreviations_builder_id" ON "builder_abbreviations" USING btree ("builder_id");--> statement-breakpoint
CREATE INDEX "idx_builder_agreements_builder_id" ON "builder_agreements" USING btree ("builder_id");--> statement-breakpoint
CREATE INDEX "idx_builder_agreements_status" ON "builder_agreements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_builder_agreements_builder_status" ON "builder_agreements" USING btree ("builder_id","status");--> statement-breakpoint
CREATE INDEX "idx_builder_contacts_builder_id" ON "builder_contacts" USING btree ("builder_id");--> statement-breakpoint
CREATE INDEX "idx_builder_contacts_is_primary" ON "builder_contacts" USING btree ("is_primary");--> statement-breakpoint
CREATE INDEX "idx_builder_interactions_builder_id" ON "builder_interactions" USING btree ("builder_id");--> statement-breakpoint
CREATE INDEX "idx_builder_interactions_builder_date" ON "builder_interactions" USING btree ("builder_id","interaction_date");--> statement-breakpoint
CREATE INDEX "idx_builder_interactions_created_by" ON "builder_interactions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_builder_interactions_contact_id" ON "builder_interactions" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_builder_programs_builder_id" ON "builder_programs" USING btree ("builder_id");--> statement-breakpoint
CREATE INDEX "idx_builder_programs_builder_status" ON "builder_programs" USING btree ("builder_id","status");--> statement-breakpoint
CREATE INDEX "idx_builder_programs_program_type" ON "builder_programs" USING btree ("program_type");--> statement-breakpoint
CREATE INDEX "idx_builders_company_name" ON "builders" USING btree ("company_name");--> statement-breakpoint
CREATE INDEX "idx_builders_name_company" ON "builders" USING btree ("name","company_name");--> statement-breakpoint
CREATE INDEX "calendar_import_logs_calendar_id_idx" ON "calendar_import_logs" USING btree ("calendar_id");--> statement-breakpoint
CREATE INDEX "calendar_import_logs_import_timestamp_idx" ON "calendar_import_logs" USING btree ("import_timestamp");--> statement-breakpoint
CREATE INDEX "calendar_import_logs_calendar_id_timestamp_idx" ON "calendar_import_logs" USING btree ("calendar_id","import_timestamp");--> statement-breakpoint
CREATE INDEX "idx_checklist_items_job_id" ON "checklist_items" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_checklist_items_status" ON "checklist_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_developments_builder_id" ON "developments" USING btree ("builder_id");--> statement-breakpoint
CREATE INDEX "idx_developments_builder_status" ON "developments" USING btree ("builder_id","status");--> statement-breakpoint
CREATE INDEX "idx_developments_municipality" ON "developments" USING btree ("municipality");--> statement-breakpoint
CREATE INDEX "idx_email_preferences_user_id" ON "email_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_job_id" ON "expenses" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_date" ON "expenses" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_forecasts_job_id" ON "forecasts" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_google_events_calendar_event" ON "google_events" USING btree ("google_calendar_id","google_event_id");--> statement-breakpoint
CREATE INDEX "idx_google_events_is_converted" ON "google_events" USING btree ("is_converted");--> statement-breakpoint
CREATE INDEX "idx_google_events_start_time" ON "google_events" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "idx_jobs_builder_id" ON "jobs" USING btree ("builder_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_plan_id" ON "jobs" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_lot_id" ON "jobs" USING btree ("lot_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_scheduled_date" ON "jobs" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_jobs_status_scheduled_date" ON "jobs" USING btree ("status","scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_jobs_created_by" ON "jobs" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_jobs_address" ON "jobs" USING btree ("address");--> statement-breakpoint
CREATE INDEX "idx_jobs_status_created_by" ON "jobs" USING btree ("status","created_by");--> statement-breakpoint
CREATE INDEX "google_event_id_idx" ON "jobs" USING btree ("google_event_id");--> statement-breakpoint
CREATE INDEX "idx_lots_development_id" ON "lots" USING btree ("development_id");--> statement-breakpoint
CREATE INDEX "idx_lots_development_lot_number" ON "lots" USING btree ("development_id","lot_number");--> statement-breakpoint
CREATE INDEX "idx_lots_plan_id" ON "lots" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_lots_status" ON "lots" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_photos_job_id_uploaded_at" ON "photos" USING btree ("job_id","uploaded_at");--> statement-breakpoint
CREATE INDEX "idx_photos_hash" ON "photos" USING btree ("hash");--> statement-breakpoint
CREATE INDEX "idx_photos_tags" ON "photos" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "idx_photos_checklist_item_id" ON "photos" USING btree ("checklist_item_id") WHERE "photos"."checklist_item_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_plans_builder_id" ON "plans" USING btree ("builder_id");--> statement-breakpoint
CREATE INDEX "idx_plans_plan_name" ON "plans" USING btree ("plan_name");--> statement-breakpoint
CREATE INDEX "idx_report_field_values_report_id" ON "report_field_values" USING btree ("report_instance_id");--> statement-breakpoint
CREATE INDEX "idx_report_field_values_section_instance_id" ON "report_field_values" USING btree ("section_instance_id");--> statement-breakpoint
CREATE INDEX "idx_report_field_values_template_field_id" ON "report_field_values" USING btree ("template_field_id");--> statement-breakpoint
CREATE INDEX "idx_report_field_values_field_type" ON "report_field_values" USING btree ("field_type");--> statement-breakpoint
CREATE INDEX "idx_report_instances_job_id" ON "report_instances" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_report_instances_template_id" ON "report_instances" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_report_instances_status" ON "report_instances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_report_instances_inspector_id" ON "report_instances" USING btree ("inspector_id");--> statement-breakpoint
CREATE INDEX "idx_report_instances_created_at" ON "report_instances" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_report_section_instances_report_id" ON "report_section_instances" USING btree ("report_instance_id");--> statement-breakpoint
CREATE INDEX "idx_report_section_instances_template_section_id" ON "report_section_instances" USING btree ("template_section_id");--> statement-breakpoint
CREATE INDEX "idx_report_templates_category" ON "report_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_report_templates_status" ON "report_templates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_report_templates_created_by" ON "report_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_schedule_events_job_id_start_time" ON "schedule_events" USING btree ("job_id","start_time");--> statement-breakpoint
CREATE INDEX "idx_schedule_events_google_event_id" ON "schedule_events" USING btree ("google_calendar_event_id");--> statement-breakpoint
CREATE INDEX "idx_schedule_events_start_end_time" ON "schedule_events" USING btree ("start_time","end_time");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_template_fields_section_id" ON "template_fields" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "idx_template_fields_field_type" ON "template_fields" USING btree ("field_type");--> statement-breakpoint
CREATE INDEX "idx_template_fields_order" ON "template_fields" USING btree ("section_id","order_index");--> statement-breakpoint
CREATE INDEX "idx_template_sections_template_id" ON "template_sections" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_template_sections_parent_id" ON "template_sections" USING btree ("parent_section_id");--> statement-breakpoint
CREATE INDEX "idx_template_sections_order" ON "template_sections" USING btree ("template_id","order_index");--> statement-breakpoint
CREATE INDEX "unmatched_events_google_event_id_idx" ON "unmatched_calendar_events" USING btree ("google_event_id");--> statement-breakpoint
CREATE INDEX "unmatched_events_status_idx" ON "unmatched_calendar_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "unmatched_events_confidence_score_idx" ON "unmatched_calendar_events" USING btree ("confidence_score");--> statement-breakpoint
CREATE INDEX "unmatched_events_created_at_idx" ON "unmatched_calendar_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "unmatched_events_status_confidence_idx" ON "unmatched_calendar_events" USING btree ("status","confidence_score");--> statement-breakpoint
CREATE INDEX "idx_user_achievements_user_id" ON "user_achievements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_achievements_achievement_id" ON "user_achievements" USING btree ("achievement_id");--> statement-breakpoint
CREATE INDEX "idx_user_achievements_earned_at" ON "user_achievements" USING btree ("earned_at");