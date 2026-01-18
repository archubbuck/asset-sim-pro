import { z } from 'zod';

// Request schema for creating a new exchange
export const CreateExchangeSchema = z.object({
  name: z.string().min(1).max(100),
});

export type CreateExchangeRequest = z.infer<typeof CreateExchangeSchema>;

// Response types
export interface ExchangeResponse {
  exchangeId: string;
  name: string;
  createdAt: string;
  createdBy: string;
}

export interface ExchangeRoleResponse {
  exchangeId: string;
  userId: string;
  role: 'RiskManager' | 'PortfolioManager' | 'Analyst';
  assignedAt: string;
}
