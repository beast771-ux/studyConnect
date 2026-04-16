import { useMemo, useState } from "react";

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function ChatPanel({
  groupData,
  selectedTopicId,
  onSelectTopic,
  onCreateTopic,
  onSendMessage,
  onVerifySolution,
  onPinMessage,
  onUpdateMessage,
  onDeleteMessage,
  onStartCall,
  onEndCall,
  onJoinCall,
  hiddenEventIds,
  currentUser,
  currentUserRole
}) {
  const [newTopic, setNewTopic] = useState("");
  const [category, setCategory] = useState("doubt");
  const [content, setContent] = useState("");
  const [replyToDoubtId, setReplyToDoubtId] = useState("");
  const [pinBusyId, setPinBusyId] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editingContent, setEditingContent] = useState("");

  const topics = groupData?.topics || [];
  const messages = groupData?.messages || [];
  const events = groupData?.events || [];
  const selectedTopic = topics.find((topic) => topic._id === selectedTopicId) || topics[0];
  const activeTopicId = selectedTopic?._id || "";

  const topicMessages = useMemo(
    () => messages.filter((message) => message.topicId === activeTopicId),
    [messages, activeTopicId]
  );
  const allDoubtsForTopic = topicMessages.filter((message) => message.category === "doubt");
  const unresolvedDoubts = allDoubtsForTopic.filter((message) => !message.verifiedSolutionId);
  const pinnedMessages = topicMessages.filter((message) => message.pinned);

  const upcomingDeadlines = events
    .filter(
      (event) =>
        !hiddenEventIds.has(event._id) && new Date(event.dueAt).getTime() >= Date.now()
    )
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
    .slice(0, 3);
  const overdueDeadlines = events
    .filter(
      (event) =>
        !hiddenEventIds.has(event._id) && new Date(event.dueAt).getTime() < Date.now()
    )
    .sort((a, b) => new Date(b.dueAt) - new Date(a.dueAt))
    .slice(0, 2);

  async function submitTopic(event) {
    event.preventDefault();
    if (!newTopic.trim()) return;
    await onCreateTopic({ title: newTopic.trim() });
    setNewTopic("");
  }

  async function submitMessage(event) {
    event.preventDefault();
    if (!content.trim() || !activeTopicId) return;
    await onSendMessage({
      topicId: activeTopicId,
      category,
      content: content.trim(),
      parentMessageId: replyToDoubtId || null
    });
    setContent("");
  }

  async function togglePin(message) {
    setPinBusyId(message._id);
    await onPinMessage(message._id, !message.pinned);
    setPinBusyId("");
  }

  function startEditing(message) {
    setEditingMessageId(message._id);
    setEditingContent(message.content);
  }

  async function saveEdit(messageId) {
    if (!editingContent.trim()) return;
    await onUpdateMessage(messageId, editingContent.trim());
    setEditingMessageId("");
    setEditingContent("");
  }

  if (!groupData) {
    return (
      <main className="panel chat-panel empty-state">
        <h2>Select a group</h2>
        <p className="muted">Choose a group from the left panel to open topics and chat.</p>
      </main>
    );
  }

  const activeCall = groupData.group.activeCall;

  return (
    <main className="panel chat-panel">
      <div className="panel-head">
        <div>
          <h2>{groupData.group.name}</h2>
          <p className="muted">{groupData.group.description || "No description yet"}</p>
        </div>
        <div className="header-actions">
          {activeCall ? (
            <>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => onJoinCall(activeCall.roomUrl)}
              >
                Join Call
              </button>
              {currentUserRole === "admin" && (
                <button type="button" className="ghost-btn" onClick={onEndCall}>
                  End Call
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              className="ghost-btn"
              onClick={() => onStartCall(activeTopicId)}
              disabled={!activeTopicId}
            >
              Start Audio Call
            </button>
          )}
          <span className="pill">{groupData.currentUserRole}</span>
        </div>
      </div>

      <div className="topics-row">
        <div className="topic-tabs">
          {topics.map((topic) => (
            <button
              key={topic._id}
              className={activeTopicId === topic._id ? "topic-tab active" : "topic-tab"}
              onClick={() => onSelectTopic(topic._id)}
              type="button"
            >
              {topic.title}
            </button>
          ))}
        </div>
        <form className="inline-topic-form" onSubmit={submitTopic}>
          <input
            value={newTopic}
            onChange={(event) => setNewTopic(event.target.value)}
            placeholder="New topic"
          />
          <button type="submit">Add</button>
        </form>
      </div>

      {pinnedMessages.length > 0 && (
        <div className="pinned-strip">
          {pinnedMessages.slice(0, 3).map((message) => (
            <div key={message._id} className="pin-item">
              <span>PIN</span>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
      )}

      {(upcomingDeadlines.length > 0 || overdueDeadlines.length > 0) && (
        <div className="deadline-strip">
          {upcomingDeadlines.map((event) => (
            <div key={event._id} className="deadline-item">
              <span>UPCOMING</span>
              <strong>{event.title}</strong>
              <small>{formatDate(event.dueAt)}</small>
            </div>
          ))}
          {overdueDeadlines.map((event) => (
            <div key={event._id} className="deadline-item overdue">
              <span>OVERDUE</span>
              <strong>{event.title}</strong>
              <small>{formatDate(event.dueAt)}</small>
            </div>
          ))}
        </div>
      )}

      <section className="messages-list">
        {topicMessages.map((message) => {
          const canEdit = currentUserRole === "admin" || message.authorId === currentUser?._id;
          const verifiedSolution = message.verifiedSolutionId
            ? topicMessages.find((item) => item._id === message.verifiedSolutionId)
            : null;

          const parentDoubt =
            message.category === "solution" && message.parentMessageId
              ? topicMessages.find(
                  (item) =>
                    item._id === message.parentMessageId && item.category === "doubt"
                ) || null
              : null;
          const canVerifyThisSolution =
            parentDoubt &&
            parentDoubt.authorId === currentUser?._id &&
            !parentDoubt.verifiedSolutionId;

          return (
            <article key={message._id} className={`message-card ${message.category}`}>
              <header>
                <div className="meta">
                  <span className="category">{message.category}</span>
                  <strong>{message.author?.name || "Unknown"}</strong>
                  <small>{formatDate(message.createdAt)}</small>
                </div>
                <div className="message-actions">
                  {currentUserRole === "admin" && (
                    <button
                      type="button"
                      className="inline-link"
                      disabled={pinBusyId === message._id}
                      onClick={() => togglePin(message)}
                    >
                      {message.pinned ? "Unpin" : "Pin"}
                    </button>
                  )}
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        className="inline-link"
                        onClick={() => startEditing(message)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="inline-link"
                        onClick={() => onDeleteMessage(message._id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </header>

              {editingMessageId === message._id ? (
                <div className="edit-row">
                  <textarea
                    rows={3}
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                  />
                  <div className="resolve-row">
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => saveEdit(message._id)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="inline-link"
                      onClick={() => setEditingMessageId("")}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p>{message.content}</p>
              )}

              {message.parentMessageId && (
                <small className="muted">Linked doubt #{message.parentMessageId.slice(0, 6)}</small>
              )}

              {verifiedSolution && (
                <div className="accepted-answer">
                  <span>Verified solution</span>
                  <p>{verifiedSolution.content}</p>
                </div>
              )}

              {canVerifyThisSolution && (
                <label className="verify-box">
                  <input
                    type="checkbox"
                    onChange={() => onVerifySolution(parentDoubt._id, message._id)}
                  />
                  Verify solution (irreversible)
                </label>
              )}
            </article>
          );
        })}
        {!topicMessages.length && (
          <p className="muted">
            No messages yet in {selectedTopic?.title || "this topic"}. Start with a doubt or
            announcement.
          </p>
        )}
      </section>

      <form className="composer" onSubmit={submitMessage}>
        <div className="composer-row">
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="doubt">Doubt</option>
            <option value="solution">Solution</option>
            <option value="resource">Resource</option>
            <option value="announcement">Announcement</option>
          </select>

          <select
            value={replyToDoubtId}
            onChange={(event) => setReplyToDoubtId(event.target.value)}
            disabled={category !== "solution" || !allDoubtsForTopic.length}
          >
            <option value="">No doubt mapping</option>
            {allDoubtsForTopic.map((doubt) => (
              <option key={doubt._id} value={doubt._id}>
                {doubt.content.slice(0, 45)}
              </option>
            ))}
          </select>
        </div>
        <textarea
          rows={3}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write your message..."
          required
        />
        <button type="submit" className="primary-btn">
          Send Message
        </button>
      </form>
    </main>
  );
}
