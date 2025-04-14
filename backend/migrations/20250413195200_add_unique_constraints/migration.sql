/*
  Warnings:

  - You are about to drop the `ANIME` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CHANNEL` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EPISODE` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `USER` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `USER_ANIME` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `USER_CHANNEL` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ANIME";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CHANNEL";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EPISODE";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "USER";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "USER_ANIME";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "USER_CHANNEL";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Anime" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "syobocal_tid" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Channel" (
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
CREATE TABLE "UserAnime" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "anime_id" INTEGER NOT NULL,
    "channel_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "last_watched" DATETIME,
    "memo" TEXT,
    CONSTRAINT "UserAnime_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserAnime_anime_id_fkey" FOREIGN KEY ("anime_id") REFERENCES "Anime" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserAnime_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "Channel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserChannel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "channel_id" INTEGER NOT NULL,
    CONSTRAINT "UserChannel_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserChannel_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "Channel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Episode" (
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
    CONSTRAINT "Episode_anime_id_fkey" FOREIGN KEY ("anime_id") REFERENCES "Anime" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Episode_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "Channel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Anime_syobocal_tid_key" ON "Anime"("syobocal_tid");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_syobocal_cid_key" ON "Channel"("syobocal_cid");

-- CreateIndex
CREATE INDEX "UserAnime_user_id_idx" ON "UserAnime"("user_id");

-- CreateIndex
CREATE INDEX "UserAnime_anime_id_idx" ON "UserAnime"("anime_id");

-- CreateIndex
CREATE INDEX "UserAnime_channel_id_idx" ON "UserAnime"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserAnime_user_id_anime_id_channel_id_key" ON "UserAnime"("user_id", "anime_id", "channel_id");

-- CreateIndex
CREATE INDEX "UserChannel_user_id_idx" ON "UserChannel"("user_id");

-- CreateIndex
CREATE INDEX "UserChannel_channel_id_idx" ON "UserChannel"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_pid_key" ON "Episode"("pid");

-- CreateIndex
CREATE INDEX "Episode_anime_id_idx" ON "Episode"("anime_id");

-- CreateIndex
CREATE INDEX "Episode_channel_id_idx" ON "Episode"("channel_id");
