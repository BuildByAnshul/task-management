require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Board = require('./models/Board');
const Task = require('./models/Task');
const Activity = require('./models/Activity');
const Comment = require('./models/Comment');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/novaboard';

const avatarColors = ['#0F9488', '#F472B6', '#FB923C', '#A78BFA', '#38BDF8', '#FBD157'];

const getAvatar = (name) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${avatarColors[Math.floor(Math.random() * avatarColors.length)].replace('#', '')}&color=fff&bold=true&size=128`;
};

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clean up
  await Promise.all([
    User.deleteMany({}),
    Board.deleteMany({}),
    Task.deleteMany({}),
    Activity.deleteMany({}),
    Comment.deleteMany({}),
  ]);
  console.log('🧹 Cleaned existing data');

  // Create users
  const passwordHash = await bcrypt.hash('password123', 12);

  const users = await User.insertMany([
    {
      name: 'John Doe',
      email: 'john@novaboard.dev',
      passwordHash,
      avatarUrl: getAvatar('John Doe'),
    },
    {
      name: 'Priya Sharma',
      email: 'priya@novaboard.dev',
      passwordHash,
      avatarUrl: getAvatar('Priya Sharma'),
    },
    {
      name: 'Alex Chen',
      email: 'alex@novaboard.dev',
      passwordHash,
      avatarUrl: getAvatar('Alex Chen'),
    },
    {
      name: 'Maria Garcia',
      email: 'maria@novaboard.dev',
      passwordHash,
      avatarUrl: getAvatar('Maria Garcia'),
    },
    {
      name: 'Sam Wilson',
      email: 'sam@novaboard.dev',
      passwordHash,
      avatarUrl: getAvatar('Sam Wilson'),
    },
  ]);

  console.log(`👤 Created ${users.length} users`);

  const [john, priya, alex, maria, sam] = users;

  // Create board matching the screenshot
  const board = await Board.create({
    title: 'NovaBoard Mobile App',
    description: 'Building the next-generation mobile Kanban experience',
    clientName: 'Arcadia Solutions',
    startDate: new Date('2025-05-20'),
    endDate: new Date('2025-06-30'),
    status: 'in_progress',
    createdBy: john._id,
    members: [
      { user: john._id, role: 'owner', joinedAt: new Date() },
      { user: priya._id, role: 'admin', joinedAt: new Date() },
      { user: alex._id, role: 'member', joinedAt: new Date() },
      { user: maria._id, role: 'member', joinedAt: new Date() },
      { user: sam._id, role: 'viewer', joinedAt: new Date() },
    ],
    columns: [
      { key: 'todo', label: 'To Do', color: '#FDE8EF', dotColor: '#F472B6' },
      { key: 'in_progress', label: 'In Progress', color: '#FEF0E7', dotColor: '#FB923C' },
      { key: 'review', label: 'In Review', color: '#E0F2FE', dotColor: '#38BDF8' },
      { key: 'done', label: 'Completed', color: '#EDE9FE', dotColor: '#A78BFA' },
    ],
  });

  console.log(`📋 Created board: ${board.title}`);

  // Create tasks matching the screenshot
  const tasksData = [
    // To Do
    {
      board: board._id, title: 'Design Notification Banner', status: 'todo', priority: 'medium',
      description: 'Note: Ensure it adapts well in both light and dark themes.',
      assignedTo: [john._id], position: 1000, progress: 0,
      commentCount: 2,
      subtasks: [
        { title: 'Sketch initial concepts', done: false },
        { title: 'Create Figma mockup', done: false },
        { title: 'Get team review', done: false },
      ],
      createdBy: john._id,
    },
    {
      board: board._id, title: 'Write Error Message Guidelines', status: 'todo', priority: 'low',
      description: 'Document best practices for error messages across the app.',
      assignedTo: [priya._id], position: 2000, progress: 0,
      commentCount: 1,
      subtasks: [
        { title: 'Research industry standards', done: false },
        { title: 'Draft document', done: false },
      ],
      createdBy: priya._id,
    },
    {
      board: board._id, title: 'Create Avatar Component', status: 'todo', priority: 'medium',
      description: 'Build reusable avatar component with fallback initials.',
      assignedTo: [alex._id], position: 3000, progress: 10,
      commentCount: 0,
      subtasks: [
        { title: 'Design component API', done: true },
        { title: 'Implement base component', done: false },
        { title: 'Add size variants', done: false },
        { title: 'Add group stacking', done: false },
        { title: 'Write tests', done: false },
      ],
      createdBy: alex._id,
    },

    // In Progress
    {
      board: board._id, title: 'Create Dashboard Wireframe', status: 'in_progress', priority: 'high',
      description: 'Note: Client wants more whitespace in the left sidebar.',
      assignedTo: [priya._id, alex._id], position: 1000, progress: 60,
      commentCount: 5,
      subtasks: [
        { title: 'Low-fi wireframes', done: true },
        { title: 'High-fi mockups', done: true },
        { title: 'Mobile responsive version', done: true },
        { title: 'Client review session', done: false },
        { title: 'Final revisions', done: false },
      ],
      createdBy: priya._id,
    },
    {
      board: board._id, title: 'API Endpoint Mapping', status: 'in_progress', priority: 'medium',
      description: 'Map all REST endpoints for the dashboard module.',
      assignedTo: [alex._id], position: 2000, progress: 40,
      commentCount: 1,
      subtasks: [
        { title: 'Auth endpoints', done: true },
        { title: 'Board endpoints', done: true },
        { title: 'Task endpoints', done: false },
        { title: 'File upload endpoints', done: false },
        { title: 'Analytics endpoints', done: false },
      ],
      createdBy: john._id,
    },
    {
      board: board._id, title: 'Dark Mode Theme Integration', status: 'in_progress', priority: 'low',
      description: 'Integrate dark mode support across all UI components.',
      assignedTo: [priya._id, john._id], position: 3000, progress: 25,
      commentCount: 2,
      subtasks: [
        { title: 'Define color tokens', done: true },
        { title: 'Update base components', done: false },
        { title: 'Test all screens', done: false },
        { title: 'Handle system preference', done: false },
      ],
      createdBy: priya._id,
    },

    // In Review
    {
      board: board._id, title: 'Mobile Navigation Prototype', status: 'review', priority: 'low',
      description: 'Note: Check responsiveness on iOS devices.',
      assignedTo: [alex._id], position: 1000, progress: 100,
      commentCount: 4,
      subtasks: [
        { title: 'Bottom nav design', done: true },
        { title: 'Gesture support', done: true },
        { title: 'iOS test', done: true },
        { title: 'Android test', done: true },
      ],
      createdBy: alex._id,
    },
    {
      board: board._id, title: 'Team Settings Layout', status: 'review', priority: 'medium',
      description: 'Design and implement the team settings management page.',
      assignedTo: [priya._id, alex._id], position: 2000, progress: 100,
      commentCount: 3,
      subtasks: [
        { title: 'Member list component', done: true },
        { title: 'Role management UI', done: true },
        { title: 'Invite flow', done: true },
      ],
      createdBy: john._id,
    },

    // Done
    {
      board: board._id, title: 'Landing Page Copywriting', status: 'done', priority: 'medium',
      description: 'Write compelling copy for the marketing landing page.',
      assignedTo: [john._id], position: 1000, progress: 100,
      commentCount: 6,
      subtasks: [
        { title: 'Hero section', done: true },
        { title: 'Features section', done: true },
        { title: 'Pricing section', done: true },
        { title: 'Footer', done: true },
      ],
      createdBy: maria._id,
    },
    {
      board: board._id, title: 'Brand Color Exploration', status: 'done', priority: 'medium',
      description: 'Note: Colors approved for both web and mobile.',
      assignedTo: [priya._id, alex._id, john._id], position: 2000, progress: 100,
      commentCount: 1,
      subtasks: [
        { title: 'Primary palette', done: true },
        { title: 'Secondary palette', done: true },
        { title: 'Dark mode variants', done: true },
      ],
      createdBy: priya._id,
    },
    {
      board: board._id, title: 'App Icon Design', status: 'done', priority: 'high',
      description: 'Design the app icon for iOS and Android stores.',
      assignedTo: [priya._id, alex._id, john._id, maria._id], position: 3000, progress: 100,
      commentCount: 3,
      subtasks: [
        { title: 'Concept sketches', done: true },
        { title: 'Vector illustration', done: true },
        { title: 'All size variants', done: true },
        { title: 'App store submission', done: true },
      ],
      createdBy: john._id,
    },
  ];

  const tasks = await Task.insertMany(tasksData);
  console.log(`✅ Created ${tasks.length} tasks`);

  // Create some comments
  await Comment.insertMany([
    {
      task: tasks[0]._id, board: board._id, author: priya._id,
      text: 'The dark mode version looks great! Should we add animation?',
    },
    {
      task: tasks[0]._id, board: board._id, author: john._id,
      text: 'Agreed! Let\'s add a subtle slide-in animation.',
    },
    {
      task: tasks[3]._id, board: board._id, author: alex._id,
      text: 'Client feedback received. They want more spacing.',
    },
  ]);

  // Create activity log
  await Activity.insertMany([
    { board: board._id, task: tasks[0]._id, actor: john._id, type: 'task_created', meta: { title: tasks[0].title } },
    { board: board._id, task: tasks[3]._id, actor: priya._id, type: 'task_created', meta: { title: tasks[3].title } },
    { board: board._id, task: tasks[6]._id, actor: alex._id, type: 'task_moved', meta: { from: 'in_progress', to: 'review', title: tasks[6].title } },
    { board: board._id, actor: john._id, type: 'member_joined', meta: { role: 'owner' } },
  ]);

  console.log('🎉 Seed complete!');
  console.log('\n📧 Demo Credentials:');
  console.log('  Email: john@novaboard.dev  | Password: password123 (Owner)');
  console.log('  Email: priya@novaboard.dev | Password: password123 (Admin)');
  console.log('  Email: alex@novaboard.dev  | Password: password123 (Member)');
  console.log('  Email: maria@novaboard.dev | Password: password123 (Member)');
  console.log('  Email: sam@novaboard.dev   | Password: password123 (Viewer)');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
