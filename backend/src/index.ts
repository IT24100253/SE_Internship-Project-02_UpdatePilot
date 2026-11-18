import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { authenticateUser, authenticateAgent, AuthRequest } from './middleware';

dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'updatepilot_super_secret_key_2026';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==========================================
// 2. DEVICE & AGENT PAIRING ROUTES
// ==========================================
app.post('/api/v1/devices/pair', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const { deviceName } = req.body;
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const device = await prisma.device.create({
      data: {
        userId: req.userId!,
        deviceName: deviceName || 'Windows-PC',
        status: 'OFFLINE',
        credentials: {
          create: { tokenHash },
        },
      },
    });

    await prisma.auditEvent.create({
      data: {
        deviceId: device.id,
        actor: 'USER',
        eventType: 'DEVICE_PAIRED',
        target: device.deviceName,
        details: 'Generated new pairing token',
      },
    });

    res.json({ device, agentToken: rawToken });
  } catch (err) {
    console.error('Pair device error:', err);
    res.status(500).json({ error: 'Failed to pair device' });
  }
});

app.get('/api/v1/devices', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const devices = await prisma.device.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(devices);
  } catch (err) {
    console.error('Get devices error:', err);
    res.status(500).json({ error: 'Failed to load devices' });
  }
});

// ==========================================
// 3. DASHBOARD OVERVIEW ROUTE
// ==========================================
app.get('/api/v1/dashboard', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const devices = await prisma.device.findMany({ where: { userId: req.userId } });
    const deviceIds = devices.map((d) => d.id);

    const totalApps = await prisma.application.count({ where: { deviceId: { in: deviceIds } } });
    const updatesAvailable = await prisma.application.count({
      where: { deviceId: { in: deviceIds }, status: 'UPDATE_AVAILABLE' },
    });
    const lastScan = await prisma.scanJob.findFirst({
      where: { deviceId: { in: deviceIds } },
      orderBy: { startedAt: 'desc' },
    });
    const recentEvents = await prisma.auditEvent.findMany({
      where: { deviceId: { in: deviceIds } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      devices,
      stats: { totalApps, updatesAvailable, lastScan },
      recentEvents,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ==========================================
// 4. SCAN & APPLICATIONS ROUTES
// ==========================================
app.post('/api/v1/devices/:id/scans', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const deviceId = String(req.params.id);
    const scanJob = await prisma.scanJob.create({
      data: { deviceId, state: 'PENDING' },
    });

    await prisma.auditEvent.create({
      data: {
        deviceId,
        actor: 'USER',
        eventType: 'SCAN_REQUESTED',
        details: `Scan Job ${scanJob.id} queued`,
      },
    });

    res.json(scanJob);
  } catch (err) {
    console.error('Start scan error:', err);
    res.status(500).json({ error: 'Failed to start scan' });
  }
});

app.get('/api/v1/applications', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const { search, status } = req.query;
    const devices = await prisma.device.findMany({ where: { userId: req.userId } });
    const deviceIds = devices.map((d) => d.id);

    const apps = await prisma.application.findMany({
      where: {
        deviceId: { in: deviceIds },
        ...(status && status !== 'ALL' ? { status: String(status) } : {}),
        ...(search
          ? { displayName: { contains: String(search), mode: 'insensitive' } }
          : {}),
      },
      orderBy: { displayName: 'asc' },
    });

    res.json(apps);
  } catch (err) {
    console.error('Get applications error:', err);
    res.status(500).json({ error: 'Failed to load applications' });
  }
});

// ==========================================
// 5. UPDATES & EXECUTION ROUTES
// ==========================================
app.get('/api/v1/updates', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const devices = await prisma.device.findMany({ where: { userId: req.userId } });
    const deviceIds = devices.map((d) => d.id);

    const updates = await prisma.application.findMany({
      where: { deviceId: { in: deviceIds }, status: 'UPDATE_AVAILABLE' },
      orderBy: { displayName: 'asc' },
    });
    res.json(updates);
  } catch (err) {
    console.error('Get updates error:', err);
    res.status(500).json({ error: 'Failed to load updates' });
  }
});

app.post('/api/v1/updates/:id/execute', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const appId = String(req.params.id);
    const { packageId, displayName } = req.body || {};

    let application = await prisma.application.findUnique({ where: { id: appId } });

    if (!application && packageId) {
      application = await prisma.application.findFirst({
        where: { packageId: String(packageId), status: 'UPDATE_AVAILABLE' },
      });
    }

    if (!application && displayName) {
      application = await prisma.application.findFirst({
        where: { displayName: String(displayName), status: 'UPDATE_AVAILABLE' },
      });
    }

    if (!application) {
      return res.status(404).json({ error: 'Application not found. Please refresh the page.' });
    }

    const updateJob = await prisma.updateJob.create({
      data: {
        deviceId: application.deviceId,
        applicationId: application.id,
        previousVersion: application.installedVersion || 'unknown',
        targetVersion: application.availableVersion || 'latest',
        state: 'PENDING',
      },
    });

    await prisma.auditEvent.create({
      data: {
        deviceId: application.deviceId,
        actor: 'USER',
        eventType: 'UPDATE_CONFIRMED',
        target: application.displayName,
        details: `Confirmed update from ${application.installedVersion} to ${application.availableVersion || 'latest'}`,
      },
    });

    res.json(updateJob);
  } catch (err) {
    console.error('❌ Execute update error:', err);
    res.status(500).json({ error: 'Failed to queue update' });
  }
});

