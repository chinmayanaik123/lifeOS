/**
 * Location types supported by the application
 */
export type LocationType =
  | 'home'
  | 'office'
  | 'bengaluru'
  | 'native'
  | 'outside';

/**
 * Location-based filtering condition for tasks
 */
export interface LocationCondition {
  /** Locations where this task should appear */
  allowedLocations?: LocationType[];
  /** Locations where this task should NOT appear */
  excludedLocations?: LocationType[];
}

/**
 * Recurrence pattern for tasks
 */
export interface RecurrenceRule {
  /** Type of recurrence */
  type: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  /** Days of week for weekly recurrence (0 = Sunday, 6 = Saturday) */
  daysOfWeek?: number[];
  /** Day of month for monthly recurrence (1-31) */
  dayOfMonth?: number;
  /** Start date for the recurrence (ISO date string) */
  startDate: string;
  /** Optional end date for the recurrence (ISO date string) */
  endDate?: string;
}

/**
 * Reminder configuration for tasks
 */
export interface ReminderConfig {
  /** Time for the reminder (HH:mm format) */
  time: string;
  /** Number of days before to send early reminder */
  earlyReminderDays?: number;
  /** Whether reminder should be silent */
  silent: boolean;
  /** Enable snap reminder (quick notification) */
  snapReminderEnabled: boolean;
}

/**
 * Main task model
 */
export interface Task {
  /** Unique identifier */
  id: string;
  /** Task title */
  title: string;
  /** Type of task input */
  type: 'checkbox' | 'counter' | 'dropdown' | 'text';
  /** Recurrence pattern */
  recurrence: RecurrenceRule;
  /** Optional reminder configuration */
  reminder?: ReminderConfig;
  /** Optional location-based filtering */
  locationCondition?: LocationCondition;
  /** Whether streak tracking is enabled */
  streakEnabled: boolean;
  /** Task importance label */
  importance?: 'low' | 'medium' | 'high';
  /** Task display priority (lower number = higher priority) */
  priority: number;
  /** Whether task is archived */
  isArchived: boolean;
  /** Creation timestamp (ISO date string) */
  createdAt: string;
  /** Dropdown options (only for dropdown type) */
  dropdownOptions?: string[];
}

/**
 * Instance of a task on a specific date
 */
export interface TaskInstance {
  /** Unique identifier */
  id: string;
  /** Reference to the parent task */
  taskId: string;
  /** Date for this instance (ISO date string YYYY-MM-DD) */
  date: string;
  /** Completion status */
  status: 'pending' | 'completed' | 'skipped';
  /** Value for counter/dropdown/text types */
  value?: number | string;
  /** Completion timestamp (ISO date string) */
  completedAt?: string;
}

/**
 * Resolved view of a task instance (combines Task + TaskInstance)
 */
export interface TaskInstanceView extends TaskInstance {
  /** Task details */
  task: Task;
  /** Current streak count (if streak enabled) */
  currentStreak?: number;
}
