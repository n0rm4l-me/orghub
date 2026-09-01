
CREATE TYPE public."DayOfWeek" AS ENUM (
    'MON',
    'TUE',
    'WED',
    'THU',
    'FRI'
);

CREATE TYPE public."PollStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'CLOSED'
);

CREATE TYPE public."RedemptionStatus" AS ENUM (
    'PENDING',
    'DONE',
    'FAILED',
    'REJECTED'
);

CREATE TYPE public."ResultsVisibility" AS ENUM (
    'ALWAYS',
    'AFTER_VOTE',
    'AFTER_CLOSE',
    'NEVER'
);

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'EDITOR',
    'VIEWER'
);

CREATE TABLE public."Account" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);

CREATE TABLE public."Announcement" (
    id text NOT NULL,
    message text NOT NULL,
    "linkUrl" text,
    "linkLabel" text,
    color text DEFAULT 'brand'::text NOT NULL,
    active boolean DEFAULT false NOT NULL,
    "showFrom" timestamp(3) without time zone,
    "showUntil" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."Article" (
    id text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    body jsonb NOT NULL,
    excerpt text,
    "coverImage" text,
    published boolean DEFAULT false NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "organizationId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "authorId" text NOT NULL,
    "eventDate" timestamp(3) without time zone,
    "eventEndDate" timestamp(3) without time zone,
    "eventLocation" text,
    pinned boolean DEFAULT false NOT NULL,
    important boolean DEFAULT false NOT NULL,
    "commentsEnabled" boolean DEFAULT true NOT NULL
);

CREATE TABLE public."ArticleReaction" (
    "articleId" text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."ArticleTranslation" (
    id text NOT NULL,
    "articleId" text NOT NULL,
    lang text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."ArticleView" (
    "articleId" text NOT NULL,
    "userId" text NOT NULL,
    "viewedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    "resourceType" text,
    "resourceId" text,
    metadata jsonb,
    ip text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."CategoriesOnArticles" (
    "articleId" text NOT NULL,
    "categoryId" text NOT NULL
);

CREATE TABLE public."Category" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL
);

CREATE TABLE public."Comment" (
    id text NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "authorId" text NOT NULL,
    "articleId" text NOT NULL
);

CREATE TABLE public."Dish" (
    id text NOT NULL,
    "venueId" text NOT NULL,
    name text NOT NULL,
    description text,
    photo text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    nutrition jsonb,
    "tagIds" text DEFAULT ''::text NOT NULL,
    price numeric(10,2)
);

CREATE TABLE public."DishModifierGroup" (
    id text NOT NULL,
    "dishId" text NOT NULL,
    name text NOT NULL,
    required boolean DEFAULT false NOT NULL,
    "multiSelect" boolean DEFAULT false NOT NULL,
    "order" integer NOT NULL
);

CREATE TABLE public."DishModifierOption" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    label text NOT NULL,
    "priceDelta" numeric(10,2) DEFAULT 0 NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "order" integer NOT NULL
);

CREATE TABLE public."FixedMenuEntry" (
    id text NOT NULL,
    "sectionId" text NOT NULL,
    "dishId" text,
    name text,
    description text,
    photo text,
    price numeric(10,2),
    "tagIds" text DEFAULT ''::text NOT NULL,
    note text,
    "order" integer NOT NULL,
    nutrition jsonb,
    "soldOut" boolean DEFAULT false NOT NULL
);

CREATE TABLE public."FixedMenuModifierGroup" (
    id text NOT NULL,
    "entryId" text NOT NULL,
    name text NOT NULL,
    required boolean DEFAULT false NOT NULL,
    "multiSelect" boolean DEFAULT false NOT NULL,
    "order" integer NOT NULL
);

CREATE TABLE public."FixedMenuModifierOption" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    label text NOT NULL,
    "priceDelta" numeric(10,2) DEFAULT 0 NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "order" integer NOT NULL,
    color text
);

CREATE TABLE public."FixedMenuSection" (
    id text NOT NULL,
    "weekMenuId" text NOT NULL,
    name text NOT NULL,
    "order" integer NOT NULL
);

CREATE TABLE public."Kudos" (
    id text NOT NULL,
    "fromId" text NOT NULL,
    "toId" text NOT NULL,
    amount integer DEFAULT 1 NOT NULL,
    message text NOT NULL,
    value text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."KudosRedeemType" (
    id text NOT NULL,
    label text NOT NULL,
    "rateLabel" text,
    webhook text,
    active boolean DEFAULT true NOT NULL,
    "order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE public."KudosRedemption" (
    id text NOT NULL,
    "userId" text NOT NULL,
    amount integer NOT NULL,
    status public."RedemptionStatus" DEFAULT 'PENDING'::public."RedemptionStatus" NOT NULL,
    "webhookResponse" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "typeId" text
);

CREATE TABLE public."Location" (
    id text NOT NULL,
    name text NOT NULL,
    timezone text DEFAULT 'America/New_York'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."MealCategory" (
    id text NOT NULL,
    "venueId" text NOT NULL,
    name text NOT NULL,
    "order" integer NOT NULL,
    "mealSlotId" text NOT NULL
);

CREATE TABLE public."MealSlot" (
    id text NOT NULL,
    "venueId" text NOT NULL,
    name text NOT NULL,
    "timeStart" text,
    "timeEnd" text,
    "order" integer NOT NULL
);

CREATE TABLE public."Media" (
    id text NOT NULL,
    filename text NOT NULL,
    url text NOT NULL,
    "mimeType" text NOT NULL,
    size integer NOT NULL,
    "uploadedById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    key text NOT NULL,
    context text
);

CREATE TABLE public."MonthlyTopic" (
    id text NOT NULL,
    "venueId" text NOT NULL,
    title text NOT NULL,
    "bannerImage" text,
    body text,
    "publishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."MonthlyTopicHighlight" (
    id text NOT NULL,
    "topicId" text NOT NULL,
    "weekLabel" text NOT NULL,
    image text,
    name text,
    description text,
    "order" integer NOT NULL
);

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    href text,
    read boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."NutritionParam" (
    id text NOT NULL,
    "venueId" text NOT NULL,
    name text NOT NULL,
    unit text DEFAULT ''::text NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    "order" integer NOT NULL
);

CREATE TABLE public."Page" (
    id text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    body jsonb NOT NULL,
    published boolean DEFAULT false NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "organizationId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "showInNav" boolean DEFAULT true NOT NULL,
    "parentId" text
);

CREATE TABLE public."Poll" (
    id text NOT NULL,
    question text NOT NULL,
    status public."PollStatus" DEFAULT 'DRAFT'::public."PollStatus" NOT NULL,
    anonymous boolean DEFAULT false NOT NULL,
    "multiChoice" boolean DEFAULT false NOT NULL,
    "resultsVisibility" public."ResultsVisibility" DEFAULT 'AFTER_VOTE'::public."ResultsVisibility" NOT NULL,
    "endsAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "authorId" text NOT NULL
);

CREATE TABLE public."PollOption" (
    id text NOT NULL,
    "pollId" text NOT NULL,
    text text NOT NULL,
    "order" integer NOT NULL
);

CREATE TABLE public."PollVote" (
    id text NOT NULL,
    "pollId" text NOT NULL,
    "optionId" text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."PushSubscription" (
    id text NOT NULL,
    "userId" text NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."QuickLink" (
    id text NOT NULL,
    label text NOT NULL,
    url text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."Session" (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."SiteSettings" (
    id text DEFAULT 'singleton'::text NOT NULL,
    "siteName" text DEFAULT 'OrgHub'::text NOT NULL,
    "logoUrl" text,
    "primaryColor" text DEFAULT '#2563eb'::text NOT NULL,
    "logoOnLightUrl" text,
    "sidebarOrder" text DEFAULT 'quickLinks,browseByTopic,upcomingEvents'::text NOT NULL,
    "enabledModules" text DEFAULT 'events'::text NOT NULL,
    "feedLayout" text DEFAULT 'sidebar-right'::text NOT NULL,
    "articleLayout" text DEFAULT 'sidebar-right'::text NOT NULL,
    "pagesLayout" text DEFAULT 'content'::text NOT NULL,
    "leftSidebarOrder" text DEFAULT ''::text NOT NULL,
    "portalWidth" text DEFAULT 'default'::text NOT NULL,
    "feedPageSize" integer DEFAULT 15 NOT NULL,
    "feedCardStyle" text DEFAULT 'preview'::text NOT NULL,
    "localAuthEnabled" boolean DEFAULT true NOT NULL,
    "gravatarsEnabled" boolean DEFAULT true NOT NULL,
    "navOrder" text DEFAULT 'events,polls'::text NOT NULL,
    "kudosMonthlyBudget" integer DEFAULT 100 NOT NULL,
    "kudosValues" text DEFAULT 'Innovation,Teamwork,Quality,Customer Focus'::text NOT NULL,
    "kudosRedeemEnabled" boolean DEFAULT false NOT NULL,
    "kudosRedeemWebhook" text,
    "kudosRedeemRateLabel" text,
    "kudosLayout" text DEFAULT 'content'::text NOT NULL,
    "eventsLayout" text DEFAULT 'content'::text NOT NULL,
    "translationProvider" text DEFAULT 'mymemory'::text NOT NULL,
    "translationLanguages" text DEFAULT 'en,ru,ja,zh,es,fr,hi,uk'::text NOT NULL,
    "diningLayout" text DEFAULT 'content'::text NOT NULL,
    "diningCurrency" text DEFAULT 'JPY'::text NOT NULL
);

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    "avatarUrl" text,
    role public."Role" DEFAULT 'VIEWER'::public."Role" NOT NULL,
    department text,
    "externalId" text,
    provider text DEFAULT 'local'::text,
    active boolean DEFAULT true NOT NULL,
    "organizationId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "passwordHash" text,
    "lastFeedVisitAt" timestamp(3) without time zone,
    "locationId" text
);

CREATE TABLE public."Venue" (
    id text NOT NULL,
    "locationId" text NOT NULL,
    name text NOT NULL,
    "weeklyMenuEnabled" boolean DEFAULT true NOT NULL,
    "topicsEnabled" boolean DEFAULT true NOT NULL,
    "orderingEnabled" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "workingDays" text DEFAULT 'MON,TUE,WED,THU,FRI'::text NOT NULL,
    "venueType" text DEFAULT 'CAFETERIA'::text NOT NULL
);

CREATE TABLE public."VenueTag" (
    id text NOT NULL,
    "venueId" text NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#374151'::text NOT NULL,
    "bgColor" text DEFAULT '#F3F4F6'::text NOT NULL,
    "order" integer NOT NULL
);

CREATE TABLE public."VerificationToken" (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."WeekMenu" (
    id text NOT NULL,
    "venueId" text NOT NULL,
    "weekStart" timestamp(3) without time zone NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "closedDays" text DEFAULT ''::text NOT NULL,
    name text,
    "menuType" text DEFAULT 'WEEKLY'::text NOT NULL
);

CREATE TABLE public."WeekMenuEntry" (
    id text NOT NULL,
    "weekMenuId" text NOT NULL,
    day public."DayOfWeek" NOT NULL,
    "categoryId" text NOT NULL,
    "dishId" text,
    name text,
    description text,
    photo text,
    note text,
    "mealSlotId" text NOT NULL,
    nutrition jsonb,
    "tagIds" text DEFAULT ''::text NOT NULL
);

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ArticleReaction"
    ADD CONSTRAINT "ArticleReaction_pkey" PRIMARY KEY ("articleId", "userId");

ALTER TABLE ONLY public."ArticleTranslation"
    ADD CONSTRAINT "ArticleTranslation_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ArticleView"
    ADD CONSTRAINT "ArticleView_pkey" PRIMARY KEY ("articleId", "userId");

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT "Article_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."CategoriesOnArticles"
    ADD CONSTRAINT "CategoriesOnArticles_pkey" PRIMARY KEY ("articleId", "categoryId");

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."DishModifierGroup"
    ADD CONSTRAINT "DishModifierGroup_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."DishModifierOption"
    ADD CONSTRAINT "DishModifierOption_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Dish"
    ADD CONSTRAINT "Dish_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."FixedMenuEntry"
    ADD CONSTRAINT "FixedMenuEntry_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."FixedMenuModifierGroup"
    ADD CONSTRAINT "FixedMenuModifierGroup_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."FixedMenuModifierOption"
    ADD CONSTRAINT "FixedMenuModifierOption_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."FixedMenuSection"
    ADD CONSTRAINT "FixedMenuSection_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."KudosRedeemType"
    ADD CONSTRAINT "KudosRedeemType_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."KudosRedemption"
    ADD CONSTRAINT "KudosRedemption_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Kudos"
    ADD CONSTRAINT "Kudos_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Location"
    ADD CONSTRAINT "Location_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."MealCategory"
    ADD CONSTRAINT "MealCategory_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."MealSlot"
    ADD CONSTRAINT "MealSlot_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Media"
    ADD CONSTRAINT "Media_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."MonthlyTopicHighlight"
    ADD CONSTRAINT "MonthlyTopicHighlight_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."MonthlyTopic"
    ADD CONSTRAINT "MonthlyTopic_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."NutritionParam"
    ADD CONSTRAINT "NutritionParam_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Page"
    ADD CONSTRAINT "Page_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."PollOption"
    ADD CONSTRAINT "PollOption_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."PollVote"
    ADD CONSTRAINT "PollVote_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Poll"
    ADD CONSTRAINT "Poll_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."PushSubscription"
    ADD CONSTRAINT "PushSubscription_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."QuickLink"
    ADD CONSTRAINT "QuickLink_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."SiteSettings"
    ADD CONSTRAINT "SiteSettings_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."VenueTag"
    ADD CONSTRAINT "VenueTag_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Venue"
    ADD CONSTRAINT "Venue_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."WeekMenuEntry"
    ADD CONSTRAINT "WeekMenuEntry_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."WeekMenu"
    ADD CONSTRAINT "WeekMenu_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON public."Account" USING btree (provider, "providerAccountId");

CREATE INDEX "Announcement_active_idx" ON public."Announcement" USING btree (active);

CREATE INDEX "ArticleReaction_articleId_idx" ON public."ArticleReaction" USING btree ("articleId");

CREATE INDEX "ArticleTranslation_articleId_idx" ON public."ArticleTranslation" USING btree ("articleId");

CREATE UNIQUE INDEX "ArticleTranslation_articleId_lang_key" ON public."ArticleTranslation" USING btree ("articleId", lang);

CREATE INDEX "ArticleView_articleId_idx" ON public."ArticleView" USING btree ("articleId");

CREATE INDEX "ArticleView_viewedAt_idx" ON public."ArticleView" USING btree ("viewedAt");

CREATE INDEX "Article_organizationId_idx" ON public."Article" USING btree ("organizationId");

CREATE INDEX "Article_published_eventDate_idx" ON public."Article" USING btree (published, "eventDate");

CREATE INDEX "Article_published_publishedAt_idx" ON public."Article" USING btree (published, "publishedAt");

CREATE UNIQUE INDEX "Article_slug_key" ON public."Article" USING btree (slug);

CREATE INDEX "AuditLog_action_idx" ON public."AuditLog" USING btree (action);

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");

CREATE INDEX "AuditLog_userId_idx" ON public."AuditLog" USING btree ("userId");

CREATE UNIQUE INDEX "Category_slug_key" ON public."Category" USING btree (slug);

CREATE INDEX "Comment_articleId_idx" ON public."Comment" USING btree ("articleId");

CREATE INDEX "DishModifierGroup_dishId_order_idx" ON public."DishModifierGroup" USING btree ("dishId", "order");

CREATE INDEX "DishModifierOption_groupId_order_idx" ON public."DishModifierOption" USING btree ("groupId", "order");

CREATE INDEX "Dish_venueId_idx" ON public."Dish" USING btree ("venueId");

CREATE INDEX "FixedMenuEntry_sectionId_order_idx" ON public."FixedMenuEntry" USING btree ("sectionId", "order");

CREATE INDEX "FixedMenuModifierGroup_entryId_order_idx" ON public."FixedMenuModifierGroup" USING btree ("entryId", "order");

CREATE INDEX "FixedMenuModifierOption_groupId_order_idx" ON public."FixedMenuModifierOption" USING btree ("groupId", "order");

CREATE INDEX "FixedMenuSection_weekMenuId_order_idx" ON public."FixedMenuSection" USING btree ("weekMenuId", "order");

CREATE INDEX "KudosRedeemType_active_order_idx" ON public."KudosRedeemType" USING btree (active, "order");

CREATE INDEX "KudosRedemption_userId_createdAt_idx" ON public."KudosRedemption" USING btree ("userId", "createdAt");

CREATE INDEX "Kudos_createdAt_idx" ON public."Kudos" USING btree ("createdAt");

CREATE INDEX "Kudos_fromId_createdAt_idx" ON public."Kudos" USING btree ("fromId", "createdAt");

CREATE INDEX "Kudos_toId_createdAt_idx" ON public."Kudos" USING btree ("toId", "createdAt");

CREATE INDEX "MealCategory_venueId_order_idx" ON public."MealCategory" USING btree ("venueId", "order");

CREATE INDEX "MealSlot_venueId_order_idx" ON public."MealSlot" USING btree ("venueId", "order");

CREATE INDEX "Media_context_idx" ON public."Media" USING btree (context);

CREATE INDEX "Media_createdAt_idx" ON public."Media" USING btree ("createdAt");

CREATE UNIQUE INDEX "Media_key_key" ON public."Media" USING btree (key);

CREATE INDEX "Media_uploadedById_idx" ON public."Media" USING btree ("uploadedById");

CREATE INDEX "MonthlyTopicHighlight_topicId_order_idx" ON public."MonthlyTopicHighlight" USING btree ("topicId", "order");

CREATE INDEX "MonthlyTopic_venueId_publishedAt_idx" ON public."MonthlyTopic" USING btree ("venueId", "publishedAt");

CREATE INDEX "Notification_userId_read_createdAt_idx" ON public."Notification" USING btree ("userId", read, "createdAt");

CREATE INDEX "NutritionParam_venueId_idx" ON public."NutritionParam" USING btree ("venueId");

CREATE INDEX "Page_parentId_idx" ON public."Page" USING btree ("parentId");

CREATE INDEX "Page_published_order_idx" ON public."Page" USING btree (published, "order");

CREATE UNIQUE INDEX "Page_slug_key" ON public."Page" USING btree (slug);

CREATE INDEX "PollVote_pollId_idx" ON public."PollVote" USING btree ("pollId");

CREATE UNIQUE INDEX "PollVote_pollId_userId_optionId_key" ON public."PollVote" USING btree ("pollId", "userId", "optionId");

CREATE INDEX "Poll_status_createdAt_idx" ON public."Poll" USING btree (status, "createdAt");

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON public."PushSubscription" USING btree (endpoint);

CREATE INDEX "PushSubscription_userId_idx" ON public."PushSubscription" USING btree ("userId");

CREATE INDEX "QuickLink_order_idx" ON public."QuickLink" USING btree ("order");

CREATE UNIQUE INDEX "Session_sessionToken_key" ON public."Session" USING btree ("sessionToken");

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);

CREATE INDEX "VenueTag_venueId_idx" ON public."VenueTag" USING btree ("venueId");

CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON public."VerificationToken" USING btree (identifier, token);

CREATE UNIQUE INDEX "VerificationToken_token_key" ON public."VerificationToken" USING btree (token);

CREATE UNIQUE INDEX "WeekMenuEntry_weekMenuId_day_mealSlotId_categoryId_key" ON public."WeekMenuEntry" USING btree ("weekMenuId", day, "mealSlotId", "categoryId");

CREATE INDEX "WeekMenuEntry_weekMenuId_day_mealSlotId_idx" ON public."WeekMenuEntry" USING btree ("weekMenuId", day, "mealSlotId");

CREATE INDEX "WeekMenu_venueId_createdAt_idx" ON public."WeekMenu" USING btree ("venueId", "createdAt");

CREATE UNIQUE INDEX "WeekMenu_venueId_weekStart_key" ON public."WeekMenu" USING btree ("venueId", "weekStart");

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."ArticleReaction"
    ADD CONSTRAINT "ArticleReaction_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES public."Article"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."ArticleReaction"
    ADD CONSTRAINT "ArticleReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."ArticleTranslation"
    ADD CONSTRAINT "ArticleTranslation_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES public."Article"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."ArticleView"
    ADD CONSTRAINT "ArticleView_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES public."Article"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."ArticleView"
    ADD CONSTRAINT "ArticleView_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."CategoriesOnArticles"
    ADD CONSTRAINT "CategoriesOnArticles_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES public."Article"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."CategoriesOnArticles"
    ADD CONSTRAINT "CategoriesOnArticles_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES public."Article"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."DishModifierGroup"
    ADD CONSTRAINT "DishModifierGroup_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES public."Dish"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."DishModifierOption"
    ADD CONSTRAINT "DishModifierOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."DishModifierGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Dish"
    ADD CONSTRAINT "Dish_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES public."Venue"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."FixedMenuEntry"
    ADD CONSTRAINT "FixedMenuEntry_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES public."Dish"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."FixedMenuEntry"
    ADD CONSTRAINT "FixedMenuEntry_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public."FixedMenuSection"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."FixedMenuModifierGroup"
    ADD CONSTRAINT "FixedMenuModifierGroup_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES public."FixedMenuEntry"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."FixedMenuModifierOption"
    ADD CONSTRAINT "FixedMenuModifierOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."FixedMenuModifierGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."FixedMenuSection"
    ADD CONSTRAINT "FixedMenuSection_weekMenuId_fkey" FOREIGN KEY ("weekMenuId") REFERENCES public."WeekMenu"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."KudosRedemption"
    ADD CONSTRAINT "KudosRedemption_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES public."KudosRedeemType"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."KudosRedemption"
    ADD CONSTRAINT "KudosRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Kudos"
    ADD CONSTRAINT "Kudos_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Kudos"
    ADD CONSTRAINT "Kudos_toId_fkey" FOREIGN KEY ("toId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."MealCategory"
    ADD CONSTRAINT "MealCategory_mealSlotId_fkey" FOREIGN KEY ("mealSlotId") REFERENCES public."MealSlot"(id) ON DELETE CASCADE;

ALTER TABLE ONLY public."MealCategory"
    ADD CONSTRAINT "MealCategory_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES public."Venue"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."MealSlot"
    ADD CONSTRAINT "MealSlot_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES public."Venue"(id) ON DELETE CASCADE;

ALTER TABLE ONLY public."Media"
    ADD CONSTRAINT "Media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."MonthlyTopicHighlight"
    ADD CONSTRAINT "MonthlyTopicHighlight_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES public."MonthlyTopic"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."MonthlyTopic"
    ADD CONSTRAINT "MonthlyTopic_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES public."Venue"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."NutritionParam"
    ADD CONSTRAINT "NutritionParam_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES public."Venue"(id) ON DELETE CASCADE;

ALTER TABLE ONLY public."Page"
    ADD CONSTRAINT "Page_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Page"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."PollOption"
    ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES public."Poll"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."PollVote"
    ADD CONSTRAINT "PollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES public."PollOption"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."PollVote"
    ADD CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES public."Poll"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."PollVote"
    ADD CONSTRAINT "PollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Poll"
    ADD CONSTRAINT "Poll_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."PushSubscription"
    ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public."Location"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."VenueTag"
    ADD CONSTRAINT "VenueTag_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES public."Venue"(id) ON DELETE CASCADE;

ALTER TABLE ONLY public."Venue"
    ADD CONSTRAINT "Venue_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public."Location"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."WeekMenuEntry"
    ADD CONSTRAINT "WeekMenuEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."MealCategory"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."WeekMenuEntry"
    ADD CONSTRAINT "WeekMenuEntry_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES public."Dish"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."WeekMenuEntry"
    ADD CONSTRAINT "WeekMenuEntry_mealSlotId_fkey" FOREIGN KEY ("mealSlotId") REFERENCES public."MealSlot"(id) ON DELETE CASCADE;

ALTER TABLE ONLY public."WeekMenuEntry"
    ADD CONSTRAINT "WeekMenuEntry_weekMenuId_fkey" FOREIGN KEY ("weekMenuId") REFERENCES public."WeekMenu"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."WeekMenu"
    ADD CONSTRAINT "WeekMenu_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES public."Venue"(id) ON UPDATE CASCADE ON DELETE CASCADE;

\unrestrict WgJ8HQXTZjZynDdjefg2TqzuHsA0L0GQHl2RBMiEcvSMti5fk3HhH3FGRXSeJ5H
