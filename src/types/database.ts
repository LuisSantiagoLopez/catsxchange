// Update currencies to include all requested currencies
export const CURRENCIES: Currency[] = [
  { code: 'USDT', name: 'USDT', flag: '💵', symbol: '$' },
  { code: 'MXN', name: 'Pesos Mexicanos', flag: '🇲🇽', symbol: '$' },
  { code: 'PEN', name: 'Soles Peruanos', flag: '🇵🇪', symbol: 'S/' },
  { code: 'COP', name: 'Pesos Colombianos', flag: '🇨🇴', symbol: '$' },
  { code: 'VES', name: 'Bolívares', flag: '🇻🇪', symbol: 'Bs.' },
];

export interface Currency {
  code: string;
  name: string;
  flag: string;
  symbol: string;
}

// Generate all possible currency pairs
export const CURRENCY_PAIRS = CURRENCIES.flatMap(from => 
  CURRENCIES
    .filter(to => from.code !== to.code)
    .map(to => `${from.code}/${to.code}`)
);

// Tipos de la base de datos
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  is_blocked: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedAccount {
  id: string;
  user_id: string;
  type: 'clabe' | 'card';
  details: {
    clabe?: string;
    card_number?: string;
    card_holder?: string;
  };
  usdt_enabled: boolean;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transfer {
  id: string;
  user_id: string;
  type: 'other' | 'cardless' | 'usd';
  status: 'pending' | 'pending_usd_approval' | 'pending_cardless' | 'completed' | 'failed';
  amount: number;
  origin_currency: string;
  destination_currency: string;
  exchange_rate: number;
  destination_amount: number;
  destination_type: 'clabe' | 'card' | null;
  destination_details: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  transfer_id: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface SupportChat {
  id: string;
  user_id: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  user?: Profile;
}

export interface SupportMessage {
  id: string;
  chat_id: string;
  user_id: string;
  content: string;
  read: boolean;
  created_at: string;
  user?: Profile;
}

export interface UsdPermission {
  id: string;
  user_id: string;
  admin_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}