import React from 'react';

const STATUS_STYLES: Record<string, string> = {
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  INACTIVE: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  BOARDING: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  DROPOFF: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  PRESENT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  ABSENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  ON_ROUTE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  NOT_STARTED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  MORNING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  EVENING: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  IN_PROGRESSMaintenance: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  COMPLETEDMaintenance: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  BOARDING: 'Boarding',
  DROPOFF: 'Drop-off',
  PRESENT: 'Present',
  ABSENT: 'Absent',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ON_ROUTE: 'On Route',
  NOT_STARTED: 'Not Started',
  MORNING: 'Morning',
  EVENING: 'Evening',
  SCHEDULED: 'Scheduled',
};

interface StatusBadgeProps {
  status: string;
  label?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  const displayLabel = label || STATUS_LABELS[status] || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
