// Central model registry — importing this file registers all Mongoose models.
// Import this (or import mongodb which imports this) before any .populate() call
// that references a model by name (e.g. ref: 'User').
export { default as User } from './User';
export { default as Client } from './Client';
export { default as Board } from './Board';
export { default as Task } from './Task';
export { default as ActivityLog } from './ActivityLog';
export { default as ContentItem } from './ContentItem';
export { default as Agreement } from './Agreement';
export { default as MonthlyReport } from './MonthlyReport';
export { default as BillingPeriod } from './BillingPeriod';
export { default as ClientPayment } from './ClientPayment';
export { default as Wallet } from './Wallet';
export { default as FinanceTransaction } from './FinanceTransaction';
export { default as Booking } from './Booking';
