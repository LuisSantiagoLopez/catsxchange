import React from 'react';
import { Building2, CreditCard, Banknote, Bitcoin } from 'lucide-react';
import type { DestinationType } from '../../types/transfers';

interface TransferTypeSelectorProps {
  selectedType: DestinationType | null;
  onTypeSelect: (type: DestinationType) => void;
}

const TransferTypeSelector: React.FC<TransferTypeSelectorProps> = ({
  selectedType,
  onTypeSelect
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* CLABE */}
      <div
        onClick={() => onTypeSelect('clabe')}
        className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
          selectedType === 'clabe'
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-200 hover:border-purple-200'
        }`}
      >
        <div className="flex flex-col items-center text-center">
          <Building2 className={`h-8 w-8 mb-2 ${
            selectedType === 'clabe' ? 'text-purple-600' : 'text-gray-400'
          }`} />
          <h3 className="text-lg font-medium text-gray-900">CLABE</h3>
        </div>
      </div>

      {/* Card */}
      <div
        onClick={() => onTypeSelect('card')}
        className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
          selectedType === 'card'
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-200 hover:border-purple-200'
        }`}
      >
        <div className="flex flex-col items-center text-center">
          <CreditCard className={`h-8 w-8 mb-2 ${
            selectedType === 'card' ? 'text-purple-600' : 'text-gray-400'
          }`} />
          <h3 className="text-lg font-medium text-gray-900">Card</h3>
        </div>
      </div>

      {/* Cardless */}
      <div
        onClick={() => onTypeSelect('cardless')}
        className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
          selectedType === 'cardless'
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-200 hover:border-purple-200'
        }`}
      >
        <div className="flex flex-col items-center text-center">
          <Banknote className={`h-8 w-8 mb-2 ${
            selectedType === 'cardless' ? 'text-purple-600' : 'text-gray-400'
          }`} />
          <h3 className="text-lg font-medium text-gray-900">Cardless</h3>
        </div>
      </div>

      {/* Binance */}
      <div
        onClick={() => onTypeSelect('binance')}
        className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
          selectedType === 'binance'
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-200 hover:border-purple-200'
        }`}
      >
        <div className="flex flex-col items-center text-center">
          <Bitcoin className={`h-8 w-8 mb-2 ${
            selectedType === 'binance' ? 'text-purple-600' : 'text-gray-400'
          }`} />
          <h3 className="text-lg font-medium text-gray-900">Binance</h3>
          <p className="text-xs text-gray-500 mt-1">For USDT</p>
        </div>
      </div>
    </div>
  );
};

export default TransferTypeSelector;