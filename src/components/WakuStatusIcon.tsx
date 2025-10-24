import React from 'react';
import { useWaku } from '@/hooks/useWaku';
import { Circle } from 'lucide-react';

const WakuStatusIcon: React.FC = () => {
  const { connected } = useWaku();

  return (
    <div className="flex items-center">
      <Circle 
        className={`h-3 w-3 transition-colors duration-200 ${
          connected ? 'text-green-500' : 'text-red-500'
        }`}
      />
    </div>
  );
};

export default WakuStatusIcon;