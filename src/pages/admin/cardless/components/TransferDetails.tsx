import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Transfer } from '../../../../types/database';

interface TransferDetailsProps {
  transfer: Transfer;
  onBack: () => void;
}

const TransferDetails = ({ transfer, onBack }: TransferDetailsProps) => {
  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Transfer Details
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">User</p>
          <p className="text-lg font-medium text-gray-900">
            {transfer.user?.full_name}
          </p>
          <p className="text-sm text-gray-500">{transfer.user?.email}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Amount</p>
          <p className="text-lg font-medium text-gray-900">
            {transfer.amount} {transfer.origin_currency}
          </p>
          <p className="text-sm text-gray-500">
            ≈ {transfer.destination_amount} {transfer.destination_currency}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TransferDetails;