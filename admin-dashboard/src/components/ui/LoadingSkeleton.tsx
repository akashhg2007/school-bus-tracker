import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
  type?: 'table' | 'cards' | 'stats';
}

const TableRowSkeleton = () => (
  <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse" />
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6 animate-pulse" />
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6 animate-pulse" />
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6 animate-pulse" />
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6 animate-pulse" />
  </div>
);

const CardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
    <div className="flex items-center justify-between mb-3">
      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
    </div>
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2 animate-pulse" />
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
  </div>
);

const StatsSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ rows = 5, type = 'table' }) => {
  if (type === 'stats') return <StatsSkeleton />;
  if (type === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700">
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </div>
  );
};

export default LoadingSkeleton;
