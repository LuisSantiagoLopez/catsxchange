export type DestinationType = 'clabe' | 'card' | 'cardless' | 'binance';

export interface TransferFormData {
  clabe: string;
  cardNumber: string;
  cardHolder: string;
  binanceId: string;
  binanceEmail: string;
  originCurrency: string;
  destinationCurrency: string;
  amount: string;
}