import React, { useState, useEffect } from 'react';
import api, { unwrapList } from '../services/api';
import { exportToCSV } from '../services/exportCSV';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  parent?: { id: string; name: string };
  bus?: { id: string; busNumber: string };
  stop?: { id: string; name: string };
}

const StudentManagement: React.FC = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBus, setFilterBus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [parentOptions, setParentOptions] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [busOptions, setBusOptions] = useState<Array<{ id: string; busNumber: string }>>([]);
  const [stopOptions, setStopOptions] = useState<Array<{ id: string; name: string; routeName: string }>>([]);
  const [formData, setFormData] = useState({ name: '', rollNumber: '', parentId: '', busId: '', stopId: '' });

  useEffect(() => {
    loadStudents();
    api.get('/parents', { params: { limit: 100 } }).then(res => setParentOptions(unwrapList(res.data))).catch(() => {});
    api.get('/buses', { params: { limit: 100 } }).then(res => setBusOptions(unwrapList(res.data))).catch(() => {});
    api.get('/routes', { params: { limit: 100 } }).then(res => {
      const routes = unwrapList(res.data);
      const stops: Array<{ id: string; name: string; routeName: string }> = [];
      for (const route of routes) { for (const stop of route.stops || []) { stops.push({ id: stop.id, name: stop.name, routeName: route.name }); } }
      setStopOptions(stops);
    }).catch(() => {});
  }, []);

  const loadStudents = async () => {
    try { const res = await api.get('/students'); setStudents(unwrapList(res.data)); }
    catch { toast('error', 'Failed to load students'); }
    setIsLoading(false);
  };

  const filtered = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q) || s.parent?.name?.toLowerCase().includes(q);
    const matchesBus = !filterBus || s.bus?.id === filterBus;
    return matchesSearch && matchesBus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = { ...formData };
      if (!payload.parentId) delete payload.parentId;
      if (!payload.busId) delete payload.busId;
      if (!payload.stopId) delete payload.stopId;

      if (editingStudent) {
        await api.put(`/students/${editingStudent.id}`, payload);
        toast('success', 'Student updated');
      } else {
        await api.post('/students', payload);
        toast('success', 'Student added');
      }
      closeModal(); loadStudents();
    } catch { toast('error', 'Failed to save student'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/students/${deleteTarget.id}`); toast('success', 'Student deleted'); loadStudents(); }
    catch { toast('error', 'Failed to delete student'); }
    setDeleteTarget(null);
  };

  const openAdd = () => { setEditingStudent(null); setFormData({ name: '', rollNumber: '', parentId: '', busId: '', stopId: '' }); setShowModal(true); };
  const openEdit = (s: Student) => { setEditingStudent(s); setFormData({ name: s.name, rollNumber: s.rollNumber, parentId: s.parent?.id || '', busId: s.bus?.id || '', stopId: s.stop?.id || '' }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingStudent(null); };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Student Management"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => exportToCSV(filtered.map(s => ({ Name: s.name, 'Roll Number': s.rollNumber, Parent: s.parent?.name || 'N/A', Bus: s.bus?.busNumber || 'Not assigned', Stop: s.stop?.name || 'N/A' })), 'students')}>Export CSV</Button>
            <Button size="sm" onClick={openAdd}>+ Add Student</Button>
          </>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name, roll number, or parent..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm"
        />
        <select
          value={filterBus}
          onChange={(e) => setFilterBus(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm sm:w-48"
        >
          <option value="">All Buses</option>
          {busOptions.map(bus => <option key={bus.id} value={bus.id}>{bus.busNumber}</option>)}
        </select>
      </div>

      {/* Desktop table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden data-table">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {['Name', 'Roll No', 'Parent', 'Bus', 'Stop', 'Actions'].map(h => (
                <th key={h} className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''} text-gray-500 dark:text-gray-400`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {filtered.map((student) => (
              <tr key={student.id} className="table-row-hover">
                <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white">{student.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{student.rollNumber}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{student.parent?.name || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{student.bus?.busNumber || 'Not assigned'}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{student.stop?.name || 'N/A'}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openEdit(student)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium mr-3">Edit</button>
                  <button onClick={() => setDeleteTarget(student)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState title={students.length === 0 ? 'No students yet' : 'No matches'} description={students.length === 0 ? 'Add your first student to get started.' : 'Try a different search term.'} action={students.length === 0 ? <Button onClick={openAdd}>+ Add Student</Button> : undefined} />}
      </div>

      {/* Mobile cards */}
      <div className="data-cards flex flex-col gap-3 sm:hidden">
        {filtered.length === 0 ? (
          <EmptyState title={students.length === 0 ? 'No students yet' : 'No matches'} description={students.length === 0 ? 'Add your first student to get started.' : 'Try a different search term.'} action={students.length === 0 ? <Button onClick={openAdd}>+ Add Student</Button> : undefined} />
        ) : filtered.map((student) => (
          <div key={student.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-800 dark:text-white">{student.name}</p>
              <span className="text-xs text-gray-500 dark:text-gray-400">{student.rollNumber}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Parent: {student.parent?.name || 'N/A'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Bus: {student.bus?.busNumber || 'Not assigned'} &middot; Stop: {student.stop?.name || 'N/A'}</p>
            <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button onClick={() => openEdit(student)} className="text-sm text-blue-600 dark:text-blue-400 font-medium">Edit</button>
              <button onClick={() => setDeleteTarget(student)} className="text-sm text-red-600 dark:text-red-400 font-medium">Delete</button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">Showing {filtered.length} of {students.length} students</p>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editingStudent ? 'Edit Student' : 'Add Student'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Roll Number</label>
            <input type="text" value={formData.rollNumber} onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Parent</label>
            <select value={formData.parentId} onChange={(e) => setFormData({ ...formData, parentId: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white" required={!editingStudent}>
              <option value="">-- Select parent --</option>
              {parentOptions.map(p => <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Bus (optional)</label>
            <select value={formData.busId} onChange={(e) => setFormData({ ...formData, busId: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white">
              <option value="">-- Unassigned --</option>
              {busOptions.map(b => <option key={b.id} value={b.id}>{b.busNumber}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Stop (optional)</label>
            <select value={formData.stopId} onChange={(e) => setFormData({ ...formData, stopId: e.target.value })} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white">
              <option value="">-- No stop --</option>
              {stopOptions.map(s => <option key={s.id} value={s.id}>{s.name} ({s.routeName})</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Student" message={`Delete student ${deleteTarget?.name}? This will remove their records.`} confirmLabel="Delete" />
    </div>
  );
};

export default StudentManagement;
