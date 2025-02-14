import React from 'react';
import type { DestinationType } from '../../types/transfers';

interface NewAccountFormProps {
  type: DestinationType;
  formData: {
    clabe: string;
    cardNumber: string;
    cardHolder: string;
    binanceId: string;
    binanceEmail: string;
  };
  onChange: (field: string, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  loading: boolean;
}

const NewAccountForm: React.FC<NewAccountFormProps> = ({
  type,
  formData,
  onChange,
  onCancel,
  onSave,
  loading
}) => {
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      {type === 'clabe' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            CLABE
          </label>
          <input
            type="text"
            value={formData.clabe}
            onChange={(e) => onChange('clabe', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            placeholder="18 digits"
            maxLength={18}
            pattern="\d{18}"
            required
          />
        </div>
      )}

      {type === 'card' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Card Number
            </label>
            <input
              type="text"
              value={formData.cardNumber}
              onChange={(e) => onChange('cardNumber', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              placeholder="16 digits"
              maxLength={16}
              pattern="\d{16}"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Card Holder
            </label>
            <input
              type="text"
              value={formData.cardHolder}
              onChange={(e) => onChange('cardHolder', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              placeholder="As shown on card"
              required
            />
          </div>
        </>
      )}

      {type === 'binance' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Binance ID
            </label>
            <input
              type="text"
              value={formData.binanceId}
              onChange={(e) => onChange('binanceId', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              placeholder="Your Binance ID"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Binance Email
            </label>
            <input
              type="email"
              value={formData.binanceEmail}
              onChange={(e) => onChange('binanceEmail', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              placeholder="Email associated with your Binance account"
              required
            />
          </div>
        </>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Account'}
        </button>
      </div>
    </div>
  );
};

export default NewAccountForm;