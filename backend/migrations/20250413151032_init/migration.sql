-- CreateTable
CREATE TABLE "USER" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ANIME" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "syobocal_tid" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CHANNEL" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "syobocal_cid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "epg_name" TEXT,
    "url" TEXT,
    "epg_url" TEXT,
    "comment" TEXT,
    "gid" INTEGER,
    "number" INTEGER,
    "last_update" DATETIME,
    "area" TEXT
);

-- CreateTable
CREATE TABLE "USER_ANIME" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "anime_id" INTEGER NOT NULL,
    "channel_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "last_watched" DATETIME,
    "memo" TEXT,
    CONSTRAINT "USER_ANIME_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USER" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "USER_ANIME_anime_id_fkey" FOREIGN KEY ("anime_id") REFERENCES "ANIME" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "USER_ANIME_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "CHANNEL" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "USER_CHANNEL" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "channel_id" INTEGER NOT NULL,
    CONSTRAINT "USER_CHANNEL_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USER" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "USER_CHANNEL_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "CHANNEL" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EPISODE" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pid" INTEGER NOT NULL,
    "anime_id" INTEGER NOT NULL,
    "channel_id" INTEGER NOT NULL,
    "st_time" DATETIME NOT NULL,
    "ed_time" DATETIME NOT NULL,
    "count" INTEGER,
    "sub_title" TEXT,
    "prog_comment" TEXT,
    "flag" INTEGER,
    "deleted" BOOLEAN,
    "warn" INTEGER,
    "revision" INTEGER,
    "last_update" DATETIME NOT NULL,
    CONSTRAINT "EPISODE_anime_id_fkey" FOREIGN KEY ("anime_id") REFERENCES "ANIME" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EPISODE_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "CHANNEL" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "USER_email_key" ON "USER"("email");

-- CreateIndex
CREATE INDEX "USER_ANIME_user_id_idx" ON "USER_ANIME"("user_id");

-- CreateIndex
CREATE INDEX "USER_ANIME_anime_id_idx" ON "USER_ANIME"("anime_id");

-- CreateIndex
CREATE INDEX "USER_ANIME_channel_id_idx" ON "USER_ANIME"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "USER_ANIME_user_id_anime_id_channel_id_key" ON "USER_ANIME"("user_id", "anime_id", "channel_id");

-- CreateIndex
CREATE INDEX "USER_CHANNEL_user_id_idx" ON "USER_CHANNEL"("user_id");

-- CreateIndex
CREATE INDEX "USER_CHANNEL_channel_id_idx" ON "USER_CHANNEL"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "EPISODE_pid_key" ON "EPISODE"("pid");

-- CreateIndex
CREATE INDEX "EPISODE_anime_id_idx" ON "EPISODE"("anime_id");

-- CreateIndex
CREATE INDEX "EPISODE_channel_id_idx" ON "EPISODE"("channel_id");
