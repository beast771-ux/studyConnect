import { useEffect, useMemo, useRef, useState } from "react";
import AuthScreen from "./components/AuthScreen";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";
import RightPanel from "./components/RightPanel";
import ProfileDrawer from "./components/ProfileDrawer";
import { api } from "./lib/api";
import { createSocket } from "./lib/socket";

const TOKEN_KEY = "studyconnect_token";

function hiddenEventsStorageKey(userId, groupId) {
  return `studyconnect_hidden_events_${userId}_${groupId}`;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [groupData, setGroupData] = useState(null);
  const [hiddenEventIds, setHiddenEventIds] = useState(new Set());

  const [authLoading, setAuthLoading] = useState(false);
  const [appLoading, setAppLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [error, setError] = useState("");

  const socketRef = useRef(null);

  const selectedGroup = useMemo(
    () => groups.find((group) => group._id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  async function refreshGroups(preferredGroupId = "") {
    if (!token) return;
    const response = await api.listGroups(token);
    setGroups(response.groups);

    let nextGroupId = preferredGroupId;
    const exists = response.groups.some((group) => group._id === nextGroupId);
    if (!exists) {
      nextGroupId = response.groups[0]?._id || "";
    }
    setSelectedGroupId(nextGroupId);

    if (!nextGroupId) {
      setGroupData(null);
      setSelectedTopicId("");
      return;
    }
    await refreshGroup(nextGroupId);
  }

  async function refreshGroup(groupId = selectedGroupId) {
    if (!token || !groupId) return;
    const data = await api.getGroup(token, groupId);
    setGroupData(data);
    setSelectedTopicId((currentTopicId) => {
      const exists = data.topics.some((topic) => topic._id === currentTopicId);
      if (exists) return currentTopicId;
      return data.topics[0]?._id || "";
    });
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    setGroups([]);
    setSelectedGroupId("");
    setSelectedTopicId("");
    setGroupData(null);
    setHiddenEventIds(new Set());
    setProfileOpen(false);
    setError("");
  }

  async function handleAuth(mode, payload) {
    setAuthLoading(true);
    setError("");
    try {
      const response = mode === "register" ? await api.register(payload) : await api.login(payload);
      localStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      setUser(response.user);
    } catch (authError) {
      setError(authError.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleResetPassword(payload) {
    setAuthLoading(true);
    setError("");
    try {
      const result = await api.resetPassword(payload);
      return result;
    } catch (resetError) {
      setError(resetError.message);
      return { tempPassword: "" };
    } finally {
      setAuthLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;

    let ignore = false;
    setAppLoading(true);
    setError("");

    (async () => {
      try {
        const me = await api.me(token);
        if (ignore) return;
        setUser(me.user);
        await refreshGroups();
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message);
          clearSession();
        }
      } finally {
        if (!ignore) {
          setAppLoading(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on("group-updated", async ({ groupId }) => {
      try {
        await refreshGroups(groupId);
      } catch (socketError) {
        setError(socketError.message);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !selectedGroupId) return undefined;
    socket.emit("join-group", { groupId: selectedGroupId });
    return () => {
      socket.emit("leave-group", { groupId: selectedGroupId });
    };
  }, [selectedGroupId]);

  useEffect(() => {
    if (!token || !selectedGroupId) return;
    setError("");
    refreshGroup(selectedGroupId).catch((groupError) => setError(groupError.message));
  }, [selectedGroupId]);

  useEffect(() => {
    if (!user?._id || !selectedGroupId) {
      setHiddenEventIds(new Set());
      return;
    }
    const key = hiddenEventsStorageKey(user._id, selectedGroupId);
    const saved = localStorage.getItem(key);
    if (!saved) {
      setHiddenEventIds(new Set());
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      setHiddenEventIds(new Set(Array.isArray(parsed) ? parsed : []));
    } catch {
      setHiddenEventIds(new Set());
    }
  }, [user?._id, selectedGroupId]);

  function hideEventForUser(eventId) {
    if (!user?._id || !selectedGroupId) return;
    setHiddenEventIds((prev) => {
      const next = new Set(prev);
      next.add(eventId);
      const key = hiddenEventsStorageKey(user._id, selectedGroupId);
      localStorage.setItem(key, JSON.stringify(Array.from(next)));
      return next;
    });
  }

  async function runAction(action, options = {}) {
    setAppLoading(true);
    setError("");
    try {
      await action();
      if (options.refreshGroups) {
        await refreshGroups(options.preferredGroupId || selectedGroupId);
      } else if (options.refreshGroup) {
        await refreshGroup(options.groupId || selectedGroupId);
      }
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setAppLoading(false);
    }
  }

  async function handleProfileSave(profile) {
    setAppLoading(true);
    setError("");
    try {
      const result = await api.updateMe(token, profile);
      setUser(result.user);
      if (selectedGroupId) {
        await refreshGroup(selectedGroupId);
      }
      setProfileOpen(false);
    } catch (profileError) {
      setError(profileError.message);
    } finally {
      setAppLoading(false);
    }
  }

  async function handleAvatarUpload(file) {
    setAppLoading(true);
    setError("");
    try {
      const result = await api.uploadAvatar(token, file);
      setUser(result.user);
    } catch (avatarError) {
      setError(avatarError.message);
    } finally {
      setAppLoading(false);
    }
  }

  async function handleChangePassword(passwordForm) {
    setAppLoading(true);
    setError("");
    try {
      await api.changePassword(token, passwordForm);
    } catch (passwordError) {
      setError(passwordError.message);
      throw passwordError;
    } finally {
      setAppLoading(false);
    }
  }

  async function handleStartCall(topicId) {
    if (!topicId || !selectedGroupId) return;
    await runAction(
      async () => {
        const result = await api.startCall(token, selectedGroupId, { topicId });
        window.open(result.call.roomUrl, "_blank", "noopener,noreferrer");
      },
      { refreshGroup: true }
    );
  }

  async function handleEndCall() {
    await runAction(() => api.endCall(token, selectedGroupId), { refreshGroup: true });
  }

  function handleJoinCall(url) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleJoinEventCall(eventItem) {
    if (!selectedGroupId) return;
    const activeCall = groupData?.group?.activeCall;
    if (activeCall?.roomUrl) {
      handleJoinCall(activeCall.roomUrl);
      hideEventForUser(eventItem._id);
      return;
    }

    await runAction(
      async () => {
        const result = await api.startCall(token, selectedGroupId, {
          topicId: groupData?.topics?.[0]?._id || null
        });
        handleJoinCall(result.call.roomUrl);
        hideEventForUser(eventItem._id);
      },
      { refreshGroup: true }
    );
  }

  if (!user || !token) {
    return (
      <AuthScreen
        onSubmit={handleAuth}
        onResetPassword={handleResetPassword}
        loading={authLoading}
        error={error}
      />
    );
  }

  return (
    <div className="app-root">
      <header className="topbar">
        <div>
          <h1>StudyConnect</h1>
          <p>Structured group study workspace with real-time sync</p>
        </div>
        <div className="topbar-actions">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="avatar" className="top-avatar" /> : null}
          <span className="pill">{user.name}</span>
          <button className="secondary-btn" type="button" onClick={() => setProfileOpen(true)}>
            Profile
          </button>
          <button className="ghost-btn" type="button" onClick={clearSession}>
            Logout
          </button>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <div className="app-shell">
        <Sidebar
          groups={groups}
          selectedGroup={selectedGroup}
          selectedGroupId={selectedGroupId}
          onSelectGroup={setSelectedGroupId}
          loading={appLoading}
          onCreateGroup={(payload) =>
            runAction(async () => {
              const result = await api.createGroup(token, payload);
              setSelectedGroupId(result.group._id);
            }, { refreshGroups: true })
          }
          onJoinGroup={(payload) =>
            runAction(async () => {
              const result = await api.joinGroup(token, payload);
              setSelectedGroupId(result.group._id);
            }, { refreshGroups: true })
          }
          onLeaveGroup={(groupId) =>
            runAction(() => api.leaveGroup(token, groupId), { refreshGroups: true })
          }
          onDeleteGroup={(groupId) =>
            runAction(() => api.deleteGroup(token, groupId), { refreshGroups: true })
          }
        />

        <ChatPanel
          groupData={groupData}
          hiddenEventIds={hiddenEventIds}
          selectedTopicId={selectedTopicId}
          onSelectTopic={setSelectedTopicId}
          currentUser={user}
          currentUserRole={groupData?.currentUserRole || "member"}
          onCreateTopic={(payload) =>
            runAction(() => api.createTopic(token, selectedGroupId, payload), {
              refreshGroup: true
            })
          }
          onSendMessage={(payload) =>
            runAction(() => api.createMessage(token, selectedGroupId, payload), {
              refreshGroup: true
            })
          }
          onVerifySolution={(doubtId, solutionId) =>
            runAction(() => api.verifySolution(token, selectedGroupId, doubtId, { solutionId }), {
              refreshGroup: true
            })
          }
          onPinMessage={(messageId, pinned) =>
            runAction(() => api.pinMessage(token, selectedGroupId, messageId, { pinned }), {
              refreshGroup: true
            })
          }
          onUpdateMessage={(messageId, content) =>
            runAction(() => api.updateMessage(token, selectedGroupId, messageId, { content }), {
              refreshGroup: true
            })
          }
          onDeleteMessage={(messageId) =>
            runAction(() => api.deleteMessage(token, selectedGroupId, messageId), {
              refreshGroup: true
            })
          }
          onStartCall={handleStartCall}
          onEndCall={handleEndCall}
          onJoinCall={handleJoinCall}
        />

        <RightPanel
          groupData={groupData}
          currentUserRole={groupData?.currentUserRole || "member"}
          currentUserId={user._id}
          hiddenEventIds={hiddenEventIds}
          onAddResource={(payload) =>
            runAction(() => api.addResource(token, selectedGroupId, payload), {
              refreshGroup: true
            })
          }
          onUploadResourceFile={(payload) =>
            runAction(() => api.uploadResourceFile(token, selectedGroupId, payload), {
              refreshGroup: true
            })
          }
          onUpdateResource={(resourceId, payload) =>
            runAction(() => api.updateResource(token, selectedGroupId, resourceId, payload), {
              refreshGroup: true
            })
          }
          onDeleteResource={(resourceId) =>
            runAction(() => api.deleteResource(token, selectedGroupId, resourceId), {
              refreshGroup: true
            })
          }
          onAddEvent={(payload) =>
            runAction(() => api.addEvent(token, selectedGroupId, payload), {
              refreshGroup: true
            })
          }
          onUpdateEvent={(eventId, payload) =>
            runAction(() => api.updateEvent(token, selectedGroupId, eventId, payload), {
              refreshGroup: true
            })
          }
          onDeleteEvent={(eventId) =>
            runAction(() => api.deleteEvent(token, selectedGroupId, eventId), {
              refreshGroup: true
            })
          }
          onJoinEventCall={handleJoinEventCall}
          onUpdateRole={(memberUserId, role) =>
            runAction(() => api.updateMemberRole(token, selectedGroupId, memberUserId, { role }), {
              refreshGroup: true
            })
          }
        />
      </div>

      <ProfileDrawer
        open={profileOpen}
        user={user}
        loading={appLoading}
        onClose={() => setProfileOpen(false)}
        onSave={handleProfileSave}
        onUploadAvatar={handleAvatarUpload}
        onChangePassword={handleChangePassword}
      />
    </div>
  );
}
