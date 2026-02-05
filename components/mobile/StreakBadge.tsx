'use client';

import { useRouter } from 'next/navigation';

interface StreakBadgeProps {
  currentStreak: number;
  onClick?: () => void;
}

export default function StreakBadge({ currentStreak, onClick }: StreakBadgeProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push('/streak');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="btn-mobile bg-orange-500 rounded-full px-3 py-1.5 flex items-center gap-1 shadow hover:bg-orange-600 transition-colors"
    >
      <span className="animate-fire text-lg">
        {currentStreak > 0 ? '🔥' : '❄️'}
      </span>
      <span className="font-bold text-sm text-white">{currentStreak}</span>
    </button>
  );
}
