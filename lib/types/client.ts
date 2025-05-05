export interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  subscription_tier: 'basic' | 'premium' | 'enterprise';
  created_at: string;
  last_login: string;
  status: 'active' | 'inactive' | 'suspended';
}

export interface ClientAnalytics {
  total_warehouses: number;
  total_products: number;
  total_stock_movements: number;
  warehouse_utilization: number;
  monthly_transactions: number;
} 