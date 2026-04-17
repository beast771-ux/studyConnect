import { useMemo, useState } from "react";

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
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
  onUpdateResource,
  onDeleteResource,
  onStartCall,
  onEndCall,
  onJoinCall,
  hiddenEventIds,
  currentUser,
  currentUserRole
}) {
  const [newTopic, setNewTopic] = useState("");
  const [category, setCategory] = useState("general");
  const [content, setContent] = useState("");
  const [replyToDoubtId, setReplyToDoubtId] = useState("");
  const [pinBusyId, setPinBusyId] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [editingResourceId, setEditingResourceId] = useState("");
  const [editingResourceTitle, setEditingResourceTitle] = useState("");

  const group = groupData?.group || null;
  const topics = Array.isArray(groupData?.topics) ? groupData.topics : [];
  const messages = Array.isArray(groupData?.messages) ? groupData.messages : [];
  const events = Array.isArray(groupData?.events) ? groupData.events : [];
  const resources = Array.isArray(groupData?.resources) ? groupData.resources : [];
  const selectedTopic = topics.find((topic) => topic._id === selectedTopicId) || topics[0];
  const activeTopicId = selectedTopic?._id || "";
  const isResourcesTopic = selectedTopic?.title?.toLowerCase() === "resources table";

  const topicMessages = useMemo(
    () => messages.filter((message) => message.topicId === activeTopicId),
    [messages, activeTopicId]
  );
  const allDoubtsForTopic = topicMessages.filter((message) => message.category === "doubt");
  const unresolvedDoubts = allDoubtsForTopic.filter((message) => !message.verifiedSolutionId);
  const pinnedMessages = topicMessages.filter((message) => message.pinned);
  const resourceRows = useMemo(
    () =>
      [...resources].sort(
        (first, second) => new Date(second.createdAt) - new Date(first.createdAt)
      ),
    [resources]
  );
  const topicTitles = useMemo(
    () => new Map(topics.map((topic) => [topic._id, topic.title])),
    [topics]
  );

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

  if (!groupData || !group) {
    return (
      <main className="panel chat-panel empty-state">
        <h2>Select a group</h2>
        <p className="muted">Choose a group from the left panel to open topics and chat.</p>
      </main>
    );
  }

  const activeCall = group.activeCall;

  return (
    <main className="panel chat-panel">
      <div className="chat-toolbar">
        <div className="chat-toolbar-title">
          <h2>{group.name}</h2>
          <p className="muted chat-toolbar-description">
            {group.description || "No description yet"}
          </p>
        </div>

        <div className="chat-toolbar-center">
          <div className="topic-tabs chat-toolbar-tabs">
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

          <form className="inline-topic-form chat-toolbar-form" onSubmit={submitTopic}>
            <input
              value={newTopic}
              onChange={(event) => setNewTopic(event.target.value)}
              placeholder="New topic"
            />
            <button type="submit">Add</button>
          </form>
        </div>

        <div className="header-actions chat-toolbar-actions">
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

      {pinnedMessages.length > 0 && (
        <div className="pinned-strip chat-banner-stack">
          {pinnedMessages.slice(0, 3).map((message) => (
            <div key={message._id} className="pin-item">
              <span>PIN</span>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
      )}

      {(upcomingDeadlines.length > 0 || overdueDeadlines.length > 0) && (
        <div className="deadline-strip chat-banner-stack">
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
        {isResourcesTopic ? (
          <div className="resources-board">
            <div className="resources-board-head">
              <div>
                <h3>Resources Table</h3>
                <p className="muted">All uploaded resources live here.</p>
              </div>
              <span className="pill">{resourceRows.length} items</span>
            </div>

            <div className="resources-board-list">
              {resourceRows.map((resource) => {
                const canManage =
                  currentUserRole === "admin" || resource.uploadedBy === currentUser?._id;
                const topicName = resource.topicId
                  ? topicTitles.get(resource.topicId) || "Archived topic"
                  : "All topics";

                return (
                  <article key={resource._id} className="resource-board-card">
                    <div className="resource-row-top">
                      <a href={resource.url} target="_blank" rel="noreferrer">
                        {resource.title}
                      </a>
                      <span className="resource-chip">{topicName}</span>
                    </div>
                    <small>
                      {resource.resourceKind === "file"
                        ? `${resource.fileName || "file"} (${formatBytes(resource.fileSize)})`
                        : resource.type}
                      {resource.linkedDoubtId ? " | tagged to doubt" : ""}
                      {resource.createdAt ? ` | added ${formatDate(resource.createdAt)}` : ""}
                    </small>
                    {canManage && (
                      <div className="resource-actions">
                        <button
                          type="button"
                          className="inline-link"
                          onClick={() => {
                            setEditingResourceId(resource._id);
                            setEditingResourceTitle(resource.title);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="inline-link"
                          onClick={() => onDeleteResource(resource._id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                    {editingResourceId === resource._id && (
                      <div className="edit-row">
                        <input
                          value={editingResourceTitle}
                          onChange={(event) => setEditingResourceTitle(event.target.value)}
                        />
                        <div className="resource-actions">
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={async () => {
                              await onUpdateResource(resource._id, {
                                title: editingResourceTitle
                              });
                              setEditingResourceId("");
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="inline-link"
                            onClick={() => setEditingResourceId("")}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
              {!resourceRows.length && (
                <p className="muted">No resources uploaded yet. Use the right panel to upload.</p>
              )}
            </div>
          </div>
        ) : (
          <>
            {topicMessages.map((message) => {
              const isOwnMessage = message.authorId === currentUser?._id;
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
                <article
                  key={message._id}
                  className={`message-row ${isOwnMessage ? "own" : "incoming"}`}
                >
                  {!isOwnMessage && (
                    <div className="message-avatar" aria-hidden="true">
                      {message.author?.avatarUrl ? (
                        <img
                          src={message.author.avatarUrl}
                          alt=""
                          className="message-avatar-image"
                        />
                      ) : (
                        <span>{(message.author?.name || "U").slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                  )}

                  <div
                    className={`message-card ${message.category} ${isOwnMessage ? "own" : "incoming"}`}
                  >
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
                      <p className="message-body">{message.content}</p>
                    )}

                    {message.parentMessageId && (
                      <small className="muted">
                        Linked doubt #{message.parentMessageId.slice(0, 6)}
                      </small>
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
                  </div>
                </article>
              );
            })}
            {!topicMessages.length && (
              <p className="muted">
                No messages yet in {selectedTopic?.title || "this topic"}. Start with a doubt or
                announcement.
              </p>
            )}
          </>
        )}
      </section>

      {!isResourcesTopic && (
        <form className="composer" onSubmit={submitMessage}>
          <div className="composer-shell">
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="general">General</option>
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
            <input
              type="text"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write your message..."
              className="composer-inline-input"
              required
            />
            <button type="submit" className="primary-btn composer-send-btn">
              Send
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