app.get('/api/v1/history', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const devices = await prisma.device.findMany({ where: { userId: req.userId } });
    const deviceIds = devices.map((d) => d.id);

    const scans = await prisma.scanJob.findMany({
      where: { deviceId: { in: deviceIds } },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    const updates = await prisma.updateJob.findMany({
      where: { deviceId: { in: deviceIds } },
      include: { application: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ scans, updates });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

// ==========================================
// 6. AGENT COMMUNICATION ROUTES
// ==========================================
app.get('/api/v1/agent/jobs', authenticateAgent, async (req: AuthRequest, res) => {
  try {
    const deviceId = req.deviceId!;

    const pendingScan = await prisma.scanJob.findFirst({
      where: { deviceId, state: 'PENDING' },
      orderBy: { startedAt: 'asc' },
    });

    const pendingUpdate = await prisma.updateJob.findFirst({
      where: { deviceId, state: 'PENDING' },
      include: { application: true },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ pendingScan, pendingUpdate });
  } catch (err) {
    console.error('Agent jobs polling error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

app.post('/api/v1/agent/scans/:jobId/report', authenticateAgent, async (req: AuthRequest, res) => {
  try {
    const jobId = String(req.params.jobId);
    const { osVersion, agentVersion, apps } = req.body;
    const deviceId = req.deviceId!;

    await prisma.device.update({
      where: { id: deviceId },
      data: { osVersion, agentVersion },
    });

    let updatesCount = 0;
    for (const item of apps) {
      const hasUpdate = Boolean(item.availableVersion && item.availableVersion !== item.installedVersion);
      if (hasUpdate) updatesCount++;

      const status = !item.packageId ? 'UNMATCHED' : hasUpdate ? 'UPDATE_AVAILABLE' : 'UP_TO_DATE';
      const pkgId = item.packageId || null;

      const existingApp = await prisma.application.findFirst({
        where: {
          deviceId,
          displayName: item.name,
          packageId: pkgId,
        },
      });

      try {
        if (existingApp) {
          await prisma.application.update({
            where: { id: existingApp.id },
            data: {
              installedVersion: item.installedVersion,
              availableVersion: item.availableVersion || null,
              status,
            },
          });
        } else {
          await prisma.application.create({
            data: {
              deviceId,
              displayName: item.name,
              installedVersion: item.installedVersion,
              availableVersion: item.availableVersion || null,
              packageId: pkgId,
              source: item.source || 'winget',
              status,
            },
          });
        }
      } catch (itemErr: any) {
        if (itemErr.code !== 'P2002') throw itemErr;
      }
    }

    await prisma.scanJob.update({
      where: { id: jobId },
      data: {
        state: 'COMPLETED',
        endedAt: new Date(),
        appsFound: apps.length,
        updatesFound: updatesCount,
      },
    });

    await prisma.auditEvent.create({
      data: {
        deviceId,
        actor: 'AGENT',
        eventType: 'SCAN_COMPLETED',
        details: `Found ${apps.length} apps, ${updatesCount} updates`,
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Save scan report error:', err);
    res.status(500).json({ error: 'Failed to save scan report' });
  }
});

app.post('/api/v1/agent/updates/:jobId/report', authenticateAgent, async (req: AuthRequest, res) => {
  try {
    const jobId = String(req.params.jobId);
    const { state, exitCode, verifiedVersion, errorSummary } = req.body;
    const deviceId = req.deviceId!;

    const safeExitCode =
      typeof exitCode === 'number' && exitCode >= -2147483648 && exitCode <= 2147483647
        ? Math.trunc(exitCode)
        : exitCode !== undefined && exitCode !== null
        ? -1
        : null;

    const job = await prisma.updateJob.update({
      where: { id: jobId },
      data: {
        state,
        exitCode: safeExitCode,
        verificationResult: verifiedVersion ? `Verified: ${verifiedVersion}` : null,
        errorSummary: errorSummary || null,
        completedAt: new Date(),
      },
    });

    if (state === 'COMPLETED' && verifiedVersion) {
      await prisma.application.update({
        where: { id: job.applicationId },
        data: {
          installedVersion: verifiedVersion,
          availableVersion: null,
          status: 'UP_TO_DATE',
        },
      });
    }

    await prisma.auditEvent.create({
      data: {
        deviceId,
        actor: 'AGENT',
        eventType: state === 'COMPLETED' ? 'UPDATE_COMPLETED' : 'UPDATE_FAILED',
        details: errorSummary || `Exit code: ${exitCode}`,
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Save update report error:', err);
    res.status(500).json({ error: 'Failed to save update report' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 UpdatePilot Backend Server running on http://localhost:${PORT}`);
});