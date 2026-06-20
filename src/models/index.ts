// Central model registry — importing this file registers all Mongoose models.
// Import this (or import mongodb which imports this) before any .populate() call
// that references a model by name (e.g. ref: 'User').
export { default as User } from './User';
export { default as Client } from './Client';
export { default as Board } from './Board';
export { default as Task } from './Task';
export { default as Payment } from './Payment';
export { default as ActivityLog } from './ActivityLog';
export { default as ContentItem } from './ContentItem';
export { default as Agreement } from './Agreement';
export { default as Report } from './Report';
