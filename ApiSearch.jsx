import React, { useEffect, useState } from "react";
import "./Activities.css";

const API_URL = "http://localhost:5000/api";

function Activities() {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [form, setForm] = useState({
    name: "",
    reason: "",
    scheduledDate: "",
    status: "Pending",
  });

  const fetchActivities = async () => {
    try {
      let url = `${API_URL}/activities?status=${statusFilter}&search=${search}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setActivities(data.data);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/stats`);
      const data = await res.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchActivities();
    fetchStats();
  }, [search, statusFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_URL}/activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        setForm({
          name: "",
          reason: "",
          scheduledDate: "",
          status: "Pending",
        });

        fetchActivities();
        fetchStats();
      }
    } catch (err) {
      console.log(err);
    }
  };

  const deleteActivity = async (id) => {
    if (!window.confirm("Delete this activity?")) return;

    try {
      await fetch(`${API_URL}/activities/${id}`, {
        method: "DELETE",
      });

      fetchActivities();
      fetchStats();
    } catch (err) {
      console.log(err);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await fetch(`${API_URL}/activities/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      fetchActivities();
      fetchStats();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="dashboard-container">
      <h1 className="title">📋 Activity Dashboard</h1>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="card total">
          <h3>Total</h3>
          <p>{stats.total || 0}</p>
        </div>

        <div className="card pending">
          <h3>Pending</h3>
          <p>{stats.pending || 0}</p>
        </div>

        <div className="card progress">
          <h3>In Progress</h3>
          <p>{stats.inProgress || 0}</p>
        </div>

        <div className="card completed">
          <h3>Completed</h3>
          <p>{stats.completed || 0}</p>
        </div>
      </div>

      {/* Add Activity */}
      <div className="form-card">
        <h2>Add Activity</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Activity Name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            required
          />

          <textarea
            placeholder="Reason"
            value={form.reason}
            onChange={(e) =>
              setForm({ ...form, reason: e.target.value })
            }
            required
          />

          <input
            type="date"
            value={form.scheduledDate}
            onChange={(e) =>
              setForm({
                ...form,
                scheduledDate: e.target.value,
              })
            }
            required
          />

          <button type="submit">Add Activity</button>
        </form>
      </div>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search activity..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option>All</option>
          <option>Pending</option>
          <option>In Progress</option>
          <option>Completed</option>
        </select>
      </div>

      {/* Activity Cards */}
      <div className="activity-grid">
        {activities.map((activity) => (
          <div key={activity.id} className="activity-card">
            <h3>{activity.name}</h3>

            <p>{activity.reason}</p>

            <div className="date">
              📅 {activity.scheduledDate}
            </div>

            <span
              className={`badge ${activity.status
                .replace(/\s/g, "")
                .toLowerCase()}`}
            >
              {activity.status}
            </span>

            <div className="actions">
              <select
                value={activity.status}
                onChange={(e) =>
                  updateStatus(
                    activity.id,
                    e.target.value
                  )
                }
              >
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>

              <button
                className="delete-btn"
                onClick={() =>
                  deleteActivity(activity.id)
                }
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Activities;