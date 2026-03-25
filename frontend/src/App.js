import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FolderOpen,
  LineChart,
  LogOut,
  Plus,
  BookOpen,
  CalendarPlus,
  UploadCloud,
  Layers,
  GraduationCap,
  Sparkles,
  ChevronRight,
  BarChart2
} from "lucide-react";

import "./App.css";

const API = axios.create({
  baseURL: "http://localhost:8000/api"
});

function App() {
  // Auth state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [isLoginView, setIsLoginView] = useState(true);

  // App Navigation
  const [activeTab, setActiveTab] = useState("dashboard");

  // App Data
  const [groupName, setGroupName] = useState("");
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");

  const [topicName, setTopicName] = useState("");
  const [topics, setTopics] = useState([]);

  const [events, setEvents] = useState([]);

  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const [analyticsData, setAnalyticsData] = useState(null);

  /* ---------- AUTH ---------- */
  const signup = async () => {
    try {
      await API.post("/auth/signup", { username, email, password });
      alert("Signup successful! Please login.");
      setIsLoginView(true);
    } catch (err) {
      alert("Signup failed");
    }
  };

  const login = async () => {
    try {
      const res = await API.post("/auth/login", { email, password });
      setToken(res.data.token);
    } catch (err) {
      alert("Login failed");
    }
  };

  const logout = () => {
    setToken("");
    setActiveTab("dashboard");
  };

  /* ---------- DATA FETCHING ---------- */
  useEffect(() => {
    if (token) {
      getGroups();
    }
  }, [token]);

  useEffect(() => {
    if (token && groupId) {
      getTopics();
      getEvents();
    }
  }, [groupId, token]);

  /* ---------- GROUPS ---------- */
  const createGroup = async () => {
    if (!groupName) return;
    try {
      await API.post("/groups", { name: groupName, description: "Demo group" }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroupName("");
      getGroups();
    } catch (err) {
      alert("Group creation failed");
    }
  };

  const getGroups = async () => {
    try {
      const res = await API.get("/groups", { headers: { Authorization: `Bearer ${token}` } });
      setGroups(res.data);
      if (res.data.length > 0 && !groupId) {
        setGroupId(res.data[0]._id);
      }
    } catch (err) {
      console.error("Failed to fetch groups");
    }
  };

  /* ---------- TOPICS ---------- */
  const createTopic = async () => {
    if (!topicName || !groupId) return;
    try {
      await API.post(`/groups/${groupId}/topics`, { name: topicName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTopicName("");
      getTopics();
    } catch (err) {
      alert("Topic creation failed");
    }
  };

  const getTopics = async () => {
    if (!groupId) return;
    try {
      const res = await API.get(`/groups/${groupId}/topics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTopics(res.data);
    } catch (err) {
      console.error("Failed to fetch topics");
    }
  };

  /* ---------- CALENDAR EVENTS ---------- */
  const createEvent = async () => {
    if (!groupId) return;
    try {
      await API.post("/calendar/create", {
        title: "Study Session",
        groupId: groupId,
        eventDate: new Date()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      getEvents();
    } catch (err) {
      alert("Event creation failed");
    }
  };

  const getEvents = async () => {
    if (!groupId) return;
    try {
      const res = await API.get(`/calendar/group/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(res.data);
    } catch (err) {
      console.error("Failed to fetch events");
    }
  };

  /* ---------- RESOURCES / FILES ---------- */
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!file || !groupId) {
      alert("Please select a file and ensure a group is selected.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("groupId", groupId);
      formData.append("topicId", "demoTopic");
      formData.append("sender", "demoUser");

      await axios.post("http://localhost:8000/api/upload/file", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      alert("File uploaded successfully!");
      setFile(null);
    } catch (err) {
      alert("Upload failed");
    }
  };

  /* ---------- ANALYTICS ---------- */
  const fetchAnalytics = async () => {
    if (!groupId) return;
    try {
      const res = await API.get(`/analytics/group/${groupId}/activity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalyticsData(res.data);
    } catch (err) {
      alert("Analytics fetch failed");
    }
  };


  /* =========================================
     RENDER HELPERS
  ========================================= */

  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon">
              <GraduationCap size={32} />
            </div>
            <h1 className="auth-title">StudyConnect</h1>
            <p className="auth-subtitle">Elevate your collaborative learning</p>
          </div>

          {isLoginView ? (
            <div className="auth-form">
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <input
                  type="email"
                  className="premium-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <input
                  type="password"
                  className="premium-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} onClick={login}>
                Sign In <ChevronRight size={18} />
              </button>
            </div>
          ) : (
            <div className="auth-form">
              <div className="input-group">
                <label className="input-label">Username</label>
                <input
                  type="text"
                  className="premium-input"
                  placeholder="johndoe"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <input
                  type="email"
                  className="premium-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <input
                  type="password"
                  className="premium-input"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} onClick={signup}>
                Create Account <ChevronRight size={18} />
              </button>
            </div>
          )}

          <div className="auth-toggle">
            {isLoginView ? "Don't have an account?" : "Already have an account?"}
            <span onClick={() => setIsLoginView(!isLoginView)}>
              {isLoginView ? "Sign up" : "Log in"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Active Group Info helper
  const activeGroup = groups.find(g => g._id === groupId);

  return (
    <div className="app-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="logo-container">
          <GraduationCap size={28} className="logo-gradient-text" />
          <span className="logo-gradient-text">StudyConnect</span>
        </div>

        <nav className="nav-menu">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard /> Dashboard
          </div>
          <div className={`nav-item ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>
            <Users /> My Groups
          </div>
          <div className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
            <CalendarDays /> Calendar
          </div>
          <div className={`nav-item ${activeTab === 'files' ? 'active' : ''}`} onClick={() => setActiveTab('files')}>
            <FolderOpen /> Resources
          </div>
          <div className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            <LineChart /> Analytics
          </div>
        </nav>

        <div className="user-profile">
          <div className="user-info">
            <div className="avatar">
              {email ? email.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>My Account</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{email}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        <header className="header">
          <div>
            <h1>
              {activeTab === 'dashboard' && 'Welcome back!'}
              {activeTab === 'groups' && 'Study Groups'}
              {activeTab === 'calendar' && 'Schedule'}
              {activeTab === 'files' && 'Shared Resources'}
              {activeTab === 'analytics' && 'Group Analytics'}
            </h1>
            {activeGroup && <div style={{ color: 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} /> Current Context: <strong>{activeGroup.name}</strong>
            </div>}
          </div>
          <div className="header-actions">
            {!groups.length && activeTab !== 'groups' && (
              <button className="btn btn-primary" onClick={() => setActiveTab('groups')}>
                <Plus size={18} /> Create a Group
              </button>
            )}
          </div>
        </header>

        {/* View Router */}
        {activeTab === 'dashboard' && (
          <div className="grid-2">
            <div className="glass-card">
              <div className="card-header">
                <div className="card-title"><Users className="card-icon" /> Your Groups ({groups.length})</div>
              </div>
              {groups.length === 0 ? (
                <div className="empty-state">
                  <Users size={48} />
                  <p>You aren't in any groups yet.</p>
                  <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={() => setActiveTab('groups')}>
                    Create One
                  </button>
                </div>
              ) : (
                <div className="group-list">
                  {groups.slice(0, 3).map(g => (
                    <div key={g._id} className={`group-item ${groupId === g._id ? 'active' : ''}`} onClick={() => setGroupId(g._id)}>
                      <div className="group-info">
                        <h3><Users size={18} /> {g.name}</h3>
                        <p>{g.description || 'Study group'}</p>
                      </div>
                      <span className="badge">Active</span>
                    </div>
                  ))}
                  {groups.length > 3 && (
                    <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setActiveTab('groups')}>
                      View all groups
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="glass-card">
              <div className="card-header">
                <div className="card-title"><CalendarDays className="card-icon" /> Upcoming Events</div>
              </div>
              {events.length === 0 ? (
                <div className="empty-state">
                  <CalendarDays size={48} />
                  <p>No upcoming study sessions.</p>
                </div>
              ) : (
                <div className="event-list">
                  {events.slice(0, 3).map(e => {
                    const d = new Date(e.eventDate);
                    return (
                      <div key={e._id} className="event-card">
                        <div className="event-date">
                          <span className="day">{d.getDate()}</span>
                          <span className="month">{d.toLocaleString('default', { month: 'short' })}</span>
                        </div>
                        <div className="event-details">
                          <h4>{e.title}</h4>
                          <p>Organized by this group</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="grid-2">
            <div className="glass-card">
              <div className="card-header">
                <div className="card-title"><Plus className="card-icon" /> Create New Group</div>
              </div>
              <div className="input-group">
                <label className="input-label">Group Name</label>
                <input
                  className="premium-input"
                  placeholder="e.g. Advanced Calculus Study"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={createGroup}>
                <Sparkles size={18} /> Create Group
              </button>
            </div>

            <div className="glass-card" style={{ gridRow: 'span 2' }}>
              <div className="card-header">
                <div className="card-title"><Layers className="card-icon" /> Manage Groups</div>
              </div>
              <div className="group-list">
                {groups.map(g => (
                  <div key={g._id} className={`group-item ${groupId === g._id ? 'active' : ''}`} onClick={() => setGroupId(g._id)}>
                    <div className="group-info">
                      <h3>{g.name}</h3>
                      <p>Select to set as active workspace</p>
                    </div>
                  </div>
                ))}
              </div>

              {groupId && (
                <div style={{ marginTop: '32px', borderTop: '1px solid var(--surface-border)', paddingTop: '24px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Topics inside Active Group</h3>
                  <div className="input-group" style={{ flexDirection: 'row', gap: '8px' }}>
                    <input
                      className="premium-input"
                      placeholder="New topic name"
                      value={topicName}
                      onChange={e => setTopicName(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={createTopic}><Plus size={18} /></button>
                  </div>
                  <div className="topic-container">
                    {topics.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No topics yet.</span>}
                    {topics.map(t => (
                      <span key={t._id} className="topic-chip"><BookOpen size={14} /> {t.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="grid-3">
            <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-header">
                <div className="card-title"><CalendarDays className="card-icon" /> Master Schedule</div>
                <button className="btn btn-primary" onClick={createEvent}>
                  <CalendarPlus size={18} /> New Session
                </button>
              </div>
              
              <div className="event-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {events.length === 0 ? (
                  <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                    <CalendarDays size={48} />
                    <p>Schedule is empty. Create a session to get started.</p>
                  </div>
                ) : (
                  events.map(e => {
                    const d = new Date(e.eventDate);
                    return (
                      <div key={e._id} className="event-card">
                        <div className="event-date">
                          <span className="day">{d.getDate()}</span>
                          <span className="month">{d.toLocaleString('default', { month: 'short' })}</span>
                        </div>
                        <div className="event-details">
                          <h4>{e.title}</h4>
                          <p>Interactive Study Session</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="grid-2">
            <div className="glass-card">
              <div className="card-header">
                <div className="card-title"><UploadCloud className="card-icon" /> Upload Resource</div>
              </div>
              <div 
                className="upload-zone"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <div className="upload-icon"><UploadCloud size={32} /></div>
                <div className="upload-text">Select a file to upload</div>
                <div className="upload-subtext">PDF, DOCX, ZIP files up to 50MB</div>
                
                {file && (
                  <div style={{ marginTop: '16px', color: '#8b5cf6', fontWeight: 600 }}>
                    Selected: {file.name}
                  </div>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="file-input-hidden"
                />
              </div>
              
              <button 
                className={`btn btn-primary`} 
                style={{ width: '100%', marginTop: '24px' }}
                onClick={uploadFile}
                disabled={!file}
              >
                <UploadCloud size={18} /> Confirm Upload
              </button>
            </div>
            
            <div className="glass-card">
              <div className="card-header">
                <div className="card-title"><FolderOpen className="card-icon" /> Shared Files</div>
              </div>
              <div className="empty-state">
                <FolderOpen size={48} />
                <p>No files uploaded for this group yet.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid-2">
            <div className="glass-card">
              <div className="card-header">
                <div className="card-title"><LineChart className="card-icon" /> Activity Insight</div>
                <button className="btn btn-secondary" onClick={fetchAnalytics}>
                  Refresh Data
                </button>
              </div>
              
              {!analyticsData ? (
                <div className="empty-state">
                  <BarChart2 size={48} />
                  <p>Click refresh to view analytics for the current group.</p>
                </div>
              ) : (
                <pre style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  padding: '16px', 
                  borderRadius: '12px',
                  border: '1px solid var(--surface-border)',
                  overflowX: 'auto',
                  fontSize: '0.85rem'
                }}>
                  {JSON.stringify(analyticsData, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;