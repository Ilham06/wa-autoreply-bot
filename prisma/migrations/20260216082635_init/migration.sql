-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotSetting" (
    "id" TEXT NOT NULL,
    "botConfigId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "offStartMinutes" INTEGER NOT NULL DEFAULT 1230,
    "offEndMinutes" INTEGER NOT NULL DEFAULT 600,
    "spamLimit" INTEGER NOT NULL DEFAULT 5,
    "spamWindowMs" INTEGER NOT NULL DEFAULT 10000,
    "aiModeTimeoutMs" INTEGER NOT NULL DEFAULT 3600000,
    "ownerReplyTimeoutMs" INTEGER NOT NULL DEFAULT 3600000,
    "aiModel" TEXT NOT NULL DEFAULT 'llama-3.1-8b-instant',
    "aiTemperature" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "aiTopP" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "aiMaxTokens" INTEGER,
    "allowEmoji" BOOLEAN NOT NULL DEFAULT true,
    "emojiStyle" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "sourceOfTruth" TEXT NOT NULL,
    "aiBehavior" TEXT NOT NULL,
    "offlineReplyText" TEXT NOT NULL,
    "outsideHoursReplyText" TEXT NOT NULL,
    "spamReplyText" TEXT NOT NULL,
    "aiOfferText" TEXT NOT NULL,
    "aiAcceptedText" TEXT NOT NULL,
    "botCredit" TEXT NOT NULL,
    "aiCredit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BotConfig_userId_name_key" ON "BotConfig"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "BotSetting_botConfigId_key" ON "BotSetting"("botConfigId");

-- AddForeignKey
ALTER TABLE "BotConfig" ADD CONSTRAINT "BotConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotSetting" ADD CONSTRAINT "BotSetting_botConfigId_fkey" FOREIGN KEY ("botConfigId") REFERENCES "BotConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
