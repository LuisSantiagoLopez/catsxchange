import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface CodeInputProps {
  code: string;
  onChange: (code: string) => void;
  onSubmit: () => void;
  error: string;
  saving: boolean;
}

const CodeInput = ({ code, onChange, onSubmit, error, saving }: CodeInputProps) => {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <AlertTriangle className="h-6 w-6 text-yellow-600" />
        <h3 className="text-lg font-medium text-yellow-900">
          Generate Withdrawal Code
        </h3>
      </div>
      <p className="text-yellow-700 mb-4">
        Please enter an 8-digit code for this cardless withdrawal.
      </p>
      <div className="space-y-4">
        <div className="flex space-x-4">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              // Only allow digits and limit to 8 characters
              const value = e.target.value.replace(/\D/g, '').slice(0, 8);
              onChange(value);
            }}
            placeholder="Enter 8-digit code"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 font-mono text-xl text-center tracking-wider"
            maxLength={8}
            pattern="\d{8}"
            required
          />
          <button
            onClick={onSubmit}
            disabled={code.length !== 8 || saving}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Code'}
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-600 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-1" />
            {error}
          </p>
        )}
        <p className="text-xs text-gray-500">
          The code must be exactly 8 digits (0-9)
        </p>
      </div>
    </div>
  );
};

export default CodeInput;