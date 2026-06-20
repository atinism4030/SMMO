import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Client from '@/models/Client';
import Board from '@/models/Board';
import Task from '@/models/Task';
import Payment from '@/models/Payment';
import ContentItem from '@/models/ContentItem';
import Report from '@/models/Report';

export async function POST() {
  await connectDB();

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Client.deleteMany({}),
    Board.deleteMany({}),
    Task.deleteMany({}),
    Payment.deleteMany({}),
    ContentItem.deleteMany({}),
    Report.deleteMany({}),
  ]);

  // Create users
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const workerHash = await bcrypt.hash('Worker123!', 12);

  const [admin, worker1, worker2] = await Promise.all([
    User.create({ name: 'Alex CEO', email: 'admin@smmo.com', passwordHash: adminHash, role: 'CEO', status: 'ACTIVE' }),
    User.create({ name: 'Sara Designer', email: 'sara@smmo.com', passwordHash: workerHash, role: 'WORKER', status: 'ACTIVE', phone: '+1-555-0101' }),
    User.create({ name: 'Mike Editor', email: 'mike@smmo.com', passwordHash: workerHash, role: 'WORKER', status: 'ACTIVE', phone: '+1-555-0102' }),
  ]);

  // Create clients
  const now = new Date();
  const [meda3, timimetal, armando, diwa] = await Promise.all([
    Client.create({ name: 'Meda 3', businessType: 'Restaurant', contactPerson: 'Meda Ali', phone: '+1-555-1001', email: 'meda3@email.com', instagramUrl: 'https://instagram.com/meda3', packageName: 'Pro Package', monthlyPrice: 1500, currency: 'USD', status: 'ACTIVE', startDate: new Date(2024, 0, 1), notes: 'Premium restaurant client. Focus on food photography.', brandColors: ['#c8a96e', '#2d2d2d'] }),
    Client.create({ name: 'Timimetal', businessType: 'Metal Construction', contactPerson: 'Timur Khan', phone: '+1-555-2001', email: 'timur@timimetal.com', instagramUrl: 'https://instagram.com/timimetal', packageName: 'Business Package', monthlyPrice: 1200, currency: 'USD', status: 'ACTIVE', startDate: new Date(2024, 1, 1), notes: 'Metal fabrication company. Drone shots of projects.' }),
    Client.create({ name: "Armando's Pizza", businessType: 'Restaurant', contactPerson: 'Armando Rossi', phone: '+1-555-3001', email: 'armando@pizza.com', instagramUrl: 'https://instagram.com/armandospizza', facebookUrl: 'https://facebook.com/armandospizza', packageName: 'Starter Package', monthlyPrice: 800, currency: 'USD', status: 'ACTIVE', startDate: new Date(2024, 2, 1) }),
    Client.create({ name: 'Diwa Restaurant', businessType: 'Restaurant', contactPerson: 'Diwali Patel', phone: '+1-555-4001', email: 'info@diwa.com', instagramUrl: 'https://instagram.com/diwarestaurant', tiktokUrl: 'https://tiktok.com/@diwarestaurant', packageName: 'Growth Package', monthlyPrice: 2000, currency: 'USD', status: 'ACTIVE', startDate: new Date(2023, 10, 1) }),
  ]);

  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Create boards for June 2026
  const [medaBoard, timiBoard, armandoBoard, diwaBoard] = await Promise.all([
    Board.create({ clientId: meda3._id, title: `Meda 3 — ${month}/${year} Board`, month, year, status: 'ACTIVE', createdBy: admin._id }),
    Board.create({ clientId: timimetal._id, title: `Timimetal — ${month}/${year} Board`, month, year, status: 'ACTIVE', createdBy: admin._id }),
    Board.create({ clientId: armando._id, title: `Armando's Pizza — ${month}/${year} Board`, month, year, status: 'ACTIVE', createdBy: admin._id }),
    Board.create({ clientId: diwa._id, title: `Diwa Restaurant — ${month}/${year} Board`, month, year, status: 'ACTIVE', createdBy: admin._id }),
  ]);

  const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // Create tasks
  await Promise.all([
    // Meda 3 tasks
    Task.create({ boardId: medaBoard._id, clientId: meda3._id, title: 'Monthly Photoshoot — Food & Ambiance', taskType: 'PHOTOSHOOT', status: 'IN_PROGRESS', priority: 'HIGH', assignedTo: worker1._id, createdBy: admin._id, deadline: daysFromNow(3), platforms: ['Instagram', 'Facebook'], description: 'Shoot 20 food photos and 5 ambiance shots for the month.', isOpenForClaim: false, checklist: [{ text: 'Set up equipment', done: true }, { text: 'Shoot food dishes', done: true }, { text: 'Shoot ambiance', done: false }, { text: 'Transfer files', done: false }] }),
    Task.create({ boardId: medaBoard._id, clientId: meda3._id, title: 'Edit June Reel — Chef in Action', taskType: 'REEL', status: 'TO_DO', priority: 'MEDIUM', createdBy: admin._id, deadline: daysFromNow(5), platforms: ['Instagram', 'TikTok'], isOpenForClaim: true }),
    Task.create({ boardId: medaBoard._id, clientId: meda3._id, title: 'Design 8 Instagram Posts', taskType: 'POST_DESIGN', status: 'WAITING_APPROVAL', priority: 'MEDIUM', assignedTo: worker1._id, createdBy: admin._id, deadline: daysFromNow(2), platforms: ['Instagram'], isOpenForClaim: false }),
    Task.create({ boardId: medaBoard._id, clientId: meda3._id, title: 'Post Performance Report — May 28 Reel', taskType: 'REPORTING', status: 'TO_DO', priority: 'LOW', createdBy: admin._id, deadline: daysFromNow(1), isOpenForClaim: false }),
    // Timimetal tasks
    Task.create({ boardId: timiBoard._id, clientId: timimetal._id, title: 'Drone Shoot — New Project Site', taskType: 'DRONE', status: 'TO_DO', priority: 'HIGH', createdBy: admin._id, deadline: daysFromNow(4), platforms: ['Instagram', 'Facebook'], isOpenForClaim: true }),
    Task.create({ boardId: timiBoard._id, clientId: timimetal._id, title: 'Edit Project Showcase Video', taskType: 'VIDEO_SHOOT', status: 'IN_PROGRESS', priority: 'HIGH', assignedTo: worker2._id, createdBy: admin._id, deadline: daysFromNow(6), platforms: ['YouTube', 'Instagram'], isOpenForClaim: false }),
    // Armando tasks
    Task.create({ boardId: armandoBoard._id, clientId: armando._id, title: 'Weekly Story Set — Pizza Specials', taskType: 'STORY', status: 'APPROVED', priority: 'MEDIUM', assignedTo: worker1._id, createdBy: admin._id, deadline: daysFromNow(1), platforms: ['Instagram', 'Facebook'], isOpenForClaim: false }),
    Task.create({ boardId: armandoBoard._id, clientId: armando._id, title: 'June Payment Follow-up', taskType: 'PAYMENT', status: 'TO_DO', priority: 'HIGH', createdBy: admin._id, deadline: daysFromNow(7), isOpenForClaim: false }),
    // Diwa tasks
    Task.create({ boardId: diwaBoard._id, clientId: diwa._id, title: 'TikTok Reel — Chef Cooking Process', taskType: 'REEL', status: 'POSTED', priority: 'HIGH', assignedTo: worker2._id, createdBy: admin._id, deadline: daysFromNow(-2), platforms: ['TikTok', 'Instagram'], isOpenForClaim: false, completedAt: daysFromNow(-3) }),
    Task.create({ boardId: diwaBoard._id, clientId: diwa._id, title: 'Post 3-Day Report — TikTok Reel', taskType: 'REPORTING', status: 'TO_DO', priority: 'HIGH', createdBy: admin._id, deadline: daysFromNow(0), isOpenForClaim: false }),
  ]);

  // Payments
  await Promise.all([
    Payment.create({ clientId: meda3._id, month: month - 1 > 0 ? month - 1 : 12, year: month - 1 > 0 ? year : year - 1, amount: 1500, currency: 'USD', status: 'PAID', paidDate: daysFromNow(-10), paymentMethod: 'BANK' }),
    Payment.create({ clientId: meda3._id, month, year, amount: 1500, currency: 'USD', status: 'UNPAID', dueDate: daysFromNow(10) }),
    Payment.create({ clientId: timimetal._id, month: month - 1 > 0 ? month - 1 : 12, year: month - 1 > 0 ? year : year - 1, amount: 1200, currency: 'USD', status: 'PAID', paidDate: daysFromNow(-15), paymentMethod: 'CARD' }),
    Payment.create({ clientId: timimetal._id, month, year, amount: 1200, currency: 'USD', status: 'LATE', dueDate: daysFromNow(-3) }),
    Payment.create({ clientId: armando._id, month, year, amount: 800, currency: 'USD', status: 'PARTIAL', dueDate: daysFromNow(5), notes: 'Paid 50% upfront. Remaining due on delivery.' }),
    Payment.create({ clientId: diwa._id, month, year, amount: 2000, currency: 'USD', status: 'PAID', paidDate: daysFromNow(-5), paymentMethod: 'CASH' }),
  ]);

  // Content items
  const [timiReel] = await Promise.all([
    ContentItem.create({ clientId: timimetal._id, boardId: timiBoard._id, title: 'Project Site Reel — June 2026', contentType: 'REEL', caption: 'Excellence in metalwork. Every project tells a story. #timimetal #construction', platforms: ['Instagram', 'Facebook'], scheduledDate: daysFromNow(8), status: 'IN_PRODUCTION', createdBy: admin._id }),
    ContentItem.create({ clientId: meda3._id, boardId: medaBoard._id, title: 'Chef Special Post — Signature Dish', contentType: 'POST', caption: 'Our chef\'s masterpiece. Book now!', platforms: ['Instagram'], scheduledDate: daysFromNow(3), status: 'APPROVED', createdBy: admin._id }),
    ContentItem.create({ clientId: diwa._id, boardId: diwaBoard._id, title: 'TikTok Kitchen Reel', contentType: 'REEL', caption: 'Behind the scenes magic at Diwa. Watch our chefs create perfection!', platforms: ['TikTok', 'Instagram'], postedDate: daysFromNow(-2), status: 'POSTED', createdBy: admin._id }),
    ContentItem.create({ clientId: armando._id, boardId: armandoBoard._id, title: 'Weekend Pizza Special Story', contentType: 'STORY', platforms: ['Instagram', 'Facebook'], scheduledDate: daysFromNow(2), status: 'SCHEDULED', createdBy: admin._id }),
  ]);

  // Report for the posted Diwa reel
  await Report.create({
    clientId: diwa._id,
    reportDate: daysFromNow(-1),
    daysAfterPosting: 3,
    views: 4820,
    reach: 3900,
    likes: 312,
    comments: 47,
    shares: 89,
    saves: 156,
    engagementRate: 12.4,
    notes: 'Excellent performance. Best reel of the month. High saves indicate strong content value.',
    createdBy: admin._id,
  });

  return NextResponse.json({
    message: 'Seed completed successfully',
    data: {
      users: 3,
      clients: 4,
      boards: 4,
      tasks: 10,
      payments: 6,
      contentItems: 4,
      reports: 1,
    },
  });
}
