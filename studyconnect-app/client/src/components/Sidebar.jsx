import { useState } from "react";

export default function Sidebar({
  groups,
  selectedGroup,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  onJoinGroup,
  onLeaveGroup,
  onDeleteGroup,
  loading
}) {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");

  async function handleCreate(event) {
    event.preventDefault();
    if (!groupName.trim()) return;
    await onCreateGroup({
      name: groupName,
      description: groupDescription
    });
    setGroupName("");
    setGroupDescription("");
  }

  async function handleJoin(event) {
    event.preventDefault();
    if (!joinCode.trim()) return;
    await onJoinGroup({ joinCode: joinCode.trim().toUpperCase() });
    setJoinCode("");
  }

  return (
    <aside className="panel sidebar-panel">
      <div className="panel-head">
        <h2>Groups</h2>
        <span>{groups.length}</span>
      </div>

      <div className="group-list">
        {groups.map((group) => (
          <button
            key={group._id}
            type="button"
            className={`group-item ${selectedGroupId === group._id ? "selected" : ""}`}
            onClick={() => onSelectGroup(group._id)}
          >
            <strong>{group.name}</strong>
            <small>
              {group.role} | {group.memberCount} members | {group.unresolvedDoubts} unresolved
            </small>
          </button>
        ))}
        {!groups.length && !loading && (
          <p className="muted">No groups yet. Create one to start collaborating.</p>
        )}
      </div>

      <form className="mini-form" onSubmit={handleCreate}>
        <h3>Create Group</h3>
        <input
          value={groupName}
          onChange={(event) => setGroupName(event.target.value)}
          placeholder="Group name"
          required
        />
        <input
          value={groupDescription}
          onChange={(event) => setGroupDescription(event.target.value)}
          placeholder="Description"
        />
        <button className="secondary-btn" type="submit">
          Create
        </button>
      </form>

      <form className="mini-form" onSubmit={handleJoin}>
        <h3>Join Group</h3>
        <input
          value={joinCode}
          onChange={(event) => setJoinCode(event.target.value)}
          placeholder="Join code"
          required
        />
        <button className="ghost-btn" type="submit">
          Join
        </button>
      </form>

      {selectedGroup && (
        <div className="mini-form">
          <h3>Group Actions</h3>
          <button
            type="button"
            className="inline-link"
            onClick={() => onLeaveGroup(selectedGroup._id)}
            disabled={selectedGroup.isDefaultAdmin}
          >
            Leave Group
          </button>
          {selectedGroup.role === "admin" && (
            <button
              type="button"
              className="ghost-btn"
              onClick={() => onDeleteGroup(selectedGroup._id)}
            >
              Delete Group
            </button>
          )}
          {selectedGroup.isDefaultAdmin && (
            <small className="muted">Default admin cannot leave this group.</small>
          )}
        </div>
      )}
    </aside>
  );
}
