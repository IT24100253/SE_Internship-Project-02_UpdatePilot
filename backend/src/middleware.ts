import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'updatepilot_super_secret_key_2026';

export interface AuthRequest extends Request {
  userId?: string;
  deviceId?: string;
}

// 1. Web User 
export const authenticateUser = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Token missing' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// 2. Windows Agent 
export const authenticateAgent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const agentToken = req.headers['x-agent-token'] as string;
  if (!agentToken) {
    res.status(401).json({ error: 'Agent token missing' });
    return;
  }

  const tokenHash = crypto.createHash('sha256').update(agentToken).digest('hex');

  const credential = await prisma.agentCredential.findUnique({
    where: { tokenHash },
    include: { device: true },
  });

  if (!credential || credential.isRevoked) {
    res.status(401).json({ error: 'Invalid or revoked agent token' });
    return;
  }

  
  await prisma.device.update({
    where: { id: credential.deviceId },
    data: { status: 'ONLINE', lastSeen: new Date() },
  });

  req.deviceId = credential.deviceId;
  next();
};