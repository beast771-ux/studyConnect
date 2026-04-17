import { useState } from "react";

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function toDateTimeParts(iso) {
  const date = new Date(iso);
  const localDate = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
  const localTime = `${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
  return { localDate, localTime };
}

export default function RightPanel({
  groupData,
  currentUserRole,
  currentUserId,
  hiddenEventIds,
  onAddResource,
  onUploadResourceFile,
  onUpdateResource,
  onDeleteResource,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onJoinEventCall,
  onUpdateRole,
  onKickMember
}) {
  const [resourceMode, setResourceMode] = useState("link");
  const [resourceFile, setResourceFile] = useState(null);
  const [resourceForm, setResourceForm] = useState({
    title: "",
    url: "",
    type: "link",
    topicId: "",
    linkedDoubtId: ""
  });

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: "",
    time: ""
  });
  const [editingEventId, setEditingEventId] = useState("");
  const [editingEvent, setEditingEvent] = useState({
    title: "",
    description: "",
    date: "",
    time: ""
  });

  const group = groupData?.group || null;
  const resources = Array.isArray(groupData?.resources) ? groupData.resources : [];
  const events = Array.isArray(groupData?.events) ? groupData.events : [];
  const members = Array.isArray(groupData?.members) ? groupData.members : [];
  const topics = Array.isArray(groupData?.topics) ? groupData.topics : [];
  const messages = Array.isArray(groupData?.messages) ? groupData.messages : [];
  const weeklySummary = groupData?.weeklySummary || {
    totalMessages: 0,
    activeMembers: 0,
    doubtsResolved: 0,
    doubtsRaised: 0,
    resourcesShared: 0,
    upcomingDeadlines: 0,
    overdueDeadlines: 0
  };

  const activeDoubts = messages.filter((message) => message.category === "doubt");
  const visibleEvents = events.filter((event) => !hiddenEventIds.has(event._id));

  if (!groupData || !group) {
    return (
      <aside className="panel right-panel empty-state">
        <h2>Insights</h2>
        <p className="muted">Resources, calendar, and weekly activity will appear here.</p>
      </aside>
    );
  }

  async function submitResource(event) {
    event.preventDefault();
    if (!resourceForm.title) return;

    if (resourceMode === "file") {
      if (!resourceFile) return;
      await onUploadResourceFile({
        title: resourceForm.title,
        type: resourceForm.type || "file",
        topicId: resourceForm.topicId || null,
        linkedDoubtId: resourceForm.linkedDoubtId || null,
        file: resourceFile
      });
      setResourceFile(null);
    } else {
      if (!resourceForm.url) return;
      await onAddResource({
        ...resourceForm,
        topicId: resourceForm.topicId || null,
        linkedDoubtId: resourceForm.linkedDoubtId || null
      });
    }

    setResourceForm({
      title: "",
      url: "",
      type: "link",
      topicId: "",
      linkedDoubtId: ""
    });
  }

  function startEventEdit(eventItem) {
    const parts = toDateTimeParts(eventItem.dueAt);
    setEditingEventId(eventItem._id);
    setEditingEvent({
      title: eventItem.title,
      description: eventItem.description || "",
      date: parts.localDate,
      time: parts.localTime
    });
  }

  async function submitEvent(event) {
    event.preventDefault();
    if (!eventForm.title || !eventForm.date || !eventForm.time) return;
    await onAddEvent({
      title: eventForm.title,
      description: eventForm.description,
      dueAt: new Date(`${eventForm.date}T${eventForm.time}`).toISOString()
    });
    setEventForm({
      title: "",
      description: "",
      date: "",
      time: ""
    });
  }

  return (
    <aside className="panel right-panel">
      <div className="panel-head">
        <div>
          <h2>Group Ops</h2>
          {currentUserRole === "admin" && (
            <p className="muted">Join code: {group.joinCode}</p>
          )}
        </div>
      </div>

      <section className="summary-grid">
        <article>
          <h4>Messages</h4>
          <strong>{weeklySummary.totalMessages}</strong>
        </article>
        <article>
          <h4>Active</h4>
          <strong>{weeklySummary.activeMembers}</strong>
        </article>
        <article>
          <h4>Doubts</h4>
          <strong>
            {weeklySummary.doubtsResolved}/{weeklySummary.doubtsRaised}
          </strong>
        </article>
        <article>
          <h4>Resources</h4>
          <strong>{weeklySummary.resourcesShared}</strong>
        </article>
        <article>
          <h4>Due Soon</h4>
          <strong>{weeklySummary.upcomingDeadlines || 0}</strong>
        </article>
        <article>
          <h4>Overdue</h4>
          <strong>{weeklySummary.overdueDeadlines || 0}</strong>
        </article>
      </section>

      <section className="section-card">
        <h3>Members</h3>
        <div className="member-list">
          {members.map((member) => (
            <div key={member._id} className="member-row">
              <div>
                <strong>{member.user?.name || "Member"}</strong>
                <small className="muted">{member.user?.email}</small>
              </div>
              {currentUserRole === "admin" && member.userId !== currentUserId ? (
                <div className="member-admin-actions">
                  <select
                    value={member.role}
                    onChange={(event) => onUpdateRole(member.userId, event.target.value)}
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                  </select>
                  {group.createdBy !== member.userId && (
                    <button
                      type="button"
                      className="inline-link kick-btn"
                      onClick={() => onKickMember(member.userId)}
                    >
                      Kick
                    </button>
                  )}
                </div>
              ) : (
                <span className="pill">{member.role}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="section-card">
        <h3>Resource Upload</h3>
        <p className="muted section-note">Uploaded resources appear in the middle Resources Table.</p>
        <form className="mini-form" onSubmit={submitResource}>
          <div className="resource-mode-toggle">
            <button
              type="button"
              className={resourceMode === "link" ? "secondary-btn" : "inline-link"}
              onClick={() => {
                setResourceMode("link");
                setResourceForm((prev) => ({
                  ...prev,
                  type: prev.type === "file" ? "link" : prev.type
                }));
              }}
            >
              Add Link
            </button>
            <button
              type="button"
              className={resourceMode === "file" ? "secondary-btn" : "inline-link"}
              onClick={() => {
                setResourceMode("file");
                setResourceForm((prev) => ({
                  ...prev,
                  type: prev.type === "link" ? "file" : prev.type
                }));
              }}
            >
              Upload File
            </button>
          </div>

          <input
            placeholder="Resource title"
            value={resourceForm.title}
            onChange={(event) =>
              setResourceForm((prev) => ({ ...prev, title: event.target.value }))
            }
            required
          />

          {resourceMode === "link" ? (
            <input
              placeholder="https://..."
              value={resourceForm.url}
              onChange={(event) =>
                setResourceForm((prev) => ({ ...prev, url: event.target.value }))
              }
              required
            />
          ) : (
            <input
              type="file"
              onChange={(event) => setResourceFile(event.target.files?.[0] || null)}
              required
            />
          )}

          <div className="double-input">
            <select
              value={resourceForm.type}
              onChange={(event) =>
                setResourceForm((prev) => ({ ...prev, type: event.target.value }))
              }
            >
              <option value="link">link</option>
              <option value="pdf">pdf</option>
              <option value="video">video</option>
              <option value="notes">notes</option>
              <option value="file">file</option>
            </select>
            <select
              value={resourceForm.topicId}
              onChange={(event) =>
                setResourceForm((prev) => ({ ...prev, topicId: event.target.value }))
              }
            >
              <option value="">All topics</option>
              {topics.map((topic) => (
                <option key={topic._id} value={topic._id}>
                  {topic.title}
                </option>
              ))}
            </select>
          </div>

          <select
            value={resourceForm.linkedDoubtId}
            onChange={(event) =>
              setResourceForm((prev) => ({ ...prev, linkedDoubtId: event.target.value }))
            }
          >
            <option value="">Tag to doubt (optional)</option>
            {activeDoubts.map((doubt) => (
              <option key={doubt._id} value={doubt._id}>
                {doubt.content.slice(0, 55)}
              </option>
            ))}
          </select>

          <button type="submit" className="secondary-btn">
            Upload Resource
          </button>
        </form>
      </section>

      <section className="section-card">
        <h3>Calendar & Deadlines</h3>
        {currentUserRole === "admin" && (
          <form className="mini-form event-form" onSubmit={submitEvent}>
            <input
              placeholder="Event title"
              value={eventForm.title}
              onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
            <input
              placeholder="Description"
              value={eventForm.description}
              onChange={(event) =>
                setEventForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
            <div className="double-input event-form-row">
              <input
                type="date"
                value={eventForm.date}
                onChange={(event) => setEventForm((prev) => ({ ...prev, date: event.target.value }))}
                required
              />
              <input
                type="time"
                value={eventForm.time}
                onChange={(event) => setEventForm((prev) => ({ ...prev, time: event.target.value }))}
                required
              />
            </div>
            <button type="submit" className="ghost-btn event-form-submit">
              Add Event
            </button>
          </form>
        )}

        <div className="event-list">
          {visibleEvents.map((event) => {
            const dueNow = new Date(event.dueAt).getTime() <= Date.now();
            return (
              <article key={event._id} className="event-item">
                {editingEventId === event._id ? (
                  <div className="edit-row">
                    <input
                      value={editingEvent.title}
                      onChange={(item) =>
                        setEditingEvent((prev) => ({ ...prev, title: item.target.value }))
                      }
                    />
                    <input
                      value={editingEvent.description}
                      onChange={(item) =>
                        setEditingEvent((prev) => ({ ...prev, description: item.target.value }))
                      }
                    />
                    <div className="double-input">
                      <input
                        type="date"
                        value={editingEvent.date}
                        onChange={(item) =>
                          setEditingEvent((prev) => ({ ...prev, date: item.target.value }))
                        }
                      />
                      <input
                        type="time"
                        value={editingEvent.time}
                        onChange={(item) =>
                          setEditingEvent((prev) => ({ ...prev, time: item.target.value }))
                        }
                      />
                    </div>
                    <div className="resource-actions">
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={async () => {
                          await onUpdateEvent(event._id, {
                            title: editingEvent.title,
                            description: editingEvent.description,
                            dueAt: new Date(
                              `${editingEvent.date}T${editingEvent.time}`
                            ).toISOString()
                          });
                          setEditingEventId("");
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="inline-link"
                        onClick={() => setEditingEventId("")}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <strong>{event.title}</strong>
                    <small>{formatDate(event.dueAt)}</small>
                    {event.description && <p>{event.description}</p>}
                    <div className="resource-actions">
                      {dueNow && (
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => onJoinEventCall(event)}
                        >
                          Join Audio Call
                        </button>
                      )}
                      {currentUserRole === "admin" && (
                        <>
                          <button
                            type="button"
                            className="inline-link"
                            onClick={() => startEventEdit(event)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="inline-link"
                            onClick={() => onDeleteEvent(event._id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </article>
            );
          })}
          {!visibleEvents.length && (
            <p className="muted">No upcoming events yet. Add one to activate deadline radar.</p>
          )}
        </div>
      </section>
    </aside>
  );
}
