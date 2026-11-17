-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "osVersion" TEXT,
    "agentVersion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCredential" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AgentCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "publisher" TEXT,
    "installedVersion" TEXT NOT NULL,
    "availableVersion" TEXT,
    "packageId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'winget',
    "status" TEXT NOT NULL DEFAULT 'UP_TO_DATE',
    "lastScannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanJob" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "appsFound" INTEGER NOT NULL DEFAULT 0,
    "updatesFound" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,

    CONSTRAINT "ScanJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpdateJob" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "previousVersion" TEXT NOT NULL,
    "targetVersion" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "exitCode" INTEGER,
    "verificationResult" TEXT,
    "errorSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "UpdateJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT,
    "actor" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "target" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AgentCredential_tokenHash_key" ON "AgentCredential"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Application_deviceId_displayName_packageId_key" ON "Application"("deviceId", "displayName", "packageId");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCredential" ADD CONSTRAINT "AgentCredential_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanJob" ADD CONSTRAINT "ScanJob_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpdateJob" ADD CONSTRAINT "UpdateJob_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpdateJob" ADD CONSTRAINT "UpdateJob_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
