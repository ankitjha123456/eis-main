const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 5000;

// Path to persistent data file (survives reboots)
const DATA_FILE = path.join(__dirname, 'data.txt');

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── File Helpers ────────────────────────────────────────────────────────────

/**
 * Read all activities from data.txt
 * Returns an empty array if the file doesn't exist or is empty/corrupted
 */
function readActivities() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8').trim();
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('[readActivities] Parse error, resetting file:', err.message);
    return [];
  }
}

/**
 * Write all activities back to data.txt (pretty-printed JSON)
 */
function writeActivities(activities) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(activities, null, 2), 'utf-8');
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/activities
 * Fetch all activities, sorted by scheduledDate descending (newest first)
 */
app.get('/api/activities', (req, res) => {
  try {
    const activities = readActivities();

    // Optional: filter by status query param  e.g. ?status=Pending
    const { status, search } = req.query;
    let filtered = activities;

    if (status && status !== 'All') {
      filtered = filtered.filter(a => a.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        a =>
          a.name.toLowerCase().includes(q) ||
          a.reason.toLowerCase().includes(q)
      );
    }

    // Sort: newest scheduled date first
    filtered.sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));

    res.json({
      success: true,
      total: activities.length,
      count: filtered.length,
      data: filtered,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/activities/:id
 * Fetch a single activity by ID
 */
app.get('/api/activities/:id', (req, res) => {
  try {
    const activities = readActivities();
    const activity = activities.find(a => a.id === req.params.id);

    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    res.json({ success: true, data: activity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/activities
 * Create a new activity
 * Body: { name, reason, scheduledDate, status? }
 */
app.post('/api/activities', (req, res) => {
  try {
    const { name, reason, scheduledDate, status } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Activity name is required' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Reason is required' });
    }
    if (!scheduledDate) {
      return res.status(400).json({ success: false, message: 'Scheduled date is required' });
    }

    const newActivity = {
      id: uuidv4(),
      name: name.trim(),
      reason: reason.trim(),
      scheduledDate,                              // ISO date string e.g. "2026-06-15"
      status: status || 'Pending',               // Pending | In Progress | Completed
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const activities = readActivities();
    activities.push(newActivity);
    writeActivities(activities);

    res.status(201).json({ success: true, message: 'Activity created', data: newActivity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/activities/:id
 * Update an existing activity (full or partial update)
 * Body: { name?, reason?, scheduledDate?, status? }
 */
app.put('/api/activities/:id', (req, res) => {
  try {
    const activities = readActivities();
    const index = activities.findIndex(a => a.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    const { name, reason, scheduledDate, status } = req.body;

    // Merge only provided fields
    const updated = {
      ...activities[index],
      ...(name        !== undefined && { name: name.trim() }),
      ...(reason      !== undefined && { reason: reason.trim() }),
      ...(scheduledDate !== undefined && { scheduledDate }),
      ...(status      !== undefined && { status }),
      updatedAt: new Date().toISOString(),
    };

    activities[index] = updated;
    writeActivities(activities);

    res.json({ success: true, message: 'Activity updated', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/activities/:id/status
 * Quick status change  (convenience endpoint used by the dashboard cards)
 * Body: { status }
 */
app.patch('/api/activities/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'In Progress', 'Completed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const activities = readActivities();
    const index = activities.findIndex(a => a.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    activities[index].status = status;
    activities[index].updatedAt = new Date().toISOString();
    writeActivities(activities);

    res.json({ success: true, message: 'Status updated', data: activities[index] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/activities/:id
 * Delete an activity by ID
 */
app.delete('/api/activities/:id', (req, res) => {
  try {
    const activities = readActivities();
    const index = activities.findIndex(a => a.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    const deleted = activities.splice(index, 1)[0];
    writeActivities(activities);

    res.json({ success: true, message: 'Activity deleted', data: deleted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/stats
 * Summary counts for the dashboard header cards
 */
app.get('/api/stats', (req, res) => {
  try {
    const activities = readActivities();

    const stats = {
      total:      activities.length,
      pending:    activities.filter(a => a.status === 'Pending').length,
      inProgress: activities.filter(a => a.status === 'In Progress').length,
      completed:  activities.filter(a => a.status === 'Completed').length,
    };

    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Activity Dashboard API is running', port: PORT });
});

// ─── 404 catch-all ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  Activity Dashboard API running on http://localhost:${PORT}`);
  console.log(`📁  Data persisted at: ${DATA_FILE}`);
  console.log('\nEndpoints:');
  console.log('  GET    /api/health');
  console.log('  GET    /api/stats');
  console.log('  GET    /api/activities          (+ ?status= ?search=)');
  console.log('  GET    /api/activities/:id');
  console.log('  POST   /api/activities');
  console.log('  PUT    /api/activities/:id');
  console.log('  PATCH  /api/activities/:id/status');
  console.log('  DELETE /api/activities/:id\n');
});
