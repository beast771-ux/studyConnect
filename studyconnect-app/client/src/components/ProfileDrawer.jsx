import { useEffect, useState } from "react";

export default function ProfileDrawer({
  user,
  open,
  onClose,
  onSave,
  onUploadAvatar,
  onChangePassword,
  loading
}) {
  const [form, setForm] = useState({
    name: "",
    bio: "",
    department: "",
    semester: ""
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: ""
  });
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      bio: user.bio || "",
      department: user.department || "",
      semester: user.semester || ""
    });
    setPasswordMessage("");
    setAvatarFile(null);
  }, [user, open]);

  if (!open) return null;

  async function submit(event) {
    event.preventDefault();
    await onSave(form);
  }

  async function submitPassword(event) {
    event.preventDefault();
    try {
      await onChangePassword(passwordForm);
      setPasswordForm({
        oldPassword: "",
        newPassword: ""
      });
      setPasswordMessage("Password updated successfully.");
    } catch {
      setPasswordMessage("");
    }
  }

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div className="profile-drawer" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="panel-head">
          <div>
            <h2>Your Profile</h2>
            <p className="muted">Update details visible to your study groups.</p>
          </div>
          <button type="button" className="inline-link" onClick={onClose}>
            Close
          </button>
        </div>

        <form className="mini-form profile-form" onSubmit={submit}>
          <label>
            Profile Photo
            {user?.avatarUrl && (
              <img src={user.avatarUrl} alt="profile" className="avatar-preview" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
            />
            <button
              type="button"
              className="secondary-btn"
              onClick={async () => {
                if (!avatarFile) return;
                await onUploadAvatar(avatarFile);
                setAvatarFile(null);
              }}
              disabled={!avatarFile || loading}
            >
              Upload Photo
            </button>
          </label>

          <label>
            Name
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>

          <label>
            Bio
            <textarea
              rows={3}
              value={form.bio}
              onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
              placeholder="Your focus area or study goals"
            />
          </label>

          <label>
            Department
            <input
              value={form.department}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, department: event.target.value }))
              }
              placeholder="Information Technology"
            />
          </label>

          <label>
            Semester
            <input
              value={form.semester}
              onChange={(event) => setForm((prev) => ({ ...prev, semester: event.target.value }))}
              placeholder="Semester 4"
            />
          </label>

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </form>

        <form className="mini-form profile-form" onSubmit={submitPassword}>
          <h3>Change Password</h3>
          <label>
            Old Password
            <input
              type="password"
              value={passwordForm.oldPassword}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, oldPassword: event.target.value }))
              }
              required
            />
          </label>
          <label>
            New Password
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
              }
              required
            />
          </label>
          {passwordMessage && <p className="muted">{passwordMessage}</p>}
          <button type="submit" className="ghost-btn" disabled={loading}>
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
