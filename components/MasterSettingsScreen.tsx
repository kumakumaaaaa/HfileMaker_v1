'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, Save, X, Building2, BedDouble, Users, CheckSquare } from 'lucide-react';
import { Ward, Room, WardType, UserAccount, UserRole, AccountAuthority } from '../types/nursing';
import { getWards, saveWard, deleteWard, getRooms, saveRoom, deleteRoom, getUsers, saveUser, deleteUser } from '../utils/storage';

export const MasterSettingsScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'ward' | 'room' | 'user'>('ward');
    const [showValidOnly, setShowValidOnly] = useState(true);
    
    // Data
    const [wards, setWards] = useState<Ward[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [users, setUsers] = useState<UserAccount[]>([]);
    
    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editingWard, setEditingWard] = useState<Ward | null>(null);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

    // Initial Load
    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        setWards(getWards());
        setRooms(getRooms());
        setUsers(getUsers());
    };

    // --- Helper for Filtering ---
    const isValid = (item: { startDate?: string; endDate?: string }) => {
        const today = new Date().toISOString().split('T')[0];
        const start = item.startDate;
        const end = item.endDate;
        
        if (start && start > today) return false;
        if (end && end < today) return false;
        return true;
    };

    const displayWards = showValidOnly ? wards.filter(isValid) : wards;
    const displayRooms = showValidOnly ? rooms.filter(isValid) : rooms;
    const displayUsers = showValidOnly ? users.filter(isValid) : users;

    // --- Ward Handlers ---
    const handleAddWard = () => {
        setEditingWard({ code: '', name: '', type: '一般病棟', startDate: '', endDate: '' });
        setIsEditing(true);
    };

    const handleEditWard = (ward: Ward) => {
        setEditingWard({ ...ward });
        setIsEditing(true);
    };

    const handleSaveWard = () => {
        if (!editingWard || !editingWard.code || !editingWard.name) return;
        saveWard(editingWard);
        setIsEditing(false);
        setEditingWard(null);
        refreshData();
    };

    const handleDeleteWard = (code: string) => {
        if (!confirm('本当に削除しますか？')) return;
        deleteWard(code);
        refreshData();
    };

    // --- Room Handlers ---
    const handleAddRoom = () => {
        setEditingRoom({ code: '', name: '', startDate: '', endDate: '' });
        setIsEditing(true);
    };

    const handleEditRoom = (room: Room) => {
        setEditingRoom({ ...room });
        setIsEditing(true);
    };

    const handleSaveRoom = () => {
        if (!editingRoom || !editingRoom.code || !editingRoom.name) return;
        saveRoom(editingRoom);
        setIsEditing(false);
        setEditingRoom(null);
        refreshData();
    };

    const handleDeleteRoom = (code: string) => {
        if (!confirm('本当に削除しますか？')) return;
        deleteRoom(code);
        refreshData();
    };
    
    // --- User Handlers ---
    const handleAddUser = () => {
        setEditingUser({ 
            id: `u_${Date.now()}`, 
            userId: '', 
            name: '', 
            password: '', 
            role: '入力者', 
            authority: '一般アカウント',
            startDate: new Date().toISOString().split('T')[0]
        });
        setIsEditing(true);
    };

    const handleEditUser = (user: UserAccount) => {
        setEditingUser({ ...user });
        setIsEditing(true);
    };

    const handleSaveUser = () => {
        if (!editingUser || !editingUser.userId || !editingUser.name || !editingUser.password) {
            alert('必須項目を入力してください');
            return;
        }
        // Prevent creating new System Admins
        if (editingUser.authority === 'システム管理者アカウント') {
             // If we are editing an EXISTING system admin, we check if it was ALREADY one.
             // But here we rely on the UI not offering the option for new users.
             // Double check:
             const existing = users.find(u => u.id === editingUser.id);
             if (!existing) {
                 // Creating new user
                 alert('システム管理者アカウントを新規作成することはできません。');
                 return;
             }
        }

        saveUser(editingUser);
        setIsEditing(false);
        setEditingUser(null);
        refreshData();
    };

    const handleDeleteUser = (user: UserAccount) => {
        if (user.authority === 'システム管理者アカウント') {
            alert('システム管理者アカウントは削除できません。');
            return;
        }
        if (!confirm('本当に削除しますか？\n\n※ユーザーは削除せず「終了日」を設定して無効化することを推奨します。')) return;
        deleteUser(user.id);
        refreshData();
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditingWard(null);
        setEditingRoom(null);
        setEditingUser(null);
    };

    // Modal Content
    const renderModal = () => {
        if (!isEditing) return null;
        
        let title = '';
        let icon = null;
        if (activeTab === 'ward') { title = '病棟マスタ編集'; icon = <Building2 />; }
        if (activeTab === 'room') { title = '病室マスタ編集'; icon = <BedDouble />; }
        if (activeTab === 'user') { title = 'アカウント編集'; icon = <Users />; }
        
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 w-[600px] shadow-xl">
                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                        {icon} {title}
                    </h3>
                    
                    <div className="space-y-6">
                        {/* Ward/Room Fields */}
                        {(activeTab === 'ward' || activeTab === 'room') && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-1">コード</label>
                                        <input 
                                            className="w-full border p-2 rounded text-lg font-mono"
                                            value={activeTab === 'ward' ? editingWard?.code : editingRoom?.code}
                                            onChange={e => activeTab === 'ward'
                                                ? setEditingWard(prev => prev ? ({...prev, code: e.target.value}) : null)
                                                : setEditingRoom(prev => prev ? ({...prev, code: e.target.value}) : null)
                                            }
                                            placeholder="W001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-1">名称</label>
                                        <input 
                                            className="w-full border p-2 rounded text-lg"
                                            value={activeTab === 'ward' ? editingWard?.name : editingRoom?.name}
                                            onChange={e => activeTab === 'ward' 
                                                ? setEditingWard(prev => prev ? ({...prev, name: e.target.value}) : null)
                                                : setEditingRoom(prev => prev ? ({...prev, name: e.target.value}) : null)
                                            }
                                            placeholder="名称"
                                        />
                                    </div>
                                </div>
                                
                                {activeTab === 'ward' && (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-1">病棟タイプ</label>
                                        <select 
                                            className="w-full border p-2 rounded text-lg"
                                            value={editingWard?.type}
                                            onChange={e => setEditingWard(prev => prev ? ({...prev, type: e.target.value as WardType}) : null)}
                                        >
                                            <option value="一般病棟">一般病棟</option>
                                            <option value="精神病棟">精神病棟</option>
                                            <option value="その他">その他</option>
                                        </select>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-1">開始日</label>
                                        <input 
                                            type="date"
                                            className="w-full border p-2 rounded text-lg"
                                            value={activeTab === 'ward' ? editingWard?.startDate || '' : editingRoom?.startDate || ''}
                                            onChange={e => activeTab === 'ward' 
                                                ? setEditingWard(prev => prev ? ({...prev, startDate: e.target.value}) : null)
                                                : setEditingRoom(prev => prev ? ({...prev, startDate: e.target.value}) : null)
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-1">終了日</label>
                                        <input 
                                            type="date"
                                            className="w-full border p-2 rounded text-lg"
                                            value={activeTab === 'ward' ? editingWard?.endDate || '' : editingRoom?.endDate || ''}
                                            onChange={e => activeTab === 'ward' 
                                                ? setEditingWard(prev => prev ? ({...prev, endDate: e.target.value}) : null)
                                                : setEditingRoom(prev => prev ? ({...prev, endDate: e.target.value}) : null)
                                            }
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* User Fields */}
                        {activeTab === 'user' && editingUser && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-1">ユーザーID</label>
                                        <input 
                                            className="w-full border p-2 rounded text-lg font-mono disabled:bg-gray-100 disabled:text-gray-400"
                                            value={editingUser.userId}
                                            onChange={e => setEditingUser(prev => prev ? ({...prev, userId: e.target.value}) : null)}
                                            placeholder="login_id"
                                            disabled={editingUser.authority === 'システム管理者アカウント'} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-1">氏名</label>
                                        <input 
                                            className="w-full border p-2 rounded text-lg"
                                            value={editingUser.name}
                                            onChange={e => setEditingUser(prev => prev ? ({...prev, name: e.target.value}) : null)}
                                            placeholder="看護 太郎"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 mb-1">パスワード</label>
                                    <input 
                                        type="password"
                                        className="w-full border p-2 rounded text-lg font-mono"
                                        value={editingUser.password}
                                        onChange={e => setEditingUser(prev => prev ? ({...prev, password: e.target.value}) : null)}
                                        placeholder="password"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-1">ユーザータイプ (役割)</label>
                                        <select 
                                            className="w-full border p-2 rounded text-lg"
                                            value={editingUser.role}
                                            onChange={e => setEditingUser(prev => prev ? ({...prev, role: e.target.value as UserRole}) : null)}
                                        >
                                            <option value="入力者">入力者</option>
                                            <option value="評価者">評価者</option>
                                            <option value="管理者">管理者</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-1">アカウント権限</label>
                                        {editingUser.authority === 'システム管理者アカウント' ? (
                                            <div className="w-full border p-2 rounded text-lg bg-gray-100 text-gray-500">
                                                システム管理者アカウント
                                            </div>
                                        ) : (
                                            <select 
                                                className="w-full border p-2 rounded text-lg"
                                                value={editingUser.authority}
                                                onChange={e => setEditingUser(prev => prev ? ({...prev, authority: e.target.value as AccountAuthority}) : null)}
                                            >
                                                <option value="一般アカウント">一般アカウント</option>
                                                <option value="施設管理者アカウント">施設管理者アカウント</option>
                                            </select>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-2">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-1">適用開始日</label>
                                        <input 
                                            type="date"
                                            className="w-full border p-2 rounded text-lg"
                                            value={editingUser.startDate || ''}
                                            onChange={e => setEditingUser(prev => prev ? ({...prev, startDate: e.target.value}) : null)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-1">適用終了日</label>
                                        <input 
                                            type="date"
                                            className="w-full border p-2 rounded text-lg"
                                            value={editingUser.endDate || ''}
                                            onChange={e => setEditingUser(prev => prev ? ({...prev, endDate: e.target.value}) : null)}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button 
                            onClick={handleCancel}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold"
                        >
                            キャンセル
                        </button>
                        <button 
                            onClick={() => {
                                if (activeTab === 'ward') handleSaveWard();
                                if (activeTab === 'room') handleSaveRoom();
                                if (activeTab === 'user') handleSaveUser();
                            }}
                            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" /> 保存
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 text-gray-900 p-8">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3 text-gray-800">
                <Settings className="w-8 h-8 text-gray-500" /> マスタ設定
            </h2>

            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-gray-300 mb-6">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('ward')}
                        className={`px-6 py-3 font-bold text-xl flex items-center gap-2 border-b-4 transition-colors ${activeTab === 'ward' ? 'border-blue-500 text-blue-800' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <Building2 className="w-6 h-6" /> 病棟マスタ
                    </button>
                    <button
                        onClick={() => setActiveTab('room')}
                        className={`px-6 py-3 font-bold text-xl flex items-center gap-2 border-b-4 transition-colors ${activeTab === 'room' ? 'border-blue-500 text-blue-800' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <BedDouble className="w-6 h-6" /> 病室マスタ
                    </button>
                    <button
                        onClick={() => setActiveTab('user')}
                        className={`px-6 py-3 font-bold text-xl flex items-center gap-2 border-b-4 transition-colors ${activeTab === 'user' ? 'border-blue-500 text-blue-800' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <Users className="w-6 h-6" /> アカウントマスタ
                    </button>
                </div>
                
                {/* Validity Filter */}
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded border border-gray-200 shadow-sm">
                    <input 
                        type="checkbox" 
                        id="showValidOnly"
                        checked={showValidOnly}
                        onChange={(e) => setShowValidOnly(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="showValidOnly" className="text-gray-700 font-bold cursor-pointer select-none">
                        有効なマスタのみ表示
                    </label>
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex-1 flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div className="text-gray-500 font-bold">
                        {activeTab === 'ward' && `${displayWards.length} 件の病棟`}
                        {activeTab === 'room' && `${displayRooms.length} 件の病室`}
                        {activeTab === 'user' && `${displayUsers.length} 件のアカウント`}
                    </div>
                    <button 
                        onClick={() => {
                            if (activeTab === 'ward') handleAddWard();
                            if (activeTab === 'room') handleAddRoom();
                            if (activeTab === 'user') handleAddUser();
                        }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 transition"
                    >
                        <Plus className="w-5 h-5" /> 新規追加
                    </button>
                </div>
                
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">ID/コード</th>
                                <th className="px-6 py-3">名称</th>
                                {activeTab === 'ward' && <th className="px-6 py-3">タイプ</th>}
                                {activeTab === 'user' ? (
                                    <>
                                        <th className="px-6 py-3">ユーザータイプ</th>
                                        <th className="px-6 py-3">権限</th>
                                    </>
                                ) : null}
                                <th className="px-6 py-3">開始日</th>
                                <th className="px-6 py-3">終了日</th>
                                <th className="px-6 py-3 w-24 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-lg">
                            {/* Ward Rows */}
                            {activeTab === 'ward' && displayWards.map(w => (
                                <tr key={w.code} className="hover:bg-blue-50/50">
                                    <td className="px-6 py-4 font-mono">{w.code}</td>
                                    <td className="px-6 py-4 font-bold">{w.name}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-gray-200 px-2 py-1 rounded text-sm text-gray-700">{w.type}</span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-gray-500">{w.startDate || '-'}</td>
                                    <td className="px-6 py-4 font-mono text-gray-500">{w.endDate || '-'}</td>
                                    <td className="px-6 py-4 flex justify-center gap-3">
                                        <button onClick={() => handleEditWard(w)} className="text-blue-600 hover:bg-blue-100 p-2 rounded"><Edit2 className="w-5 h-5" /></button>
                                        <button onClick={() => handleDeleteWard(w.code)} className="text-red-400 hover:bg-red-100 p-2 rounded"><Trash2 className="w-5 h-5" /></button>
                                    </td>
                                </tr>
                            ))}

                            {/* Room Rows */}
                            {activeTab === 'room' && displayRooms.map(r => (
                                <tr key={r.code} className="hover:bg-blue-50/50">
                                    <td className="px-6 py-4 font-mono">{r.code}</td>
                                    <td className="px-6 py-4 font-bold">{r.name}</td>
                                    <td className="px-6 py-4 font-mono text-gray-500">{r.startDate || '-'}</td>
                                    <td className="px-6 py-4 font-mono text-gray-500">{r.endDate || '-'}</td>
                                    <td className="px-6 py-4 flex justify-center gap-3">
                                        <button onClick={() => handleEditRoom(r)} className="text-blue-600 hover:bg-blue-100 p-2 rounded"><Edit2 className="w-5 h-5" /></button>
                                        <button onClick={() => handleDeleteRoom(r.code)} className="text-red-400 hover:bg-red-100 p-2 rounded"><Trash2 className="w-5 h-5" /></button>
                                    </td>
                                </tr>
                            ))}
                            
                            {/* User Rows */}
                            {activeTab === 'user' && displayUsers.map(u => (
                                <tr key={u.id} className="hover:bg-blue-50/50">
                                    <td className="px-6 py-4 font-mono">{u.userId}</td>
                                    <td className="px-6 py-4 font-bold">{u.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-sm text-white font-bold
                                            ${u.role === '管理者' ? 'bg-purple-500' : u.role === '評価者' ? 'bg-green-500' : 'bg-blue-400'}
                                        `}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{u.authority}</td>
                                    <td className="px-6 py-4 font-mono text-gray-500">{u.startDate || '-'}</td>
                                    <td className="px-6 py-4 font-mono text-gray-500">{u.endDate || '-'}</td>
                                    <td className="px-6 py-4 flex justify-center gap-3">
                                        <button onClick={() => handleEditUser(u)} className="text-blue-600 hover:bg-blue-100 p-2 rounded"><Edit2 className="w-5 h-5" /></button>
                                        {u.authority !== 'システム管理者アカウント' && (
                                            <button onClick={() => handleDeleteUser(u)} className="text-red-400 hover:bg-red-100 p-2 rounded"><Trash2 className="w-5 h-5" /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {renderModal()}
        </div>
    );
};
