import React from 'react';
import { Copy, CheckCircle } from 'lucide-react';

interface CodeDisplayProps {
  code: string;
  expiresAt: string;
  status: string;
  onCopy: () => void;
  copied: boolean;
}

const CodeDisplay = ({ code, expiresAt, status, onCopy, copied }: CodeDisplayProps) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-blue-900">
          Withdrawal Code
        </h3>
        <button
          onClick={onCopy}
          className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200"
        >
          {copied ? (
            <>
              <CheckCircle className="h-4 w-4 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="bg-white rounded-lg p-4 font-mono text-xl text-center">
        {code}
      </div>
      <p className="mt-4 text-sm text-blue-700">
        {status === 'active' ? (
          <>
            This code will expire on{' '}
            {new Date(expiresAt).toLocaleString()}
          </>
        ) : (
          'This code has expired'
        )}
      </p>
    </div>
  );
};

export default CodeDisplay;