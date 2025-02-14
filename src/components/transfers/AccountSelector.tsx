import React from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import type { SavedAccount } from '../../types/database';

interface AccountSelectorProps {
  accounts: SavedAccount[];
  selectedAccountId: string | null;
  showNewAccountForm: boolean;
  onAccountSelect: (id: string) => void;
  onNewAccountClick: () => void;
}

const AccountSelector: React.FC<AccountSelectorProps> = ({
  accounts,
  selectedAccountId,
  showNewAccountForm,
  onAccountSelect,
  onNewAccountClick
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Select Account
        </h3>
        <button
          type="button"
          onClick={onNewAccountClick}
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Account
        </button>
      </div>

      {!showNewAccountForm && (
        <div className="grid gap-4">
          {accounts.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No saved accounts of this type
            </div>
          ) : (
            accounts.map((account) => (
              <div
                key={account.id}
                onClick={() => onAccountSelect(account.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedAccountId === account.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    {account.type === 'clabe' && (
                      <p className="font-medium">CLABE: {account.details.clabe}</p>
                    )}
                    {account.type === 'card' && (
                      <>
                        <p className="font-medium">{account.details.card_holder}</p>
                        <p className="text-sm text-gray-600">
                          **** {account.details.card_number?.slice(-4)}
                        </p>
                      </>
                    )}
                    {account.type === 'binance' && (
                      <>
                        <p className="font-medium">ID: {account.details.binance_id}</p>
                        <p className="text-sm text-gray-600">
                          {account.details.binance_email}
                        </p>
                      </>
                    )}
                  </div>
                  {account.type === 'binance' && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      account.usdt_enabled && account.verified_at
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {account.usdt_enabled && account.verified_at ? (
                        'USDT Verified'
                      ) : (
                        <div className="flex items-center space-x-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Pending Verification</span>
                        </div>
                      )}
                    </span>
                  )}
                </div>
                {account.type === 'binance' && !account.usdt_enabled && (
                  <p className="mt-2 text-xs text-gray-500">
                    This account needs to be verified for USDT transfers. Please contact support.
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AccountSelector;