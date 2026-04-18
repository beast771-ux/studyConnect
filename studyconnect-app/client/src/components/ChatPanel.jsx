import { useEffect, useMemo, useRef, useState } from "react";

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

function excerpt(text, maxLength = 90) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
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
  const [replyToMessageId, setReplyToMessageId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [pinBusyId, setPinBusyId] = useState("");
  const [pendingScrollMessageId, setPendingScrollMessageId] = useState("");
  const [highlightedMessageId, setHighlightedMessageId] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [editingResourceId, setEditingResourceId] = useState("");
  const [editingResourceTitle, setEditingResourceTitle] = useState("");
  const messageElementRefs = useRef(new Map());
  const highlightTimeoutRef = useRef(null);

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
  const messageLookup = useMemo(
    () => new Map(messages.map((message) => [message._id, message])),
    [messages]
  );
  const normalizedSearchText = searchText.trim().toLowerCase();
  const filteredTopicMessages = useMemo(() => {
    if (!normalizedSearchText) return topicMessages;

    return topicMessages.filter((message) =>
      [message.content, message.author?.name, message.category].some((value) =>
        (value || "").toLowerCase().includes(normalizedSearchText)
      )
    );
  }, [topicMessages, normalizedSearchText]);
  const filteredResourceRows = useMemo(() => {
    if (!normalizedSearchText) return resourceRows;

    return resourceRows.filter((resource) => {
      const linkedDoubt = resource.linkedDoubtId
        ? messageLookup.get(resource.linkedDoubtId)
        : null;
      const topicName = resource.topicId
        ? topicTitles.get(resource.topicId) || "Archived topic"
        : "All topics";

      return [
        resource.title,
        resource.url,
        resource.type,
        topicName,
        linkedDoubt?.content
      ].some((value) => (value || "").toLowerCase().includes(normalizedSearchText));
    });
  }, [resourceRows, normalizedSearchText, messageLookup, topicTitles]);
  const replyTarget = replyToMessageId ? messageLookup.get(replyToMessageId) || null : null;
  const visibleItemCount = isResourcesTopic
    ? filteredResourceRows.length
    : filteredTopicMessages.length;
  const totalItemCount = isResourcesTopic ? resourceRows.length : topicMessages.length;

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

  useEffect(() => {
    setSearchText("");
    setReplyToMessageId("");
    setEditingMessageId("");
    setEditingContent("");
  }, [activeTopicId]);

  useEffect(() => {
    if (replyToMessageId && !messageLookup.has(replyToMessageId)) {
      setReplyToMessageId("");
    }
  }, [replyToMessageId, messageLookup]);

  useEffect(() => {
    if (!pendingScrollMessageId) return;

    const targetMessage = messageLookup.get(pendingScrollMessageId);
    const targetElement = messageElementRefs.current.get(pendingScrollMessageId);
    if (!targetMessage) {
      setPendingScrollMessageId("");
      return;
    }
    if (targetMessage.topicId !== activeTopicId || !targetElement) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(pendingScrollMessageId);
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightedMessageId("");
        highlightTimeoutRef.current = null;
      }, 2200);
      setPendingScrollMessageId("");
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [pendingScrollMessageId, messageLookup, activeTopicId, filteredTopicMessages]);

  useEffect(
    () => () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    },
    []
  );

  function setMessageElementRef(messageId, node) {
    if (node) {
      messageElementRefs.current.set(messageId, node);
      return;
    }
    messageElementRefs.current.delete(messageId);
  }

  function jumpToMessage(messageId) {
    const targetMessage = messageLookup.get(messageId);
    if (!targetMessage) return;

    setPendingScrollMessageId(messageId);

    if (targetMessage.topicId !== activeTopicId) {
      onSelectTopic(targetMessage.topicId);
      return;
    }

    const targetIsVisible = filteredTopicMessages.some((message) => message._id === messageId);
    if (!targetIsVisible && normalizedSearchText) {
      setSearchText("");
    }
  }

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
      parentMessageId: replyToMessageId || null
    });
    setContent("");
    setReplyToMessageId("");
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

  function startReply(message) {
    setReplyToMessageId(message._id);
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

      <section className="messages-toolbar">
        <div className="messages-search">
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={isResourcesTopic ? "Search resources" : "Search text in this topic"}
          />
          {searchText && (
            <button
              type="button"
              className="inline-link"
              onClick={() => setSearchText("")}
            >
              Clear
            </button>
          )}
        </div>
        <span className="pill">
          {visibleItemCount}/{totalItemCount} shown
        </span>
      </section>

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
              {filteredResourceRows.map((resource) => {
                const canManage =
                  currentUserRole === "admin" || resource.uploadedBy === currentUser?._id;
                const topicName = resource.topicId
                  ? topicTitles.get(resource.topicId) || "Archived topic"
                  : "All topics";
                const linkedDoubt = resource.linkedDoubtId
                  ? messageLookup.get(resource.linkedDoubtId) || null
                  : null;

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
                      {resource.createdAt ? ` | added ${formatDate(resource.createdAt)}` : ""}
                    </small>
                    {linkedDoubt && (
                      <button
                        type="button"
                        className="message-reference message-reference-link resource-reference"
                        onClick={() => jumpToMessage(linkedDoubt._id)}
                        title="Jump to tagged doubt"
                      >
                        <span>
                          Tagged doubt from {linkedDoubt.author?.name || "Unknown"}
                        </span>
                        <p>{linkedDoubt.content}</p>
                      </button>
                    )}
                    {resource.linkedDoubtId && !linkedDoubt && (
                      <div className="message-reference missing">
                        <span>Tagged doubt unavailable</span>
                      </div>
                    )}
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
              {!filteredResourceRows.length && (
                <p className="muted">
                  {resourceRows.length
                    ? "No resources match your search."
                    : "No resources uploaded yet. Use the right panel to upload."}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {filteredTopicMessages.map((message) => {
              const isOwnMessage = message.authorId === currentUser?._id;
              const canEdit = message.authorId === currentUser?._id;
              const canManageMessage = currentUserRole === "admin" || isOwnMessage;
              const verifiedSolution = message.verifiedSolutionId
                ? messageLookup.get(message.verifiedSolutionId) || null
                : null;
              const parentMessage = message.parentMessageId
                ? messageLookup.get(message.parentMessageId) || null
                : null;

              const parentDoubt =
                message.category === "solution" && message.parentMessageId
                  ? parentMessage?.category === "doubt"
                    ? parentMessage
                    : null
                  : null;
              const canVerifyThisSolution =
                parentDoubt &&
                parentDoubt.authorId === currentUser?._id &&
                !parentDoubt.verifiedSolutionId;

              return (
                <article
                  key={message._id}
                  className={`message-row ${isOwnMessage ? "own" : "incoming"}`}
                  ref={(node) => setMessageElementRef(message._id, node)}
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
                    className={`message-card ${message.category} ${isOwnMessage ? "own" : "incoming"} ${
                      highlightedMessageId === message._id ? "jump-highlight" : ""
                    }`}
                  >
                    <header>
                      <div className="meta">
                        <span className="category">{message.category}</span>
                        <strong>{message.author?.name || "Unknown"}</strong>
                        <small>{formatDate(message.createdAt)}</small>
                      </div>
                      <div className="message-actions">
                        <button
                          type="button"
                          className="inline-link"
                          onClick={() => startReply(message)}
                        >
                          {"Reply <-"}
                        </button>
                        {canManageMessage && (
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
                          <button
                            type="button"
                            className="inline-link"
                            onClick={() => startEditing(message)}
                          >
                            Edit
                          </button>
                        )}
                        {canManageMessage && (
                          <button
                            type="button"
                            className="inline-link"
                            onClick={() => onDeleteMessage(message._id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </header>

                    {parentMessage && (
                      <button
                        type="button"
                        className="message-reference message-reference-link"
                        onClick={() => jumpToMessage(parentMessage._id)}
                        title="Jump to original message"
                      >
                        <span>
                          Replying to {parentMessage.author?.name || "Unknown"} |{" "}
                          {parentMessage.category}
                        </span>
                        <p>{parentMessage.content}</p>
                      </button>
                    )}
                    {message.parentMessageId && !parentMessage && (
                      <div className="message-reference missing">
                        <span>Original message unavailable</span>
                      </div>
                    )}

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
            {!filteredTopicMessages.length && (
              <p className="muted">
                {topicMessages.length
                  ? "No messages match your search."
                  : `No messages yet in ${
                      selectedTopic?.title || "this topic"
                    }. Start with a doubt or announcement.`}
              </p>
            )}
          </>
        )}
      </section>

      {!isResourcesTopic && (
        <div className="composer">
          {replyTarget && (
            <div className="composer-reply-preview">
              <div>
                <span>
                  Replying to {replyTarget.author?.name || "Unknown"} | {replyTarget.category}
                </span>
                <p>{excerpt(replyTarget.content, 140)}</p>
              </div>
              <button
                type="button"
                className="inline-link"
                onClick={() => setReplyToMessageId("")}
              >
                Cancel reply
              </button>
            </div>
          )}

          <form className="composer-shell" onSubmit={submitMessage}>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="general">General</option>
              <option value="doubt">Doubt</option>
              <option value="solution">Solution</option>
              <option value="resource">Resource</option>
              <option value="announcement">Announcement</option>
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
          </form>
        </div>
      )}
    </main>
  );
}
