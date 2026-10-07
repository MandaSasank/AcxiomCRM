import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { UserDto, UserRole } from '../types/crm.ts';
import {
  Lock,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Unlock,
  KeyRound,
  Edit2,
  CheckCircle,
  AlertCircle,
  X,
  UserCheck,
  UserX,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPwModal, setShowResetPwModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);

  // Form states
  const [createFormData, setCreateFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleName: 'SalesExecutive',
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    roleName: 'SalesExecutive' as UserRole,
    isActive: true,
  });

  const [resetPwValue, setResetPwValue] = useState('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch('/api/auth/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setUsersList(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user?.roleName]);

  // Check Admin authorization guard
  if (user?.roleName !== 'Admin') {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">403 Forbidden - Access Restricted</h2>
        <p className="text-sm text-slate-600">
          User & Role Administration is restricted strictly to users with the <strong className="text-rose-600">Admin</strong> role. Your active role is <strong className="text-blue-700">{user?.roleName}</strong>.
        </p>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Password policy validation (Section 6.2)
    const pw = createFormData.password;
    if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/[0-9]/.test(pw) || !/[!@#$%^&*]/.test(pw)) {
      setServerError('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character (!@#$%^&*).');
      return;
    }

    try {
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(createFormData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowCreateModal(false);
        setActionSuccess(`User "${data.user.name}" created with role ${data.user.roleName}.`);
        fetchUsers();
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        setServerError(data.message || 'Failed to create user');
      }
    } catch (err: any) {
      setServerError(err.message || 'Network error');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setServerError(null);

    try {
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch(`/api/auth/users/${selectedUser.userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowEditModal(false);
        setActionSuccess(`User "${selectedUser.name}" updated.`);
        fetchUsers();
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        setServerError(data.message || 'Failed to update user');
      }
    } catch (err: any) {
      setServerError(err.message || 'Network error');
    }
  };

  const handleUnlockUser = async (targetUser: UserDto) => {
    try {
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch(`/api/auth/users/${targetUser.userId}/unlock`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        setActionSuccess(`Account unlocked for ${targetUser.name}.`);
        fetchUsers();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Failed to unlock:', err);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setServerError(null);

    if (resetPwValue.length < 8) {
      setServerError('New password must be at least 8 characters long.');
      return;
    }

    try {
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch(`/api/auth/users/${selectedUser.userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ newPassword: resetPwValue }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowResetPwModal(false);
        setResetPwValue('');
        setActionSuccess(`Password successfully reset for ${selectedUser.name}.`);
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        setServerError(data.message || 'Password reset failed');
      }
    } catch (err: any) {
      setServerError(err.message || 'Network error');
    }
  };

  const openEdit = (u: UserDto) => {
    setSelectedUser(u);
    setEditFormData({
      name: u.name,
      roleName: u.roleName,
      isActive: u.isActive,
    });
    setServerError(null);
    setShowEditModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Lock className="w-6 h-6 text-blue-600" />
            User & Role Administration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise RBAC: Provision accounts, assign roles (Admin, Manager, Sales Executive), and manage security lockout.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateFormData({
              name: '',
              email: '',
              password: '',
              roleName: 'SalesExecutive',
            });
            setServerError(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Provision User
        </button>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Failed Logins</th>
                <th className="py-3 px-4">Lockout Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Security Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : (
                usersList.map(u => {
                  const isLocked = u.lockoutEnd !== null && u.lockoutEnd !== undefined;
                  return (
                    <tr key={u.userId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block">{u.name}</span>
                        <span className="text-xs text-slate-500">{u.email}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                            u.roleName === 'Admin'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : u.roleName === 'Manager'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {u.roleName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.isActive ? (
                          <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                            <UserX className="w-3.5 h-3.5" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-700">
                        {u.failedLoginCount || 0} / 5
                      </td>
                      <td className="py-3.5 px-4">
                        {isLocked ? (
                          <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold flex items-center gap-1 w-max">
                            <ShieldAlert className="w-3 h-3" /> Locked Out
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Normal</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {new Date(u.createdDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLocked && (
                            <button
                              onClick={() => handleUnlockUser(u)}
                              className="px-2 py-1 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md flex items-center gap-1"
                              title="Unlock Locked Account"
                            >
                              <Unlock className="w-3 h-3" /> Unlock
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setResetPwValue('');
                              setServerError(null);
                              setShowResetPwModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Reset Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                            title="Edit Role / Status"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROVISION USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Provision Application User</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {serverError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {serverError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={createFormData.name}
                  onChange={e => setCreateFormData({ ...createFormData, name: e.target.value })}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={createFormData.email}
                  onChange={e => setCreateFormData({ ...createFormData, email: e.target.value })}
                  placeholder="user@acxiomcrm.com"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role Assignment</label>
                <select
                  value={createFormData.roleName}
                  onChange={e => setCreateFormData({ ...createFormData, roleName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                >
                  <option value="SalesExecutive">Sales Executive</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Password <span className="text-rose-500">* (Policy enforced)</span>
                </label>
                <input
                  type="password"
                  required
                  value={createFormData.password}
                  onChange={e => setCreateFormData({ ...createFormData, password: e.target.value })}
                  placeholder="Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Password hashed with cryptographically salted PBKDF2.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE & STATUS MODAL */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Edit User Role & Status</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {serverError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {serverError}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={editFormData.roleName}
                  onChange={e => setEditFormData({ ...editFormData, roleName: e.target.value as UserRole })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="SalesExecutive">Sales Executive</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="userActiveCheck"
                  checked={editFormData.isActive}
                  onChange={e => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="userActiveCheck" className="text-xs font-semibold text-slate-700">
                  Account is Active & Allowed to Sign In
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetPwModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Reset User Password</h2>
            <p className="text-xs text-slate-500">
              Set new administrative credentials for <strong className="text-slate-800">{selectedUser.name}</strong>.
            </p>

            {serverError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {serverError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={resetPwValue}
                  onChange={e => setResetPwValue(e.target.value)}
                  placeholder="Min 8 chars with complexity"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetPwModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
